import compact from "lodash/compact";
import flatten from "lodash/flatten";
import unique from "lodash/intersection";
import merge from "lodash/merge";
import omit from "lodash/omit";
import React from "react";
import Badge, { BadgeProps } from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import { deserialize } from "serializr";
import "./App.css";
import StorageMemo from "./StorageMemo";
import IEntry from "./types/gen/IEntry";
import IHeadwordEntry from "./types/gen/IHeadwordEntry";
import ILexicalEntry from "./types/gen/ILexicalEntry";
import IPronunciation from "./types/gen/IPronunciation";
import ISense from "./types/gen/ISense";
import RetrieveEntry from "./types/gen/RetrieveEntry";
import { OxfordLanguage } from "./types/OxfordDictionariesAPI";

async function fetchJson(url: string) {
  // tslint:disable: variable-name
  const app_id = localStorage.getItem("oed/app_id");
  const app_key = localStorage.getItem("oed/app_key");
  // tslint:enable: variable-name
  if (!app_id || !app_key) {
    throw new Error("missing app id or key");
  }
  const queryResult = await fetch(url, { headers: { Accept: "application/json", app_id, app_key } });
  const result = await queryResult.json();
  return result;
}

interface IProps {

}

enum Pass {
  primary = 1,
  secondary = 2,
  banned = 0,
}

interface IPassMap { [key: string]: Pass; }

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;

  language: OxfordLanguage;
  q?: string;

  history: string[];

  re?: RetrieveEntry;

  allowedPartsOfSpeech: IPassMap;
  allowedRegisters: IPassMap;
  allowedDomains: IPassMap;
}

class WordRecord {
  @observable()
  dictionaryEntry: IDictionaryEntry;
}

type FlagPropertyNames<T> = { [K in keyof Required<T>]: T[K] extends IPassMap ? K : never }[keyof T];

interface IDictionaryEntry {
  entry_rich: string;
  definitions: {
    [partOfSpeech: string]: string[],
  };
  pronunciation_ipa: string;
  audio_file: string;
  example: string;
  etymology: string;
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

const FLAG_PROPS: Array<FlagPropertyNames<IState>> = ["allowedPartsOfSpeech", "allowedRegisters", "allowedDomains"];

interface IResultMetadata {
}

export default class App extends React.Component<IProps, IState> {
  private fetchMemo = new StorageMemo(localStorage, "fetchJson", fetchJson);

  constructor(props: Readonly<IProps>) {
    super(props);
    const interfaceSettings = FLAG_PROPS.map((prop) => {
      const value = localStorage.getItem("oed/passes/" + prop);
      const effective = JSON.parse(value || "{}");
      const result = { [prop]: effective };
      return result;
    });
    const history = JSON.parse(localStorage.getItem("oed/history") || "[]");
    const state0 = merge({
      apiBaseUrl: "/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
      history,
      language: OxfordLanguage.americanEnglish,
      q: sessionStorage.getItem("oed/q") || undefined,
    }, ...interfaceSettings);
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
    const { q } = this.state;
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
                  <Dropdown.Item onClick={() => this.setState({ q }, this.go)}>{q}</Dropdown.Item>,
                )
              }
            </DropdownButton>
          </Form.Group>
        </Form.Row>
      </Form>

      {this.renderFilter("Parts of Speech", "allowedPartsOfSpeech")}
      {this.renderFilter("Registers", "allowedRegisters")}
      {this.renderFilter("Domains", "allowedDomains")}

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
        Object.keys(this.state[prop]).sort().map((flag) => {
          const value = this.state[prop][flag];
          const variants: Array<BadgeProps["variant"]> = ["danger", "light", "secondary", "warning"];
          const variant = variants[value];
          return <Badge variant={variant} onClick={() => this.setState((state) => {
            const flags = state[prop];
            const newFlags: IPassMap = { ...flags, [flag]: (flags[flag] + 1) % 3 as Pass };
            const newState: any = { [prop]: newFlags };
            return newState;
          })}
          >{flag}</Badge>;
        })
      }
      </Col>
    </Row>;
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
        if (lexicalEntry.entries) {
          lexicalEntry.entries.forEach((lentry) => {
            this.pullPronunciation(result, lentry.pronunciations);
            const baseWord = this.state.q;
            const { etymologies, senses, variantForms } = lentry;
            if (variantForms && baseWord && result.entry_rich !== baseWord
              && variantForms.find((vf) => vf.text === baseWord)) {
              result.entry_rich = this.state.q;
            }
            // pass down etymologies so we only take them from entries with first-pass acceptable senses
            if (senses) {
              senses.forEach(this.processSense.bind(
                this, result, { partOfSpeech, short: false, pass: 1, etymologies }));
            }
          });
        }
      });
    });

    [{ short: true, pass: 1 as Pass }, { short: false, pass: 2 as Pass },
    { short: true, pass: 2 as Pass }].forEach((pass) => {
      entries.forEach((entry) => {
        entry.lexicalEntries.forEach((lexicalEntry) => {
          const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
          if (!lexicalEntry.entries) { return; }
          lexicalEntry.entries.forEach((lentry) => {
            const { senses } = lentry;
            if (!senses) { return; }
            senses.forEach(this.processSense.bind(this, result, { partOfSpeech, ...pass }));
          });
        });
      });
    });

    return <pre>{JSON.stringify(result, undefined, 2)}</pre>;
  }

  private allowed(prop: FlagPropertyNames<IState>, flag: string): Pass {
    let allowed = this.state[prop][flag];
    if (allowed === undefined) {
      allowed = Pass.primary;
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

  private processSense(
    result: Partial<IDictionaryEntry>,
    { partOfSpeech, short, pass, etymologies: entryEtymologies }:
      { partOfSpeech: string, short: boolean, pass: Pass, etymologies?: string[] },
    sense: ISense) {
    const { pronunciations, subsenses, examples, etymologies: senseEtymologies } = sense;
    const definitions = short ? sense.shortDefinitions : sense.definitions;
    this.pullPronunciation(result, pronunciations);
    const passes = [
      this.allowed("allowedPartsOfSpeech", partOfSpeech),
      ...(sense.registers || []).map((e) => e.id).map(this.allowed.bind(this, "allowedRegisters")),
      ...(sense.domains || []).map((e) => e.id).map(this.allowed.bind(this, "allowedDomains")),
    ];
    const banned = Math.min(...passes) === 0;
    const requiredPass = Math.max(...passes);
    if (banned || requiredPass !== pass) {
      return;
    }
    const etymologies = entryEtymologies || senseEtymologies;
    if (!result.etymology && etymologies) {
      result.etymology = etymologies[0];
    }
    if (definitions) {
      definitions.forEach((definition) => {
        if (needsMoreDefinitions(result, partOfSpeech, short, pass)) {
          result.definitions = result.definitions || {};
          result.definitions[partOfSpeech] = result.definitions[partOfSpeech] || [];
          result.definitions[partOfSpeech].push(definition);
          if (!result.example && examples) {
            result.example = examples[0].text;
          }
        }
      });
    }
    if (subsenses) {
      subsenses.forEach(this.processSense.bind(this, result, { partOfSpeech, short, pass }));
    }
  }

  private pullPronunciation(result: Partial<IDictionaryEntry>, pronunciations?: IPronunciation[]) {
    if (pronunciations) {
      pronunciations.forEach((p) => {
        if (!result.pronunciation_ipa && p.phoneticNotation === "IPA") {
          result.pronunciation_ipa = p.phoneticSpelling;
          if (!result.audio_file) {
            result.audio_file = p.audioFile;
          }
        }
      });
    }
  }

  private renderResponse = (entry: IHeadwordEntry, index: number) => {
    const derivativeOf = flatten(compact(entry.lexicalEntries.map((lentry) => lentry.derivativeOf)));
    return <Card key={`${entry.id}-${index}`}>
      <Card.Header>{entry.word} <Badge>{entry.type}</Badge></Card.Header>
      {derivativeOf.length > 0 && <Card.Header>{derivativeOf.map((dof) =>
        <Button onClick={() => this.setState({ q: dof.id }, this.go)}>
          {dof.text}
        </Button>)}</Card.Header>}
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
          <Col as="pre">
            {JSON.stringify(omit(entry, "entries"), undefined, 2)}
          </Col>
        </Row>
      </Col>
    </Row>;
  }

  private renderEntry = (entry: IEntry, index: number) => {
    return <Col key={index} as="pre">
      {JSON.stringify(entry, undefined, 2)}
    </Col>;
  }

  private maybeFollow = () => {
    if (this.state.re && this.state.re.results) {
      const derivativeOf = flatten(flatten(flatten(this.state.re.results.map((result) =>
      compact(result.lexicalEntries.map((entry) => entry.derivativeOf)))))).map((re) => re.id);
      if (derivativeOf.length === 1) {
        this.setState({q: derivativeOf[0]}, this.go);
      }
    }
  }

  private go = () => {
    const { apiBaseUrl, language, q } = this.state;
    if (!q) {
      return;
    }
    this.fetchMemo.get(`${apiBaseUrl}/words${language ? `/${language}` : ""}?q=${q}`, {
      // bypass: true,
    }).then((json) => {
      return deserialize(RetrieveEntry, json);
    }).then((re) => this.setState({ re }, () => {
      if (!this.state.history.includes(q)) {
        setImmediate(() => this.setState(({ history }) => {
          const newHistory = unique(history.concat(q)).sort();
          return { history: newHistory };
        }));
      }
      this.maybeFollow();
    }));
  }
}
