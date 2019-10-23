import {primitive, serializable} from "serializr";

export default class CrossReference {
    /** The word id of the co-occurrence  */
    @serializable(primitive())
    id!: string;

    /** The word of the co-occurrence  */
    @serializable(primitive())
    text!: string;

    /** The type of relation between the two words. Possible values are 'close match', 'related', 'see also', 'variant spelling', and 'abbreviation' in case of crossreferences, or 'pre', 'post' in case of collocates. */
    @serializable(primitive())
    type!: string;

}

