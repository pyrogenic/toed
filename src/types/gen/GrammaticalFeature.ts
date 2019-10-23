import {primitive, serializable} from "serializr";

export default class GrammaticalFeature {
    @serializable(primitive())
    id!: string;

    @serializable(primitive())
    text!: string;

    @serializable(primitive())
    type!: string;

}

