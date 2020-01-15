import React from "react";
import { TagControlFactory } from "./App";
import { ITags } from "./IWordRecord";

export default function TagControls(
    { tags, useLabels, word, TagControl }:
        { tags: ITags, word: string, useLabels?: boolean, TagControl: TagControlFactory; },
) {
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
}
