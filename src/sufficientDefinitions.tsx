import IDictionaryEntry from "./IDictionaryEntry";
import Pass from "./Pass";

/**
 * @return false if we want to add this new definition, or a string giving the reason why we don't.
 */
export default function sufficientDefinitions(
    result: Partial<IDictionaryEntry>, partOfSpeech: string, short: boolean, pass: Pass) {
    const max = short ? 1 : 2;
    if (!result.definitions) {
        return false;
    } else if (pass > 1) {
        return "discouraged";
    } else if (!result.definitions[partOfSpeech]) {
        if (Object.keys(result.definitions).length < max) {
          return false;
        }
        return "definition";
    } else {
        if (result.definitions[partOfSpeech].length < max) {
          return false;
        }
        return "part-of-speech";
    }
}
