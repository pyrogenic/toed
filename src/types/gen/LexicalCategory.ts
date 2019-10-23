import {primitive, serializable} from "serializr";

export default class LexicalCategory {
    @serializable(primitive())
    id!: string;

    @serializable(primitive())
    text!: string;

}

