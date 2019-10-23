import {list, object, primitive, serializable} from "serializr";
import CategorizedText from "./CategorizedText";
import Domain from "./Domain";
import ICategorizedText from "./ICategorizedText";
import IDomain from "./IDomain";
import IPronunciation from "./IPronunciation";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import Pronunciation from "./Pronunciation";
import Region from "./Region";
import Register from "./Register";

export default class VariantForm {
    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    @serializable(list(object(Domain)))
    domains?: IDomain[];

    @serializable(list(object(CategorizedText)))
    notes?: ICategorizedText[];

    /** A grouping of pronunciation information  */
    @serializable(list(object(Pronunciation)))
    pronunciations?: IPronunciation[];

    /** A particular area in which the variant form occurs, e.g. 'Great Britain'  */
    @serializable(list(object(Region)))
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    @serializable(list(object(Register)))
    registers?: IRegister[];

    @serializable(primitive())
    text!: string;

}

