import { omit } from "lodash";
import React from "react";
import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import { TagControlFactory } from "./App";
import { AnnotatedHeadwordEntry } from "./OxfordDictionariesPipeline";
import TagControls from "./TagControls";
import IEntry from "./types/gen/IEntry";
import IHeadwordEntry from "./types/gen/IHeadwordEntry";
import ILexicalEntry from "./types/gen/ILexicalEntry";
import IRetrieveEntry from "./types/gen/IRetrieveEntry";

export default function LiteralResultComponent(
    { entry, TagControl }:
        { entry: IRetrieveEntry, TagControl: TagControlFactory; }) {
    return <Container>
        {entry.results?.map((headwordEntry) =>
            <Row key={`${headwordEntry.language}-${headwordEntry.id}-${headwordEntry.word}`}>
                <Col>
                    <HeadwordEntryComponent
                        entry={headwordEntry}
                        TagControl={TagControl}
                    />
                </Col>
            </Row>)}
    </Container>;
}

function HeadwordEntryComponent(
    { entry, TagControl }:
        { entry: IHeadwordEntry, TagControl: TagControlFactory; }) {

    const { tags } = entry as AnnotatedHeadwordEntry;
    const tagControls = tags && <TagControls TagControl={TagControl} word={entry.word} tags={tags} />;
    return <Card>
        <Card.Header>
            {entry.word} <Badge>{entry.type}</Badge> {tagControls}
        </Card.Header>
        <Card.Body>
            {entry.lexicalEntries.map((lexicalEntry, lexicalEntryIndex) =>
                <LexicalEntryComponent
                    key={lexicalEntryIndex}
                    index={lexicalEntryIndex}
                    entry={lexicalEntry}
                    TagControl={TagControl}
                />)}
        </Card.Body>
    </Card>;
}

function LexicalEntryComponent(
    { entry: lexicalEntry, index, TagControl }:
        { entry: ILexicalEntry, index: number, TagControl: TagControlFactory; }) {
    return <>
        <Row>
            <Col>Lexical Entry #{index}</Col>
        </Row>
        <Row>
            <Col xs={2}>{lexicalEntry.lexicalCategory.id}</Col>
            <Col>
                <Row>
                    {lexicalEntry.entries?.map((entry, entryIndex) =>
                        <EntryComponent
                            key={entryIndex}
                            index={entryIndex}
                            entry={entry}
                        />)}
                </Row>
            </Col>
        </Row>
        {Object.entries(omit(lexicalEntry, "entries")).map(([key, value]) => value &&
            <Row key={key}>
                <Col xs={2}>
                    {key}
                </Col>
                <Col as="pre">
                    {JSON.stringify(value, undefined, 2)}
                </Col>
            </Row>)}
    </>;
}

function EntryComponent({ entry, index }: { entry: IEntry, index: number; }) {
    return <Col as="pre">
        <Badge variant="info">Entry #{index}</Badge>
        {JSON.stringify(entry, undefined, 2)}
    </Col>;
}
