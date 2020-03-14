import { cloneDeep, compact, flatten, kebabCase } from "lodash";
import { ITags } from "../IWordRecord";
import Lookup, { CacheMode, PartialLookupProps } from "../Lookup";
import { arraySetAdd } from "../Magic";
import { AnnotatedHeadwordEntry, fillInTags } from "../OxfordDictionariesPipeline";
import IHeadwordEntry from "../types/gen/IHeadwordEntry";
import IRetrieveEntry from "../types/gen/IRetrieveEntry";
import RetrieveEntry from "../types/gen/RetrieveEntry";
import OxfordLanguage from "../types/OxfordLanguage";

export default class LookupCoordinator {
    private lookup: Lookup;

    constructor(props: PartialLookupProps) {
        this.lookup = new Lookup({cache: CacheMode.none, ...props});
    }

    public getWord = async (q: string, languages: OxfordLanguage[], redirect?: string): Promise<IRetrieveEntry> => {
        q = q.toLocaleLowerCase();
        let promises: Array<[string, Promise<RetrieveEntry>]> = [];
        const addLookup = (word: string, tags: ITags) => {
            const words = promises.map(([w]) => w);
            if (words.includes(word)) {
                return;
            }
            promises = promises.concat(languages.map((language) =>
                [word, this.lookup.get(language, word).then((pre) => {
                    pre?.results?.forEach((he) => (he as AnnotatedHeadwordEntry).tags = cloneDeep(tags));
                    return pre;
                })]));
        };
        const doLookups = async () => {
            // const words = promises.map(([w]) => w);
            const ps = promises.map(([, p]) => p);
            // console.log({words, ps});
            const promiseResults = await Promise.all(ps);
            // console.log(`get: finished waiting for lookups: ${words.join(", ")}`);
            return promiseResults.reduce((re0, re1) => {
                re0.results = flatten(compact([re0.results, re1.results]));
                return re0;
            });
        };
        addLookup(redirect || q, {});
        let re = await doLookups();
        const crossReferences: string[] = [];
        re.results?.forEach((result) =>
            result.lexicalEntries.forEach((entry) => {
                if (entry.lexicalCategory.id === "other") {
                    if (arraySetAdd({ crossReferences }, "crossReferences", result.id)) {
                        const tags: ITags = { imputed: [[`xref-other`, `${q} > ${result.id}`]] };
                        fillInTags(tags, undefined, entry.grammaticalFeatures, undefined, undefined);
                        addLookup(result.id, tags);
                    }
                }
                entry.entries?.forEach((lexicalEntry) =>
                    lexicalEntry.senses?.forEach((sense) =>
                        sense.crossReferences?.forEach((crossReference) => {
                            const { id: crossReferenceId, type } = crossReference;
                            if (arraySetAdd({ crossReferences }, "crossReferences", crossReferenceId)) {
                                const tags: ITags = { imputed: [[`xref-${kebabCase(type)}`, `${crossReferenceId} > ${result.id}`]] };
                                fillInTags(
                                    tags, entry.lexicalCategory.id, lexicalEntry.grammaticalFeatures, sense, undefined);
                                addLookup(crossReference.id, tags);
                            }
                        })));
            }));
        re = await doLookups();
        redirect = this.derivativeOf(re.results);
        if (redirect) {
            // console.log("get: redirecting to " + redirect);
            return this.getWord(q, languages, redirect);
        }
        return re;
    }

  private derivativeOf = (results?: IHeadwordEntry[]) => {
    if (results) {
      const derivativeOf = flatten(flatten(flatten(results.map((result) =>
        compact(result.lexicalEntries.map((entry) => entry.derivativeOf)))))).map((re) => re.id);
      if (derivativeOf.length === 1) {
        return derivativeOf[0];
      }
    }
  }
}
