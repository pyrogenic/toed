import {primitive, serializable} from "serializr";

export default class Region {
    @serializable(primitive())
    id!: string;

    @serializable(primitive())
    text!: string;

}

