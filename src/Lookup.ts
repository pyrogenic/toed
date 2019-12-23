import compact from "lodash/compact";
import { deserialize } from "serializr";
import IMemoOptions from "./memo/IMemoOptions";
import RedisMemo from "./memo/RedisMemo";
import StorageMemo from "./memo/StorageMemo";
import OpTrack from "./OpTrack";
import IRetrieveEntry from "./types/gen/IRetrieveEntry";
import RetrieveEntry from "./types/gen/RetrieveEntry";
import OxfordLanguage from "./types/OxfordLanguage";

export default class Lookup {

    public readonly storage: StorageMemo<string, IRetrieveEntry>;
    public readonly redis?: RedisMemo<string, IRetrieveEntry>;
    public readonly enterprise: boolean;

    constructor(enterprise: boolean) {
        let lookup = this.callOxfordDictionaries;
        this.enterprise = enterprise;
        if (enterprise) {
            this.redis = new RedisMemo({
                factory: lookup,
                name(url) {
                    return compact(["memo", "od-api", ...url.split(/[/?#=]/)]);
                },
                webdis: "",
            });
            lookup = this.redis.get;
        }
        const development = process.env.NODE_ENV === "development";
        this.storage = new StorageMemo(
            development ? localStorage : sessionStorage, "fetchJson",
            lookup,
            (result) => typeof result === "object" && !("errno" in result));
    }

    public readonly callOxfordDictionaries = async (url: string): Promise<IRetrieveEntry> => {
        // tslint:disable: variable-name
        const app_id = localStorage.getItem("oed/app_id");
        const app_key = localStorage.getItem("oed/app_key");
        // tslint:enable: variable-name
        if (!app_id || !app_key) {
            throw new Error("missing app id or key");
        }
        // tslint:disable-next-line:no-console
        console.warn("fetch " + url);
        const promise = fetch(url, { headers: { Accept: "application/json", app_id, app_key } });
        OpTrack.track("odapi", url, promise);
        const queryResult = await promise;
        return await queryResult.json();
    }

    public readonly get = async (
        apiBaseUrl: string, language: OxfordLanguage, q: string, options?: IMemoOptions) => {
        const json = await this.storage.get(`${apiBaseUrl}/words/${language}?q=${q}`, options);
        return deserialize(RetrieveEntry, json);
    }
}
