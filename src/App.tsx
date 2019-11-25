import _ from "lodash";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import omit from "lodash/omit";
import uniq from "lodash/uniq";
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
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Row from "react-bootstrap/Row";
import "./App.css";
import fetchWord from "./fetchWord";
import { ITags } from "./IWordRecord";
import { arraySetAdd, arraySetHas, PropertyNamesOfType } from "./Magic";
import OxfordDictionariesPipeline, {
  FlagPropertyNames, IPassMap, IPipelineConfig,
} from "./OxfordDictionariesPipeline";
import Pass from "./Pass";
import PassComponent from "./PassComponent";
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
  hidden: string[];
  records: WordRecord[];

  re?: IRetrieveEntry;

  config: IPipelineConfig;
}

type ConfigFlagPropertyNames = FlagPropertyNames<IState["config"]>;

const FLAG_PROPS: ConfigFlagPropertyNames[] = [
  "allowedPartsOfSpeech",
  "allowedGrammaticalFeatures",
  "allowedRegisters",
  "allowedDomains",
];

@observer
export default class App extends React.Component<IProps, IState> {
  public static stylesheet?: CSSStyleSheet;
  private static highlightedTag?: string;
  private static ruleIndex: Map<string, CSSStyleRule> = new Map();

  @observable
  private busy: string[] = [];

  constructor(props: Readonly<IProps>) {
    super(props);
    const config: IPipelineConfig = {
      allowedDomains: {},
      allowedGrammaticalFeatures: {},
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
    const history: string[] = uniq(JSON.parse(localStorage.getItem("oed/history") || "[]"));
    const hidden: string[] = uniq(JSON.parse(localStorage.getItem("oed/hidden") || "[]"));
    this.state = {
      apiBaseUrl: "/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
      config,
      hidden,
      history,
      language: OxfordLanguage.americanEnglish,
      q: sessionStorage.getItem("oed/q") || undefined,
      records: [],
    };
  }

  public componentDidMount() {
    if (App.stylesheet === undefined) {
      const sheet = document.createElement("style");
      document.body.appendChild(sheet);
      setImmediate(() => {
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < document.styleSheets.length; i++) {
          const ss = document.styleSheets[i];
          if (!ss.href && ss.ownerNode.childNodes.length === 0) {
            App.stylesheet = ss as CSSStyleSheet;
          }
        }
      });
    }
    let cont: (history: string[]) => Promise<void> | undefined;
    cont = (history: string[]) => {
      if (history.length > 0) {
        return this.get(history.shift()!).then((re) => {
          if (history.length > 0) {
            setImmediate(cont, history);
          }
        });
      } else {
        if (this.state.q) {
          this.go();
        }
      }
    };
    cont([...this.state.history.slice(-10)].sort());
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
      <Row>
        <Col>
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
                    [...this.state.history].sort().map((q) =>
                      <Dropdown.Item key={q} onClick={() => this.setState({ q }, this.go)}>{q}</Dropdown.Item>,
                    )
                  }
                </DropdownButton>
              </Form.Group>
            </Form.Row>
          </Form>
        </Col>
      </Row>

      {this.renderFilter("Parts of Speech", "allowedPartsOfSpeech")}
      {this.renderFilter("Grammatical Features", "allowedGrammaticalFeatures")}
      {this.renderFilter("Registers", "allowedRegisters")}
      {this.renderFilter("Domains", "allowedDomains")}

      {/* {this.state.re && this.state.re.results &&
        <Row>
          <Col>
            <pre>{
              JSON.stringify(
                new OxfordDictionariesPipeline(this.state.q!, this.state.re.results, this.allowed)
                  .process(), undefined, 2)
            }
            </pre>
          </Col>
        </Row>
      } */}

      <Row><Col><WordTable records={this.state.records} TagControl={this.TagControl} /></Col></Row>

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
        setImmediate(() => this.setState((state) => {
          let { config } = state;
          let { [prop]: flags } = config;
          if (flags[flag] === undefined) {
            flags = { [flag]: allowed, ...flags };
            config = { ...config, [prop]: flags };
            return { config };
          }
          return null;
        }));
      } else {
        // tslint:disable-next-line:no-console
        console.error("Flag is not a string", flag);
      }
    }
    return allowed;
  }

  private onEnterBadge = (tag: string) => {
    if (App.stylesheet) {
      if (App.highlightedTag === tag) {
        return;
      }
      let rule = App.ruleIndex.get(tag);
      if (rule === undefined) {
        const ruleIndex = App.stylesheet.insertRule(`.tag-${tag} {}`);
        rule = App.stylesheet.rules.item(ruleIndex) as CSSStyleRule;
        App.ruleIndex.set(tag, rule);
        // tslint:disable-next-line:no-console
        console.log({ op: "tag not in ruleIndex", tag, rule, ruleIndex });
      } else {
        // tslint:disable-next-line:no-console
        console.log({ op: "tag in ruleIndex", tag, rule });
      }
      if (App.highlightedTag) {
        const highlightedRule = App.ruleIndex.get(App.highlightedTag);
        if (highlightedRule) {
          highlightedRule.style.outline = "";
          rule.style.backgroundColor = null;
        }
      }
      if (rule) {
        rule.style.outline = "5px solid #ffff0044";
        rule.style.backgroundColor = "#ffff0088";
      }
    }
  }

  private onExitBadge = (tag: string) => {
    if (App.highlightedTag === tag) {
      App.highlightedTag = undefined;
    }
    if (App.stylesheet) {
      const rule = App.ruleIndex.get(tag);
      if (rule !== undefined) {
        rule.style.outline = "";
        rule.style.backgroundColor = null;
      }
    }
  }

  private renderFilter(label: string, prop: ConfigFlagPropertyNames): React.ReactNode {
    const flags = Object.keys(this.state.config[prop]).sort();
    return <Row>
      <Col xs={4}>
        <Form.Label>{label}</Form.Label>
      </Col>
      <Col>
        {flags.map((flag) => <this.TagControl key={`${prop}${flag}`} prop={prop} flag={flag} />)}
      </Col>
    </Row>;
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
    const { q } = this.state;
    if (!q) {
      return;
    }
    this.setState((state) => {
      if (arraySetAdd(state, "history", q, "mru")) {
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
        let records = state.records;
        if (!records.find((e) => e.q === q)) {
          const pipeline = new OxfordDictionariesPipeline(q, re.results || [], this.allowed);
          const wr = new WordRecord(q, re, pipeline);
          records = records.sort((a, b) => a.q.localeCompare(b.q));
          records.unshift(wr);
        }
        return { records: state.records };
      });
      return re;
    } finally {
      _.pull(this.busy, q);
    }
  }

  private TagControl = ({ prop, flag }: {
    prop: PropertyNamesOfType<IPipelineConfig, IPassMap>,
    flag: keyof IPassMap & string,
  }) => {
    const value = this.state.config[prop][flag];
    let realName: keyof ITags;
    switch (prop) {
      case "allowedDomains":
        realName = "domains";
        break;
      case "allowedPartsOfSpeech":
        realName = "partOfSpeech";
        break;
      case "allowedGrammaticalFeatures":
        realName = "grammaticalFeatures";
        break;
      case "allowedRegisters":
        realName = "registers";
        break;
      default:
        throw new Error(prop);
    }
    const variants: Array<BadgeProps["variant"]> = ["danger", "light", "secondary", "warning"];
    const variant = variants[value];
    const key = `app-${realName}-${prop}`;
    return <OverlayTrigger
      trigger="click"
      rootClose={true}
      key={key}
      overlay={<Popover id={key}>
        <Popover.Content>
          <PassComponent value={value} change={(newValue) =>
            this.setState((state) => {
              const flags = state.config[prop];
              const newFlags: IPassMap = { ...flags, [flag]: newValue };
              const newState = { config: { ...state.config, [prop]: newFlags } };
              return newState;
            })
          } />
        </Popover.Content>
      </Popover>}>
      <Badge variant={variant}>{flag}</Badge>
    </OverlayTrigger>;
    // const variants: Array<BadgeProps["variant"]> = ["danger", "light", "secondary", "warning"];
    // const variant = variants[value];
    // return <Badge variant={variant}
    //   onMouseEnter={() => this.onEnterBadge(flag)}
    //   onMouseLeave={() => this.onExitBadge(flag)}
    //   onClick={() => this.setState((state) => {
    //     const flags = state.config[prop];
    //     const newFlags: IPassMap = { ...flags, [flag]: (flags[flag] + 1) % 3 as Pass };
    //     const newState = { config: { ...state.config, [prop]: newFlags } };
    //     return newState;
    //   }, () => {
    //     this.state.records.forEach((record) => {
    //       const hasIt = arraySetHas(record.allTags, realName, flag);
    //       if (hasIt) {
    //         // tslint:disable-next-line:no-console
    //         console.log({ record, hasIt, what: flag });
    //         record.refresh();
    //       }
    //     });
    //   })}>{flag}</Badge>;
  }
}

export type TagControlFactory = App["TagControl"];
