import IDictionaryEntry from "./IDictionaryEntry";
import RetrieveEntry from "./types/gen/RetrieveEntry";

interface ITags {
    partsOfSpeech?: string[];
    registers?: string[];
    domains?: string[];
}

export default interface IWordRecord {
    q: string;
    re: RetrieveEntry;
    result?: Partial<IDictionaryEntry>;
    resultTags?: { [K in keyof IDictionaryEntry]?: ITags };
    pipelineNotes?: string[];
    notes: string;
}
