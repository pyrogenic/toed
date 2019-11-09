import _ from "lodash";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import omit from "lodash/omit";
import { observable } from "mobx";
import { observer } from "mobx-react";
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
import "./App.css";
import fetchWord from "./fetchWord";
import { arraySetAdd } from "./Magic";
import OxfordDictionariesPipeline, {
  FlagPropertyNames, IPassMap, IPipelineConfig,
} from "./OxfordDictionariesPipeline";
import Pass from "./Pass";
import IEntry from "./types/gen/IEntry";
import IHeadwordEntry from "./types/gen/IHeadwordEntry";
import ILexicalEntry from "./types/gen/ILexicalEntry";
import IRetrieveEntry from "./types/gen/IRetrieveEntry";
import OxfordLanguage from "./types/OxfordLanguage";
import WordRecord from "./WordRecord";
import WordTable from "./WordTable";

interface IProps {

}

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;

  language: OxfordLanguage;
  q?: string;

  history: string[];
  records: WordRecord[];

  re?: IRetrieveEntry;

  config: IPipelineConfig;
}

type ConfigFlagPropertyNames = FlagPropertyNames<IState["config"]>;

const FLAG_PROPS: ConfigFlagPropertyNames[] = ["allowedPartsOfSpeech", "allowedRegisters", "allowedDomains"];

@observer
export default class App extends React.Component<IProps, IState> {
  @observable
  private busy: string[] = [];

  constructor(props: Readonly<IProps>) {
    super(props);
    const config: IPipelineConfig = {
      allowedDomains: {},
      allowedPartsOfSpeech: {},
      allowedRegisters: {},
    };
    FLAG_PROPS.forEach((prop) => {
      const value = localStorage.getItem("oed/passes/" + prop);
      if (value) {
        try {
          const effective = JSON.parse(value);
          config[prop] = effective;
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.error(e);
        }
      }
    });
    const history = JSON.parse(localStorage.getItem("oed/history") || "[]");
    this.state = {
      apiBaseUrl: "/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
      config,
      history,
      language: OxfordLanguage.americanEnglish,
      q: sessionStorage.getItem("oed/q") || undefined,
      records: [],
    };
  }

  public componentDidMount() {
    let cont: (history: string[]) => Promise<void> | undefined;
    cont = (history: string[]) => {
      // tslint:disable-next-line:no-console
      console.log({ history });
      if (history.length > 0) {
        return this.get(history.shift()!).then((re) => {
          // tslint:disable-next-line:no-console
          console.log({ done: re.results ? re.results[0].word : "not found" });
          if (history.length > 0) {
            cont(history);
          }
        });
      } else {
        if (this.state.q) {
          this.go();
        }
      }
    };
    cont([...this.state.history]);
  }

  public componentDidUpdate() {
    FLAG_PROPS.forEach((prop) => {
      localStorage.setItem("oed/passes/" + prop, JSON.stringify(this.state.config[prop] || {}));
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
          <Form.Group as={Col}>
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

      {this.state.re && this.state.q && this.state.re.results &&
        <Row>
          <Col>
            <pre>{
              JSON.stringify(
                new OxfordDictionariesPipeline(this.state.q, this.state.re.results, this.allowed)
                  .process(), undefined, 2)
            }
            </pre>
          </Col>
        </Row>
      }

      <Row><Col><WordTable records={this.state.records} /></Col></Row>

      <Row>
        <Col>
          {this.state.re && this.state.re.results && this.state.re.results.map(this.renderResponse)}
        </Col>
      </Row>
    </Container>;
  }

  public allowed = (prop: ConfigFlagPropertyNames, flag: string): Pass => {
    let allowed = this.state.config[prop][flag];
    if (allowed === undefined) {
      allowed = Pass.primary;
      if (typeof flag === "string") {
        setImmediate(() => this.setState(({ config: { [prop]: flags } }) => {
          if (flags[flag] === undefined) {
            return { [prop]: { [flag]: allowed, ...flags } } as any;
          }
          return null;
        }));
      }
    }
    return allowed;
  }

  private renderFilter(label: string, prop: ConfigFlagPropertyNames): React.ReactNode {
    return <Row>
      <Col xs={3}>
        <Form.Label>{label}</Form.Label>
      </Col>
      <Col>{
        Object.keys(this.state.config[prop]).sort().map((flag) => {
          const value = this.state.config[prop][flag];
          const variants: Array<BadgeProps["variant"]> = ["danger", "light", "secondary", "warning"];
          const variant = variants[value];
          return <Badge variant={variant} onClick={() => this.setState((state) => {
            const flags = state.config[prop];
            const newFlags: IPassMap = { ...flags, [flag]: (flags[flag] + 1) % 3 as Pass };
            const newState = { config: { ...state.config, [prop]: newFlags } };
            return newState;
          }, this.refreshRecords)}
          >{flag}</Badge>;
        })
      }
      </Col>
    </Row>;
  }

  private refreshRecords = () => {
    this.state.records.forEach((record) => record.refresh());
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

  private derivativeOf = (results?: IHeadwordEntry[]) => {
    if (results) {
      const derivativeOf = flatten(flatten(flatten(results.map((result) =>
        compact(result.lexicalEntries.map((entry) => entry.derivativeOf)))))).map((re) => re.id);
      if (derivativeOf.length === 1) {
        return derivativeOf[0];
      }
    }
  }

  private go = () => {
    const { apiBaseUrl, language, q } = this.state;
    if (!q) {
      return;
    }
    this.setState((state) => {
      if (arraySetAdd(state, "history", q, true)) {
        return { history: state.history };
      }
      return null;
    }, () => this.get(q).then((re) => this.setState({ re })));
  }

  private get = async (q: string, redirect?: string): Promise<IRetrieveEntry> => {
    const { apiBaseUrl, language } = this.state;
    this.busy.push(q);
    try {
      const re = await fetchWord(apiBaseUrl, language, redirect || q);
      redirect = this.derivativeOf(re.results);
      if (redirect) {
        return this.get(q, redirect);
      }
      this.setState((state) => {
        if (!state.records.find((e) => e.q === q)) {
          const pipeline = new OxfordDictionariesPipeline(q, re.results || [], this.allowed);
          const wr = new WordRecord(q, re, pipeline);
          state.records.push(wr);
        }
        return { records: state.records };
      });
      return re;
    } finally {
      _.pull(this.busy, q);
    }
  }
}
