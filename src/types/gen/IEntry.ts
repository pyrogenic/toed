import ICategorizedText from "./ICategorizedText";
import IGrammaticalFeature from "./IGrammaticalFeature";
import IPronunciation from "./IPronunciation";
import ISense from "./ISense";
import IVariantForm from "./IVariantForm";

export default interface IEntry {
    /** The origin of the word and the way in which its meaning has changed throughout history  */
    etymologies?: string[];

    grammaticalFeatures?: IGrammaticalFeature[];

    /** Identifies the homograph grouping. The last two digits identify different entries of the same homograph. The first one/two digits identify the homograph number.  */
    homographNumber?: string;

    notes?: ICategorizedText[];

    pronunciations?: IPronunciation[];

    /** Complete list of senses  */
    senses?: ISense[];

    /** Various words that are used interchangeably depending on the context, e.g 'a' and 'an' */
    variantForms?: IVariantForm[];

}

