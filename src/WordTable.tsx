import compact from "lodash/compact";
import flatten from "lodash/flatten";
import React from "react";
import Badge from "react-bootstrap/Badge";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Row from "react-bootstrap/Row";
import { TagControlFactory } from "./App";
import IWordRecord, { ITags } from "./IWordRecord";
import { RECORD_SEP } from "./OxfordDictionariesPipeline";
import "./WordTable.css";

interface IProps {
    records: IWordRecord[];
    TagControl: TagControlFactory;
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

function taggedComponent({ word, title, children, tags, TagControl }:
    React.PropsWithChildren<{
        word: string,
        title: string | false,
        tags?: ITags,
        TagControl: TagControlFactory,
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
        console.log(tags);
        return tags && <Popover id={id} className="tags">
            {title && <Popover.Title>{title}</Popover.Title>}
            <Popover.Content>
                {tags.partsOfSpeech && <span>{useLabels && "partsOfSpeech: "}{tags.partsOfSpeech.map((t) =>
                    <TagControl key={t} prop="allowedPartsOfSpeech" flag={t} />)}</span>}

                {tags.grammaticalFeatures && <span>{useLabels && "grammaticalFeatures: "}{tags.grammaticalFeatures.map((t) =>
                    <TagControl key={t} prop="allowedGrammaticalFeatures" flag={t} />)}</span>}

                {tags.domains && <span>{useLabels && "domains: "}{tags.domains.map((t) =>
                    <TagControl key={t} prop="allowedDomains" flag={t} />)}</span>}

                {tags.registers && <span>{useLabels && "registers: "}{tags.registers.map((t) =>
                    <TagControl key={t} prop="allowedRegisters" flag={t} />)}</span>}

                {tags.imputed && <span>{useLabels && "imputed: "}{tags.imputed.map(([t, comment]) =>
                    <TagControl key={t} prop="allowedImputed" flag={t} detail={comment}/>)}</span>}
            </Popover.Content>
        </Popover>;
    }
}

const TaggedComponent = taggedComponent;

function WordRow({ record, TagControl, fluid }:
    { record: IWordRecord, TagControl: TagControlFactory, fluid?: boolean }) {
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
    return <Row className="entry" key={`${record.q}`}>
        <Col xs={fluid ? "auto" : 1}>
            {result.entry_rich && record.q !== result.entry_rich && <Row className="text-muted">
                {record.q}
            </Row>}
            <TaggedComponent word={word} title="Rich Entry" tags={resultTags.entry_rich} TagControl={TagControl}>
                <Row className={result.entry_rich ? "headword" : "headword not-found"}>
                    {word.toString()}
                </Row>
            </TaggedComponent>
            <Maybe when={result.pronunciation_ipa && result.pronunciation_ipa.length > 0}>
                <TaggedComponent word={word} title="Pronunciation"
                    tags={resultTags.pronunciation_ipa} TagControl={TagControl}>
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
                                        word={`${word} (${partOfSpeech})`}
                                        title="Definition"
                                        tags={resultTags.definitions?.[partOfSpeech]?.[index]}
                                        TagControl={TagControl}>
                                        {definition}
                                    </TaggedComponent>
                                </Col>
                            </Row>)
                        }
                    </Col>
                </Row>)}
                {etymology &&
                    <TaggedComponent word={word} title="Etymology" tags={resultTags.etymology} TagControl={TagControl}>
                        <Row>
                            <Col xs={fluid ? "auto" : 2}>etymology</Col>
                            <Col>{etymology}</Col>
                        </Row>
                    </TaggedComponent>}
                {example &&
                    <TaggedComponent word={word} title="Example" tags={resultTags.example} TagControl={TagControl}>
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
                    <WordRow record={discardedRecord} TagControl={TagControl} fluid={true}/>
                </div>
            </Popover.Content>
        </Popover>;
    }
}

export default class WordTable extends React.Component<IProps, {}> {
    public render() {
        return <div className="word-table">
            <Row>
                <Col xs={1}>Word</Col>
                <Col>Definition</Col>
                <Col xs={1}>Notes</Col>
            </Row>
            {this.props.records.map((record) =>
                <WordRow key={record.q} record={record} TagControl={this.props.TagControl} />)}
        </div>;
    }
}
