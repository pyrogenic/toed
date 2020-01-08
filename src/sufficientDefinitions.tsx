import IDictionaryEntry from "./IDictionaryEntry";
import Pass from "./Pass";

const MAX_PARTS_OF_SPEECH = 2;
const MAX_DEFINITIONS_PER_PART_OF_SPEECH = 2;

/**
 * @return false if we want to add this new definition, or a string giving the reason why we don't.
 */
export default function sufficientDefinitions(
    result: Partial<IDictionaryEntry>, partOfSpeech: string, short: boolean, pass: Pass) {
    if (!result.definitions) {
        return false;
    } else if (!result.definitions[partOfSpeech]) {
        if (Object.keys(result.definitions).length < MAX_PARTS_OF_SPEECH) {
            if (pass > Pass.secondary) {
                // Don't add additional definitions to a part of speech in subsequent passes
                return "discouraged";
            }
            return false;
        }
        return "part-of-speech";
    } else {
        const currentCount = result.definitions[partOfSpeech].length;
        if (currentCount > 0) {
            if (short) {
                // Don't add additional definitions to a part of speech if they're short
                return "short";
            }
            if (pass > Pass.primary) {
                // Don't add additional definitions to a part of speech in subsequent passes
                return "discouraged";
            }
        }
        if (currentCount >= MAX_DEFINITIONS_PER_PART_OF_SPEECH) {
            return "definition";
        }
        return false;
    }
}
