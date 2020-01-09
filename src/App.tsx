// import _ from "lodash";
import cloneDeep from "lodash/cloneDeep";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import isEqual from "lodash/isEqual";
import kebabCase from "lodash/kebabCase";
import omit from "lodash/omit";
import sortedIndexBy from "lodash/sortedIndexBy";
import uniq from "lodash/uniq";
import without from "lodash/without";
import React from "react";
import Badge, { BadgeProps } from "react-bootstrap/Badge";
import Button, { ButtonProps } from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Collapse from "react-bootstrap/Collapse";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import FormCheck from "react-bootstrap/FormCheck";
import InputGroup from "react-bootstrap/InputGroup";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavbarBrand from "react-bootstrap/NavbarBrand";
import NavDropdown from "react-bootstrap/NavDropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Row from "react-bootstrap/Row";
import "./App.css";
import badWords from "./badWords";
import defaultConfig from "./default.od3config.json";
import Focus, { FocusIcons } from "./Focus";
import Icon from "./Icon";
import IWordRecord, { ITags } from "./IWordRecord";
import Lookup, { CacheMode, ILookupProps } from "./Lookup";
import {
  arraySetAdd,
  arraySetHas,
  arraySetRemove,
  arraySetToggle,
  ensureMap,
  peek,
  PropertyNamesOfType,
  titleCase,
} from "./Magic";
import Marks from "./Marks";
import OpenIconicNames from "./OpenIconicNames";
import OpTrack from "./OpTrack";
import OxfordDictionariesPipeline,
{
  AnnotatedHeadwordEntry,
  IPassMap,
  IPipelineConfig,
  PartialWordRecord,
  fillInTags,
} from "./OxfordDictionariesPipeline";
import Pass from "./Pass";
import PassComponent from "./PassComponent";
import IEntry from "./types/gen/IEntry";
import IHeadwordEntry from "./types/gen/IHeadwordEntry";
import ILexicalEntry from "./types/gen/ILexicalEntry";
import IRetrieveEntry from "./types/gen/IRetrieveEntry";
import RetrieveEntry from "./types/gen/RetrieveEntry";
import OxfordLanguage from "./types/OxfordLanguage";
import WordRecord from "./WordRecord";
import WordTable from "./WordTable";
import jqxzWordsUrl from "./wwf/jqxzWords.txt";
import threeLetterWordsUrl from "./wwf/threeLetterWords.txt";
import twoLetterWordsUrl from "./wwf/twoLetterWords.txt";

interface IStringMap { [key: string]: string[]; }

type ITagCrossReference = { [K in keyof IPipelineConfig]: IStringMap };

export type TagFocusElement = [keyof IPipelineConfig, string];
export type TagFocus = {
  [K in Exclude<Focus, Focus.normal>]: TagFocusElement[];
};

interface IProps {

}

interface IPromiseEntry { q: string; promise: Promise<any>; }

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;

  languages: OxfordLanguage[];
  q: string;
  queue: string[];
  rate: number;
  paused?: boolean | number;
  promises: IPromiseEntry[];
  lookupProps: Partial<ILookupProps>;

  history: string[];
  hideCached: boolean;

  records: WordRecord[];

  re?: IRetrieveEntry;

  config: IPipelineConfig;
  xref: ITagCrossReference;
  focus: TagFocus;
  visibleRecordCount: number;
}

function odApiCallsLastMinute() {
  return OpTrack.history("odapi", 60 * 1000)[0]?.length ?? 0;
}

function DisclosureBar({id, title, tooltip, children}: React.PropsWithChildren<{
  id: string,
  title: React.ReactChild,
  tooltip?: string}>) {
  const [open, setOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  return (
    <div className={compact(["disclosure", open && "show"]).join(" ")}>
      <div
        className="disclosure-bar"
        onClick={open ? close : setOpen.bind(null, true)}
        aria-controls={id}
        aria-expanded={open}
        title={tooltip}
      >
        {title}
      </div>
      <Collapse in={open}>
        <div id={id}>
          {(open || closing) && children}
        </div>
      </Collapse>
    </div>
  );

  function close() {
    setOpen(false);
    setClosing(true);
    setTimeout(setClosing, 500, false);
  }
}

export default class App extends React.Component<IProps, IState> {
  public static stylesheet?: CSSStyleSheet;
  private static highlightedTag?: string;
  private static ruleIndex: Map<string, CSSStyleRule> = new Map();
  private timer?: NodeJS.Timeout;
  private readonly lookup: Lookup;

  constructor(props: Readonly<IProps>) {
    super(props);
    const config: IPipelineConfig = {
      domains: {},
      grammaticalFeatures: {},
      imputed: {},
      marks: {},
      partsOfSpeech: {},
      registers: {},
    };
    const xref: ITagCrossReference = {
      domains: {},
      grammaticalFeatures: {},
      imputed: {},
      marks: {},
      partsOfSpeech: {},
      registers: {},
    };
    const focus: TagFocus = defaultFocus();
    Object.keys(config).forEach((prop) => {
      const value = localStorage.getItem("oed/passes/" + prop);
      if (value) {
        try {
          config[prop as keyof typeof config] = JSON.parse(value);
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.error(e);
        }
      }
    });
    Object.keys(xref).forEach((prop) => {
      const value = localStorage.getItem("oed/xref/" + prop);
      if (value) {
        try {
          xref[prop as keyof typeof xref] = JSON.parse(value);
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.error(e);
        }
      }
    });
    Object.values(xref).forEach((value) => {
      Object.entries(value).forEach(([tag, words]) => {
        if (tag !== kebabCase(tag)) {
          delete value[tag];
          tag = kebabCase(tag);
        }
        value[tag] = uniq(words as string[]);
      });
    });
    Object.keys(focus).forEach((key) => {
      const value = localStorage.getItem("oed/focus/" + key);
      if (value) {
        try {
          focus[key as keyof TagFocus] = JSON.parse(value);
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.error(e);
        }
      }
    });
    Marks.forEach(([key]) => config.marks[key] = config.marks[key] ?? Pass.primary);
    const history: string[] = uniq(JSON.parse(localStorage.getItem("oed/history") || "[]"));
    const hideCached: boolean = JSON.parse(localStorage.getItem("oed/hideCached") || "false");
    const lookupProps = JSON.parse(localStorage.getItem("oed/lookupProps") ?? "{}");
    this.state = {
      apiBaseUrl: "/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
      config,
      focus,
      history,
      hideCached,
      languages: [OxfordLanguage.americanEnglish, OxfordLanguage.britishEnglish],
      lookupProps,
      promises: [],
      q: sessionStorage.getItem("oed/q") || "",
      queue: [],
      rate: 0,
      records: [],
      visibleRecordCount: 0,
      xref,
    };
    this.lookup = new Lookup(lookupProps);
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
    this.timer = setInterval(this.tick, 100);
    OpTrack.listeners.push(setImmediate.bind(null, this.updateRate));
  }

  public componentWillUnmount() {
    let timer;
    [this.timer, timer] = [undefined, this.timer];
    if (timer) {
      clearInterval(timer);
    }
  }

  public componentDidUpdate() {
    Object.entries(this.state.config).forEach(([prop, value]) => {
      localStorage.setItem("oed/passes/" + prop, JSON.stringify(value));
    });
    Object.entries(this.state.xref).forEach(([prop, value]) => {
      localStorage.setItem("oed/xref/" + prop, JSON.stringify(value));
    });
    Object.entries(this.state.focus).forEach(([prop, value]) => {
      localStorage.setItem("oed/focus/" + prop, JSON.stringify(value));
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
    const { history, hideCached, lookupProps, q, re } = this.state;
    if (q && re && re.results) {
      sessionStorage.setItem("oed/q", q);
    } else {
      localStorage.removeItem("oed/q");
    }
    localStorage.setItem("oed/history", JSON.stringify(history));
    localStorage.setItem("oed/hideCached", JSON.stringify(hideCached));
    localStorage.setItem("oed/lookupProps", JSON.stringify(lookupProps));
  }

  public render() {
    const loaded = this.state.records.map(({q}) => q);
    const history = without(this.state.history, ...loaded).reverse();
    const wordListExceptions = this.state.hideCached ? [...loaded, ...history] : [];
    const WordListComponent = this.WordListComponent;
    const QueueComponent = this.QueueComponent;
    const hiddenCount = this.state.records.length - this.state.visibleRecordCount;
    const browserCache = Lookup.browserCache;
    return <>
      <Navbar bg="light" expand="lg">
        <Navbar.Toggle aria-controls="nav" as={NavbarBrand}>OD³</Navbar.Toggle>
        <Navbar.Collapse id="nav">
          <Navbar.Text className="powered-by-oxford"> Oxford Dictionaries Definition Distiller</Navbar.Text>
          <NavDropdown title="Keys" id="nav-keys" as={Button}>
            <Container>
              <Form>
                <Form.Group>
                  <Form.Label>App ID</Form.Label>
                  <Form.Control
                      placeholder="App ID"
                      value={this.state.app_id || undefined}
                      style={{fontFamily: "monospace"}}
                      onChange={(e: any) => this.setState({app_id: e.target.value})}/>
                  {this.lookupConfig({as: "checkbox", prop: "enterprise"})}
                  {this.lookupConfig({as: "checkbox", prop: "directWebdis"})}
                </Form.Group>
                <Form.Group>
                  <Form.Label>App Key</Form.Label>
                  <Form.Control
                      placeholder="App Key"
                      value={this.state.app_key || undefined}
                      style={{fontFamily: "monospace"}}
                      onChange={(e: any) => this.setState({app_key: e.target.value})}/>
                </Form.Group>
              </Form>
            </Container>
          </NavDropdown>
          <NavDropdown title="Perf" id="nav-perf" as={Button}>
            <Container>
              <Form>
                <Form.Group>
                  <Form.Label>Lookup</Form.Label>
                  {this.lookupConfig({as: "checkbox", prop: "online"})}
                  {this.lookupConfig({as: "select", prop: "cache", enumType: CacheMode})}
                </Form.Group>
                <Form.Group>
                  <Form.Label>Limits</Form.Label>
                  {this.lookupConfig({as: "number", prop: "threads", range: [1, 10]})}
                  {this.lookupConfig({as: "number", prop: "apiRate", range: [1, 500]})}
                  {this.lookupConfig({as: "number", prop: "loaded", range: [1, 1000]})}
                </Form.Group>
              </Form>
            </Container>
          </NavDropdown>
          <NavDropdown title="Config" id="nav-config">
            <Container>
              <ConfigImportBox
                  currentConfig={this.state.config}
                  setConfig={(config) => this.setState({config})}/>
            </Container>
          </NavDropdown>
          <NavDropdown title="Words" id="nav-words">
            <Container>
              <FormCheck label="Hide Cached" checked={this.state.hideCached} onChange={() => this.setState(({ hideCached }) => ({ hideCached: !hideCached }))} />
              <ButtonToolbar>
                {browserCache.localStorage.count > 0 && <Button variant="outline-primary">Local <Badge onClick={browserCache.localStorage.clear} variant="primary">{browserCache.localStorage.count}</Badge></Button>}
                {browserCache.sessionStorage.count > 0 && <Button variant="outline-primary">Session <Badge onClick={browserCache.sessionStorage.clear} variant="primary">{browserCache.sessionStorage.count}</Badge></Button>}
              </ButtonToolbar>
              <BakedWordListComponent except={wordListExceptions} label={"Two-Letter"} url={twoLetterWordsUrl} WordListComponent={WordListComponent} />
              <BakedWordListComponent except={wordListExceptions} label={"Three-Letter"} url={threeLetterWordsUrl} WordListComponent={WordListComponent} />
              <BakedWordListComponent except={wordListExceptions} label={"JQXZ"} url={jqxzWordsUrl} WordListComponent={WordListComponent} />
              <WordListComponent except={wordListExceptions} label={"Bad Words"} words={badWords} variant={"outline-warning"} />
              <WordListComponent label={"History"} words={history} />
            </Container>
          </NavDropdown>

          <Nav className="mr-auto"/>

          <QueueComponent/>
        </Navbar.Collapse>
        <Form inline={true} onSubmitCapture={this.go} action={"#"}>
          <InputGroup>
            <Form.Control
                placeholder={"one or more terms"}
                value={this.state.q}
                onChange={(e: any) => this.setState({q: e.target.value ? e.target.value : undefined})}
            />
            <InputGroup.Append>
              <Button
                  type={"submit"}
                  onClick={this.go}
                  variant="outline-primary"
                  disabled={!this.state.q || this.state.q.length < 2}>Look Up</Button>
            </InputGroup.Append>
          </InputGroup>
        </Form>
      </Navbar>
      <Container>

        <DisclosureBar id="filters and tags"
        title={
          // eslint-disable-next-line
          <>filters and tags{hiddenCount > 0 && ` — ${hiddenCount} hidden`}{Object.values(this.state.focus).some((e) => e.length > 0) && <> — <a onClickCapture={() => this.setState({focus: defaultFocus()})}>reset filters</a></>}</>
        } tooltip={
          JSON.stringify(this.state.focus)
        }>
          {this.renderFilters()}
        </DisclosureBar>

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

        <Row>
          <Col>
            <WordTable
                records={this.state.records}
                focus={this.state.focus}
                onFiltered={this.onFiltered}
                TagControl={this.TagControl}
                MarksControl={this.MarksControl}
            />
          </Col>
        </Row>

        <Row>
          <Col>
            {this.state.re && this.state.re.results && this.state.re.results.map(this.renderResponse)}
          </Col>
        </Row>
      </Container>
    </>;
  }

  public allowed = (prop: keyof IPipelineConfig, flag: string): Pass => {
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

  public getMarksFor = (query: string) => {
    const { xref: { marks } } = this.state;
    return Object.keys(marks).filter((key) =>
      arraySetHas(marks, key, query));
  }

  public processed = (query: string, {allTags}: PartialWordRecord) => {
    if (!allTags) {
      return;
    }

    setImmediate(this.updateXref, query, cloneDeep(allTags));
  }

  private renderFilters = () => {
    return <Container>
      {this.renderFilter("Parts of Speech", "partsOfSpeech")}
      {this.renderFilter("Grammatical Features", "grammaticalFeatures")}
      {this.renderFilter("Registers", "registers")}
      {this.renderFilter("Domains", "domains")}
      {this.renderFilter("Imputed", "imputed")}
      {this.renderFilter("Marks", "marks", true)}
    </Container>;
  }

  private lookupConfig<TEnum>(props: ({
                                    as: "checkbox",
                                    prop: PropertyNamesOfType<ILookupProps, boolean>,
                                  } | {
                                    as: "select",
                                    prop: PropertyNamesOfType<ILookupProps, TEnum>,
                                    enumType: {[key: string]: TEnum},
                                  } | {
                                    as: "number",
                                    prop: PropertyNamesOfType<ILookupProps, number>,
                                    range?: [number, number],
                                  })) {
    const defaultValue = Lookup.effectiveProps()[(props.prop)];
    const defaultValueLabel = `Default (${defaultValue.toString()})`;
    return <Form.Row>
      {props.as === "checkbox" &&
      <Form.Check
          className="mr-auto"
          label={titleCase(props.prop)}
          checked={this.state.lookupProps[props.prop]}
          onChange={() =>
              this.setState(({lookupProps}) =>
                      ({lookupProps: {...lookupProps, [props.prop]: !lookupProps[(props.prop)]}}),
                  () => this.lookup.props = this.state.lookupProps)
          }
      />}
      {props.as === "select" &&
      <>
      <Form.Text>{titleCase(props.prop)}</Form.Text>
      <Form.Control
          as={"select"}
          value={(this.state.lookupProps[props.prop] ?? defaultValueLabel).toString()}
          onChange={(event) => {
            const value = event.currentTarget.value;
            this.setState(({ lookupProps }) => {
              const realValue = value === defaultValueLabel ? undefined : value;
              return ({
                lookupProps: {
                  ...lookupProps,
                  [props.prop]: realValue,
                },
              });
            },
              () => this.lookup.props = this.state.lookupProps);
          }}
      >
        <option value={defaultValueLabel}>{defaultValueLabel}</option>
        <option>-</option>
        {Object.keys(props.enumType).sort().map((value) =>
            <option key={value} value={value}>{value}</option>)}
      </Form.Control>
        </>}
        {props.as === "number" &&
      <>
        <Form.Text>{titleCase(props.prop)}</Form.Text>
        <Form.Control
          type={"number"}
          min={props.range?.[0]}
          max={props.range?.[1]}
          placeholder={`${defaultValue}`}
          defaultValue={this.state.lookupProps[props.prop] === undefined ? `${defaultValue}` : undefined}
          value={this.state.lookupProps[props.prop] === undefined ? undefined : `${this.state.lookupProps[props.prop]}`}
            onChange={(event: any) => {
              const value = event.currentTarget.value;
              this.setState(({ lookupProps }) => {
                return ({
                  lookupProps: {
                    ...lookupProps,
                    [props.prop]: value,
                  },
                });
              },
                () => this.lookup.props = this.state.lookupProps);
            }} />
        </>}
      {props.as !== "select" && this.state.lookupProps[(props.prop)] !== undefined &&
      <Button size="sm" variant="warning" onClick={() =>
          this.setState(({lookupProps}) =>
                  ({lookupProps: {...lookupProps, [props.prop]: undefined}}),
              () => this.lookup.props = this.state.lookupProps)
      }>
        {defaultValueLabel}
      </Button>
      }
    </Form.Row>;
  }

  private updateXref = (query: string, allTags: ITags) => {
    this.setState(({xref}) => {
      Object.entries(xref).forEach(([tagType, xrefsForType]) => {
        Object.keys(xrefsForType).forEach((tag) => {
          if (!arraySetHas(allTags, tagType, (e) => peek(e) === tag)) {
            // TODO: binary search
            if (arraySetRemove(xrefsForType, tag, query)) {
              // console.log(`Removed ${query} from ${tagType}/${tag}`);
            }
          }
        });
      });
      Object.entries(allTags).forEach(([tagType, tags]) =>
          tags?.forEach((tag: [string, string] | string) => {
            const tagTypeXref = ensureMap(xref, tagType as keyof ITags);
            tag = peek(tag);
            if (arraySetAdd(tagTypeXref, tag, query, true)) {
              // console.log(`Added ${query} to ${tagType}/${tag}`);
            }
          }));
      return {xref: {...xref}};
    });
  }

  private WordListComponent = ({label, words, except = [], variant = "outline-primary"}:
                                   { label: string,
                                     className?: string,
                                     words: string[],
                                     except?: string[],
                                     variant?: ButtonProps["variant"] }) => {
    const NavDropdownButtonGroup = this.NavDropdownButtonGroup;
    if (except.length > 0) {
      words = without(words, ...except);
    }
    return <NavDropdownButtonGroup variant={variant} label={label} words={words}>
      {[1, 2, 10, 100].map((n) =>
          words.length >= n && <Button
              key={n}
              variant={variant}
              onClick={() =>
                  this.enqueue(words.slice(0, n))}>{n}</Button>)}
        {words.length > 0 && <Button
            variant={variant}
            onClick={() => this.enqueue(words)}>All</Button>}
    </NavDropdownButtonGroup>;
  }

  private NavDropdownButtonGroup = ({variant, label, className, words, children}:
                                        React.PropsWithChildren<{
                                          variant: ButtonProps["variant"],
                                          label: string,
                                          className?: string,
                                          words: string[],
                                        }>) => {
    const disabled = words.length === 0;
    const fakeButtonClassName = compact(["btn", `btn-${variant}`, disabled && "disabled"]).join(" ");
    return <Nav>
      <Navbar.Text className={className}>
        <ButtonGroup>
          <div className={fakeButtonClassName} style={{padding: 0}}>
            <Dropdown className="d-flex justify-content-start">
              <Dropdown.Toggle
                  id={`nav-${label}`}
                  className="flex-fill text-left"
                  variant={variant}
                  style={{border: "none"}}
                  disabled={disabled}>
                {label}{words.length > 0 && ` (${words.length})`}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {
                  words.map((q) =>
                      <Dropdown.Item key={q} onClick={this.getOnClick(q)}>{q}</Dropdown.Item>,
                  )
                }
              </Dropdown.Menu>
            </Dropdown>
          </div>
          {children}
        </ButtonGroup>
      </Navbar.Text>
    </Nav>;
  }

  private QueueComponent = () => {
    const {paused, queue, rate} = this.state;
    const variant: ButtonProps["variant"] = "outline-secondary";
    const NavDropdownButtonGroup = this.NavDropdownButtonGroup;
    const style = rate <= 0 ? undefined : {
      backgroundImage: "linear-gradient(transparent 0%, var(--warning) 0%)",
      backgroundPosition: "bottom",
      backgroundRepeat: "no-repeat",
      backgroundSize: `100% ${Math.min(Math.ceil(100 * (rate / this.maxApiRate)), 100)}%`,
    };
    return <NavDropdownButtonGroup variant={variant} label={"Queue"} words={queue} className={"mr-3"}>
      {/* {promises.map(({q}) => <Button>{q}</Button>)} */}
      <Button
          variant={variant}
          onClick={this.togglePause}
          style={style}
      >
            <span
                className={`oi oi-${paused ? OpenIconicNames["media-play"] : OpenIconicNames["media-pause"]}`}
                title={paused ? "Unpause" : "Pause"}/>
      </Button>
      <Button
          variant={variant}
          onClick={this.unpauseOnce}
          disabled={!paused || queue.length === 0}
      >
            <span
                className={`oi oi-${OpenIconicNames["media-step-forward"]}`}
                title="Process One"/>
      </Button>
    </NavDropdownButtonGroup>;
  }

  private onFiltered = (visibleRecords: IWordRecord[]) => {
    this.setState({visibleRecordCount: visibleRecords.length});
  }

  private get maxThreads() {
    return this.lookup.effectiveProps.threads;
  }

  private get maxLoaded() {
    return this.lookup.effectiveProps.loaded;
  }

  private get maxApiRate() {
    return this.lookup.effectiveProps.apiRate;
  }

  private getOnClick(q: string) {
    return this.unshift.bind(this, [q], true);
  }

  private togglePause = () => this.setState(({paused}) => ({paused: !paused}));

  private unpauseOnce = () => this.setState({paused: 1});

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

  private renderFilter(label: string, prop: keyof ITagCrossReference, showAll?: boolean): React.ReactNode {
    return <FilterRow
        label={label}
        prop={prop}
        focus={this.getFocusFor}
        config={this.state.config[prop]}
        xref={this.state.xref[prop]}
        TagControl={this.TagControl}
        showAll={showAll}
    />;
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

  private enqueue = (words: Array<string | undefined>) => {
    this.setState(({queue}) =>
        ({queue: uniq(compact(flatten([queue, words])))}));
  }

  private unshift = (words: Array<string | undefined>, go?: boolean) => {
    this.setState(({queue, paused}) => {
      if (go && paused !== false) {
        words = uniq(compact(words));
        if (typeof paused === "number") {
          paused += paused;
        } else if (paused) {
          paused = words.length;
        }
      }
      return ({queue: uniq(compact(flatten([words, queue]))), paused});
    });
  }

  private go = () => {
    const { q } = this.state;
    if (!q) {
      return;
    }
    this.unshift(q.split(/\W+/), true);
  }

  private tick = () => {
    this.setState(({queue: [item, ...queue], paused, promises, rate}) => {
      if (paused === true || item === undefined || promises.length > this.maxThreads) {
        return null;
      }
      if (rate > this.maxApiRate) {
        return null;
      }
      if (typeof paused === "number") {
        paused--;
      }
      if (paused === 0) {
        paused = true;
      }
      const promise: Promise<any> = this.get(item);
      OpTrack.track("lookup", item, promise);
      const promiseEntry = { q: item, promise };
      promise.then(...this.resolvePromise(promiseEntry));
      promises.push(promiseEntry);
      return {queue, promises, paused};
    }, this.updateRate);
  }

  private resolvePromise = (promiseEntry: IPromiseEntry) => {
    const c = () => new Promise((resolve) => this.setState(({promises}) =>
        ({promises: without(promises, promiseEntry)}), resolve));
    return [c, c];
  }

  private get = async (q: string, redirect?: string): Promise<IRetrieveEntry> => {
    q = q.toLocaleLowerCase();
    const {apiBaseUrl, languages} = this.state;
    let promises: Array<[string, Promise<RetrieveEntry>]> = [];
    const addLookup = (word: string, tags: ITags) => {
      const words = promises.map(([w]) => w);
      if (words.includes(word)) {
        console.log(`get: ignoring redundant request for '${word}' (${words.join(", ")})`);
        return;
      }
      promises = promises.concat(languages.map((language) =>
        [word, this.lookup.get(apiBaseUrl, language, word).then((pre) => {
          pre?.results?.forEach((he) => (he as AnnotatedHeadwordEntry).tags = cloneDeep(tags));
          return pre;
        })]));
      // console.log({addLookup: word, tags, promises});
    };
    const doLookups = async () => {
      const words = promises.map(([w]) => w);
      const ps = promises.map(([, p]) => p);
      console.log({words, ps});
      const promiseResults = await Promise.all(ps);
      console.log(`get: finished waiting for lookups: ${words.join(", ")}`);
      return promiseResults.reduce((re0, re1) => {
        re0.results = flatten(compact([re0.results, re1.results]));
        return re0;
      });
    };
    addLookup(redirect || q, {});
    let re = await doLookups();
    const crossReferences: string[] = [];
    re.results?.forEach((result) =>
      result.lexicalEntries.forEach((entry) =>
        entry.entries?.forEach((lexicalEntry) =>
          lexicalEntry.senses?.forEach((sense) =>
            sense.crossReferences?.forEach((crossReference) => {
              const { id: word, type, text } = crossReference;
              if (arraySetAdd({ crossReferences }, "crossReferences", word)) {
                const tags: ITags = { imputed: [[`xref-${kebabCase(type)}`, text]] };
                fillInTags(tags, entry.lexicalCategory.id, lexicalEntry.grammaticalFeatures, sense);
                addLookup(crossReference.id, tags);
              }
            }
            )))));
    re = await doLookups();
    redirect = this.derivativeOf(re.results);
    if (redirect) {
      console.log("get: redirecting to " + redirect);
      return this.get(q, redirect);
    }
    return new Promise((resolve) => {
      this.setState(({records, history}) => {
        const pipeline = new OxfordDictionariesPipeline({
          allowed: this.allowed,
          entries: re.results as AnnotatedHeadwordEntry[] || [],
          getMarksFor: this.getMarksFor,
          processed: this.processed,
          query: q,
        });
        const record = new WordRecord(q, re, pipeline);
        const index = sortedIndexBy(records, record, "q");
        if (records[index]?.q === q) {
          records[index] = record;
        } else {
          records.splice(index, 0, record);
        }
        arraySetAdd({history}, "history", q, "mru");
        return {re, records, history};
      }, resolve);
    });
  }

  private tagControl = ({prop, flag, detail, value, query}: {
    prop: keyof ITagCrossReference,
    flag: string,
    detail?: ReturnType<React.Component["render"]>,
    value?: Pass,
    query: string | undefined,
  }) => {
    const {xref, config} = this.state;
    value = value ?? config[prop][flag];
    const key = `${prop}-${flag}`;
    const words = xref[prop][flag];
    return <OverlayTrigger
      trigger="click"
      rootClose={true}
      key={key}
      overlay={<Popover id={key}>
        <Popover.Content>
          <PassComponent
            pass={value}
            focus={this.getFocusFor(prop, flag)}
            words={words}
            changePass={this.changePass.bind(this, query, prop, flag)}
            changeFocus={this.setFocusFor.bind(this, prop, flag)}
            lookup={(word) => this.unshift([word], false)}
          />
        </Popover.Content>
      </Popover>}>
      <TagBadge pass={value}><Badge variant="light">{words?.length}</Badge> {flag}{
        detail && <span className="text-muted">&nbsp;{detail}</span>
      }</TagBadge>
    </OverlayTrigger>;
  }

  private changePass(query: string | undefined, prop: keyof IPipelineConfig, flag: string, newValue: Pass) {
    const words = this.state.xref[prop][flag];
    console.log({changePass: words});
    this.setState((state) => {
      state.config[prop][flag] = newValue;
      return {config: {...state.config}};
    }, () => this.unshift([query, ...words]));
  }

  private marksControl = ({word, badges}: { word: string, badges?: boolean}) => {
    const marks = this.getMarksFor(word);
    if (badges) {
      return <div className="marks">{Marks.map(([mark, icon]) =>
            marks.includes(mark) && <Badge key={mark}><span className={`oi oi-${icon}`} title={mark}/></Badge>)}</div>;
    }
    return <ButtonGroup>
      {Marks.map(([mark, icon]) =>
          <Button
              key={mark}
              onClick={this.toggleMark.bind(this, word, mark)}
              size="sm"
              variant={
                marks.includes(mark)
                    ? "primary"
                    : "outline-primary"}
          >
            <span className={`oi oi-${icon}`} title={mark}/>
          </Button>)}
    </ButtonGroup>;
  }

  // // tslint:disable-next-line:member-ordering
  // private TagControl = React.memo(this.tagControl);
  // // tslint:disable-next-line:member-ordering
  // private MarksControl = React.memo(this.marksControl);
  // tslint:disable-next-line:member-ordering
  private TagControl = this.tagControl;
  // tslint:disable-next-line:member-ordering
  private MarksControl = this.marksControl;

  private getFocusFor = (prop: keyof IPipelineConfig, key: string) => {
    const entry = [prop, key];
    const lookup = isEqual.bind(null, entry);
    if (this.state.focus.hide.find(lookup)) {
      return Focus.hide;
    }
    if (this.state.focus.focus.find(lookup)) {
      return Focus.focus;
    }
    return Focus.normal;
  }

  private setFocusFor(prop: keyof IPipelineConfig, key: string, value: Focus, solo: boolean) {
    this.setState(({focus}) => {
      focus = cloneDeep(focus);
      if (solo) {
        Object.entries(focus).forEach(([focusType, e]) => {
          const items: TagFocusElement[] = focusType === value ? [[prop, key]] : [];
          e.splice(0, e.length, ...items);
        });
      } else {
        Object.entries(focus).forEach(([focusType, e]) => {
          const element: TagFocusElement = [prop, key];
          const index = e.findIndex(isEqual.bind(null, element));
          if (index >= 0) {
            if (value === focusType) {
              return;
            }
            e.splice(index, 1);
          } else {
            if (value !== focusType) {
              return;
            }
            e.push(element);
          }
        });
      }
      return {focus};
    });
  }

  private toggleMark(query: string, mark: string) {
    this.setState(({xref}) => {
      arraySetToggle(xref.marks, mark, query);
      return {xref};
    }, () => this.unshift([query]));
  }

  private updateRate = () => {
    this.setState(({rate}) => {
          const newRate = odApiCallsLastMinute();
          if (newRate === rate) {
            return null;
          }
          return {rate: newRate};
        });
  }
}
/*
        marks: string[],
        toggleMark(mark: string): void,

 */
export type TagControlFactory = App["TagControl"];
export type MarksControlFactory = App["MarksControl"];

type PrefixUnion<A, B> = A & Omit<B, keyof A>;

type ITagBadgeProps = PrefixUnion<{pass: Pass, flag?: string}, React.HTMLAttributes<HTMLSpanElement>>;

function defaultFocus(): TagFocus {
  return {
    [Focus.hide]: [],
    [Focus.focus]: [],
  };
}

function TagBadge(props: ITagBadgeProps) {
  const {pass, flag, children} = props;
  return <Badge variant={variantForPass(pass)} {...props}>{flag}{children}</Badge>;
}

function variantForPass(value: Pass): BadgeProps["variant"] {
  const variants: Array<BadgeProps["variant"]> = ["danger", "light", "secondary", "warning"];
  return variants[value];
}

function FilterRow({
                     label,
                     prop,
                     focus,
                     config,
                     xref,
                     TagControl,
                     showAll = false,
                   }:
                       {
                         label: string,
                         prop: keyof ITagCrossReference,
                         focus: App["getFocusFor"],
                         config: IPassMap,
                         xref: IStringMap,
                         TagControl: TagControlFactory;
                         showAll?: boolean
                       }) {
    const [open, setOpen] = React.useState(showAll);
    const flags = Object.keys(config).sort();
    // These orphaned tags (like "404") are probably from old bugs:
    // without(Object.keys(xref), ...flags).forEach((key) => config[key] = Pass.primary);
    let hidden = 0;
    return <Row>
    <Col xs={3}>
      <Form.Label>{label}</Form.Label>
    </Col>
    <Col className="tags">
      {flags.map((flag) => {
        const value = config[flag];
        const flagFocus = focus(prop, flag);
        if (!open && value === Pass.primary && flagFocus === Focus.normal) {
          hidden++;
          return false;
        }
        return <TagControl key={flag} prop={prop} flag={flag} value={value} query={undefined}
        detail={flagFocus !== Focus.normal && <Icon icon={FocusIcons[flagFocus]} />}/>;
      })}
    </Col>
    <Col xs={"auto"} className="tags">
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

function BakedWordListComponent({label, url, WordListComponent, except}: {label: string, url: string, WordListComponent: App["WordListComponent"], except: string[]}) {
  const [words, setWords] = React.useState([] as string[]);
  React.useEffect(() => {
    fetch(url).then((r) => r.text()).then((text) => setWords(uniq(compact(text.split("\n")))));
  }, [url]);
  return <WordListComponent label={label} words={words} except={except}/>;
}
