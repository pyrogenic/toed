import compact from "lodash/compact";
import flatten from "lodash/flatten";
import React from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import { MarksControlFactory, TagControlFactory } from "./App";
import { ITags } from "./IWordRecord";
import TagControls from "./TagControls";

export default function TaggedComponent({ query, word, title, children, tags, TagControl, MarksControl }:
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
        return tags ? <Popover id={id} className="tags">
            {title && <Popover.Title>{title} <span className="text-muted">{word}</span></Popover.Title>}
            <Popover.Content>
                <TagControls TagControl={TagControl} word={word} tags={tags} />
            </Popover.Content>
            <Popover.Content>
                <MarksControl word={query} />
            </Popover.Content>
        </Popover> : <></>;
    }
};
