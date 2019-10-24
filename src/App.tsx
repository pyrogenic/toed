import React from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
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
import ILexicalEntry from './types/gen/ILexicalEntry';
import IEntry from './types/gen/IEntry';
import IPronunciation from './types/gen/IPronunciation';
import ISense from './types/gen/ISense';

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

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;

  language: OxfordLanguage;
  q?: string;

  re?: RetrieveEntry;

  allowedPartsOfSpeech: { [partOfSpeech: string]: boolean };
}

interface IDictionaryEntry {
  entry_rich: string;
  definitions: {
    [partOfSpeech: string]: string[],
  },
  pronunciation_ipa: string,
  audio_file: string,
  example: string,
}

function needsMoreDefinitions(result: Partial<IDictionaryEntry>, partOfSpeech: string) {
  if (!result.definitions) {
    return true;
  } else if (!result.definitions[partOfSpeech]) {
    return Object.keys(result.definitions).length < 2;
  } else {
    return result.definitions[partOfSpeech].length < 2;
  }
}

export default class App extends React.Component<IProps, IState> {
  private fetchMemo = new StorageMemo(localStorage, "fetchJson", fetchJson);

  constructor(props: Readonly<IProps>) {
    super(props);
    const interfaceSettings: Partial<IState> = JSON.parse(sessionStorage.getItem("oed/interface") || "{}");
    this.state = {
      apiBaseUrl: "/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
      language: OxfordLanguage.americanEnglish,
      q: sessionStorage.getItem("oed/q") || undefined,
      allowedPartsOfSpeech: {},
      ...interfaceSettings,
    };
  }

  public componentDidMount() {
    if (this.state.q) {
      this.go();
    }
  }

  public componentDidUpdate() {
    sessionStorage.setItem("oed/interface", JSON.stringify(pick(this.state, 'allowedPartsOfSpeech')));
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
    if (this.state.q && this.state.re && this.state.re.results) {
      sessionStorage.setItem("oed/q", this.state.q);
    } else {
      localStorage.removeItem("oed/q");
    }
  }

  public render() {
    return <Container>
      <Form>
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
          <Form.Control placeholder="Search" value={this.state.q}
            onChange={(e: any) => this.setState({ q: e.target.value ? e.target.value : undefined })} />
          {
            Object.keys(this.state.allowedPartsOfSpeech).sort().map((partOfSpeech) =>
              <Form.Check inline={true} label={partOfSpeech} checked={this.state.allowedPartsOfSpeech[partOfSpeech] === true}
                onChange={() =>
                  this.setState(({ allowedPartsOfSpeech }) =>
                    ({ allowedPartsOfSpeech: { ...allowedPartsOfSpeech, [partOfSpeech]: !allowedPartsOfSpeech[partOfSpeech] } })
                  )}
              />)
          }
          <Button onClick={this.go} disabled={!this.state.q || this.state.q.length < 2}>Go</Button>
        </Form.Row>
      </Form>
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

  private renderResult = (entries: IHeadwordEntry[]) => {
    const result: Partial<IDictionaryEntry> = {};
    entries.forEach((entry) => {
      const { pronunciations } = entry;
      this.pullPronunciation(result, pronunciations);
      entry.lexicalEntries.forEach((lexicalEntry) => {
        const { lexicalCategory: { id: partOfSpeech }, text } = lexicalEntry;
        if (!result.entry_rich) {
          result.entry_rich = text;
        }
        this.pullPronunciation(result, lexicalEntry.pronunciations);
        lexicalEntry.entries && lexicalEntry.entries.forEach((lentry) => {
          this.pullPronunciation(result, lentry.pronunciations);
          const baseWord = this.state.q;
          const variantForms = lentry.variantForms;
          console.log({variantForms, baseWord, entry_rich: result.entry_rich});
          if (variantForms && baseWord && result.entry_rich !== baseWord && variantForms.find((vf) => vf.text === baseWord)) {
            result.entry_rich = this.state.q;
          }
          lentry.senses && lentry.senses.forEach(this.processSense.bind(this, result, { partOfSpeech, short: false }))
        });
      })
    });
    entries.forEach((entry) => {
      entry.lexicalEntries.forEach((lexicalEntry) => {
        const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
        lexicalEntry.entries && lexicalEntry.entries.forEach((lentry) => {
          lentry.senses && lentry.senses.forEach(this.processSense.bind(this, result, { partOfSpeech, short: true }))
        });
      })
    });

    return <pre>{JSON.stringify(result, undefined, 2)}</pre>;
  }

  private addPartOfSpeech(partOfSpeech: string) {
    setImmediate(() => this.setState(({ allowedPartsOfSpeech }) => {
      if (allowedPartsOfSpeech[partOfSpeech] === undefined) {
        return { allowedPartsOfSpeech: { [partOfSpeech]: true, ...allowedPartsOfSpeech } };
      }
      return null;
    }));
  }

  private processSense(result: Partial<IDictionaryEntry>, { partOfSpeech, short }: { partOfSpeech: string, short: boolean }, sense: ISense) {
    const { pronunciations, subsenses, examples } = sense;
    const definitions = short ? sense.shortDefinitions : sense.definitions;
    this.pullPronunciation(result, pronunciations);
    let allowed = this.state.allowedPartsOfSpeech[partOfSpeech];
    if (allowed === undefined) {
      allowed = true;
      this.addPartOfSpeech(partOfSpeech);
    }
    allowed && definitions && definitions.forEach((definition) => {
      if (needsMoreDefinitions(result, partOfSpeech)) {
        result.definitions = result.definitions || {};
        result.definitions[partOfSpeech] = result.definitions[partOfSpeech] || [];
        result.definitions[partOfSpeech].push(definition);
        if (!result.example && examples) {
          result.example = examples[0].text;
        }
      }
    });
    subsenses && subsenses.forEach(this.processSense.bind(this, result, { partOfSpeech, short }));
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
    }).then((re) => this.setState({ re }, this.maybeFollow))
  }
}
