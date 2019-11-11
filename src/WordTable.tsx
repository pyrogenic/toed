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

function Maybe({ when, children }: React.PropsWithChildren<{ when: any }>):
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

    const word = result.entry_rich || record.q;
    // const cell = TaggedComponent({title: "Rich Entry", tags: resultTags.entry_rich, content: row});
    return <>
        <Row className="entry">
            <Col xs={1}>
                <TaggedComponent word={word} title="Rich Entry" tags={resultTags.entry_rich}>
                    <Row className={result.entry_rich ? "headword" : "headword not-found"}>
                        {word}
                    </Row>
                </TaggedComponent>
                <TaggedComponent word={word}  title="Pronunciation" tags={resultTags.pronunciation_ipa}>
                    <Maybe when={result.pronunciation_ipa && result.pronunciation_ipa.length > 0}>
                        <Row className="pronunciation">
                            {result.pronunciation_ipa}
                        </Row>
                    </Maybe>
                </TaggedComponent>
            </Col>
            {notFound ? <Col>{pipelineNoteList}</Col> : <>
                <Col>
                    {partsOfSpeech.map((partOfSpeech) => <Row>
                        <Col xs={2} className="partOfSpeech">{partOfSpeech}</Col>
                        <Col>
                            {definitions[partOfSpeech].map((definition, index) =>
                                <Row>
                                    <Col>
                                        <TaggedComponent
                                            word={`${word} (${partOfSpeech})`}
                                            title="Definition"
                                            tags={resultTags.definitions![partOfSpeech][index]}>
                                            {definition}
                                        </TaggedComponent>
                                    </Col>
                                </Row>)
                            }
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

function TaggedComponent({ word, title, children, tags }:
    React.PropsWithChildren<{ word: string, title: string | false, tags?: ITags }>) {
    if (!children) {
        return null;
    }
    if (!tags) {
        return <>{children}</>;
    }
    return <OverlayTrigger trigger="click" overlay={popover(`${word}-${title}`)} rootClose={true}>
        <div className="trigger-click">
            {children}
        </div>
    </OverlayTrigger>;
    function popover(id: string) {
        return tags && <Popover id={id} className="tags">
            {title && <Popover.Title>{title}</Popover.Title>}
            <Popover.Content>
                {/* {tags.partOfSpeech && <Row><Col>Part of Speech</Col>
                    <Col><Badge>{tags.partOfSpeech}</Badge></Col></Row>}
                {tags.domains && <Row><Col>Domains</Col>
                    <Col>{tags.domains.map((t) => <Badge>{t}</Badge>)}</Col></Row>}
                {tags.registers && <Row><Col>Registers</Col>
                    <Col>{tags.registers.map((t) => <Badge>{t}</Badge>)}</Col></Row>} */}
                {tags.partOfSpeech && <Badge>{tags.partOfSpeech}</Badge>}
                {tags.domains && tags.domains.map((t) => <Badge>{t}</Badge>)}
                {tags.registers && tags.registers.map((t) => <Badge>{t}</Badge>)}
            </Popover.Content>
        </Popover>;
    }
}
