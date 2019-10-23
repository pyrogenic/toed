import IDomain from "./IDomain";
import IRegion from "./IRegion";
import IRegister from "./IRegister";

export default interface IRelatedEntries {
    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    domains?: IDomain[];

    /** The identifier of the word  */
    id: string;

    /** IANA language code specifying the language of the word  */
    language?: string;

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    registers?: IRegister[];

    text: string;

}

