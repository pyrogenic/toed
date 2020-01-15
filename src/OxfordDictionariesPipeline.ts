import cloneDeep from "lodash/cloneDeep";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import isEqual from "lodash/isEqual";
import uniq from "lodash/uniq";
import without from "lodash/without";
import App from "./App";
import IDictionaryEntry from "./IDictionaryEntry";
import IWordRecord, {DiscardedDictionaryEntry, ITags} from "./IWordRecord";
import {
    ArrayPropertyNamesOfType,
    arraySetAdd,
    arraySetAddAll,
    arraySetClear,
    arraySetHas,
    arraySetRemove,
    ensure,
    ensureArray,
    spread,
} from "./Magic";
import map from "./map";
import Marks from "./Marks";
import Pass from "./Pass";
import sufficientDefinitions from "./sufficientDefinitions";
import IGrammaticalFeature from "./types/gen/IGrammaticalFeature";
import IHeadwordEntry from "./types/gen/IHeadwordEntry";
import ILexicalEntry from "./types/gen/ILexicalEntry";
import IPronunciation from "./types/gen/IPronunciation";
import ISense from "./types/gen/ISense";
import IVariantForm from "./types/gen/IVariantForm";

export interface IPassMap { [key: string]: Pass; }

export interface IPipelineConfig {
    partsOfSpeech: IPassMap;
    grammaticalFeatures: IPassMap;
    registers: IPassMap;
    domains: IPassMap;
    imputed: IPassMap;
    /** note that this is really just to config appearance */
    marks: IPassMap;
}

export type PartialWordRecord = Pick<IWordRecord, "result" | "resultTags" | "resultOriginal" | "resultDiscarded" | "resultDiscardedTags" | "allTags" | "pipelineNotes">;

const RECORD_SEP = "///";
export { RECORD_SEP };

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

export type AnnotatedHeadwordEntry = IHeadwordEntry & { tags: ITags };

export default class OxfordDictionariesPipeline {
    public readonly query: string;
    public readonly entries: AnnotatedHeadwordEntry[];
    public allEntryTexts: string[];

    private readonly allowed: App["allowed"];
    private readonly getMarksFor: App["getMarksFor"];
    private readonly processed: App["processed"];

    constructor({ query, entries, allowed, getMarksFor, processed }: {
        query: string,
        entries: AnnotatedHeadwordEntry[],
        allowed: App["allowed"],
        getMarksFor: App["getMarksFor"],
        processed: App["processed"],
    }) {
        this.allowed = allowed;
        this.getMarksFor = getMarksFor;
        this.processed = processed;
        this.query = query;
        this.entries = entries;
        this.allEntryTexts = flatten(map(flatten(map(entries, "lexicalEntries")), "text"));
    }

    public process(existingRecord?: PartialWordRecord): IWordRecord["result"] {
        const { entries: headwordEntries, query } = this;
        const record = existingRecord || {};
        const result = ensure(record, "result", Object);
        const resultTags = ensure(record, "resultTags", Object);
        const allTags = ensure(record, "allTags", Object);

        arraySetClear(allTags, "imputed");

        if (headwordEntries.length === 0) {
            arraySetAdd(allTags, "imputed", ["404"]);
        }

        const marks = this.getMarksFor(query);
        Object.values(Marks).forEach(([mark]) => {
            if (marks.includes(mark)) {
                arraySetAdd(allTags, "marks", mark);
            } else {
                arraySetRemove(allTags, "marks", mark);
            }
        });

        const lowercaseMatchingEntryTexts = undefIfEmpty(this.allEntryTexts.filter((text) =>
            query.toLocaleLowerCase() === text));
        const mixedCaseMatchingEntryTexts = undefIfEmpty(this.allEntryTexts.filter((text) => {
            const lowerCase = text.toLocaleLowerCase();
            return lowerCase !== text && query.toLocaleLowerCase() === lowerCase;
        }));
        const singularForm: { [pural: string]: string[] } = {};
        const pluralForm: { [singular: string]: string[] } = {};
        headwordEntries.forEach((potentialSingular) => {
            const plural = headwordEntries.find((potentialPlural) => {
                if (potentialPlural.id === potentialSingular.id) {
                    return false;
                }
                if (potentialPlural.language !== potentialSingular.language) {
                    return false;
                }
                return potentialPlural.lexicalEntries?.some((lexicalEntry) => {
                    return lexicalEntry.entries?.some((entry) => {
                        const isPlural = entry.grammaticalFeatures?.some(({id}) => id === "plural");
                        if (isPlural) {
                            const crossReferencePlural = entry.senses?.some(({ crossReferences: ec }) =>
                                ec?.some(({ type, id }) => type === "see also" && id === potentialSingular.id));
                            if (crossReferencePlural) {
                                console.log(lexicalEntry.text + " is a plural of " + potentialSingular.id);
                                return true;
                            }
                        }
                    });
                });
            });
            if (plural) {
                console.log(singularForm, plural.id, potentialSingular.id);
                arraySetAdd(singularForm, plural.id, potentialSingular.id);
                arraySetAdd(pluralForm, potentialSingular.id, plural.id);
            }
        });
        const imputedXrefs = new Map<AnnotatedHeadwordEntry, AnnotatedHeadwordEntry>();
        headwordEntries.forEach((definedBy) => {
            const target = headwordEntries.find((headword) => {
                if (headword.id === definedBy.id) {
                    return false;
                }
                if (headword.language !== definedBy.language) {
                    return false;
                }
                return headword.lexicalEntries?.some((lexicalEntry) => {
                    return lexicalEntry.entries?.some((entry) => {
                        return entry.senses?.some((sense) => {
                            const defs = flatten(compact([sense.definitions, sense.shortDefinitions]));
                            const machingDefinitions = defs.filter((definition) => definition.match(new RegExp(`^\\W*${definedBy.word}\\W*$`, "i")));
                            return machingDefinitions.length > 0;
                        });
                    });
                });
            });
            if (target) {
                imputedXrefs.set(target, definedBy);
            }
        });
        console.log({internalRedirects: imputedXrefs});
        const rejectedLexicalEntries: ILexicalEntry[] = [];
        const discard = (
            lexicalEntry: Pick<ILexicalEntry, "entries" | "lexicalCategory" | "text">,
            tags: ITags,
            reason: string) => {
            // console.log(`discard ${lexicalEntry.text} for ${reason}`, {lexicalEntry, tags, reason});
            const { lexicalCategory: { id: partOfSpeech } } = lexicalEntry;
            lexicalEntry.entries?.forEach((lentry) => {
                const grammaticalFeatures = lentry.grammaticalFeatures?.map((e) => e.id);
                discardElements(record, result, "etymology", lentry.etymologies, tags);
                this.pullPronunciation(
                    record, result, {}, lexicalEntry.text, lentry.pronunciations, tags, {discard: true});
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
                    discardElements(record, result, "etymology", sense.etymologies, tags);
                    discardElements(record, result, "example", sense.examples, tags);
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
                        discardElements(record, result, "etymology", subsense.etymologies, tags);
                        discardElements(record, result, "example", subsense.examples, tags);
                    });
                });
            });
            // if (reason) {
            //     arraySetAdd(record, "pipelineNotes", reason);
            // } else {
            //     // todo: assert tags
            // }
            rejectedLexicalEntries.push(lexicalEntry as ILexicalEntry);
        };

        const lcQuery = query.toLocaleLowerCase();
        function imputeTags(entry: AnnotatedHeadwordEntry, lexicalEntry: ILexicalEntry) {
            const internalRedirect = imputedXrefs.get(entry);
            const entryTags: ITags = cloneDeep(entry.tags);
            arraySetAdd(entryTags, "imputed", [entry.language]);
            internalRedirect?.lexicalEntries.forEach((redirectedFrom) => {
                entryTags.grammaticalFeatures =
                    appendGrammaticalFeatures(redirectedFrom, entryTags.grammaticalFeatures);
                arraySetAdd(entryTags, "imputed",
                    [`redirect-${redirectedFrom.lexicalCategory.id}`, `from '${internalRedirect.word}'`]);
            });
            const { text } = lexicalEntry;
            if (text === lcQuery) {
                arraySetAdd(entryTags, "imputed", ["exact"]);
                return entryTags;
            }
            if (arraySetHas(pluralForm, query, text)) {
                arraySetAdd(entryTags, "imputed", ["exact-plural", `'${text}' is plural of '${query}'`]);
                return entryTags;
            }
            if (arraySetHas(singularForm, query, text)) {
                arraySetAdd(entryTags, "imputed", ["exact-singular", `'${text}' is singular of '${query}'`]);
                return entryTags;
            }
            const lowerCase = text.toLocaleLowerCase();
            if (lowerCase !== text) {
                arraySetAdd(entryTags, "imputed", ["mixed-case"]);
                if (lowerCase === lcQuery) {
                    arraySetAdd(entryTags, "imputed", ["exact-mixed-case"]);
                }
            }
            if (lowercaseMatchingEntryTexts && text.length !== query.length) {
                arraySetAdd(entryTags, "imputed", ["inexact",
                    `'${text}' vs '${uniq(lowercaseMatchingEntryTexts).join("', '")}'`]);
            }
            if (mixedCaseMatchingEntryTexts && text.length !== query.length) {
                arraySetAdd(entryTags, "imputed", ["inexact-mixed-case",
                    `'${text}' vs '${uniq(mixedCaseMatchingEntryTexts).join("', '")}'`]);
            }
            if (internalRedirect) {
                arraySetAdd(entryTags, "imputed",
                    ["redirect", `'${text}' -> '${internalRedirect.word}'`]);
            }
            // console.log({ input: entry.tags, entryTags });
            return entryTags;
        }

        headwordEntries.forEach((headwordEntry) => {
            const { pronunciations: headwordEntryPronunciations} = headwordEntry;
            // console.log(`Headword Entry '${headwordEntry.id}'`,
            //     { headwordEntryPronunciations },
            // );
            headwordEntry.lexicalEntries.forEach((lexicalEntry, lexicalEntryIndex) => {
                const {
                    lexicalCategory: { id: partOfSpeech },
                    pronunciations: lexicalEntryPronunciations,
                    text,
                } = lexicalEntry;
                // tslint:disable-next-line:max-line-length
                // console.log(`Headword Entry '${headwordEntry.id}' / Lexical Entry #${lexicalEntryIndex} '${lexicalEntry.text}'`,
                //     { headwordEntryPronunciations, lexicalEntryPronunciations },
                // );
                const lexicalEntryTags = imputeTags(headwordEntry, lexicalEntry);
                let grammaticalFeatures = appendGrammaticalFeatures(lexicalEntry, undefined);
                if (grammaticalFeatures.length > 0) {
                    const disallowed = grammaticalFeatures.filter((tag) => {
                        const tagAllowedForPass = this.allowed("grammaticalFeatures", tag);
                        return tagAllowedForPass === Pass.banned;
                    });
                    if (disallowed.length > 0) {
                        const detail = `‘${text}’ rejected because ${disallowed.join(" & ")} is/are banned`;
                        arraySetAdd(lexicalEntryTags, "imputed",
                            ["banned-grammatical-features",
                                detail]);
                        return discard(lexicalEntry, lexicalEntryTags, detail);
                    }
                }
                const allowedForPass = this.allowed("partsOfSpeech", partOfSpeech);
                if (allowedForPass === Pass.banned) {
                    arraySetAdd(lexicalEntryTags, "imputed",
                        ["banned-part-of-speech", partOfSpeech]);
                    return discard(lexicalEntry, lexicalEntryTags, partOfSpeech);
                }
                if (lexicalEntry.entries) {
                    lexicalEntry.entries.forEach((lentry, lentryIndex) => {
                        // tslint:disable-next-line:max-line-length
                        // console.log(`Headword Entry '${headwordEntry.id}' / Lexical Entry #${lexicalEntryIndex} '${lexicalEntry.text}' / Entry #${lentryIndex}`,
                        //     { headwordEntryPronunciations, lexicalEntryPronunciations },
                        // );
                        const lentryTags = cloneDeep(lexicalEntryTags);
                        if (lentry.grammaticalFeatures) {
                            grammaticalFeatures = [
                                ...grammaticalFeatures,
                                ...lentry.grammaticalFeatures.map((e) => e.id),
                            ];
                            const disallowed = grammaticalFeatures.filter((tag) => {
                                const tagAllowedForPass = this.allowed("grammaticalFeatures", tag);
                                return tagAllowedForPass === Pass.banned;
                            });
                            if (disallowed.length > 0) {
                                const detail = disallowed.join(", ");
                                arraySetAdd(lentryTags, "imputed",
                                    ["banned-grammatical-features", detail]);
                                const syntheticLexicalEntry = {
                                    entries: [lentry],
                                    lexicalCategory: lexicalEntry.lexicalCategory,
                                    text,
                                };
                                return discard(syntheticLexicalEntry, lentryTags, detail);
                            }
                        }
                        const baseWord = this.query;
                        const { etymologies, senses, variantForms, pronunciations: entryPronunciations } = lentry;
                        let v: IVariantForm | undefined;
                        if (variantForms && baseWord && result.entry_rich !== baseWord
                            // tslint:disable-next-line:no-conditional-assignment
                            && (v = variantForms.find((vf) => vf.text === baseWord))) {
                            arraySetAdd(lentryTags, "imputed", ["variant", JSON.stringify(v)]);
                        }
                        const pronunciations = flatten(compact([
                            headwordEntryPronunciations, lexicalEntryPronunciations, entryPronunciations,
                        ]));
                        if (senses) {
                            senses.forEach(this.processSense.bind(
                                this, record, lentryTags, discard, {
                                etymologies,
                                grammaticalFeatures,
                                partOfSpeech,
                                pass: Pass.primary,
                                pronunciations,
                                short: false,
                                subsenses: false,
                                text,
                            }));
                        } else {
                            arraySetAdd(lentryTags, "imputed", ["no-senses"]);
                            discardElements(record, result, "etymology", etymologies, lentryTags);
                            this.pullPronunciation(
                                record, result, resultTags, text, pronunciations, lentryTags, {discard: true});
                        }
                    });
                } else {
                    const pronunciations =  flatten(compact([headwordEntryPronunciations, lexicalEntryPronunciations]));
                    this.pullPronunciation(
                        record, result, resultTags, text, pronunciations, lexicalEntryTags, {discard: true});
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

            { short: false, subsenses: false, pass: Pass.tertiary, fallbackPass: Pass.secondary },
            { short: false, subsenses: true, pass: Pass.tertiary, fallbackPass: Pass.secondary },
            { short: true, subsenses: false, pass: Pass.tertiary, fallbackPass: Pass.secondary },
            { short: true, subsenses: true, pass: Pass.tertiary, fallbackPass: Pass.secondary },
        ].forEach((pass) => {
            headwordEntries.forEach((headwordEntry) => {
                const {lexicalEntries, pronunciations: headwordPronounciations} = headwordEntry;
                lexicalEntries?.forEach((lexicalEntry) => {
                    if (rejectedLexicalEntries.includes(lexicalEntry)) {
                        return;
                    }
                    const {
                        entries,
                        lexicalCategory: { id: partOfSpeech },
                        pronunciations: lexicalEntryPronounciations,
                    } = lexicalEntry;
                    if (entries === undefined || entries.length === 0) { return; }
                    const lexicalEntryTags = imputeTags(headwordEntry, lexicalEntry);
                    const grammaticalFeatures = appendGrammaticalFeatures(lexicalEntry, undefined);
                    entries.forEach((lentry) => {
                        const { senses, pronunciations: entryPronounciations } = lentry;
                        if (senses === undefined || senses.length === 0) { return; }
                        const lentryGrammaticalFeatures = appendGrammaticalFeatures(lentry, grammaticalFeatures);
                        if (lentryGrammaticalFeatures.length > 0) {
                            const disallowed = lentryGrammaticalFeatures.some((tag) => {
                                const tagAllowedForPass = this.allowed("grammaticalFeatures", tag);
                                return tagAllowedForPass > pass.pass;
                            });
                            if (disallowed) {
                                return;
                            }
                        }
                        const pronunciations = flatten(compact(
                            [headwordPronounciations, lexicalEntryPronounciations, entryPronounciations],
                        ));
                        senses.forEach(this.processSense.bind(this, record, lexicalEntryTags, discard, {
                            etymologies: lentry.etymologies,
                            grammaticalFeatures: lentryGrammaticalFeatures,
                            partOfSpeech,
                            pronunciations,
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
        if (!result.definitions || Object.keys(result.definitions).length === 0) {
          arraySetAdd(allTags, "imputed", ["undefined"]);
        }
        this.processed(this.query, record);
        return result;
    }

    private processSense(
        record: PartialWordRecord,
        entryTags: ITags,
        discard: (
            lexicalEntry: Pick<ILexicalEntry, "entries" | "lexicalCategory" | "text">,
            tags: ITags,
            reason: string) => void,
        { text, partOfSpeech, grammaticalFeatures, pronunciations: parentPronunciations,
            short, pass, fallbackPass = Pass.primary, subsenses: onlySubsenses, etymologies: entryEtymologies }:
            {
                text: string, partOfSpeech: string, grammaticalFeatures: string[],
                pronunciations: IPronunciation[] | undefined,
                short: boolean, pass: Pass, fallbackPass?: Pass, subsenses: boolean, etymologies: string[] | undefined,
            },
        sense: ISense) {
        const result = record.result!;
        const lexicalCategory = { id: partOfSpeech, text: "" };
        const {
            crossReferences,
            pronunciations: sensePronunciations,
            subsenses,
            examples,
            etymologies: senseEtymologies,
        } = sense;
        const pronunciations = [...flatten(compact([parentPronunciations, sensePronunciations]))];
        const etymologies = entryEtymologies ?? senseEtymologies;
        let tags = cloneDeep(entryTags);
        const { registers, domains } = fillInTags(tags, partOfSpeech, grammaticalFeatures, sense, onlySubsenses ? "subsense-of-" : undefined);
        if (onlySubsenses) {
            if (subsenses) {
                subsenses.forEach(this.processSense.bind(this, record, tags, discard, {
                    etymologies,
                    grammaticalFeatures,
                    partOfSpeech,
                    pass,
                    pronunciations,
                    short,
                    subsenses: false,
                    text,
                }));
                subsenses.forEach(this.processSense.bind(this, record, tags, discard, {
                    etymologies,
                    grammaticalFeatures,
                    partOfSpeech,
                    pass,
                    pronunciations,
                    short,
                    subsenses: true,
                    text,
                }));
            }
            return;
        }
        if (short) {
            arraySetAdd(tags, "imputed", ["short"]);
        }
        const resultTags = ensure(record, "resultTags", Object);
        const allTags = ensure(record, "allTags", Object);
        copyTags(tags, allTags);
        const savedTags = cloneDeep(tags);
        const resetTags = () => {
            if (tags !== savedTags) {
                tags = savedTags;
            }
        };
        const earlyOutForTags = () => {
            const passMap: Array<{ flag: string; allowed: Pass; type: keyof ITags; }> = [];
            let check: (...args: Parameters<App["allowed"]>) => void;
            check = (prop, flag) => {
                const allowed = this.allowed(prop, flag);
                const type = prop;
                const item = { type, flag, allowed };
                passMap.push(item);
            };
            [partOfSpeech].forEach(check.bind(null, "partsOfSpeech"));
            registers.forEach(check.bind(null, "registers"));
            grammaticalFeatures.forEach(check.bind(null, "grammaticalFeatures"));
            domains.forEach(check.bind(null, "domains"));
            tags.imputed?.map(([tag]) => tag).forEach(check.bind(null, "imputed"));
            const passes = uniq(passMap.map(({ allowed }) => allowed));
            const banned = Math.min(...passes) === 0;
            const requiredPass = Math.max(...passes);
            const nextRequiredPass = Math.max(...without(passes, requiredPass));
            if (banned) {
                if (pass === Pass.primary) {
                    discard({
                        entries: [{
                            etymologies,
                            pronunciations,
                            senses: [sense],
                        }],
                        lexicalCategory: { id: partOfSpeech, text: "banned" },
                        text,
                    },
                        {
                            imputed: passMap.filter(({ allowed }) => allowed === Pass.banned)
                                .map(({ type, flag }) => [`banned-${type}`, flag]),
                        }, "banned");
                }
                return true;
            }
            if (requiredPass !== pass) {
                return true;
            }
            if (nextRequiredPass > fallbackPass) {
                return true;
            }
            return false;
        };
        if (earlyOutForTags()) {
            return;
        }
        if (crossReferences && crossReferences.length > 0) {
            this.pullPronunciation(record, result, resultTags, text, pronunciations, () => {
                const erTags = cloneDeep(tags);
                arraySetAdd(tags, "imputed", ["cross-reference", crossReferences.map((e) => e.id).join(", ")]);
                return erTags;
            });
        }
        const definitions = short ? sense.shortDefinitions : sense.definitions;
        if (definitions) {
            definitions.forEach((definition) => {
                resetTags();
                let match = definition.match(/\b(sex)/i);
                if (match) {
                    const word1 = match[1].toLocaleLowerCase();
                    match = definition.match(/\b((?:wo)?man)/i);
                    const word2 = match?.[1]?.toLocaleLowerCase();
                    tags = cloneDeep(tags);
                    arraySetAdd(tags, "imputed", [compact(["match", word1]).join("-")]);
                    arraySetAdd(tags, "imputed", [compact(["match", word1, word2]).join("-")]);
                    if (earlyOutForTags()) {
                        return;
                    }
                }
                const haveSufficient = sufficientDefinitions(result, partOfSpeech, short, pass);
                if (haveSufficient === false) {
                    const cleanDefinition = this.cleanOxfordText(definition);
                    result.definitions = result.definitions || {};
                    result.definitions[partOfSpeech] = result.definitions[partOfSpeech] || [];
                    if (arraySetAdd(result.definitions, partOfSpeech, cleanDefinition)) {
                        resultTags.definitions = resultTags.definitions || {};
                        resultTags.definitions[partOfSpeech] = resultTags.definitions[partOfSpeech] || [];
                        resultTags.definitions[partOfSpeech].push(tags);
                        if (cleanDefinition !== definition) {
                            const originals = ensure(record, "resultOriginal", Object);
                            originals.definitions = originals.definitions || {};
                            originals.definitions[partOfSpeech] = originals.definitions[partOfSpeech] || [];
                            originals.definitions[partOfSpeech].push(definition);
                        }
                        if (etymologies && etymologies.length > 0) {
                            const remainingEtymologies = [...etymologies];
                            if (!result.etymology) {
                                const etymology = remainingEtymologies.pop()!;
                                result.etymology = this.cleanOxfordText(etymology);
                                resultTags.etymology = tags;
                                if (result.etymology !== etymology) {
                                    const originals = ensure(record, "resultOriginal", Object);
                                    originals.etymology = etymology;
                                }
                            }
                            discardElements(record, result, "etymology", remainingEtymologies, tags);
                        }
                        this.pullPronunciation(record, result, resultTags, text, pronunciations, tags);
                    } else {
                        this.pullPronunciation(
                            record, result, resultTags, text, pronunciations, tags, { discard: true });
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
                    discardElements(record, result, "example", discardedExamples, tags);
                } else {
                    const discardTags = cloneDeep(tags);
                    arraySetAdd(discardTags, "imputed", ["extra", haveSufficient]);
                    discard({
                        entries: [{
                            senses: [{
                                definitions: [definition],
                                examples,
                            }],
                        }], lexicalCategory, text,
                    }, discardTags, haveSufficient);
                }
            });
        }
    }

    private cleanOxfordText(example: string): string {
        example = example.replace(/((?:Middle|Old) English)(\w)/g, "$1 $2");
        example = example.replace(/(\S)‘([^’]+)’/g, "$1 ‘$2’");
        return example;
    }

    private pullPronunciation(
        record: PartialWordRecord,
        result: Partial<IDictionaryEntry>,
        resultTags: Required<IWordRecord>["resultTags"],
        word: string, pronunciations: IPronunciation[] | undefined,
        tags: ITags | (() => ITags),
        options?: {replace?: boolean, discard?: boolean}) {
        const discard = options?.discard;
        const replace = options?.replace;
        if (!word) {
            // NOOP
        } else if (!discard && (replace || !result.entry_rich)) {
            tags = applyElement(record, result, resultTags, "entry_rich", word, tags);
            // console.warn(pronunciations);
        } else {
            tags = discardElement(record, result, "entry_rich", word, tags);
        }
        pronunciations?.forEach((p) => {
            if (p.phoneticSpelling === undefined) {
                if (p.audioFile) {
                    tags = discardElement(
                        record, result, "audio_file", p.audioFile, tags, ["no-phonetic-spelling"]);
                }
            } else if (!discard && p.phoneticNotation !== "IPA") {
                tags = discardElement(
                    record, result, "pronunciation_ipa", word, tags, ["wrong-format", p.phoneticNotation]);
            } else if (!discard && (replace || !result.pronunciation_ipa)) {
                tags = applyElement(record, result, resultTags, "pronunciation_ipa", p.phoneticSpelling, tags);
                if (p.audioFile === undefined) {
                    // NOOP
                } else if (replace || !result.audio_file) {
                    tags = applyElement(record, result, resultTags, "audio_file", p.audioFile, tags);
                } else {
                    tags = discardElement(record, result, "audio_file", p.audioFile, tags);
                }
            } else {
                tags = discardElement(record, result, "pronunciation_ipa", p.phoneticSpelling, tags);
                if (p.audioFile !== undefined) {
                    tags = discardElement(
                        record, result, "audio_file", p.audioFile, tags, ["extra", "pronunciation_ipa"]);
                }
            }
        });
    }
}

function applyElement(
    record: PartialWordRecord,
    result: Partial<IDictionaryEntry>,
    resultTags: Required<IWordRecord>["resultTags"],
    prop: ArrayPropertyNamesOfType<DiscardedDictionaryEntry, string>,
    value: string,
    tags: ITags | (() => ITags)) {
    const existingValue = result[prop];
    const existingProps = resultTags[prop];
    // console.log(`Applying: ${prop} = '${value}'`);
    result[prop] = value;
    resultTags[prop] = (typeof tags === "function") ? (tags = tags()) : tags;
    if (existingValue && (record.resultDiscarded === undefined || !arraySetHas(record.resultDiscarded, prop, value))) {
        tags = discardElement(record, result, prop, existingValue, existingProps || {}, ["replaced", value]);
    }
    return tags;
}

function discardElement(
    record: PartialWordRecord,
    result: Partial<IDictionaryEntry>,
    prop: ArrayPropertyNamesOfType<DiscardedDictionaryEntry, string>,
    value: string,
    tags: ITags | (() => ITags),
    ...additionalTags: Required<ITags>["imputed"]) {
    const existingValue = result[prop];
    if (existingValue === value) {
        return tags;
    }
    const discarded = ensure(record, "resultDiscarded", Object);
    const discards = ensureArray(discarded, prop);
    const discardsTags = ensureArray(ensure(record, "resultDiscardedTags", Object), prop);
    const discardTags = cloneDeep((typeof tags === "function") ? (tags = tags()) : tags);
    if (additionalTags === undefined) {
        arraySetAdd(discardTags, "imputed", ["extra", prop]);
    } else {
        arraySetAddAll(discardTags, "imputed", additionalTags);
    }
    if (discards.some((discard, index) => discard === value && isEqual(discardsTags[index], discardTags))) {
        // console.log(`  ... skipping duplicate discard of ${prop} = '${value}'`);
        return tags;
    }
    // console.log(`  ... discarding ${prop} = '${value}'`);
    discards.push(value);
    discardsTags.push(discardTags);
    return tags;
}

function discardElements(
    record: PartialWordRecord,
    result: Partial<IDictionaryEntry>,
    prop: ArrayPropertyNamesOfType<DiscardedDictionaryEntry, string>,
    values: Array<string | {text: string}> | undefined,
    tags: ITags | (() => ITags),
    ...additionalTags: Required<ITags>["imputed"]) {
    values?.forEach((item) => {
        const value = (typeof item === "object") ? item.text : item;
        discardElement(record, result, prop, value, tags, ...additionalTags);
    });
}

export function fillInTags(
    tags: ITags,
    partOfSpeech: string | undefined,
    grammaticalFeatures: string[] | IGrammaticalFeature[] | undefined,
    sense: ISense | undefined,
    prefix: string | undefined) {
    if (partOfSpeech !== undefined) {
        arraySetAdd(tags, "partsOfSpeech", partOfSpeech);
    }
    if (grammaticalFeatures && typeof grammaticalFeatures[0] === "object") {
        grammaticalFeatures = (grammaticalFeatures as IGrammaticalFeature[]).map((e) => e.id);
    }
    arraySetAddAll(tags, "grammaticalFeatures", grammaticalFeatures as string[]);
    const getId = prefix ? ({id}: {id: string}) => `${prefix}${id}` : ({id}: {id: string}) => id;
    const registers = spread(sense?.registers).map(getId);
    arraySetAddAll(tags, "registers", registers);
    const domains = spread(sense?.domains).map(getId);
    arraySetAddAll(tags, "domains", domains);
    return { registers, domains };
}
