import { PlainProperties, MapProperties, ArrayProperties, MultipleValue } from "@pyrogenic/asset/lib";
import IDictionaryEntry from "./IDictionaryEntry";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export interface ITags {
    partsOfSpeech?: [string];
    grammaticalFeatures?: string[];
    registers?: string[];
    domains?: string[];
    imputed?: Array<[string, string?]>;
    marks?: string[];
}

export type ResultTags<T> =
    { [K in keyof PlainProperties<T>]?: ITags } &
    { [K in keyof MapProperties<T>]?: {
        [key: string]: T[K] extends { [key: string]: any[]; } ? ITags[] : ITags;
    } } &
    { [K in keyof ArrayProperties<T>]?: ITags[] };

export type DiscardedDictionaryEntry = MultipleValue<IDictionaryEntry, "audio_file" | "entry_rich" | "pronunciation_ipa" | "example" | "etymology">;

export default interface IWordRecord {
    q: string;
    re: RetrieveEntry;
    result?: Partial<IDictionaryEntry>;
    resultTags?: ResultTags<IDictionaryEntry>;
    resultOriginal?: Partial<IDictionaryEntry>;
    resultDiscarded?: Partial<DiscardedDictionaryEntry>;
    resultDiscardedTags?: ResultTags<DiscardedDictionaryEntry>;
    allTags?: ITags;
    pipelineNotes?: string[];
    notes: string;
}

export interface IDiscardedWordRecord {
    q: IWordRecord["q"];
    re: IWordRecord["re"];
    result?: IWordRecord["resultDiscarded"];
    resultTags?: IWordRecord["resultDiscardedTags"];
    resultDiscarded?: IWordRecord["resultDiscarded"];
    resultDiscardedTags?: IWordRecord["resultDiscardedTags"];
    allTags?: IWordRecord["allTags"];
    pipelineNotes?: IWordRecord["pipelineNotes"];
    notes: IWordRecord["notes"];
}
