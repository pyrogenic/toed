// import _ from "lodash";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";
import pull from "lodash/pull";
import sample from "lodash/sample";
import uniq from "lodash/uniq";
import without from "lodash/without";
import {observable} from "mobx";
import {observer} from "mobx-react";
import React from "react";
import Badge, {BadgeProps} from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Row from "react-bootstrap/Row";
import "./App.css";
import badWords from "./badWords";
import defaultConfig from "./default.od3config.json";
import fetchWord from "./fetchWord";
import {ITags} from "./IWordRecord";
import {arraySetAdd, ensure, ensureArray, ensureMap, PropertyNamesOfType} from "./Magic";
import OxfordDictionariesPipeline, {
  FlagPropertyNames,
  IPassMap,
  IPipelineConfig,
  PartialWordRecord
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

interface IStringMap { [key: string]: string[]; }

interface ITagCrossReference {
  partsOfSpeech: IStringMap;
  grammaticalFeatures: IStringMap;
  registers: IStringMap;
  domains: IStringMap;
}

interface IProps {

}

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;

  language: OxfordLanguage;
  q?: string;
  busy: number;

  history: string[];
  hidden: string[];
  records: WordRecord[];

  re?: IRetrieveEntry;

  config: IPipelineConfig;
  xref: ITagCrossReference;
}

type ConfigFlagPropertyNames = FlagPropertyNames<IState["config"]>;

const FLAG_PROPS: ConfigFlagPropertyNames[] = [
  "allowedPartsOfSpeech",
  "allowedGrammaticalFeatures",
  "allowedRegisters",
  "allowedDomains",
];

type XrefFlagPropertyNames = PropertyNamesOfType<IState["xref"], IStringMap>;

const XREF_PROPS: XrefFlagPropertyNames[] = [
  "partsOfSpeech",
  "grammaticalFeatures",
  "registers",
  "domains",
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
    const xref: ITagCrossReference = {
      domains: {},
      grammaticalFeatures: {},
      partsOfSpeech: {},
      registers: {},
    };
    FLAG_PROPS.forEach((prop) => {
      const value = localStorage.getItem("oed/passes/" + prop);
      if (value) {
        try {
          config[prop] = JSON.parse(value);
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.error(e);
        }
      }
    });
    XREF_PROPS.forEach((prop) => {
      const value = localStorage.getItem("oed/xref/" + prop);
      if (value) {
        try {
          xref[prop] = JSON.parse(value);
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
      busy: 0,
      config,
      hidden,
      history,
      language: OxfordLanguage.americanEnglish,
      q: sessionStorage.getItem("oed/q") || undefined,
      records: [],
      xref,
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
    // this.lookup(...this.state.history);
  }

  public componentDidUpdate() {
    FLAG_PROPS.forEach((prop) => {
      localStorage.setItem("oed/passes/" + prop, JSON.stringify(this.state.config[prop] || {}));
    });
    XREF_PROPS.forEach((prop) => {
      localStorage.setItem("oed/xref/" + prop, JSON.stringify(this.state.xref[prop] || {}));
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
    const loaded = this.state.records.map(({q}) => q);
    const history = without(this.state.history, ...loaded);
    return <>
      <Navbar bg="light" expand="lg">
        <Navbar.Brand href="#home">OD³</Navbar.Brand>
        <Navbar.Text> Dictionaries Definition Distiller</Navbar.Text>
        <Navbar.Toggle aria-controls="nav" />
        <Navbar.Collapse id="nav">
          <NavDropdown title="Keys" id="nav-import" as={Button}>
            <Container>
              <Form>
                <Form.Group>
                  <Form.Label>App ID</Form.Label>
                  <Form.Control
                    placeholder="App ID"
                    value={this.state.app_id || undefined}
                    style={{ fontFamily: "monospace" }}
                    onChange={(e: any) => this.setState({ app_id: e.target.value })} />
                </Form.Group>
                <Form.Group>
                  <Form.Label>App Key</Form.Label>
                  <Form.Control
                    placeholder="App Key"
                    value={this.state.app_key || undefined}
                    style={{ fontFamily: "monospace" }}
                    onChange={(e: any) => this.setState({ app_key: e.target.value })} />
                </Form.Group>
              </Form>
            </Container>
          </NavDropdown>
          <NavDropdown title="Config" id="nav-config">
            <Container>
              <ConfigImportBox
                currentConfig={this.state.config}
                setConfig={(config) => this.setState({ config })} />
            </Container>
            {/*{FLAG_PROPS.map((prop) => <NavDropdown.Item*/}
            {/*    onClick={() =>*/}
            {/*        console.log({[prop]: this.state.config[prop]})}*/}
            {/*    href={"#" + prop}>{prop.replace("allowed", "")}*/}
            {/*</NavDropdown.Item>)}*/}
          </NavDropdown>
          <Nav className="mr-auto" />
            <NavDropdown id="nav-history" title={`History${history.length > 0 ? ` (${history.length})` : ""}`} disabled={history.length === 0}>
              {
                history.sort().map((q) =>
                    <Dropdown.Item key={q} onClick={() => this.setState({ q }, this.go)}>{q}</Dropdown.Item>,
                )
              }
            </NavDropdown>
          <Navbar.Text>
            <ButtonGroup className="mr-2">
              {[1, 2, 10, 100, 1000].map((n) =>
                  history.length >= n && <Button
                      key={n}
                      variant="outline-secondary"
                      onClick={() =>
                      this.lookup(...history.slice(-n))}>{n}</Button>)}
              {history.length > 0 && <Button
                  variant="outline-secondary"
                  onClick={() => this.lookup(...history)}>All</Button>}
              {/*{    const seen = this.state.history; // records.map((e) => e.q);*/}
              {/*  const badWordsRemaining = without(badWords, ...seen);*/}
              {/*  const badWord = sample(badWordsRemaining);*/}
              {/*}*/}
              {/*{badWordsRemaining.length > 0 && <Button onClick={() => this.lookup(...badWordsRemaining.slice(-10))}>Next 10 Bad Words</Button>}*/}
              {/*{badWord && <Button onClick={() => this.setState({ q: badWord }, this.go)}>{badWord}</Button>}*/}
            </ButtonGroup>
          </Navbar.Text>
          <Form inline={true}>
            <InputGroup>
              <Form.Control placeholder="word" value={this.state.q}
                onChange={(e: any) => this.setState({ q: e.target.value ? e.target.value : undefined })} />
              <InputGroup.Append>
                <Button
                    onClick={this.go} variant="outline-primary"
                    disabled={!this.state.q || this.state.q.length < 2}>Look Up</Button>
              </InputGroup.Append>
            </InputGroup>
          </Form>
        </Navbar.Collapse>
      </Navbar>
      <Container>
        <Row>
          <Col>
            <Form inline={true}>
              <Form.Row>
                <Col>
                </Col>
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
      </Container>
    </>;
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

  public processed = (query: string, record: PartialWordRecord) => {
    const {allTags} = record;
    if (allTags) {
      this.setState(({xref}) => {
        Object.entries(allTags).forEach(([tagType, tags]) =>
            tags?.forEach((tag) => {
              const tagTypeXref = ensureMap(xref, tagType as keyof ITags);
              if (tag) {
                arraySetAdd(tagTypeXref, tag, query, true);
              }
            }));
        return {xref};
      });
    }
  }

  private toggleFocus = (tag: string) => {
    (App.highlightedTag === tag ? this.onExitBadge : this.onEnterBadge)(tag);
    // // tslint:disable-next-line:no-console
    // console.log("highlightedTag", App.high);
    // this.forceUpdate();
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
        // console.log({ op: "tag not in ruleIndex", tag, rule, ruleIndex });
      } else {
        // tslint:disable-next-line:no-console
        // console.log({ op: "tag in ruleIndex", tag, rule });
      }
      if (App.highlightedTag) {
        const highlightedRule = App.ruleIndex.get(App.highlightedTag);
        if (highlightedRule) {
          highlightedRule.style.outline = "";
          rule.style.backgroundColor = "inherit";
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
        rule.style.backgroundColor = "inherit";
      }
    }
  }

  private renderFilter(label: string, prop: ConfigFlagPropertyNames): React.ReactNode {
    const config = this.state.config[prop];
    return <FilterRow label={label} prop={prop} config={config} TagControl={this.TagControl} />;
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

  private lookup = (...words: string[]) => {
    this.setState(({busy}) => ({busy: busy + 1}),
        () => this.continueLookup([...words])
            .then(() => this.setState(({busy}) => ({busy: busy - 1}))));
  }

  private continueLookup = async (words: string[]) => {
    const word = words.shift();
    if (word !== undefined) {
      await this.get(word);
      setImmediate(this.continueLookup, words);
    }
  }

  private go = () => {
    const { q } = this.state;
    if (!q) {
      return;
    }
    const queryWords = q.split(/\W+/) || [];
    if (queryWords.length > 1) {
      return this.continueLookup(queryWords);
    }
    this.get(q).then((re) =>
        this.setState(({history}) => {
          arraySetAdd({history}, "history", q, "mru");
          return {re, history};
        }));
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
          const pipeline = new OxfordDictionariesPipeline(q, re.results || [], this.allowed, this.processed);
          const wr = new WordRecord(q, re, pipeline);
          records = records.sort((a, b) => a.q.localeCompare(b.q));
          records.unshift(wr);
        }
        return { records: state.records };
      });
      return re;
    } finally {
      pull(this.busy, q);
    }
  }

  private TagControl = ({ prop, flag, value }: {
    prop: PropertyNamesOfType<IPipelineConfig, IPassMap>,
    flag: keyof IPassMap & string,
    value?: Pass,
  }) => {
    value = value ?? this.state.config[prop][flag];
    let realName: keyof ITags;
    switch (prop) {
      case "allowedPartsOfSpeech":
        realName = "partsOfSpeech";
        break;
      case "allowedDomains":
        realName = "domains";
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
    const key = `${realName}-${flag}`;
    const xref = this.state.xref[realName][flag];
    return <OverlayTrigger
      trigger="click"
      rootClose={true}
      key={key}
      overlay={<Popover id={key}>
        <Popover.Content>
          <PassComponent
            value={value}
            xref={xref}
            focus={App.highlightedTag === flag}
            toggleFocus={this.toggleFocus.bind(this, flag)}
            change={(newValue) =>
              this.setState((state) => {
                const flags = state.config[prop];
                const newFlags: IPassMap = { ...flags, [flag]: newValue };
                const newState = { config: { ...state.config, [prop]: newFlags } };
                return newState;
              })}
            lookup={this.lookup}
          />
        </Popover.Content>
      </Popover>}>
      <TagBadge pass={value}><Badge variant="light">{xref?.length}</Badge> {flag}</TagBadge>
    </OverlayTrigger>;
  }
}

export type TagControlFactory = App["TagControl"];

type PrefixUnion<A, B> = A & Omit<B, keyof A>;

type ITagBadgeProps = PrefixUnion<{pass: Pass, flag?: string}, React.HTMLAttributes<HTMLSpanElement>>;

function TagBadge(props: ITagBadgeProps) {
  const {pass, flag, children} = props;
  return <Badge variant={variantForPass(pass)} {...props}>{flag}{children}</Badge>;
}

function variantForPass(value: Pass): BadgeProps["variant"] {
  const variants: Array<BadgeProps["variant"]> = ["danger", "light", "secondary", "warning"];
  return variants[value];
}

function FilterRow({ label, config, prop, TagControl }:
  { label: string, prop: ConfigFlagPropertyNames, config: IPassMap, TagControl: TagControlFactory; }) {
    const [open, setOpen] = React.useState(false);
    const flags = Object.keys(config).sort();
    let hidden = 0;
    return <Row>
    <Col xs={3}>
      <Form.Label>{label}</Form.Label>
    </Col>
    <Col className="tags">
      {flags.map((flag) => {
        const value = config[flag];
        if (!open && value === Pass.primary) {
          hidden++;
          return false;
        }
        return <TagControl prop={prop} flag={flag} value={value} />;
      })}
    </Col>
    <Col xs={2} className="tags">
    <TagBadge
        pass={Pass.primary}
        onClick={() => setOpen(!open)}>
          {open ? "hide acceptable tags" : <><Badge variant="secondary">{hidden}</Badge> acceptable tags</>}
        </TagBadge>
    </Col>
  </Row>;
}

function ConfigImportBox({ currentConfig, setConfig }: {
  currentConfig: IPipelineConfig,
  setConfig(config: IPipelineConfig): void,
}) {
  const [value, setValue] = React.useState(stringify(currentConfig));
  const [configError, setConfigError] = React.useState<{ config?: IPipelineConfig, error?: Error; }>({});
  React.useEffect(() => {
    try {
      setConfigError({ config: JSON.parse(value) });
    } catch (error) {
      setConfigError({ error });
    }
  }, [value]);
  const { config, error } = configError;
  const inputArea = <Col>
    <Form.Control
      as="textarea"
      rows={10}
      cols={24}
      value={value}
      onChange={(e: React.SyntheticEvent<HTMLInputElement>) => setValue(e.currentTarget.value)} />
  </Col>;
  const isDefault = !error && isEqual(config, defaultConfig);
  const isCurrent = isEqual(config, currentConfig);
  const toolbar = <Col as={ButtonToolbar}>
    <Button
      as="a"
      variant="link"
      href={`data:application/json,${value}`}
      download="current.od3config.json">
      Export
    </Button>
    <Button
      size="sm"
      variant={isDefault ? "primary" : "warning"}
      disabled={isDefault}
      onClick={() => setValue(stringify(defaultConfig))}
    >
      Default
    </Button>
    <ButtonGroup>
    <Button
        size="sm"
        variant="outline-primary"
        disabled={isCurrent}
        onClick={() => setValue(stringify(currentConfig))}
      >
        Undo
      </Button>
    <Button
      size="sm"
      disabled={!!error || isEqual(config, currentConfig)}
      title={error ? error.message : undefined}
      onClick={() => config && setConfig(config)}>
      Save
    </Button>
    </ButtonGroup>
  </Col>;

  return <>
    <Row className="mb-2">
      {inputArea}
    </Row>
    <Row>
      {toolbar}
    </Row>
  </>;
}
function stringify(currentConfig: IPipelineConfig): string | (() => string) {
  return JSON.stringify(currentConfig, null, 4);
}
