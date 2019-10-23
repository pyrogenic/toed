
export default interface ICrossReference {
    /** The word id of the co-occurrence  */
    id: string;

    /** The word of the co-occurrence  */
    text: string;

    /** The type of relation between the two words. Possible values are 'close match', 'related', 'see also', 'variant spelling', and 'abbreviation' in case of crossreferences, or 'pre', 'post' in case of collocates. */
    type: string;

}

