import React from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button, { ButtonProps } from 'react-bootstrap/Button';
import Badge, { BadgeProps } from 'react-bootstrap/Badge';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import { OxfordLanguage } from './types/OxfordDictionariesAPI';
import { deserialize } from 'serializr';
import RetrieveEntry from './types/gen/RetrieveEntry';
import IHeadwordEntry from './types/gen/IHeadwordEntry';
import StorageMemo from './StorageMemo';
import compact from 'lodash/compact';
import flatten from 'lodash/flatten';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import every from 'lodash/every';
import ILexicalEntry from './types/gen/ILexicalEntry';
import IEntry from './types/gen/IEntry';
import IPronunciation from './types/gen/IPronunciation';
import ISense from './types/gen/ISense';
import merge from 'lodash/merge';
import unique from 'lodash/intersection';

async function fetchJson(url: string) {
  const app_id = localStorage.getItem("oed/app_id");
  const app_key = localStorage.getItem("oed/app_key");
  if (!app_id || !app_key) {
    throw new Error("missing app id or key");
  }
  const queryResult = await fetch(url, { headers: { Accept: "application/json", app_id, app_key } });
  console.log({ queryResult });
  const result = await queryResult.json();
  console.log({ result });
  return result;
}

interface IProps {

}

type Pass = 1 | 2 | 3 | 0;

interface FlagMap { [domain: string]: Pass }

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;

  language: OxfordLanguage;
  q?: string;

  history: string[];

  re?: RetrieveEntry;

  allowedPartsOfSpeech: FlagMap;
  allowedRegisters: FlagMap;
  allowedDomains: FlagMap;
}

type FlagPropertyNames<T> = { [K in keyof Required<T>]: T[K] extends FlagMap ? K : never }[keyof T];

interface IDictionaryEntry {
  entry_rich: string;
  definitions: {
    [partOfSpeech: string]: string[],
  },
  pronunciation_ipa: string,
  audio_file: string,
  example: string,
}

function needsMoreDefinitions(result: Partial<IDictionaryEntry>, partOfSpeech: string, short: boolean, pass: Pass) {
  const max = short ? 1 : 2;
  if (!result.definitions) {
    return true;
  } else if (pass > 1) {
    return false;
  } else if (!result.definitions[partOfSpeech]) {
    return Object.keys(result.definitions).length < max;
  } else {
    return result.definitions[partOfSpeech].length < max;
  }
}

const FLAG_PROPS: Array<FlagPropertyNames<IState>> = ['allowedPartsOfSpeech', 'allowedRegisters', 'allowedDomains'];

export default class App extends React.Component<IProps, IState> {
  private fetchMemo = new StorageMemo(localStorage, "fetchJson", fetchJson);

  constructor(props: Readonly<IProps>) {
    super(props);
    const interfaceSettings = FLAG_PROPS.map((prop) => {
      const value = localStorage.getItem("oed/passes/" + prop);
      const effective = JSON.parse(value || "{}");
      const result = { [prop]: effective }
      console.log({prop, value, effective, result})
      return result;
    });
    const history = JSON.parse(localStorage.getItem("oed/history") || "[]");
    const state0 = merge({
      apiBaseUrl: "/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
      language: OxfordLanguage.americanEnglish,
      q: sessionStorage.getItem("oed/q") || undefined,
      history,
    }, ...interfaceSettings);
    console.log({state0});
    this.state = state0;
  }

  public componentDidMount() {
    if (this.state.q) {
      this.go();
    }
  }

  public componentDidUpdate() {
    FLAG_PROPS.forEach((prop) => {
      localStorage.setItem("oed/passes/" + prop, JSON.stringify(this.state[prop] || {}));
    });
    if (this.state.app_id) {
      localStorage.setItem("oed/app_id", this.state.app_id);
    } else {
      localStorage.removeItem("oed/app_id");
    }
    if (this.state.app_key) {
      localStorage.setItem("oed/app_key", this.state.app_key);
    } else {
      localStorage.removeItem("oed/app_key");
    }
    const { q, re } = this.state;
    if (q && this.state.re && this.state.re.results) {
      sessionStorage.setItem("oed/q", q);
    } else {
      localStorage.removeItem("oed/q");
    }
    localStorage.setItem("oed/history", JSON.stringify(this.state.history));
  }

  public render() {
    return <Container>
      <Form inline={true}>
        <Form.Row>
          <Col>
            <Form.Control placeholder="App ID" value={this.state.app_id || undefined}
              onChange={(e: any) => this.setState({ app_id: e.target.value })} />

          </Col>
          <Col>
            <Form.Control placeholder="App Key" value={this.state.app_key || undefined}
              onChange={(e: any) => this.setState({ app_key: e.target.value })} />
          </Col>
        </Form.Row>
        <Form.Row>
          <Form.Group>
            <Form.Control placeholder="Search" value={this.state.q}
              onChange={(e: any) => this.setState({ q: e.target.value ? e.target.value : undefined })} />
            <Button onClick={this.go} disabled={!this.state.q || this.state.q.length < 2}>Go</Button>
            <DropdownButton id="dropdown-basic-button" title="History">
              {
                this.state.history.map((q) =>
                  <Dropdown.Item onClick={() => this.setState({ q }, this.go)}>{q}</Dropdown.Item>
                )
              }
            </DropdownButton>
          </Form.Group>
        </Form.Row>
      </Form>

      {this.renderFilter('Parts of Speech', 'allowedPartsOfSpeech')}
      {this.renderFilter('Registers', 'allowedRegisters')}
      {this.renderFilter('Domains', 'allowedDomains')}

      <Row>
        <Col>
          {this.state.re && this.state.re.results && this.renderResult(this.state.re.results)}
        </Col>
      </Row>
      <Row>
        <Col>
          {this.state.re && this.state.re.results && this.state.re.results.map(this.renderResponse)}
        </Col>
      </Row>
    </Container>;
  }

  private renderFilter(label: string, prop: FlagPropertyNames<IState>): React.ReactNode {
    return <Row>
      <Col xs={3}>
        <Form.Label>{label}</Form.Label>
      </Col>
      <Col>{
        Object.keys(this.state[prop]).sort().map((flag) =>
          {
            const value = this.state[prop][flag];
            const variants: Array<BadgeProps['variant']> = ['danger', 'light', 'secondary', 'warning'];
            const variant = variants[value];
            return <Badge variant={variant} onClick={() => this.setState((state) => {
                const flags = state[prop];
                const newFlags: FlagMap = { ...flags, [flag]: (flags[flag] + 1) % 3 as Pass};
                const newState: any = { [prop]: newFlags };
                return newState;
              })}
              >{flag}</Badge>;
          })
      }
      </Col>
    </Row>
  }

  private renderResult = (entries: IHeadwordEntry[]) => {
    const result: Partial<IDictionaryEntry> = {};
    entries.forEach((entry) => {
      const { pronunciations } = entry;

      this.pullPronunciation(result, pronunciations);
      entry.lexicalEntries.forEach((lexicalEntry) => {
        const { lexicalCategory: { id: partOfSpeech }, text } = lexicalEntry;
        if (text.match(/[A-Z]/)) {
          return;
        }
        if (!result.entry_rich) {
          result.entry_rich = text;
        }
        this.pullPronunciation(result, lexicalEntry.pronunciations);
        lexicalEntry.entries && lexicalEntry.entries.forEach((lentry) => {
          this.pullPronunciation(result, lentry.pronunciations);
          const baseWord = this.state.q;
          const variantForms = lentry.variantForms;
          if (variantForms && baseWord && result.entry_rich !== baseWord && variantForms.find((vf) => vf.text === baseWord)) {
            result.entry_rich = this.state.q;
          }
          lentry.senses && lentry.senses.forEach(this.processSense.bind(this, result, { partOfSpeech, short: false, pass: 1 }))
        });
      })
    });

    [{ short: true, pass: 1 as Pass }, { short: false, pass: 2 as Pass },
      { short: true, pass: 2 as Pass }].forEach((pass) => {
      entries.forEach((entry) => {
        entry.lexicalEntries.forEach((lexicalEntry) => {
          const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
          lexicalEntry.entries && lexicalEntry.entries.forEach((lentry) => {
            lentry.senses && lentry.senses.forEach(this.processSense.bind(this, result, { partOfSpeech, ...pass }))
          });
        });
      });
    });

    return <pre>{JSON.stringify(result, undefined, 2)}</pre>;
  }

  private allowed(prop: FlagPropertyNames<IState>, flag: string): Pass {
    let allowed = this.state[prop][flag];
    console.log({prop, flag, allowed});
    if (allowed === undefined) {
      allowed = 1;
      if (typeof flag === "string") {
        setImmediate(() => this.setState(({ [prop]: flags }) => {
          if (flags[flag] === undefined) {
            return { [prop]: { [flag]: allowed, ...flags } } as any;
          }
          return null;
        }));
      }
    }
    return allowed;
  }

  private processSense(result: Partial<IDictionaryEntry>, { partOfSpeech, short, pass }: { partOfSpeech: string, short: boolean, pass: Pass }, sense: ISense) {
    const { pronunciations, subsenses, examples } = sense;
    const definitions = short ? sense.shortDefinitions : sense.definitions;
    this.pullPronunciation(result, pronunciations);
    const passes = [
      this.allowed('allowedPartsOfSpeech', partOfSpeech),
    ...(sense.registers || []).map((e) => e.id).map(this.allowed.bind(this, 'allowedRegisters')),
    ...(sense.domains || []).map((e) => e.id).map(this.allowed.bind(this, 'allowedDomains')),
  ];
    const allowed = Math.min(...passes) > 0;
    const requiredPass = Math.max(...passes);
    if (!allowed || requiredPass !== pass) {
      return;
    }
    definitions && definitions.forEach((definition) => {
      if (needsMoreDefinitions(result, partOfSpeech, short, pass)) {
        result.definitions = result.definitions || {};
        result.definitions[partOfSpeech] = result.definitions[partOfSpeech] || [];
        result.definitions[partOfSpeech].push(definition);
        if (!result.example && examples) {
          result.example = examples[0].text;
        }
      }
    });
    subsenses && subsenses.forEach(this.processSense.bind(this, result, { partOfSpeech, short, pass }));
  }

  private pullPronunciation(result: Partial<IDictionaryEntry>, pronunciations?: IPronunciation[]) {
    if (pronunciations) {
      pronunciations.forEach((p) => {
        if (!result.pronunciation_ipa && p.phoneticNotation === 'IPA') {
          result.pronunciation_ipa = p.phoneticSpelling;
          if (!result.audio_file) {
            result.audio_file = p.audioFile;
          }
        }
      });
    }
  }

  private renderResponse = (entry: IHeadwordEntry, index: number) => {
    const derivativeOf = flatten(compact(entry.lexicalEntries.map((entry) => entry.derivativeOf)));
    return <Card key={`${entry.id}-${index}`}>
      <Card.Header>{entry.word} <Badge>{entry.type}</Badge></Card.Header>
      {derivativeOf.length > 0 && <Card.Header>{derivativeOf.map((dof) => <Button onClick={() => this.setState({ q: dof.id }, this.go)}>{dof.text}</Button>)}</Card.Header>}
      <Card.Body>
        {entry.lexicalEntries.map(this.renderLexicalEntry)}
      </Card.Body>
    </Card>;
  }

  private renderLexicalEntry = (entry: ILexicalEntry, index: number) => {
    return <Row key={index}>
      <Col xs={2}>{entry.lexicalCategory.id}</Col>
      <Col>
        <Row>
          {entry.entries && entry.entries.map(this.renderEntry)}
        </Row>
        <Row className="small">
          <Col as='pre'>
            {JSON.stringify(omit(entry, 'entries'), undefined, 2)}
          </Col>
        </Row>
      </Col>
    </Row>;
  };

  private renderEntry = (entry: IEntry, index: number) => {
    return <Col key={index} as='pre'>
      {JSON.stringify(entry, undefined, 2)}
    </Col>;
  };

  private maybeFollow = () => {
    if (this.state.re && this.state.re.results) {
      const derivativeOf = compact(this.state.re.results.map((result) => result.lexicalEntries.map((entry) => entry.derivativeOf)));
      console.log({ derivativeOf });
    }
  }

  private go = () => {
    const { apiBaseUrl, language, q } = this.state;
    if (!q) {
      return;
    }
    this.fetchMemo.get(`${apiBaseUrl}/words${language ? `/${language}` : ''}?q=${q}`, {
      // bypass: true,
    }).then((json) => {
      console.log({ json });
      return deserialize(RetrieveEntry, json);
    }).then((re) => this.setState({ re }, () => {
      if (!this.state.history.includes(q)) {
        setImmediate(() => this.setState(({ history }) => {
          const newHistory = unique(history.concat(q)).sort();
          return { history: newHistory };
        }))
      }
      this.maybeFollow();
    }));
  }
}
