import {primitive, serializable} from "serializr";

export default class Domain {
    @serializable(primitive())
    id!: string;

    @serializable(primitive())
    text!: string;

}

