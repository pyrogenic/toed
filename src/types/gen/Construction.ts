import {list, object, primitive, serializable} from "serializr";
import CategorizedText from "./CategorizedText";
import Domain from "./Domain";
import ICategorizedText from "./ICategorizedText";
import IDomain from "./IDomain";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import Region from "./Region";
import Register from "./Register";

export default class Construction {
    @serializable(list(object(Domain)))
    domains?: IDomain[];

    @serializable(list(primitive()))
    examples?: string[];

    @serializable(list(object(CategorizedText)))
    notes?: ICategorizedText[];

    @serializable(list(object(Region)))
    regions?: IRegion[];

    @serializable(list(object(Register)))
    registers?: IRegister[];

    /** The construction text */
    @serializable(primitive())
    text!: string;

}

