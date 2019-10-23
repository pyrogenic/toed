import {primitive, serializable} from "serializr";

export default class Register {
    @serializable(primitive())
    id!: string;

    @serializable(primitive())
    text!: string;

}

