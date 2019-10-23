import ICategorizedText from "./ICategorizedText";
import IDomain from "./IDomain";
import IRegion from "./IRegion";
import IRegister from "./IRegister";

export default interface IExample {
    /** A list of statements of the exact meaning of a word  */
    definitions?: string[];

    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    domains?: IDomain[];

    notes?: ICategorizedText[];

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    registers?: IRegister[];

    /** The list of sense identifiers related to the example. Provided in the sentences endpoint only.  */
    senseIds?: string[];

    text: string;

}

