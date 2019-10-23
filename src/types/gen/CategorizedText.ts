import {primitive, serializable} from "serializr";

export default class CategorizedText {
    /** The identifier of the word  */
    @serializable(primitive())
    id?: string;

    /** A note text  */
    @serializable(primitive())
    text!: string;

    /** The descriptive category of the text */
    @serializable(primitive())
    type!: string;

}

