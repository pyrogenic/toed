import React from "react";
import Badge from "react-bootstrap/Badge";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Row from "react-bootstrap/Row";
import IWordRecord, { ITags } from "./IWordRecord";
import "./WordTable.css";

interface IProps {
    records: IWordRecord[];
}

function WordRow({ record }: { record: IWordRecord }) {
    const result = record.result || {};
    const resultTags = record.resultTags || {};
    const { etymology, example } = result;
    const definitions = result.definitions || {};
    const partsOfSpeech = Object.keys(definitions);
    const { pipelineNotes } = record;
    const pipelineNoteList = (pipelineNotes && pipelineNotes.length && <ul>{
        pipelineNotes.map((note, index) => <li key={index}>{note}</li>)
    }</ul>) || false;
    const notFound = !(partsOfSpeech.length || etymology || example);

    function popover(id: string, tags?: ITags) {
        return tags && <Popover id={id}>
            <Popover.Title as="h3">{id}</Popover.Title>
            <Popover.Content>
                {tags.partOfSpeech && <Row><Col>Part of Speech</Col>
                    <Col><Badge>{tags.partOfSpeech}</Badge></Col></Row>}
                {tags.domains && <Row><Col>Domains</Col>
                    <Col>{tags.domains.map((t) => <Badge>{t}</Badge>)}</Col></Row>}
                {tags.registers && <Row><Col>Registers</Col>
                    <Col>{tags.registers.map((t) => <Badge>{t}</Badge>)}</Col></Row>}
            </Popover.Content>
        </Popover>;
    }

    return <>
        <Row className="entry">
            <Col xs={1}>
                <OverlayTrigger trigger="click" overlay={popover("Rich Entry", resultTags.entry_rich)} rootClose={true}>
                    <Row className={result.entry_rich ? "headword" : "headword not-found"}>
                        {result.entry_rich || record.q}
                    </Row>
                </OverlayTrigger>
                <Row className="pronunciation">
                    {result.pronunciation_ipa}
                </Row>
                <Row>
                    {JSON.stringify(record.resultTags!.entry_rich!)}
                </Row>
            </Col>
            {notFound ? <Col>{pipelineNoteList}</Col> : <>
                <Col>
                    {partsOfSpeech.map((partOfSpeech) => <Row>
                        <Col xs={2} className="partOfSpeech">{partOfSpeech}</Col>
                        <Col>
                            {definitions[partOfSpeech].map((definition) => <Row><Col>{definition}</Col></Row>)}
                        </Col>
                    </Row>)}
                    {etymology && <Row>
                        <Col xs={2}>etymology</Col>
                        <Col>{etymology}</Col>
                    </Row>}
                    {example && <Row>
                        <Col xs={2}>example</Col>
                        <Col>{example}</Col>
                    </Row>}
                </Col>
                <Col xs={1}>{pipelineNoteList}</Col>
            </>}
        </Row>

    </>;
}

export default class WordTable extends React.Component<IProps, {}> {
    public render() {
        return <div className="word-table">
            <Row>
                <Col xs={1}>Word</Col>
                <Col>Definition</Col>
                <Col xs={1}>Notes</Col>
            </Row>
            {this.props.records.map((record) => <WordRow record={record} />)}
        </div>;
    }
}
