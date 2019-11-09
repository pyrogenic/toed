import ICategorizedText from "./ICategorizedText";
import IConstruction from "./IConstruction";
import ICrossReference from "./ICrossReference";
import IDomain from "./IDomain";
import IExample from "./IExample";
import IPronunciation from "./IPronunciation";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import IThesaurusLink from "./IThesaurusLink";
import IVariantForm from "./IVariantForm";

export default interface ISense {
    // tslint:disable-next-line:max-line-length
    /** A construction provides information about typical syntax used of this sense. Each construction may optionally have one or more examples.  */
    constructions?: IConstruction[][];

    /** A grouping of crossreference notes.  */
    crossReferenceMarkers?: string[];

    crossReferences?: ICrossReference[];

    /** A list of statements of the exact meaning of a word  */
    definitions?: string[];

    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    domains?: IDomain[];

    /** The origin of the word and the way in which its meaning has changed throughout history  */
    etymologies?: string[];

    examples?: IExample[];

    /** The id of the sense that is required for the delete procedure  */
    id?: string;

    notes?: ICategorizedText[];

    pronunciations?: IPronunciation[];

    /** A particular area in which the Sense occurs, e.g. 'Great Britain'  */
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    registers?: IRegister[];

    /** A list of short statements of the exact meaning of a word  */
    shortDefinitions?: string[];

    /** Ordered list of subsenses of a sense  */
    subsenses?: ISense[];

    /** Ordered list of links to the Thesaurus Dictionary  */
    thesaurusLinks?: IThesaurusLink[];

    /** Various words that are used interchangeably depending on the context, e.g 'duck' and 'duck boat' */
    variantForms?: IVariantForm[];

}

