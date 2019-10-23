import {list, object, optional, primitive, serializable} from "serializr";
import CategorizedText from "./CategorizedText";
import Domain from "./Domain";
import ICategorizedText from "./ICategorizedText";
import IDomain from "./IDomain";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import Region from "./Region";
import Register from "./Register";

export default class Example {
    /** A list of statements of the exact meaning of a word  */
    @serializable(optional(list(primitive())))
    definitions?: string[];

    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    @serializable(optional(list(object(Domain))))
    domains?: IDomain[];

    @serializable(optional(list(object(CategorizedText))))
    notes?: ICategorizedText[];

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    @serializable(optional(list(object(Region))))
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    @serializable(optional(list(object(Register))))
    registers?: IRegister[];

    /** The list of sense identifiers related to the example. Provided in the sentences endpoint only.  */
    @serializable(optional(list(primitive())))
    senseIds?: string[];

    @serializable(primitive())
    text!: string;

}

