import {list, object, primitive, serializable} from "serializr";
import Domain from "./Domain";
import IDomain from "./IDomain";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import Region from "./Region";
import Register from "./Register";

export default class RelatedEntries {
    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    @serializable(list(object(Domain)))
    domains?: IDomain[];

    /** The identifier of the word  */
    @serializable(primitive())
    id!: string;

    /** IANA language code specifying the language of the word  */
    @serializable(primitive())
    language?: string;

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    @serializable(list(object(Region)))
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    @serializable(list(object(Register)))
    registers?: IRegister[];

    @serializable(primitive())
    text!: string;

}

