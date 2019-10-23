import {list, object, primitive, serializable} from "serializr";
import CategorizedText from "./CategorizedText";
import GrammaticalFeature from "./GrammaticalFeature";
import ICategorizedText from "./ICategorizedText";
import IGrammaticalFeature from "./IGrammaticalFeature";
import IPronunciation from "./IPronunciation";
import ISense from "./ISense";
import IVariantForm from "./IVariantForm";
import Pronunciation from "./Pronunciation";
import Sense from "./Sense";
import VariantForm from "./VariantForm";

export default class Entry {
    /** The origin of the word and the way in which its meaning has changed throughout history  */
    @serializable(list(primitive()))
    etymologies?: string[];

    @serializable(list(object(GrammaticalFeature)))
    grammaticalFeatures?: IGrammaticalFeature[];

    /** Identifies the homograph grouping. The last two digits identify different entries of the same homograph. The first one/two digits identify the homograph number.  */
    @serializable(primitive())
    homographNumber?: string;

    @serializable(list(object(CategorizedText)))
    notes?: ICategorizedText[];

    @serializable(list(object(Pronunciation)))
    pronunciations?: IPronunciation[];

    /** Complete list of senses  */
    @serializable(list(object(Sense)))
    senses?: ISense[];

    /** Various words that are used interchangeably depending on the context, e.g 'a' and 'an' */
    @serializable(list(object(VariantForm)))
    variantForms?: IVariantForm[];

}

