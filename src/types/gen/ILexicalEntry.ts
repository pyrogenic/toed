import ICategorizedText from "./ICategorizedText";
import IEntry from "./IEntry";
import IGrammaticalFeature from "./IGrammaticalFeature";
import ILexicalCategory from "./ILexicalCategory";
import IPronunciation from "./IPronunciation";
import IRelatedEntries from "./IRelatedEntries";
import IVariantForm from "./IVariantForm";

export default interface ILexicalEntry {
    /** Other words from which this one derives  */
    derivativeOf?: IRelatedEntries[];

    /** Other words from which their Sense derives  */
    derivatives?: IRelatedEntries[];

    entries?: IEntry[];

    grammaticalFeatures?: IGrammaticalFeature[];

    /** IANA language code  */
    language: string;

    /** A linguistic category of words (or more precisely lexical items), generally defined by the syntactic or morphological behaviour of the lexical item in question, such as noun or verb  */
    lexicalCategory: ILexicalCategory;

    notes?: ICategorizedText[];

    pronunciations?: IPronunciation[];

    /** A given written or spoken realisation of an entry.  */
    text: string;

    /** Various words that are used interchangeably depending on the context, e.g 'a' and 'an' */
    variantForms?: IVariantForm[];

}

