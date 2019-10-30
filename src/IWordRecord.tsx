import IDictionaryEntry from "./IDictionaryEntry";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export default interface IWordRecord {
    q: string;
    re: RetrieveEntry;
    result?: Partial<IDictionaryEntry>;
    notes: string[];
}
