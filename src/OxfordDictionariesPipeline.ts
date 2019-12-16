import cloneDeep from "lodash/cloneDeep";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import App from "./App";
import IDictionaryEntry from "./IDictionaryEntry";
import IWordRecord, { ITags } from "./IWordRecord";
import { arraySetAdd, arraySetAddAll, ensure } from "./Magic";
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
}

export type FlagPropertyNames<T> = { [K in keyof Required<T>]: T[K] extends IPassMap ? K : never }[keyof T];

type PartialWordRecord = Pick<IWordRecord, "result" | "resultTags" | "resultOriginal" | "resultDiscarded" | "resultDiscardedTags" | "allTags" | "pipelineNotes">;

const RECORD_SEP = "///";
export {RECORD_SEP};

export default class OxfordDictionariesPipeline {
    public readonly query: string;
    public readonly entries: IHeadwordEntry[];
    public allEntryTexts: string[];
    private allowed: App["allowed"];

    constructor(query: string, entries: IHeadwordEntry[], allowed: App["allowed"]) {
        this.allowed = allowed;
        this.query = query;
        this.entries = entries;
        this.allEntryTexts = flatten(map(flatten(map(entries, "lexicalEntries")), "text"));
    }

    public process(precord?: PartialWordRecord): IWordRecord["result"] {
        const { entries, query } = this;
        const record = precord || {};
        const result = ensure(record, "result", Object);
        const resultTags = ensure(record, "resultTags", Object);
        const allTags = ensure(record, "allTags", Object);
        const matchingEntryTexts = this.allEntryTexts.some((text) =>
          query.toLocaleLowerCase() === text);
        // tslint:disable-next-line:no-console
        console.log(`Processing ${query}…`);
        const rejectedLexicalEntries: ILexicalEntry[] = [];
        const discard = (
            lexicalEntry: Pick<ILexicalEntry, "entries" | "lexicalCategory" | "text">,
            reason: string) => {
            const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
            lexicalEntry.entries?.forEach((lentry) => {
                const grammaticalFeatures = lentry.grammaticalFeatures?.map((e) => e.id);
                lentry.senses?.forEach((sense) => {
                    const tags: ITags = {};
                    arraySetAdd(tags, "partOfSpeech", partOfSpeech);
                    arraySetAddAll(tags, "grammaticalFeatures", grammaticalFeatures);
                    arraySetAddAll(tags, "registers", sense.registers?.map((e) => e.id));
                    arraySetAddAll(tags, "domains", sense.domains?.map((e) => e.id));
                    sense.definitions?.forEach((definition) => {
                        // tslint:disable-next-line:no-console
                        console.log(`Discarding ${definition}`);
                        const discards = ensure(record, "resultDiscarded", Object);
                        discards.definitions = discards.definitions || {};
                        discards.definitions[partOfSpeech] = discards.definitions[partOfSpeech] || [];
                        discards.definitions[partOfSpeech].push(definition);
                        const discardTags = ensure(record, "resultDiscardedTags", Object);
                        discardTags.definitions = discardTags.definitions || {};
                        discardTags.definitions[partOfSpeech] = discardTags.definitions[partOfSpeech] || [];
                        discardTags.definitions[partOfSpeech].push(tags);
                    });
                    sense.subsenses?.forEach((subsense) => {
                        subsense.definitions?.forEach((definition) => {
                            // tslint:disable-next-line:no-console
                            console.log(`Discarding subsense ${definition}`);
                            const discards = ensure(record, "resultDiscarded", Object);
                            discards.definitions = discards.definitions || {};
                            discards.definitions[partOfSpeech] = discards.definitions[partOfSpeech] || [];
                            discards.definitions[partOfSpeech].push(definition);
                            const subsenseTags = cloneDeep(tags);
                            arraySetAdd(subsenseTags, "partOfSpeech", partOfSpeech);
                            arraySetAddAll(subsenseTags, "grammaticalFeatures", grammaticalFeatures);
                            arraySetAddAll(subsenseTags, "registers", sense.registers?.map((e) => e.id));
                            arraySetAddAll(subsenseTags, "domains", sense.domains?.map((e) => e.id));
                            const discardTags = ensure(record, "resultDiscardedTags", Object);
                            discardTags.definitions = discardTags.definitions || {};
                            discardTags.definitions[partOfSpeech] = discardTags.definitions[partOfSpeech] || [];
                            discardTags.definitions[partOfSpeech].push(subsenseTags);
                        });
                    });
                });
            });
            arraySetAdd(record, "pipelineNotes", reason);
            rejectedLexicalEntries.push(lexicalEntry as ILexicalEntry);
        };
        entries.forEach((entry) => {
            const { pronunciations } = entry;
            this.pullPronunciation(result, pronunciations);
            entry.lexicalEntries.forEach((lexicalEntry) => {
                const { lexicalCategory: { id: partOfSpeech }, text } = lexicalEntry;
                let grammaticalFeatures: string[] = [];
                // tslint:disable-next-line:no-console
                console.log({query, grammaticalFeatures: lexicalEntry.grammaticalFeatures});
                if (lexicalEntry.grammaticalFeatures) {
                    grammaticalFeatures = lexicalEntry.grammaticalFeatures.map((e) => e.id);
                    arraySetAddAll(allTags, "grammaticalFeatures", grammaticalFeatures);
                    const disallowed = grammaticalFeatures.filter((tag) => {
                        const tagAllowedForPass = this.allowed("allowedGrammaticalFeatures", tag);
                        return tagAllowedForPass === Pass.banned;
                    });
                    if (disallowed.length > 0) {
                        return discard(lexicalEntry, `‘${text}’ rejected because ${disallowed.join(" & ")} is/are banned`);
                    }
                }
                const allowedForPass = this.allowed("allowedPartsOfSpeech", partOfSpeech);
                if (allowedForPass === Pass.banned) {
                    return discard(lexicalEntry, `‘${text}’ rejected because ${partOfSpeech} is banned`);
                }
                if (text.match(/[A-Z]/)) {
                    return discard(lexicalEntry, `‘${text}’ rejected because of capitalization`);
                }
                if (matchingEntryTexts && text.length !== query.length) {
                    return discard(lexicalEntry, `‘${text}’ rejected because exact matches of the query are present`);
                }
                if (!result.entry_rich) {
                    result.entry_rich = text;
                    resultTags.entry_rich = { partOfSpeech: [partOfSpeech], grammaticalFeatures };
                }
                this.pullPronunciation(result, lexicalEntry.pronunciations);
                if (lexicalEntry.entries) {
                    lexicalEntry.entries.forEach((lentry) => {
                        // tslint:disable-next-line:no-console
                        console.log({query, grammaticalFeatures: lentry.grammaticalFeatures});
                        if (lentry.grammaticalFeatures) {
                            grammaticalFeatures = [
                                ...grammaticalFeatures,
                                ...lentry.grammaticalFeatures.map((e) => e.id),
                            ];
                            arraySetAddAll(allTags, "grammaticalFeatures", grammaticalFeatures);
                            const disallowed = grammaticalFeatures.filter((tag) => {
                                const tagAllowedForPass = this.allowed("allowedGrammaticalFeatures", tag);
                                return tagAllowedForPass === Pass.banned;
                            });
                            if (disallowed.length > 0) {
                                return discard({text, lexicalCategory: lexicalEntry.lexicalCategory, entries: [entry]}, `‘${text}’ rejected because ${disallowed.join(" & ")} is/are banned`);
                            }
                        }
                        this.pullPronunciation(result, lentry.pronunciations);
                        const baseWord = this.query;
                        const { etymologies, senses, variantForms } = lentry;
                        if (variantForms && baseWord && result.entry_rich !== baseWord
                            && variantForms.find((vf) => vf.text === baseWord)) {
                            result.entry_rich = baseWord;
                            resultTags.entry_rich = { partOfSpeech: [partOfSpeech] };
                        }
                        // pass down etymologies so we only take them from entries with first-pass acceptable senses
                        if (senses) {
                            senses.forEach(this.processSense.bind(
                                this, record, {
                                etymologies,
                                grammaticalFeatures,
                                partOfSpeech,
                                pass: 1,
                                short: false,
                                subsenses: false,
                            }));
                        }
                    });
                }
            });
        });

        [
            { short: true, subsenses: false, pass: 1 as Pass },
            { short: false, subsenses: true, pass: 1 as Pass },
            { short: true, subsenses: true, pass: 1 as Pass },

            { short: false, subsenses: false, pass: 2 as Pass },
            { short: false, subsenses: true, pass: 2 as Pass },
            { short: true, subsenses: false, pass: 2 as Pass },
            { short: true, subsenses: true, pass: 2 as Pass },
        ].forEach((pass) => {
            entries.forEach((entry, entryIndex) => {
                entry.lexicalEntries.forEach((lexicalEntry, lexicalEntryIndex) => {
                    if (rejectedLexicalEntries.includes(lexicalEntry)) {
                        return;
                    }
                    const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
                    if (!lexicalEntry.entries) { return; }
                    let grammaticalFeatures: string[] = [];
                    if (lexicalEntry.grammaticalFeatures) {
                        grammaticalFeatures = lexicalEntry.grammaticalFeatures.map((e) => e.id);
                        // tslint:disable-next-line:no-console
                        console.log({query, grammaticalFeatures});
                        arraySetAddAll(allTags, "grammaticalFeatures", grammaticalFeatures);
                        const disallowed = grammaticalFeatures.filter((tag) => {
                            const tagAllowedForPass = this.allowed("allowedGrammaticalFeatures", tag);
                            return tagAllowedForPass > pass.pass;
                        });
                        if (disallowed.length > 0) {
                            return discard(lexicalEntry, `entry ${entryIndex}.${lexicalEntryIndex} rejected because ${disallowed.join(" & ")} is/are disallowed for pass ${pass.pass}`);
                        }
                    }
                    lexicalEntry.entries.forEach((lentry, lentryIndex) => {
                        const { senses } = lentry;
                        if (!senses) { return; }
                        if (lentry.grammaticalFeatures) {
                            grammaticalFeatures = [
                                ...grammaticalFeatures,
                                ...lentry.grammaticalFeatures.map((e) => e.id),
                            ];
                            // tslint:disable-next-line:no-console
                            console.log({query, grammaticalFeatures});
                            arraySetAddAll(allTags, "grammaticalFeatures", grammaticalFeatures);
                            const disallowed = grammaticalFeatures.filter((tag) => {
                                const tagAllowedForPass = this.allowed("allowedGrammaticalFeatures", tag);
                                return tagAllowedForPass > pass.pass;
                            });
                            if (disallowed.length > 0) {
                                return discard(lexicalEntry, `entry ${entryIndex}.${lentryIndex} rejected because ${disallowed.join(" & ")} is/are disallowed for pass ${pass.pass}`);
                            }
                        }
                        senses.forEach(this.processSense.bind(this, record, {
                            grammaticalFeatures,
                            partOfSpeech,
                            ...pass,
                        }));
                    });
                });
            });
        });
        return result;
    }

    private processSense(
        record: PartialWordRecord,
        { partOfSpeech, grammaticalFeatures, short, pass, subsenses: onlySubsenses, etymologies: entryEtymologies }:
            {
                partOfSpeech: string, grammaticalFeatures: string[],
                short: boolean, pass: Pass, subsenses: boolean, etymologies?: string[],
            },
        sense: ISense) {
        const result = record.result!;
        const { pronunciations, subsenses, examples, etymologies: senseEtymologies } = sense;
        const definitions = short ? sense.shortDefinitions : sense.definitions;
        this.pullPronunciation(result, pronunciations);
        const resultTags = ensure(record, "resultTags", Object);
        const tags: ITags = {};
        const allTags = ensure(record, "allTags", Object);
        arraySetAdd(allTags, "partOfSpeech", partOfSpeech);
        arraySetAdd(tags, "partOfSpeech", partOfSpeech);
        arraySetAddAll(tags, "grammaticalFeatures", grammaticalFeatures);
        const registers = tags.registers = (sense.registers || []).map((e) => e.id);
        const domains = tags.domains = (sense.domains || []).map((e) => e.id);
        arraySetAddAll(allTags, "grammaticalFeatures", grammaticalFeatures);
        arraySetAddAll(allTags, "registers", registers);
        arraySetAddAll(allTags, "domains", domains);
        const passes = [
            this.allowed("allowedPartsOfSpeech", partOfSpeech),
            ...registers.map(this.allowed.bind(this, "allowedRegisters")),
            ...domains.map(this.allowed.bind(this, "allowedDomains")),
        ];
        const banned = Math.min(...passes) === 0;
        const requiredPass = Math.max(...passes);
        if (banned || requiredPass !== pass) {
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
                subsenses.forEach(this.processSense.bind(this, record, {
                    grammaticalFeatures,
                    partOfSpeech,
                    pass,
                    short,
                    subsenses: true,
                }));
            }
            return;
        }
        if (definitions) {
            definitions.forEach((definition) => {
                if (needsMoreDefinitions(result, partOfSpeech, short, pass)) {
                    const cleanDefinition = this.cleanOxfordText(definition);
                    result.definitions = result.definitions || {};
                    result.definitions[partOfSpeech] = result.definitions[partOfSpeech] || [];
                    result.definitions[partOfSpeech].push(cleanDefinition);
                    resultTags.definitions = resultTags.definitions || {};
                    resultTags.definitions[partOfSpeech] = resultTags.definitions[partOfSpeech] || [];
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
                    const discards = ensure(record, "resultDiscarded", Object);
                    discards.definitions = discards.definitions || {};
                    discards.definitions[partOfSpeech] = discards.definitions[partOfSpeech] || [];
                    discards.definitions[partOfSpeech].push(definition);
                    if (examples && examples.length > 0) {
                        discards.example = uniq(compact([
                            discards.example, ...examples.map((e) => e.text)])).join(RECORD_SEP);
                    }
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
