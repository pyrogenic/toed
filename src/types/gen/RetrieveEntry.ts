import {list, object, optional, primitive, serializable} from "serializr";
import HeadwordEntry from "./HeadwordEntry";
import IHeadwordEntry from "./IHeadwordEntry";

export default class RetrieveEntry {
    /** Additional Information provided by OUP  */
    @serializable(optional(primitive()))
    metadata?: object;

    /** A list of entries and all the data related to them */
    @serializable(optional(list(object(HeadwordEntry))))
    results?: IHeadwordEntry[];

}

