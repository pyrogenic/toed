import {primitive, serializable} from "serializr";

export default class ThesaurusLink {
    /** identifier of a word  */
    @serializable(primitive())
    entry_id!: string;

    /** identifier of a sense */
    @serializable(primitive())
    sense_id!: string;

}

