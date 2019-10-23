import {list, object, primitive, serializable} from "serializr";
import ILexicalEntry from "./ILexicalEntry";
import IPronunciation from "./IPronunciation";
import LexicalEntry from "./LexicalEntry";
import Pronunciation from "./Pronunciation";

export default class HeadwordEntry {
    /** The identifier of a word  */
    @serializable(primitive())
    id!: string;

    /** IANA language code  */
    @serializable(primitive())
    language!: string;

    /** A grouping of various senses in a specific language, and a lexical category that relates to a word  */
    @serializable(list(object(LexicalEntry)))
    lexicalEntries: ILexicalEntry[] = [];

    @serializable(list(object(Pronunciation)))
    pronunciations?: IPronunciation[];

    /** The json object type. Could be 'headword', 'inflection' or 'phrase'  */
    @serializable(primitive())
    type?: string;

    /** (DEPRECATED) A given written or spoken realisation of an entry, lowercased. */
    @serializable(primitive())
    word!: string;

}

