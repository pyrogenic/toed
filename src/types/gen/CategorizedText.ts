import {optional, primitive, serializable} from "serializr";

export default class CategorizedText {
    /** The identifier of the word  */
    @serializable(optional(primitive()))
    id?: string;

    /** A note text  */
    @serializable(primitive())
    text!: string;

    /** The descriptive category of the text */
    @serializable(primitive())
    type!: string;

}

