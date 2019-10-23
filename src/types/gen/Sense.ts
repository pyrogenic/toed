import {list, object, optional, primitive, serializable} from "serializr";
import CategorizedText from "./CategorizedText";
import Construction from "./Construction";
import CrossReference from "./CrossReference";
import Domain from "./Domain";
import Example from "./Example";
import ICategorizedText from "./ICategorizedText";
import IConstruction from "./IConstruction";
import ICrossReference from "./ICrossReference";
import IDomain from "./IDomain";
import IExample from "./IExample";
import IPronunciation from "./IPronunciation";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import ISense from "./ISense";
import IThesaurusLink from "./IThesaurusLink";
import IVariantForm from "./IVariantForm";
import Pronunciation from "./Pronunciation";
import Region from "./Region";
import Register from "./Register";
import ThesaurusLink from "./ThesaurusLink";
import VariantForm from "./VariantForm";

export default class Sense {
    /** A construction provides information about typical syntax used of this sense. Each construction may optionally have one or more examples.  */
    @serializable(optional(list(object(Construction))))
    constructions?: IConstruction[][];

    /** A grouping of crossreference notes.  */
    @serializable(optional(list(primitive())))
    crossReferenceMarkers?: string[];

    @serializable(optional(list(object(CrossReference))))
    crossReferences?: ICrossReference[];

    /** A list of statements of the exact meaning of a word  */
    @serializable(optional(list(primitive())))
    definitions?: string[];

    /** A subject, discipline, or branch of knowledge particular to the Sense  */
    @serializable(optional(list(object(Domain))))
    domains?: IDomain[];

    /** The origin of the word and the way in which its meaning has changed throughout history  */
    @serializable(optional(list(primitive())))
    etymologies?: string[];

    @serializable(optional(list(object(Example))))
    examples?: IExample[];

    /** The id of the sense that is required for the delete procedure  */
    @serializable(optional(primitive()))
    id?: string;

    @serializable(optional(list(object(CategorizedText))))
    notes?: ICategorizedText[];

    @serializable(optional(list(object(Pronunciation))))
    pronunciations?: IPronunciation[];

    /** A particular area in which the Sense occurs, e.g. 'Great Britain'  */
    @serializable(optional(list(object(Region))))
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal'  */
    @serializable(optional(list(object(Register))))
    registers?: IRegister[];

    /** A list of short statements of the exact meaning of a word  */
    @serializable(optional(list(primitive())))
    shortDefinitions?: string[];

    /** Ordered list of subsenses of a sense  */
    @serializable(optional(list(object(Sense))))
    subsenses?: ISense[];

    /** Ordered list of links to the Thesaurus Dictionary  */
    @serializable(optional(list(object(ThesaurusLink))))
    thesaurusLinks?: IThesaurusLink[];

    /** Various words that are used interchangeably depending on the context, e.g 'duck' and 'duck boat' */
    @serializable(optional(list(object(VariantForm))))
    variantForms?: IVariantForm[];

}

