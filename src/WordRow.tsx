import React from "react";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";
import App, { MarksControlFactory, TagControlFactory } from "./App";
import GwfGlue from "./GwfGlue";
import Icon from "./Icon";
import IDictionaryEntry from "./IDictionaryEntry";
import IWordRecord, { IDiscardedWordRecord } from "./IWordRecord";
import LiteralResultComponent from "./LiteralResultComponent";
import { array } from "./Magic";
import OpenIconicNames from "./OpenIconicNames";
import TaggedComponent from "./TaggedComponent";
import IRetrieveEntry from "./types/gen/IRetrieveEntry";

export default function WordRow(
    {
        id,
        gwf,
        record,
        onlyForHash,
        getReload,
        get,
        TagControl,
        MarksControl,
        fluid,
        gwfOnly,
    }:
        {
            id?: string,
            gwf: boolean,
            record: IWordRecord | IDiscardedWordRecord,
            onlyForHash: boolean,
            getReload: App["getOnClick"],
            get: App["get"],
            TagControl: TagControlFactory,
            MarksControl: MarksControlFactory,
            fluid?: boolean,
            gwfOnly?: boolean,
        }) {
    const [showLiteralResult, setShowLiteralResult] = React.useState(false);
    const [showGwfResult, setShowGwfResult] = React.useState(false);
    const [literalResult, setLiteralResult] = React.useState(undefined as IRetrieveEntry | undefined);
    const [gwfResult, setGwfResult] = React.useState(undefined as IDictionaryEntry | undefined);
    const toggleShowLiteralResult = () => {
        const newValue = !showLiteralResult;
        if (newValue && literalResult === undefined) {
            get(record.q).then((value) => {
                setLiteralResult(value);
            });
        }
        setShowLiteralResult(newValue);
    };
    const toggleShowGwfResult = () => {
        const newValue = !showGwfResult;
        if (newValue && literalResult === undefined) {
            GwfGlue.get("en", record.q).then((value) => {
                setGwfResult(value);
            });
        }
        setShowGwfResult(newValue);
    };
    if (gwfOnly === true && !showGwfResult) { toggleShowGwfResult(); }
    const result = showGwfResult ? gwfResult : (record.result ?? {});
    const resultTags = record.resultTags || {};
    const etymologies = array(result?.etymology);
    const examples = array(result?.example);
    const definitions = result?.definitions || {};
    const partsOfSpeech = Object.keys(definitions);
    const { pipelineNotes, resultDiscarded, resultDiscardedTags } = record;
    const moreInfo = (pipelineNotes && pipelineNotes.length > 0)
        || resultDiscarded || resultDiscardedTags;
    return <>
        {gwfOnly !== true && <MarksControl word={record.q} badges={true} />}
        <Col xs={fluid ? "auto" : gwf ? 1 : 2}>
            {record.q !== array(result?.entry_rich)?.[0] && <Row className={result?.definitions === undefined ? "headword not-found" : "text-muted"}>
                {record.q}
            </Row>}
            {array(result?.entry_rich)?.map((entryRich, index) =>
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
            {array(result?.pronunciation_ipa)?.map((pronunciation, index) =>
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
        <Col xs={fluid ? "auto" : gwf ? 4 : 8}>
            {result === undefined ? <Spinner className="m-2" animation="border" role="status">
                <span className="sr-only">Loading...</span>
            </Spinner> : <>
                    {partsOfSpeech.map((partOfSpeech) => <Row key={partOfSpeech}>
                        <Col xs={2} className="partOfSpeech">{partOfSpeech}</Col>
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
                            <Col xs={2}>etymology</Col>
                            <Col className="etymology">
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
                        </Row>}
                    {examples &&
                        <Row>
                            <Col xs={2}>example</Col>
                            <Col className="example">
                                {examples.map((example, index) =>
                                    <TaggedComponent
                                        key={index}
                                        query={record.q}
                                        word={"?"}
                                        title="Example"
                                        tags={array(resultTags?.example)?.[index]}
                                        TagControl={TagControl}
                                        MarksControl={MarksControl}>
                                        {example.match(/^\w/) ? "“" : ""}
                                        {example}
                                        {example.match(/\w$/) ? "”" : ""}
                                    </TaggedComponent>)}
                            </Col>
                        </Row>}
                </>}
            {showLiteralResult && literalResult && <Row>
                <Col>
                    <LiteralResultComponent entry={literalResult} TagControl={TagControl} />
                </Col>
            </Row>}
        </Col>
        {!fluid && !(gwfOnly === true) && <Col xs={fluid ? "auto" : gwf ? 1 : 2}>
            <ButtonGroup>
                {moreInfo && <OverlayTrigger trigger="click" overlay={popover()} rootClose={true}>
                    <Button size="sm" variant="light">
                        <Icon icon={OpenIconicNames.info} />
                    </Button>
                </OverlayTrigger>}
                <Button size="sm" variant={showLiteralResult ? "secondary" : "light"}
                    onClick={toggleShowLiteralResult}
                >
                    <Icon icon={OpenIconicNames.spreadsheet} />
                </Button>
                {(gwfOnly === undefined) && <Button size="sm" variant={showGwfResult ? "secondary" : "light"}
                    onClick={toggleShowGwfResult}
                >
                    <Icon icon={OpenIconicNames.cloud} />
                </Button>}
                <Button size="sm" variant="light" onClick={getReload(record.q)}>
                    <Icon icon={OpenIconicNames.reload} />
                </Button>
            </ButtonGroup>
        </Col>}
    </>;

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
                        getReload={getReload}
                        get={get}
                        TagControl={TagControl}
                        MarksControl={MarksControl}
                        fluid={true}
                        gwf={false}
                    />
                </div>
            </Popover.Content>
        </Popover>;
    }
}
