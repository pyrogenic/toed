import {list, object, optional, primitive, serializable} from "serializr";
import CategorizedText from "./CategorizedText";
import Entry from "./Entry";
import GrammaticalFeature from "./GrammaticalFeature";
import ICategorizedText from "./ICategorizedText";
import IEntry from "./IEntry";
import IGrammaticalFeature from "./IGrammaticalFeature";
import ILexicalCategory from "./ILexicalCategory";
import IPronunciation from "./IPronunciation";
import IRelatedEntries from "./IRelatedEntries";
import IVariantForm from "./IVariantForm";
import LexicalCategory from "./LexicalCategory";
import Pronunciation from "./Pronunciation";
import RelatedEntries from "./RelatedEntries";
import VariantForm from "./VariantForm";

export default class LexicalEntry {
    /** Other words from which this one derives  */
    @serializable(optional(list(object(RelatedEntries))))
    derivativeOf?: IRelatedEntries[];

    /** Other words from which their Sense derives  */
    @serializable(optional(list(object(RelatedEntries))))
    derivatives?: IRelatedEntries[];

    @serializable(optional(list(object(Entry))))
    entries?: IEntry[];

    @serializable(optional(list(object(GrammaticalFeature))))
    grammaticalFeatures?: IGrammaticalFeature[];

    /** IANA language code  */
    @serializable(primitive())
    language!: string;

    /** A linguistic category of words (or more precisely lexical items), generally defined by the syntactic or morphological behaviour of the lexical item in question, such as noun or verb  */
    @serializable(object(LexicalCategory))
    lexicalCategory: ILexicalCategory = new LexicalCategory();

    @serializable(optional(list(object(CategorizedText))))
    notes?: ICategorizedText[];

    @serializable(optional(list(object(Pronunciation))))
    pronunciations?: IPronunciation[];

    /** A given written or spoken realisation of an entry.  */
    @serializable(primitive())
    text!: string;

    /** Various words that are used interchangeably depending on the context, e.g 'a' and 'an' */
    @serializable(optional(list(object(VariantForm))))
    variantForms?: IVariantForm[];

}

