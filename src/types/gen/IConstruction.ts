import ICategorizedText from "./ICategorizedText";
import IDomain from "./IDomain";
import IRegion from "./IRegion";
import IRegister from "./IRegister";

export default interface IConstruction {
    domains?: IDomain[];

    examples?: string[];

    notes?: ICategorizedText[];

    regions?: IRegion[];

    registers?: IRegister[];

    /** The construction text */
    text: string;

}

