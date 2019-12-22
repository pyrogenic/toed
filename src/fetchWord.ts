import { deserialize } from "serializr";
import { fetchMemo } from "./fetchJson";
import IMemoOptions from "./IMemoOptions";
import RetrieveEntry from "./types/gen/RetrieveEntry";
import OxfordLanguage from "./types/OxfordLanguage";

export default async function fetchWord(
    apiBaseUrl: string, language: OxfordLanguage, q: string, options?: IMemoOptions) {
    const json = await fetchMemo.get(`${apiBaseUrl}/words${language ? `/${language}` : ""}?q=${q}`, options);
    return deserialize(RetrieveEntry, json);
}
