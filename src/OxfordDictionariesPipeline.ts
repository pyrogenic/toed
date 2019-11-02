import flatten from "lodash/flatten";
import App from "./App";
import IDictionaryEntry from "./IDictionaryEntry";
import IWordRecord from "./IWordRecord";
import { arraySetAdd, arraySetClear, ensure } from "./Magic";
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
    allowedRegisters: IPassMap;
    allowedDomains: IPassMap;
}

export type FlagPropertyNames<T> = { [K in keyof Required<T>]: T[K] extends IPassMap ? K : never }[keyof T];

type PartialWordRecord = Pick<IWordRecord, "result" | "resultTags" | "allTags" | "pipelineNotes">;

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
        arraySetClear(record, "pipelineNotes");
        const matchingEntryTexts = this.allEntryTexts.some((text) =>
            query.toLocaleLowerCase() === text.toLocaleLowerCase());
        // tslint:disable-next-line:no-console
        console.log({ allEntryTexts: this.allEntryTexts, matchingEntryTexts });
        const rejectedLexicalEntries: ILexicalEntry[] = [];
        entries.forEach((entry) => {
            const { pronunciations } = entry;

            this.pullPronunciation(result, pronunciations);
            entry.lexicalEntries.forEach((lexicalEntry) => {
                const { lexicalCategory: { id: partOfSpeech }, text } = lexicalEntry;
                if (text.match(/[A-Z]/)) {
                    rejectedLexicalEntries.push(lexicalEntry);
                    arraySetAdd(record, "pipelineNotes", `‘${text}’ rejected because of capitalization`);
                    return;
                }
                if (matchingEntryTexts && text.length !== query.length) {
                    rejectedLexicalEntries.push(lexicalEntry);
                    arraySetAdd(record, "pipelineNotes", `‘${text}’ rejected because exact matches of the query are present`);
                    return;
                }
                if (!result.entry_rich) {
                    result.entry_rich = text;
                }
                this.pullPronunciation(result, lexicalEntry.pronunciations);
                if (lexicalEntry.entries) {
                    lexicalEntry.entries.forEach((lentry) => {
                        this.pullPronunciation(result, lentry.pronunciations);
                        const baseWord = this.query;
                        const { etymologies, senses, variantForms } = lentry;
                        if (variantForms && baseWord && result.entry_rich !== baseWord
                            && variantForms.find((vf) => vf.text === baseWord)) {
                            result.entry_rich = baseWord;
                        }
                        // pass down etymologies so we only take them from entries with first-pass acceptable senses
                        if (senses) {
                            senses.forEach(this.processSense.bind(
                                this, record, { partOfSpeech, short: false, subsenses: false, pass: 1, etymologies }));
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
            entries.forEach((entry) => {
                entry.lexicalEntries.forEach((lexicalEntry) => {
                    if (rejectedLexicalEntries.includes(lexicalEntry)) {
                        return;
                    }
                    const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
                    if (!lexicalEntry.entries) { return; }
                    lexicalEntry.entries.forEach((lentry) => {
                        const { senses } = lentry;
                        if (!senses) { return; }
                        senses.forEach(this.processSense.bind(this, record, { partOfSpeech, ...pass }));
                    });
                });
            });
        });
        return result;
    }

    private processSense(
        record: PartialWordRecord,
        { partOfSpeech, short, pass, subsenses: onlySubsenses, etymologies: entryEtymologies }:
            { partOfSpeech: string, short: boolean, pass: Pass, subsenses: boolean, etymologies?: string[] },
        sense: ISense) {
        const result = record.result!;
        const { pronunciations, subsenses, examples, etymologies: senseEtymologies } = sense;
        const definitions = short ? sense.shortDefinitions : sense.definitions;
        this.pullPronunciation(result, pronunciations);
        const resultTags = ensure(record, "resultTags", Object);
        const allTags = ensure(record, "allTags", Object);
        arraySetAdd(allTags, "partOfSpeech", partOfSpeech);
        const passes = [
            this.allowed("allowedPartsOfSpeech", partOfSpeech),
            ...(sense.registers || []).map((e) => e.id).map(this.allowed.bind(this, "allowedRegisters")),
            ...(sense.domains || []).map((e) => e.id).map(this.allowed.bind(this, "allowedDomains")),
        ];
        const banned = Math.min(...passes) === 0;
        const requiredPass = Math.max(...passes);
        if (banned || requiredPass !== pass) {
            return;
        }
        const etymologies = entryEtymologies || senseEtymologies;
        if (!result.etymology && etymologies) {
            result.etymology = etymologies[0];
        }
        if (onlySubsenses) {
            if (subsenses) {
                subsenses.forEach(this.processSense.bind(this, record, { partOfSpeech, short, pass, subsenses: true }));
            }
            return;
        }
        if (definitions) {
            definitions.forEach((definition) => {
                if (needsMoreDefinitions(result, partOfSpeech, short, pass)) {
                    result.definitions = result.definitions || {};
                    result.definitions[partOfSpeech] = result.definitions[partOfSpeech] || [];
                    result.definitions[partOfSpeech].push(definition);
                    // if (!result.entry_rich) {
                    //   result.entry_rich = sense.t;
                    // }
                    if (!result.example && examples) {
                        result.example = examples[0].text;
                    }
                }
            });
        }
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
