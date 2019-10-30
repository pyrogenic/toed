import IDictionaryEntry from "./IDictionaryEntry";
import Pass from "./Pass";
export default function needsMoreDefinitions(
    result: Partial<IDictionaryEntry>, partOfSpeech: string, short: boolean, pass: Pass) {
    const max = short ? 1 : 2;
    if (!result.definitions) {
        return true;
    } else if (pass > 1) {
        return false;
    } else if (!result.definitions[partOfSpeech]) {
        return Object.keys(result.definitions).length < max;
    } else {
        return result.definitions[partOfSpeech].length < max;
    }
}
