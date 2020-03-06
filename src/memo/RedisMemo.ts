import IRedis from "../redis/IRedis";
import IMemoOptions from "./IMemoOptions";

export interface IOptions {
    cache?: boolean;
    bypass?: boolean;
}

interface IRedisMemoProps<TProps, TResult> {
    redis: IRedis;
    /**
     * scheme to turn props into a redis key name
     */
    name: (props: TProps) => string[];
    factory: (props: TProps) => Promise<TResult>;
    validate?: (result: TResult) => boolean;
}

export default class RedisMemo<TProps, TResult> {
    public readonly redis: IRedis;
    public readonly name: (props: TProps) => string[];
    public readonly factory: (props: TProps) => Promise<TResult>;
    public readonly validate?: (result: TResult) => boolean;

    constructor({ redis, name, factory, validate }: IRedisMemoProps<TProps, TResult>) {
        this.redis = redis;
        this.name = name;
        this.factory = factory;
        this.validate = validate;
    }

    public get = async (props: TProps, { cache, bypass }: IMemoOptions = {}) => {
        if (cache === undefined) { cache = true; }
        if (bypass === undefined) { bypass = false; }
        const key = this.key(props);
        if (!bypass) {
            const cachedValue = await this.redis.get(key);
            if (cachedValue !== undefined) {
                const parse = JSON.parse(cachedValue) as TResult;
                const valid = this.validate?.(parse) ?? "no validate func";
                if (valid) {
                    return parse;
                }
            }
        }
        const newValue = await this.factory(props);
        if (cache) {
            const valid = this.validate?.(newValue) ?? "no validate func";
            if (valid) {
              await this.cache(props, newValue, key);
            }
        }
        return newValue;
    }

    // todo: remove {key} from public API
    public cache = async (props: TProps, value: TResult, key?: string) => {
        key = key ?? this.key(props);
        const stringValue = JSON.stringify(value);
        await this.redis.set(key, stringValue);
    }

    public has = async (props: TProps) => {
        const key = this.key(props);
        return this.redis.exists(key);

    }

    private key(props: TProps) {
        return this.name(props).map(encodeURIComponent.bind(null)).join(":");
    }

    // private go(url: string): Promise<{ success: boolean, cachedValue: string; }> {
    //     const catchError = (error: Error) => {
    //         return { cachedValue: error.message, success: false };
    //     };
    //     return fetch(url).then(
    //         (response) => {
    //             const { ok: success } = response;
    //             return response.text()
    //                 .then(
    //                     (cachedValue: string) => ({ cachedValue, success }),
    //                     catchError);
    //         },
    //         catchError);
    // }
}
