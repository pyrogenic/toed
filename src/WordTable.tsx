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
import IWordRecord, { ITags } from "./IWordRecord";
import { arraySetHas } from "./Magic";
import OpenIconicNames from "./OpenIconicNames";
import { RECORD_SEP } from "./OxfordDictionariesPipeline";
import "./WordTable.css";

interface IProps {
  records: IWordRecord[];
  focus: TagFocus;
  TagControl: TagControlFactory;
  MarksControl: MarksControlFactory;
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

function taggedComponent({ query, word, title, children, tags, TagControl, MarksControl }:
  React.PropsWithChildren<{
    query: string,
    word: string,
    title: string | false,
    tags?: ITags,
    TagControl: TagControlFactory,
    MarksControl: MarksControlFactory,
  }>) {
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
    const useLabels = false;
    return tags && <Popover id={id} className="tags">
      {title && <Popover.Title>{title}</Popover.Title>}
      <Popover.Content>
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
      </Popover.Content>
      <Popover.Content>
        <MarksControl word={query} />
      </Popover.Content>
    </Popover>;
  }
}

const TaggedComponent = taggedComponent;

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
      record: IWordRecord,
      onlyForHash: boolean,
      TagControl: TagControlFactory,
      MarksControl: MarksControlFactory,
      fluid?: boolean,
    }) {
  const result = record.result || {};
  const resultTags = record.resultTags || {};
  const { etymology, example } = result;
  const definitions = result.definitions || {};
  const partsOfSpeech = Object.keys(definitions);
  const { pipelineNotes, resultDiscarded, resultDiscardedTags } = record;
  const notFound = !(partsOfSpeech.length || etymology || example);
  const word = result.entry_rich || record.q;
  const moreInfo = (pipelineNotes && pipelineNotes.length > 0)
    || resultDiscarded || resultDiscardedTags;
  return <Row className={`entry ${onlyForHash ? "onlyForHash" : ""}`} id={id}>
    <MarksControl word={record.q} badges={true} />
    <Col xs={fluid ? "auto" : 1}>
      {result.entry_rich && record.q !== result.entry_rich && <Row className="text-muted">
        {record.q}
      </Row>}
      <TaggedComponent
        query={record.q}
        word={word}
        title="Rich Entry" tags={resultTags.entry_rich}
        TagControl={TagControl}
        MarksControl={MarksControl}>
        <Row className={result.entry_rich ? "headword" : "headword not-found"}>
          {word.toString()}
        </Row>
      </TaggedComponent>
      <Maybe when={result.pronunciation_ipa && result.pronunciation_ipa.length > 0}>
        <TaggedComponent
          query={record.q}
          word={word}
          title="Pronunciation"
          tags={resultTags.pronunciation_ipa}
          TagControl={TagControl}
          MarksControl={MarksControl}>
          <Row className="pronunciation">
            {result.pronunciation_ipa}
          </Row>
        </TaggedComponent>
      </Maybe>
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
                    word={`${word} (${partOfSpeech})`}
                    title="Definition"
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
        {etymology &&
          <TaggedComponent
            query={record.q}
            word={word}
            title="Etymology" tags={resultTags.etymology}
            TagControl={TagControl}
            MarksControl={MarksControl}>
            <Row>
              <Col xs={fluid ? "auto" : 2}>etymology</Col>
              <Col>{etymology}</Col>
            </Row>
          </TaggedComponent>}
        {example &&
          <TaggedComponent
            query={record.q}
            word={word}
            title="Example" tags={resultTags.example}
            TagControl={TagControl}
            MarksControl={MarksControl}>
            <Row>
              <Col xs={fluid ? "auto" : 2}>example</Col>
              <Col>{
                example.includes(RECORD_SEP)
                  ? example.split(RECORD_SEP).map((s) => <li>{s}</li>)
                  : example
              }</Col>
            </Row>
          </TaggedComponent>}
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
    this.state = {
      page: 0,
      records: props.records,
      show: 10,
    };
  }

  public componentDidUpdate(prevProps: Readonly<IProps>) {
    const { focus } = this.props;
    const { show, page: currentPage } = this.state;
    const hash = window.location.hash?.split(/^q-/)[1];
    const hashTargetIndex = hash && this.props.records.findIndex(({ q }) => hash);
    if (hashTargetIndex && hashTargetIndex >= 0) {
      const page = Math.ceil(hashTargetIndex / show);
      if (page !== currentPage) {
        this.setState({ page });
      }
    }
    if (!isEqual(prevProps.focus, focus) || !isEqual(prevProps.records, this.props.records)) {
      let onlyForHash: string | undefined;
      const records = this.props.records.filter(({ q, allTags }, index) =>
        // using not-some, so true value --> reject
        !Object.entries(focus).some(([focusMode, elements]) =>
          elements.some(([key, tag]) => {
            const present = allTags && arraySetHas(allTags, key, tag);
            if (focusMode === Focus.hide) {
              return present;
            } else if (focusMode === Focus.focus) {
              return !present;
            } else {
              return false;
            }
          })) || (index !== hashTargetIndex || !(onlyForHash = q)));
      this.setState({ records, onlyForHash });
    }
  }

  public render() {
    const currentPage = this.state.page;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const variant: ButtonProps["variant"] = "secondary";
    const outlineVariant: ButtonProps["variant"] = "outline-secondary";
    const count = this.props.records.length;
    const maxPage = Math.ceil(count / this.state.show);
    let [minShownPage, maxShownPage] = [0, maxPage];
    if (Math.abs(currentPage - minShownPage) < Math.abs(currentPage - maxShownPage)) {
      minShownPage = Math.max(0, currentPage - 5);
      maxShownPage = Math.min(maxPage, minShownPage + 10);
    } else {
      maxShownPage = Math.min(maxShownPage, currentPage + 5);
      minShownPage = Math.max(0, maxShownPage - 10);
    }
    return <div className="word-table">
      <Row>
        <Col>
          <InputGroup>
            <InputGroup.Prepend>
              <Button
                variant={outlineVariant}
                disabled={this.state.page === 0}
                onClick={() => this.setState({ page: 0 })}
              >
                <span className={"flip oi oi-" + OpenIconicNames["media-step-forward"]} />
              </Button>
              <Button
                variant={outlineVariant}
                disabled={this.state.page === 0}
                onClick={() => this.setState(({ page }) => ({ page: clamp(page - 1, 0, maxPage) }))}
              >
                <span className={"flip oi oi-" + OpenIconicNames["media-play"]} />
              </Button>
              {0 < minShownPage && <InputGroup.Text>
                <span className={`oi oi-${OpenIconicNames.ellipses}`}/>
              </InputGroup.Text>}
              {minShownPage < currentPage && range(minShownPage, currentPage).map((page) => {
                return <Button
                  variant={outlineVariant}
                  onClick={() => this.setState({ page })}
                >
                  {page + 1}
                </Button>;
              })}
            </InputGroup.Prepend>
            <Form.Control
              type="number"
              style={{textAlign: "center"}}
              min={1}
              max={maxPage + 1}
              value={(currentPage + 1).toString()}
              onChange={({ target: { value } }: any) => this.setState({ page: clamp(Number(value) - 1, 0, maxPage) })}
            />
            <InputGroup.Append>
              {currentPage < maxShownPage && range(currentPage + 1, maxShownPage).map((page) => {
                return <Button
                  variant={outlineVariant}
                  onClick={() => this.setState({ page })}
                >
                  {page + 1}
                </Button>;
              })}
              {maxShownPage < maxPage && <InputGroup.Text>
                <span className={`oi oi-${OpenIconicNames.ellipses}`}/>
              </InputGroup.Text>}
              <Button
                variant={outlineVariant}
                disabled={this.state.page === maxPage}
                onClick={() => this.setState(({ page }) => ({ page: clamp(page + 1, 0, maxPage) }))}
              >
                <span className={"oi oi-" + OpenIconicNames["media-play"]} />
              </Button>
              <Button
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

  private renderVisibleRows(): React.ReactNode {
    const { records, TagControl, MarksControl } = this.props;
    const { page, show, onlyForHash } = this.state;
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
