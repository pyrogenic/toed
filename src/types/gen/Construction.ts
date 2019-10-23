import {list, object, optional, primitive, serializable} from "serializr";
import CategorizedText from "./CategorizedText";
import Domain from "./Domain";
import ICategorizedText from "./ICategorizedText";
import IDomain from "./IDomain";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import Region from "./Region";
import Register from "./Register";

export default class Construction {
    @serializable(optional(list(object(Domain))))
    domains?: IDomain[];

    @serializable(optional(list(primitive())))
    examples?: string[];

    @serializable(optional(list(object(CategorizedText))))
    notes?: ICategorizedText[];

    @serializable(optional(list(object(Region))))
    regions?: IRegion[];

    @serializable(optional(list(object(Register))))
    registers?: IRegister[];

    /** The construction text */
    @serializable(primitive())
    text!: string;

}

