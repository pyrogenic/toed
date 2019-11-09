import IDictionaryEntry from "./IDictionaryEntry";
import { ArrayProperties, MapProperties, PlainProperties } from "./Magic";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export interface ITags {
    partOfSpeech?: string[];
    registers?: string[];
    domains?: string[];
}

export type ResultTags =
{ [K in keyof PlainProperties<IDictionaryEntry>]?: ITags } &
{ [K in keyof MapProperties<IDictionaryEntry>]?: {[key: string]: ITags }} &
{ [K in keyof ArrayProperties<IDictionaryEntry>]?: ITags[] };

export default interface IWordRecord {
    q: string;
    re: RetrieveEntry;
    result?: Partial<IDictionaryEntry>;
    resultTags?: ResultTags;
    allTags?: ITags;
    pipelineNotes?: string[];
    notes: string;
}
