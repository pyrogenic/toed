import IRegion from "./IRegion";
import IRegister from "./IRegister";

export default interface IPronunciation {
    /** The URL of the sound file  */
    audioFile?: string;

    /** A local or regional variation where the pronunciation occurs, e.g. 'British English'  */
    dialects?: string[];

    /** The alphabetic system used to display the phonetic spelling  */
    phoneticNotation?: string;

    /** Phonetic spelling is the representation of vocal sounds which express pronunciations of words. It is a system of spelling in which each letter represents invariably the same spoken sound  */
    phoneticSpelling?: string;

    /** A particular area in which the pronunciation occurs, e.g. 'Great Britain'  */
    regions?: IRegion[];

    /** A level of language usage, typically with respect to formality. e.g. 'offensive', 'informal' */
    registers?: IRegister[];

}

