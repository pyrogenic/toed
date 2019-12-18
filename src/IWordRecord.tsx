import IDictionaryEntry from "./IDictionaryEntry";
import { ArrayProperties, MapProperties, PlainProperties } from "./Magic";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export interface ITags {
    partsOfSpeech?: [string];
    grammaticalFeatures?: string[];
    registers?: string[];
    domains?: string[];
    imputed?: Array<[string, string?]>;
}

export type ResultTags<T> =
{ [K in keyof PlainProperties<IDictionaryEntry>]?: ITags } &
{ [K in keyof MapProperties<IDictionaryEntry>]?: {[key: string]:
     IDictionaryEntry[K] extends {[key: string]: any[]} ? ITags[] : ITags }} &
{ [K in keyof ArrayProperties<IDictionaryEntry>]?: ITags[] };

export default interface IWordRecord {
    q: string;
    re: RetrieveEntry;
    result?: Partial<IDictionaryEntry>;
    resultTags?: ResultTags<IDictionaryEntry>;
    resultOriginal?: Partial<IDictionaryEntry>;
    resultDiscarded?: Partial<IDictionaryEntry>;
    resultDiscardedTags?: ResultTags<IDictionaryEntry>;
    allTags?: ITags;
    pipelineNotes?: string[];
    notes: string;
}
