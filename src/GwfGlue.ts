import IDictionaryEntry from "./IDictionaryEntry";

const LOC_DICTIONARY_HASH_NAME = "_oed_dictionary_info";
const HOST = "http://localhost:7380";

type GwfLocale = "en";

function locDictionaryHashName(locale: GwfLocale) {
    return [process.env.NODE_ENV, locale + LOC_DICTIONARY_HASH_NAME].join(":");
}

export default class GwfGlue {
    public static get = async (locale: GwfLocale, word: string): Promise<IDictionaryEntry> => {
        const result = await fetch([HOST, "HGET", locDictionaryHashName(locale), word].join("/"));
        const { HGET: json } = await result.json();
        return JSON.parse(json);
    }

    public static set = async (locale: GwfLocale, word: string, value: IDictionaryEntry) => {
        const url = [HOST, "HSET", locDictionaryHashName(locale), word].join("/");
        const result = await fetch(url, {method: "PUT", body: JSON.stringify(value, null, 2)});
        return result.json();
    }
}
