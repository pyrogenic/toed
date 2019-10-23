import ILexicalEntry from "./ILexicalEntry";
import IPronunciation from "./IPronunciation";

export default interface IHeadwordEntry {
    /** The identifier of a word  */
    id: string;

    /** IANA language code  */
    language: string;

    /** A grouping of various senses in a specific language, and a lexical category that relates to a word  */
    lexicalEntries: ILexicalEntry[];

    pronunciations?: IPronunciation[];

    /** The json object type. Could be 'headword', 'inflection' or 'phrase'  */
    type?: string;

    /** (DEPRECATED) A given written or spoken realisation of an entry, lowercased. */
    word: string;

}

