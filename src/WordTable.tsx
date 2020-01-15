import clamp from "lodash/clamp";
import isEqual from "lodash/isEqual";
import range from "lodash/range";
import slice from "lodash/slice";
import React from "react";
import Button, { ButtonProps } from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Row from "react-bootstrap/Row";
import App, { MarksControlFactory, TagControlFactory, TagFocus } from "./App";
import Focus from "./Focus";
import IWordRecord from "./IWordRecord";
import { arraySetHas } from "./Magic";
import OpenIconicNames from "./OpenIconicNames";
import { minDiff } from "./volumize";
import WordRow from "./WordRow";
import "./WordTable.css";

interface IProps {
  records: IWordRecord[];
  focus: TagFocus;
  show: number;
  getReload: App["getOnClick"];
  get: App["get"];
  TagControl: TagControlFactory;
  MarksControl: MarksControlFactory;
  onFiltered(visibleRecords: IWordRecord[]): void;
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
      records: [],
      show: props.show ?? 10,
    };
  }

  public componentDidMount() {
    this.applyFilter();
  }

  public componentDidUpdate(prevProps: Readonly<IProps>) {
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
    const maxPage = Math.ceil(count / pageSize) - 1;
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
    const pager = <Row>
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
          {currentPage < maxShownPage && range(currentPage + 1, maxShownPage + 1).map((page) =>
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
  </Row>;
    return <div className="word-table">
      {pager}
      <Row className="header">
        <Col xs={1}>Word</Col>
        <Col xs={4}>Definition</Col>
        <Col xs={2}>Notes</Col>
        <Col xs={5}>GWF Definition</Col>
      </Row>
      {this.renderVisibleRows()}
      {pager}
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
    const { getReload, get, TagControl, MarksControl } = this.props;
    const { page, records, show, onlyForHash } = this.state;
    return slice(records, page * show, page * show + show).map((record) =>
    // <Row className={`entry ${onlyForHash ? "onlyForHash" : ""}`} id={record.q} key={record.q}>
      <Row className="entry" id={record.q} key={record.q}>
        <WordRow
          onlyForHash={onlyForHash === record.q}
          record={record}
          gwfOnly={false}
          getReload={getReload}
          get={get}
          TagControl={TagControl}
          MarksControl={MarksControl}
        />
        <WordRow
          onlyForHash={onlyForHash === record.q}
          record={record}
          gwfOnly={true}
          getReload={getReload}
          get={get}
          TagControl={TagControl}
          MarksControl={MarksControl}
        />
      </Row>);
  }
}
