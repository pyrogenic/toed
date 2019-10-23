import IHeadwordEntry from "./IHeadwordEntry";

export default interface IRetrieveEntry {
    /** Additional Information provided by OUP  */
    metadata?: object;

    /** A list of entries and all the data related to them */
    results?: IHeadwordEntry[];

}

