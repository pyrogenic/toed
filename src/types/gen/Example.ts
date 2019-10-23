import {list, object, primitive, serializable} from "serializr";
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
    @serializable(list(primitive()))
    definitions?: string[];

    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    @serializable(list(object(Domain)))
    domains?: IDomain[];

    @serializable(list(object(CategorizedText)))
    notes?: ICategorizedText[];

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    @serializable(list(object(Region)))
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    @serializable(list(object(Register)))
    registers?: IRegister[];

    /** The list of sense identifiers related to the example. Provided in the sentences endpoint only.  */
    @serializable(list(primitive()))
    senseIds?: string[];

    @serializable(primitive())
    text!: string;

}

