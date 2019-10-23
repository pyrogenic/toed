import {list, object, raw, serializable} from "serializr";
import HeadwordEntry from "./HeadwordEntry";
import IHeadwordEntry from "./IHeadwordEntry";

export default class RetrieveEntry {
    /** Additional Information provided by OUP  */
    @serializable(raw())
    metadata?: object;

    /** A list of entries and all the data related to them */
    @serializable(list(object(HeadwordEntry)))
    results?: IHeadwordEntry[];

}

