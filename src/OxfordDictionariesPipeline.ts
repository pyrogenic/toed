import cloneDeep from "lodash/cloneDeep";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import App, {configKeyToTagKey} from "./App";
import IDictionaryEntry from "./IDictionaryEntry";
import IWordRecord, {ITags} from "./IWordRecord";
import {arraySetAdd, arraySetAddAll, ensure} from "./Magic";
import map from "./map";
import needsMoreDefinitions from "./needsMoreDefinitions";
import Pass from "./Pass";
import IHeadwordEntry from "./types/gen/IHeadwordEntry";
import ILexicalEntry from "./types/gen/ILexicalEntry";
import IPronunciation from "./types/gen/IPronunciation";
import ISense from "./types/gen/ISense";

export interface IPassMap { [key: string]: Pass; }

export interface IPipelineConfig {
    allowedPartsOfSpeech: IPassMap;
    allowedGrammaticalFeatures: IPassMap;
    allowedRegisters: IPassMap;
    allowedDomains: IPassMap;
    allowedImputed: IPassMap;
}

export type FlagPropertyNames<T> = { [K in keyof Required<T>]: T[K] extends IPassMap ? K : never }[keyof T];

export type PartialWordRecord = Pick<IWordRecord, "result" | "resultTags" | "resultOriginal" | "resultDiscarded" | "resultDiscardedTags" | "allTags" | "pipelineNotes">;

const RECORD_SEP = "///";
export {RECORD_SEP};

function copyTags(src: ITags, dst: ITags) {
    Object.entries(src).map(([key, flags]) =>
        arraySetAddAll(dst, key as keyof ITags, flags));
}

function appendGrammaticalFeatures(
    lexicalEntry: Pick<ILexicalEntry, "grammaticalFeatures">, grammaticalFeatures: string[] | undefined) {
    grammaticalFeatures = grammaticalFeatures ?? [];
    if (lexicalEntry.grammaticalFeatures) {
        grammaticalFeatures = [
            ...grammaticalFeatures,
            ...lexicalEntry.grammaticalFeatures.map((e) => e.id),
        ];
    }
    return grammaticalFeatures;
}

function undefIfEmpty(value: any[] | undefined) {
    if (value === undefined || value.length === 0) {
        return undefined;
    }
    return value;
}

export default class OxfordDictionariesPipeline {
    public readonly query: string;
    public readonly entries: IHeadwordEntry[];
    public allEntryTexts: string[];

    private readonly allowed: App["allowed"];
    private readonly processed: App["processed"];

    constructor(query: string, entries: IHeadwordEntry[], allowed: App["allowed"], processed: App["processed"]) {
        this.allowed = allowed;
        this.processed = processed;
        this.query = query;
        this.entries = entries;
        this.allEntryTexts = flatten(map(flatten(map(entries, "lexicalEntries")), "text"));
    }

    public process(existingRecord?: PartialWordRecord): IWordRecord["result"] {
        const { entries, query } = this;
        const record = existingRecord || {};
        const result = ensure(record, "result", Object);
        const resultTags = ensure(record, "resultTags", Object);
        const allTags = ensure(record, "allTags", Object);
        const lowercaseMatchingEntryTexts = undefIfEmpty(this.allEntryTexts.filter((text) =>
            query.toLocaleLowerCase() === text));
        const mixedCaseMatchingEntryTexts = undefIfEmpty(this.allEntryTexts.filter((text) => {
            const lowerCase = text.toLocaleLowerCase();
            return lowerCase !== text && query.toLocaleLowerCase() === lowerCase;
        }));
        const internalRedirects = new Map<IHeadwordEntry, IHeadwordEntry>();
        entries.forEach((target) => {
            const definedBy = entries.find((headword) => {
                if (headword === target) {
                    return false;
                }
                return headword.lexicalEntries?.some((lexicalEntry) => {
                    return lexicalEntry.entries?.some((entry) => {
                        return entry.senses?.some((sense) => {
                            // console.log({
                            //     word,
                            //     headword: headword.word,
                            //     lexicalEntry: lexicalEntry.text,
                            //     entry,
                            //     sense: sense.shortDefinitions,
                            // });
                            return flatten(compact([sense.definitions, sense.shortDefinitions]))
                                .some((definition) => definition.match(target.word));
                        });
                    });
                });
            });
            if (definedBy) {
                internalRedirects.set(target, definedBy);
            }
        });
        // console.log({matchingEntryTexts, allEntryTexts: this.allEntryTexts, internalRedirects});
        const rejectedLexicalEntries: ILexicalEntry[] = [];
        const discard = (
            lexicalEntry: Pick<ILexicalEntry, "entries" | "lexicalCategory" | "text">,
            tags: ITags,
            reason?: string) => {
            const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
            lexicalEntry.entries?.forEach((lentry) => {
                const grammaticalFeatures = lentry.grammaticalFeatures?.map((e) => e.id);
                lentry.senses?.forEach((sense) => {
                    const senseTags: ITags = cloneDeep(tags);
                    arraySetAdd(senseTags, "partsOfSpeech", partOfSpeech);
                    arraySetAddAll(senseTags, "grammaticalFeatures", grammaticalFeatures);
                    arraySetAddAll(senseTags, "registers", sense.registers?.map((e) => e.id));
                    arraySetAddAll(senseTags, "domains", sense.domains?.map((e) => e.id));
                    sense.definitions?.forEach((definition) => {
                        const discards = ensure(record, "resultDiscarded", Object);
                        discards.definitions = discards.definitions || {};
                        discards.definitions[partOfSpeech] = discards.definitions[partOfSpeech] || [];
                        if (!discards.definitions[partOfSpeech].includes(definition)) {
                            discards.definitions[partOfSpeech].push(definition);
                            const discardTags = ensure(record, "resultDiscardedTags", Object);
                            discardTags.definitions = discardTags.definitions || {};
                            discardTags.definitions[partOfSpeech] = discardTags.definitions[partOfSpeech] || [];
                            discardTags.definitions[partOfSpeech].push(senseTags);
                            copyTags(senseTags, allTags);
                        }
                    });
                    sense.subsenses?.forEach((subsense) => {
                        subsense.definitions?.forEach((definition) => {
                            const discards = ensure(record, "resultDiscarded", Object);
                            discards.definitions = discards.definitions || {};
                            discards.definitions[partOfSpeech] = discards.definitions[partOfSpeech] || [];
                            if (!discards.definitions[partOfSpeech].includes(definition)) {
                                discards.definitions[partOfSpeech].push(definition);
                                const subsenseTags = cloneDeep(senseTags);
                                arraySetAdd(subsenseTags, "partsOfSpeech", partOfSpeech);
                                arraySetAddAll(subsenseTags, "grammaticalFeatures", grammaticalFeatures);
                                arraySetAddAll(subsenseTags, "registers", sense.registers?.map((e) => e.id));
                                arraySetAddAll(subsenseTags, "domains", sense.domains?.map((e) => e.id));
                                const discardTags = ensure(record, "resultDiscardedTags", Object);
                                discardTags.definitions = discardTags.definitions || {};
                                discardTags.definitions[partOfSpeech] = discardTags.definitions[partOfSpeech] || [];
                                discardTags.definitions[partOfSpeech].push(subsenseTags);
                                copyTags(subsenseTags, allTags);
                            }
                        });
                    });
                });
            });
            if (reason) {
                arraySetAdd(record, "pipelineNotes", reason);
            } else {
                // todo: assert tags
            }
            rejectedLexicalEntries.push(lexicalEntry as ILexicalEntry);
        };

        function imputeTags(entry: IHeadwordEntry, lexicalEntry: ILexicalEntry) {
            const internalRedirect = internalRedirects.get(entry);
            const entryTags: ITags = {};
            internalRedirect?.lexicalEntries.forEach((redirectedFrom) => {
                entryTags.grammaticalFeatures =
                    appendGrammaticalFeatures(redirectedFrom, entryTags.grammaticalFeatures);
                arraySetAdd(entryTags, "imputed",
                    [`redirect-${redirectedFrom.lexicalCategory.id}`, `from '${internalRedirect.word}'`]);
            });
            const {lexicalCategory: {id: partOfSpeech}, text} = lexicalEntry;
            const lexicalEntryTags = cloneDeep(entryTags);
            if (text === query.toLocaleLowerCase()) {
                arraySetAdd(lexicalEntryTags, "imputed", ["exact"]);
            }
            const lowerCase = text.toLocaleLowerCase();
            if (lowerCase !== text) {
                arraySetAdd(lexicalEntryTags, "imputed", ["mixed-case"]);
                if (lowerCase === query.toLocaleLowerCase()) {
                    arraySetAdd(lexicalEntryTags, "imputed", ["exact-mixed-case"]);
                }
            }
            if (lowercaseMatchingEntryTexts && text.length !== query.length) {
                arraySetAdd(lexicalEntryTags, "imputed", ["inexact",
                    `exact matches of the query ('${lowercaseMatchingEntryTexts.join("', '")}') are present`]);
            }
            if (mixedCaseMatchingEntryTexts && text.length !== query.length) {
                arraySetAdd(lexicalEntryTags, "imputed", ["inexact-mixed-case",
                    `mixed-case matches of the query ('${mixedCaseMatchingEntryTexts.join("', '")}') are present`]);
            }
            if (internalRedirect) {
                arraySetAdd(lexicalEntryTags, "imputed",
                    ["redirect", `'${text}' -> '${internalRedirect.word}'`]);
            }
            return lexicalEntryTags;
        }

        entries.forEach((entry) => {
            const { pronunciations } = entry;
            this.pullPronunciation(result, pronunciations);
            entry.lexicalEntries.forEach((lexicalEntry) => {
                const {lexicalCategory: {id: partOfSpeech}, text} = lexicalEntry;
                const lexicalEntryTags = imputeTags(entry, lexicalEntry);
                let grammaticalFeatures = appendGrammaticalFeatures(lexicalEntry, undefined);
                if (grammaticalFeatures.length > 0) {
                    const disallowed = grammaticalFeatures.filter((tag) => {
                        const tagAllowedForPass = this.allowed("allowedGrammaticalFeatures", tag);
                        return tagAllowedForPass === Pass.banned;
                    });
                    if (disallowed.length > 0) {
                        arraySetAdd(lexicalEntryTags, "imputed",
                            ["banned-grammatical-features",
                                `‘${text}’ rejected because ${disallowed.join(" & ")} is/are banned`]);
                        return discard(lexicalEntry, lexicalEntryTags);
                    }
                }
                const allowedForPass = this.allowed("allowedPartsOfSpeech", partOfSpeech);
                if (allowedForPass === Pass.banned) {
                    arraySetAdd(lexicalEntryTags, "imputed",
                        ["banned-part-of-speech", partOfSpeech]);
                    return discard(lexicalEntry, lexicalEntryTags);
                }
                this.pullPronunciation(result, lexicalEntry.pronunciations);
                if (lexicalEntry.entries) {
                    lexicalEntry.entries.forEach((lentry) => {
                        const lentryTags = cloneDeep(lexicalEntryTags);
                        if (lentry.grammaticalFeatures) {
                            grammaticalFeatures = [
                                ...grammaticalFeatures,
                                ...lentry.grammaticalFeatures.map((e) => e.id),
                            ];
                            const disallowed = grammaticalFeatures.filter((tag) => {
                                const tagAllowedForPass = this.allowed("allowedGrammaticalFeatures", tag);
                                return tagAllowedForPass === Pass.banned;
                            });
                            if (disallowed.length > 0) {
                                arraySetAdd(lentryTags, "imputed",
                                    ["banned-grammatical-features", disallowed.join(", ")]);
                                return discard({text, lexicalCategory: lexicalEntry.lexicalCategory, entries: [entry]},
                                    lentryTags);
                            }
                        }
                        this.pullPronunciation(result, lentry.pronunciations);
                        const baseWord = this.query;
                        const { etymologies, senses, variantForms } = lentry;
                        if (variantForms && baseWord && result.entry_rich !== baseWord
                            && variantForms.find((vf) => vf.text === baseWord)) {
                            result.entry_rich = baseWord;
                            resultTags.entry_rich = { partsOfSpeech: [partOfSpeech] };
                        }
                        // pass down etymologies so we only take them from entries with first-pass acceptable senses
                        if (senses) {
                            senses.forEach(this.processSense.bind(
                                this, record, lentryTags, discard, {
                                etymologies,
                                grammaticalFeatures,
                                partOfSpeech,
                                pass: 1,
                                short: false,
                                subsenses: false,
                                text,
                            }));
                        }
                    });
                }
            });
        });

        [
            { short: true, subsenses: false, pass: Pass.primary },
            { short: false, subsenses: true, pass: Pass.primary },
            { short: true, subsenses: true, pass: Pass.primary },

            { short: false, subsenses: false, pass: Pass.secondary },
            { short: false, subsenses: true, pass: Pass.secondary },
            { short: true, subsenses: false, pass: Pass.secondary },
            { short: true, subsenses: true, pass: Pass.secondary },

            { short: false, subsenses: false, pass: Pass.tertiary },
            { short: false, subsenses: true, pass: Pass.tertiary },
            { short: true, subsenses: false, pass: Pass.tertiary },
            { short: true, subsenses: true, pass: Pass.tertiary },
        ].forEach((pass) => {
            entries.forEach((entry, entryIndex) => {
                entry.lexicalEntries.forEach((lexicalEntry, lexicalEntryIndex) => {
                    if (rejectedLexicalEntries.includes(lexicalEntry)) {
                        return;
                    }
                    const { lexicalCategory: { id: partOfSpeech }, entries: lexicalEntryEntries} = lexicalEntry;
                    if (lexicalEntryEntries === undefined || lexicalEntryEntries.length === 0) { return; }
                    const lexicalEntryTags = imputeTags(entry, lexicalEntry);
                    const grammaticalFeatures = appendGrammaticalFeatures(lexicalEntry, undefined);
                    lexicalEntryEntries.forEach((lentry, lentryIndex) => {
                        const { senses } = lentry;
                        if (senses === undefined || senses.length === 0) { return; }
                        const lentryGrammaticalFeatures = appendGrammaticalFeatures(lentry, grammaticalFeatures);
                        if (lentryGrammaticalFeatures.length > 0) {
                            const disallowed = lentryGrammaticalFeatures.filter((tag) => {
                                const tagAllowedForPass = this.allowed("allowedGrammaticalFeatures", tag);
                                return tagAllowedForPass > pass.pass;
                            });
                            if (disallowed.length > 0) {
                                console.log(`entry ${entryIndex}.${lentryIndex} rejected because ${disallowed.join(" & ")} is/are disallowed for pass ${pass.pass}`);
                                return;
                            }
                        }
                        senses.forEach(this.processSense.bind(this, record, lexicalEntryTags, discard, {
                            grammaticalFeatures: lentryGrammaticalFeatures,
                            partOfSpeech,
                            text: lexicalEntry.text,
                            ...pass,
                        }));
                    });
                });
            });
        });
        if (resultTags.entry_rich) {
            copyTags(resultTags.entry_rich, allTags);
        }
        if (resultTags.audio_file) {
            copyTags(resultTags.audio_file, allTags);
        }
        if (resultTags.definitions) {
            Object.values(resultTags.definitions).forEach((definitions) =>
                definitions.forEach((definition) => copyTags(definition, allTags)));
        }
        if (resultTags.etymology) {
            copyTags(resultTags.etymology, allTags);
        }
        if (resultTags.example) {
            copyTags(resultTags.example, allTags);
        }
        if (resultTags.pronunciation_ipa) {
            copyTags(resultTags.pronunciation_ipa, allTags);
        }
        this.processed(this.query, record);
        return result;
    }

    private processSense(
        record: PartialWordRecord,
        tags: ITags,
        discard: (
            lexicalEntry: Pick<ILexicalEntry, "entries" | "lexicalCategory" | "text">,
            tags: ITags,
            reason?: string) => void,
        { text, partOfSpeech, grammaticalFeatures,
            short, pass, subsenses: onlySubsenses, etymologies: entryEtymologies }:
            {
                text: string, partOfSpeech: string, grammaticalFeatures: string[],
                short: boolean, pass: Pass, subsenses: boolean, etymologies?: string[],
            },
        sense: ISense) {
        const result = record.result!;
        const { pronunciations, subsenses, examples, etymologies: senseEtymologies } = sense;
        const definitions = short ? sense.shortDefinitions : sense.definitions;
        this.pullPronunciation(result, pronunciations);
        tags = cloneDeep(tags);
        const resultTags = ensure(record, "resultTags", Object);
        const allTags = ensure(record, "allTags", Object);
        arraySetAdd(tags, "partsOfSpeech", partOfSpeech);
        // arraySetAdd(allTags, "partsOfSpeech", partOfSpeech);
        arraySetAddAll(tags, "grammaticalFeatures", grammaticalFeatures);
        // arraySetAddAll(allTags, "grammaticalFeatures", grammaticalFeatures);
        const registers = tags.registers = (sense.registers || []).map((e) => e.id);
        arraySetAddAll(tags, "registers", registers);
        // arraySetAddAll(allTags, "registers", registers);
        const domains = tags.domains = (sense.domains || []).map((e) => e.id);
        arraySetAddAll(tags, "domains", domains);
        // arraySetAddAll(allTags, "domains", domains);
        copyTags(tags, allTags);
        const passMap: Array<{ flag: string; allowed: Pass; type: keyof ITags }> = [];
        let check: (...args: Parameters<App["allowed"]>) => void;
        check = (prop, flag) => {
            const allowed = this.allowed(prop, flag);
            const type = configKeyToTagKey(prop);
            const item = {type, flag, allowed};
            passMap.push(item);
        };
        [partOfSpeech].forEach(check.bind(null, "allowedPartsOfSpeech"));
        registers.forEach(check.bind(null, "allowedRegisters"));
        grammaticalFeatures.forEach(check.bind(null, "allowedGrammaticalFeatures"));
        domains.forEach(check.bind(null, "allowedDomains"));
        tags.imputed?.map(([tag]) => tag).forEach(check.bind(null, "allowedImputed"));
        const passes = passMap.map(({allowed}) => allowed);
        const banned = Math.min(...passes) === 0;
        const requiredPass = Math.max(...passes);
        if (banned) {
            if (pass === Pass.primary) {
                discard({ entries: [{senses: [sense]}], lexicalCategory: { id: partOfSpeech, text: "banned" }, text: "banned"},
                    {imputed: passMap.filter(({allowed}) => allowed === Pass.banned)
                            .map(({type, flag}) => [`banned-${type}`, flag])});
            }
            return;
        }
        if (requiredPass !== pass) {
            return;
        }
        const etymologies = entryEtymologies || senseEtymologies;
        if (!result.etymology && etymologies) {
            const etymology = etymologies[0];
            result.etymology = this.cleanOxfordText(etymology);
            resultTags.etymology = tags;
            if (result.etymology !== etymology) {
                const originals = ensure(record, "resultOriginal", Object);
                originals.etymology = etymology;
            }
        }
        if (onlySubsenses) {
            if (subsenses) {
                subsenses.forEach(this.processSense.bind(this, record, tags, discard, {
                    grammaticalFeatures,
                    partOfSpeech,
                    pass,
                    short,
                    subsenses: true,
                    text,
                }));
            }
            return;
        }
        if (definitions) {
            definitions.forEach((definition) => {
                if (needsMoreDefinitions(result, partOfSpeech, short, pass)) {
                    if (!result.entry_rich) {
                        result.entry_rich = text;
                        resultTags.entry_rich = { partsOfSpeech: [partOfSpeech], grammaticalFeatures };
                    }
                    const cleanDefinition = this.cleanOxfordText(definition);
                    result.definitions = result.definitions || {};
                    result.definitions[partOfSpeech] = result.definitions[partOfSpeech] || [];
                    result.definitions[partOfSpeech].push(cleanDefinition);
                    resultTags.definitions = resultTags.definitions || {};
                    resultTags.definitions[partOfSpeech] = resultTags.definitions[partOfSpeech] || [];
                    console.log({definition, tags});
                    resultTags.definitions[partOfSpeech].push(tags);
                    if (cleanDefinition !== definition) {
                        const originals = ensure(record, "resultOriginal", Object);
                        originals.definitions = originals.definitions || {};
                        originals.definitions[partOfSpeech] = originals.definitions[partOfSpeech] || [];
                        originals.definitions[partOfSpeech].push(definition);
                    }
                    let discardedExamples = examples;
                    if (!result.example && examples && examples.length > 0) {
                        const example = examples[0].text;
                        if (examples.length > 1) {
                            discardedExamples = discardedExamples!.slice(1);
                        }
                        result.example = this.cleanOxfordText(example);
                        resultTags.example = tags;
                        if (result.example !== example) {
                            const originals = ensure(record, "resultOriginal", Object);
                            originals.example = example;
                        }
                    }
                    if (discardedExamples && discardedExamples.length > 0) {
                        const discards = ensure(record, "resultDiscarded", Object);
                        discards.example = uniq(compact([
                            discards.example, ...discardedExamples.map((e) => e.text)])).join(RECORD_SEP);
                    }
                } else {
                    arraySetAdd(tags, "imputed", ["extra"]);
                    discard({
                        entries: [{
                            senses: [{
                                definitions: [definition],
                                examples,
                            }],
                        }], lexicalCategory: {id: partOfSpeech, text: "extra"}, text,
                    }, tags);
                }
            });
        }
    }

    private cleanOxfordText(example: string): string {
        example = example.replace(/((?:Middle|Old) English)(\w)/g, "$1 $2");
        example = example.replace(/(\S)‘([^’]+)’/g, "$1 ‘$2’");
        return example;
    }

    private pullPronunciation(result: Partial<IDictionaryEntry>, pronunciations?: IPronunciation[]) {
        if (pronunciations) {
            pronunciations.forEach((p) => {
                if (!result.pronunciation_ipa && p.phoneticNotation === "IPA") {
                    result.pronunciation_ipa = p.phoneticSpelling;
                    if (!result.audio_file) {
                        result.audio_file = p.audioFile;
                    }
                }
            });
        }
    }
}
