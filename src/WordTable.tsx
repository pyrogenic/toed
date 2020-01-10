import clamp from "lodash/clamp";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import isEqual from "lodash/isEqual";
import range from "lodash/range";
import slice from "lodash/slice";
import React from "react";
import Badge from "react-bootstrap/Badge";
import Button, { ButtonProps } from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Row from "react-bootstrap/Row";
import { MarksControlFactory, TagControlFactory, TagFocus } from "./App";
import Focus from "./Focus";
import IWordRecord, { IDiscardedWordRecord, ITags } from "./IWordRecord";
import { array, arraySetHas } from "./Magic";
import OpenIconicNames from "./OpenIconicNames";
import { minDiff } from "./volumize";
import "./WordTable.css";

interface IProps {
  records: IWordRecord[];
  focus: TagFocus;
  TagControl: TagControlFactory;
  MarksControl: MarksControlFactory;
  onFiltered(visibleRecords: IWordRecord[]): void;
}

function Maybe({ when, children }: React.PropsWithChildren<{ when: any; }>):
  JSX.Element | null {
  if (when === undefined || when === null || !when) {
    return null;
  }

  if (!children) {
    return null;
  }

  switch (typeof when) {
    case "object":
    case "string":
      if ("length" in when) {
        if (when.length === 0) {
          return null;
        }
      }
      break;
  }

  return <>{children}</>;
}

const TaggedComponent = ({ query, word, title, children, tags, TagControl, MarksControl }:
  React.PropsWithChildren<{
    query: string,
    word: string,
    title: string | false,
    tags?: ITags,
    TagControl: TagControlFactory,
    MarksControl: MarksControlFactory,
  }>) => {
  if (!children) {
    return null;
  }
  if (!tags) {
    return <>{children}</>;
  }
  let className = ["trigger-click"];
  const flattenedUnobservableTags = flatten(compact(
    Object.values(tags).map((x) => x.slice()),
  ));
  className = className.concat(...flattenedUnobservableTags.map((tag) => `tag-${tag}`));
  return <OverlayTrigger trigger="click" overlay={popover(`${word}-${title}`)} rootClose={true}>
    <div className={className.join(" ")}>
      {children}
    </div>
  </OverlayTrigger>;

  function popover(id: string) {
    return tags && <Popover id={id} className="tags">
      {title && <Popover.Title>{title} <span className="text-muted">{word}</span></Popover.Title>}
      <Popover.Content>
        <TagControls TagControl={TagControl} word={word} tags={tags}/>
      </Popover.Content>
      <Popover.Content>
        <MarksControl word={query} />
      </Popover.Content>
    </Popover>;
  }
};

export const TagControls = (
  { tags, useLabels, word, TagControl }:
    { tags: ITags, word: string, useLabels?: boolean, TagControl: TagControlFactory; },
) => {
  return <>
    {tags.partsOfSpeech && <span>{useLabels && "partsOfSpeech: "}
      {tags.partsOfSpeech.map((t) =>
        <TagControl key={t} query={word} prop="partsOfSpeech" flag={t} />)}</span>}

    {tags.grammaticalFeatures && <span>{useLabels && "grammaticalFeatures: "}
      {tags.grammaticalFeatures.map((t) =>
        <TagControl key={t} query={word} prop="grammaticalFeatures" flag={t} />)}</span>}

    {tags.domains && <span>{useLabels && "domains: "}
      {tags.domains.map((t) =>
        <TagControl key={t} query={word} prop="domains" flag={t} />)}</span>}

    {tags.registers && <span>{useLabels && "registers: "}
      {tags.registers.map((t) =>
        <TagControl key={t} query={word} prop="registers" flag={t} />)}</span>}

    {tags.imputed && <span>{useLabels && "imputed: "}
      {tags.imputed.map(([t, comment]) =>
        <TagControl key={t} query={word} prop="imputed" flag={t} detail={comment} />)}</span>}
  </>;
};

function WordRow(
  {
    id,
    record,
    onlyForHash,
    TagControl,
    MarksControl,
    fluid,
  }:
    {
      id?: string,
      record: IWordRecord | IDiscardedWordRecord,
      onlyForHash: boolean,
      TagControl: TagControlFactory,
      MarksControl: MarksControlFactory,
      fluid?: boolean,
    }) {
  const result = record.result || {};
  const resultTags = record.resultTags || {};
  const etymologies = array(result.etymology);
  const examples = array(result.example);
  const definitions = result.definitions || {};
  const partsOfSpeech = Object.keys(definitions);
  const { pipelineNotes, resultDiscarded, resultDiscardedTags } = record;
  const notFound = false;
  const moreInfo = (pipelineNotes && pipelineNotes.length > 0)
    || resultDiscarded || resultDiscardedTags;
  return <Row className={`entry ${onlyForHash ? "onlyForHash" : ""}`} id={id}>
    <MarksControl word={record.q} badges={true} />
    <Col xs={fluid ? "auto" : 1}>
      {record.q !== array(result.entry_rich)?.[0] && <Row className={notFound ? "headword not-found" : "text-muted"}>
        {record.q}
      </Row>}
      {array(result.entry_rich)?.map((entryRich, index) =>
       <TaggedComponent
        key={index}
        query={record.q}
        word={entryRich}
        title="Rich Entry"
        tags={array(resultTags.entry_rich)?.[index]}
        TagControl={TagControl}
        MarksControl={MarksControl}>
        <Row>
          {entryRich}
        </Row>
      </TaggedComponent>)}
      {array(result.pronunciation_ipa)?.map((pronunciation, index) =>
        <TaggedComponent
          key={index}
          query={record.q}
          word={"?"}
          title="Pronunciation"
          tags={array(resultTags.pronunciation_ipa)?.[index]}
          TagControl={TagControl}
          MarksControl={MarksControl}>
          <Row className="pronunciation">
            {pronunciation}
          </Row>
      </TaggedComponent>)}
    </Col>
    {notFound ? <Col /> : <>
      <Col>
        {partsOfSpeech.map((partOfSpeech) => <Row key={partOfSpeech}>
          <Col xs={fluid ? "auto" : 2} className="partOfSpeech">{partOfSpeech}</Col>
          <Col>
            {definitions[partOfSpeech].map((definition, index) =>
              <Row key={index}>
                <Col className="definition">
                  <TaggedComponent
                    query={record.q}
                    word={"?"}
                    title={`Definition #${index + 1} (${partOfSpeech})`}
                    tags={resultTags.definitions?.[partOfSpeech]?.[index]}
                    TagControl={TagControl}
                    MarksControl={MarksControl}>
                    {definition}
                  </TaggedComponent>
                </Col>
              </Row>)
            }
          </Col>
        </Row>)}
        {etymologies &&
          <Row>
            <Col xs={fluid ? "auto" : 2}>etymology</Col>
            <Col>
              {etymologies.map((etymology, index) =>
                <TaggedComponent
                  key={index}
                  query={record.q}
                  word={"?"}
                  title="Etymology"
                  tags={array(resultTags?.etymology)?.[index]}
                  TagControl={TagControl}
                  MarksControl={MarksControl}>
                  {etymology}
                </TaggedComponent>)}
            </Col>
          </Row>
        }
        {examples &&
          <Row>
            <Col xs={fluid ? "auto" : 2}>example</Col>
            <Col>
              {examples.map((example, index) => <div key={index}>
                <TaggedComponent
                  query={record.q}
                  word={"?"}
                  title="Example"
                  tags={array(resultTags?.example)?.[index]}
                  TagControl={TagControl}
                  MarksControl={MarksControl}>
                  {example}
                </TaggedComponent>
              </div>)}
            </Col>
          </Row>}
      </Col>
    </>}
    {(!fluid || moreInfo) && <Col xs={1}>{moreInfo &&
      <OverlayTrigger trigger="click" overlay={popover()} rootClose={true}>
        <div className="trigger-click">
          <Badge variant="success">more info</Badge>
        </div>
      </OverlayTrigger>}
    </Col>}
  </Row>;

  function popover() {
    const { q, re } = record;
    const discardedRecord = { q, re, result: resultDiscarded, resultTags: resultDiscardedTags, notes: "" };
    return <Popover id={`${q}/More Info`} className="info">
      {pipelineNotes?.map((note, index) => <li key={index}>{note}</li>)}
      <Popover.Content>
        <div className="word-table">
          <WordRow
            record={discardedRecord}
            onlyForHash={onlyForHash}
            TagControl={TagControl}
            MarksControl={MarksControl}
            fluid={true}
          />
        </div>
      </Popover.Content>
    </Popover>;
  }
}

interface IState {
  records: IWordRecord[];
  onlyForHash?: string;
  show: number;
  page: number;
}

export default class WordTable extends React.Component<IProps, IState> {
  constructor(props: Readonly<IProps>) {
    super(props);
    // console.log("WordTable construct");
    this.state = {
      page: 0,
      records: [],
      show: 10,
    };
  }

  public componentDidMount() {
    // console.log("WordTable mount");
    this.applyFilter();
  }

  public componentDidUpdate(prevProps: Readonly<IProps>) {
    // console.log("WordTable update");
    this.applyFilter(prevProps);
  }

  public applyFilter(prevProps: Readonly<Partial<IProps>> = {}) {
    const { focus } = this.props;
    // const { show, page: currentPage } = this.state;
    // const hash = window.location.hash?.split(/^q-/)[1];
    // const hashTargetIndex = hash && this.props.records.findIndex(({ q }) => hash);
    // const focusChanged = !isEqual(prevProps.focus, focus);
    // const recordsChanged = !isEqual(prevProps.records, this.props.records);
    // console.log({prc: this.props.records.length});
    // if (focusChanged || recordsChanged)
    {
      // let onlyForHash: string | undefined;
      const records = this.props.records.filter(({ q, allTags }, index) =>
        // using not-some, so true value --> reject
        !Object.entries(focus).some(([focusMode, elements]) =>
          elements.some(([key, tag]) => {
            const present = allTags && (arraySetHas(allTags, key, tag) ||
              (key === "imputed" && allTags.imputed?.find(([e]) => e === tag)));
            if (focusMode === Focus.hide) {
              // console.log(`${q}: '${tag}' is hide -> present on q: '${present}' (true will reject)`);
              return present;
            } else if (focusMode === Focus.focus) {
              // console.log(`${q}: '${tag}' is focus -> present on q: '${present}' (false will reject)`);
              return !present;
            } else {
              // console.log(`${q}: '${tag}' is normal -> present on q: '${present}'`);
              return false;
            }
          }))); // || (index !== hashTargetIndex || !(onlyForHash = q)));
      if (!isEqual(records, this.state.records)) {
        this.setState({ records, onlyForHash: undefined }, () => {
          this.props.onFiltered(records);
        });
      }
    }
    // if (hashTargetIndex && hashTargetIndex >= 0) {
    //   const page = Math.ceil(hashTargetIndex / show);
    //   if (page !== currentPage) {
    //     this.setState({ page });
    //   }
    // }
  }

  public render() {
    const currentPage = this.state.page;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const variant: ButtonProps["variant"] = "secondary";
    const outlineVariant: ButtonProps["variant"] = "outline-secondary";
    const {records: visibleRecords, show: pageSize} = this.state;
    const count = visibleRecords.length;
    const maxPage = Math.ceil(count / pageSize);
    let [minShownPage, maxShownPage] = [0, maxPage];
    if (Math.abs(currentPage - minShownPage) < Math.abs(currentPage - maxShownPage)) {
      minShownPage = Math.max(0, currentPage - 5);
      maxShownPage = Math.min(maxPage, minShownPage + 10);
    } else {
      maxShownPage = Math.min(maxShownPage, currentPage + 5);
      minShownPage = Math.max(0, maxShownPage - 10);
    }
    const PageButton = this.pageButton;
    const currentPageSpine = this.spine(currentPage);
    return <div className="word-table">
      <Row>
        <Col>
          <InputGroup>
            <InputGroup.Prepend>
              <Button
                  key={"min page"}
                  variant={outlineVariant}
                disabled={this.state.page === 0}
                onClick={() => this.setState({ page: 0 })}
              >
                <span className={"flip oi oi-" + OpenIconicNames["media-step-forward"]} />
              </Button>
              <Button
                  key={"page - 1"}
                  variant={outlineVariant}
                disabled={this.state.page === 0}
                onClick={() => this.setState(({ page }) => ({ page: clamp(page - 1, 0, maxPage) }))}
              >
                <span className={"flip oi oi-" + OpenIconicNames["media-play"]} />
              </Button>
              {0 < minShownPage && <InputGroup.Text key={0}>
                <span className={`oi oi-${OpenIconicNames.ellipses}`}/>
              </InputGroup.Text>}
              {minShownPage < currentPage && range(minShownPage, currentPage).map((page) =>
                <PageButton key={page} page={page} variant={outlineVariant} />)}
              {currentPageSpine[0] && <InputGroup.Text>{currentPageSpine[0]}</InputGroup.Text>}
            </InputGroup.Prepend>
            <Form.Control
                  key={currentPage + 1}
                  type="number"
              style={{textAlign: "center"}}
              min={1}
              max={maxPage + 1}
              value={(currentPage + 1).toString()}
              onChange={({ target: { value } }: any) => this.setState({ page: clamp(Number(value) - 1, 0, maxPage) })}
            />
            <InputGroup.Append>
              {currentPageSpine[1] && <InputGroup.Text>{currentPageSpine[1]}</InputGroup.Text>}
              {currentPage < maxShownPage && range(currentPage + 1, maxShownPage).map((page) =>
                <PageButton key={page} page={page} variant={outlineVariant} />)}
              {maxShownPage < maxPage && <InputGroup.Text key={maxPage}>
                <span className={`oi oi-${OpenIconicNames.ellipses}`}/>
              </InputGroup.Text>}
              <Button
                  key={"page + 1"}
                  variant={outlineVariant}
                disabled={this.state.page === maxPage}
                onClick={() => this.setState(({ page }) => ({ page: clamp(page + 1, 0, maxPage) }))}
              >
                <span className={"oi oi-" + OpenIconicNames["media-play"]} />
              </Button>
              <Button
                  key={"max page"}
                  variant={outlineVariant}
                disabled={this.state.page === maxPage}
                onClick={() => this.setState({ page: maxPage })}
              >
                <span className={"oi oi-" + OpenIconicNames["media-step-forward"]} />
              </Button>
            </InputGroup.Append>
          </InputGroup>
        </Col>
      </Row>
            <Row><Col>{this.props.records.length - visibleRecords.length} hidden</Col></Row>
      <Row className="header">
        <Col xs={1} onClick={() => {
          this.props.records.sort((a, b) => a.q.localeCompare(b.q));
          this.forceUpdate();
        }}>Word</Col>
        <Col>Definition</Col>
        <Col xs={1}>Notes</Col>
      </Row>
      {this.renderVisibleRows()}
    </div>;
  }

  private spine(page: number) {
    const { records: visibleRecords, show: pageSize } = this.state;
    const count = visibleRecords.length;
    if (count === 0) {
      return [undefined, undefined];
    }
    const ai = Math.min(page * pageSize, count - 1);
    const pai = ai > 0 ? ai - 1 : undefined;
    const bi = Math.min(ai + pageSize - 1, count - 1);
    const pbi = bi < count - 1 ? bi + 1 : undefined;
    const a = visibleRecords[ai].q;
    const b = ai === bi ? undefined : visibleRecords[bi].q;
    const preA = pai === undefined ? undefined : visibleRecords[pai].q;
    const postB = pbi === undefined ? undefined : visibleRecords[pbi].q;
    return minDiff(a, b, {preA, postB});
  }

  private pageButton = ({page, variant}: {page: number, variant: ButtonProps["variant"]}) => {
    const [spineA, spineB] = this.spine(page);
    return <Button className="spine" key={page + 1} variant={variant} onClick={() => this.setState({ page })}>
      <div className="from">
      {spineA}
      </div>
      {page + 1}
      <div className="to">
      {spineB}
      </div>
    </Button>;
  }

  private renderVisibleRows(): React.ReactNode {
    const { TagControl, MarksControl } = this.props;
    const { page, records, show, onlyForHash } = this.state;
    return slice(records, page * show, page * show + show).map((record, index) =>
      <WordRow
        key={index}
        id={"q-" + record.q}
        onlyForHash={onlyForHash === record.q}
        record={record}
        TagControl={TagControl}
        MarksControl={MarksControl} />);
  }
}
