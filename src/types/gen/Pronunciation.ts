import {list, object, optional, primitive, serializable} from "serializr";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import Region from "./Region";
import Register from "./Register";

export default class Pronunciation {
    /** The URL of the sound file  */
    @serializable(optional(primitive()))
    audioFile?: string;

    /** A local or regional variation where the pronunciation occurs, e.g. 'British English'  */
    @serializable(optional(list(primitive())))
    dialects?: string[];

    /** The alphabetic system used to display the phonetic spelling  */
    @serializable(optional(primitive()))
    phoneticNotation?: string;

    /** Phonetic spelling is the representation of vocal sounds which express pronunciations of words. It is a system of spelling in which each letter represents invariably the same spoken sound  */
    @serializable(optional(primitive()))
    phoneticSpelling?: string;

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    @serializable(optional(list(object(Region))))
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal' */
    @serializable(optional(list(object(Register))))
    registers?: IRegister[];

}

