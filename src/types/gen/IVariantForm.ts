import ICategorizedText from "./ICategorizedText";
import IDomain from "./IDomain";
import IPronunciation from "./IPronunciation";
import IRegion from "./IRegion";
import IRegister from "./IRegister";

export default interface IVariantForm {
    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    domains?: IDomain[];

    notes?: ICategorizedText[];

    /** A grouping of pronunciation information  */
    pronunciations?: IPronunciation[];

    /** A particular area in which the variant form occurs, e.g. 'Great Britain'  */
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    registers?: IRegister[];

    text: string;

}

