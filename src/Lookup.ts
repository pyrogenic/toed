import compact from "lodash/compact";
import get from "lodash/get";
import { deserialize } from "serializr";
import IMemoOptions from "./memo/IMemoOptions";
import RedisMemo from "./memo/RedisMemo";
import StorageMemo from "./memo/StorageMemo";
import OpTrack from "./OpTrack";
import IRetrieveEntry from "./types/gen/IRetrieveEntry";
import RetrieveEntry from "./types/gen/RetrieveEntry";
import OxfordLanguage from "./types/OxfordLanguage";
import IRedis from "./redis/IRedis";
import Webdis from "./redis/Webdis";

export enum CacheMode {
    "none" = "none",
    "session" = "session",
    "local" = "local",
}

export interface ILookupProps {
    cache: CacheMode;
    enterprise: boolean;
    online: boolean;
    redis: IRedis;
    threads: number;
    visible: number;
    apiRate: number;
}

const STORAGE_KEY_PREFIX = "fetchJson";
// const LookupDefaults: ILookupProps = {
//     cache: CacheMode.session,
//     enterprise: false,
//     online: true,
// };

export default class Lookup {

    public get effectiveProps(): ILookupProps {
        const props = this.props;
        return Lookup.effectiveProps(props);
    }

    public get props() { return this.propsValue; }

    public set props(props: Partial<ILookupProps>) {
        this.propsValue = props;
        const {redis, cache, enterprise, online} = this.effectiveProps;
        const validate = (result: any) =>
          typeof result === "object" && Object.keys(result).length > 0 && !("errno" in result) && result?.error !== "offline";
        let lookup = online ? this.callOxfordDictionaries : (url: string) => Promise.resolve({error: "offline"} as any);
        if (enterprise) {
            this.redis = new RedisMemo({
                factory: lookup,
                name(url) {
                    return compact(["memo", "od-api", ...url.split(/[/?#=]/)]);
                },
                redis,
                validate,
            });
            lookup = this.redis.get;
        } else {
            this.redis = undefined;
        }
        if (cache === "none") {
            this.storage = undefined;
        } else {
            this.storage = new StorageMemo(
                cache === "local" ? localStorage : sessionStorage,
                STORAGE_KEY_PREFIX,
                lookup,
                validate);
            lookup = this.storage.get;
        }
        this.lookup = lookup;
    }

    public static get browserCache() {
        const result = {
            localStorage: { count: 0, clear: Lookup.clearBrowserCache.bind(this, localStorage) },
            sessionStorage: { count: 0, clear: Lookup.clearBrowserCache.bind(this, sessionStorage) },
        };
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                result.localStorage.count += 1;
            }
        });
        Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                result.sessionStorage.count += 1;
            }
        });
        return result;
    }

    public static effectiveProps(props: Partial<ILookupProps> = {}) {
        // const development = process.env.NODE_ENV === "development";
        const enterprise = get(props, "enterprise", (process.env.REACT_APP_ENTERPRISE as unknown as boolean) ?? false);
        const cache = get(props, "cache", CacheMode.session);
        const online = get(props, "online", true);
        const threads = get(props, "threads", 2);
        const visible = get(props, "visible", 10);
        const apiRate = get(props, "apiRate", 200);
        const redis = get(props, "redis", new Webdis("http://localhost:7382"));
        return {
            apiRate,
            cache,
            enterprise,
            online,
            redis,
            threads,
            visible,
        };
    }

    public static clearBrowserCache(storage: Storage) {
        Object.keys(storage).forEach((key) => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                storage.removeItem(key);
            }
        });
    }

    public storage?: StorageMemo<string, IRetrieveEntry>;
    public redis?: RedisMemo<string, IRetrieveEntry>;

    private propsValue: Partial<ILookupProps> = {};
    private lookup!: RedisMemo<string, IRetrieveEntry>["get"];

    constructor(props: Partial<ILookupProps>) {
        this.props = props;
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
        const json = await queryResult.json();
        json.status = json.status ?? queryResult.status;
        // tslint:disable-next-line:no-console
        console.warn({fetch: url, queryResult, json});
        return json;
    }

    public readonly get = async (
        apiBaseUrl: string, language: OxfordLanguage, q: string, options?: IMemoOptions) => {
        const url = `${apiBaseUrl}/words/${language}?q=${q}`;
        const json = await this.lookup(url, options);
        return deserialize(RetrieveEntry, json);
    }
}
