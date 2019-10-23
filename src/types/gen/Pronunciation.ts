import {list, object, primitive, serializable} from "serializr";
import IRegion from "./IRegion";
import IRegister from "./IRegister";
import Region from "./Region";
import Register from "./Register";

export default class Pronunciation {
    /** The URL of the sound file  */
    @serializable(primitive())
    audioFile?: string;

    /** A local or regional variation where the pronunciation occurs, e.g. 'British English'  */
    @serializable(list(primitive()))
    dialects?: string[];

    /** The alphabetic system used to display the phonetic spelling  */
    @serializable(primitive())
    phoneticNotation?: string;

    /** Phonetic spelling is the representation of vocal sounds which express pronunciations of words. It is a system of spelling in which each letter represents invariably the same spoken sound  */
    @serializable(primitive())
    phoneticSpelling?: string;

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    @serializable(list(object(Region)))
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal' */
    @serializable(list(object(Register)))
    registers?: IRegister[];

}

