import IRedis, { ValueType } from "./IRedis";

export default class Webdis implements IRedis {
    private webdis: string;

    constructor(url: string) {
        this.webdis = url;
    }

    public url(...args: any[]) {
        return [this.webdis, ...args].join("/");
    }

    public async flushdb(): Promise<boolean> {
        const result = await fetch(this.url("FLUSHDB"));
        const json = await result.json();
        const { FLUSHDB: [success] } = json;
        return success;
    }

    public async get(key: string): Promise<string | undefined> {
        const result = await fetch(this.url("GET", key));
        const { GET: value } = await result.json();
        return value === null ? undefined : value;
    }

    public async set(key: KeyType, value: ValueType, options?: {
        ttl?: number; exists?: boolean;
    }): Promise<boolean> {
        const ttl = options?.ttl;
        const exists = options?.exists;
        const args: any[] = [];
        if (ttl !== undefined) {
            args.push("EX", ttl);
        }
        if (exists !== undefined) {
            args.push(exists ? "XX" : "NX");
        }
        const result = await fetch(this.url("SET", key, value, ...args));
        const { SET: setResult } = await result.json();
        const [success] = setResult || [false];
        return success;
    }

    public async sismember(key: string, value: ValueType): Promise<boolean> {
        const result = await fetch(this.url("SISMEMBER", key, value));
        const { SISMEMBER: success } = await result.json();
        return success;
    }

    public async smembers(key: string): Promise<ValueType[] | undefined> {
        const result = await fetch(this.url("SMEMBERS", key));
        const { SMEMBERS: value } = await result.json();
        return value === null ? undefined : value;
    }

    public async eval(lua: string, args?: { keys?: string[]; argv?: ValueType[]; }) {
        lua = encodeURIComponent(lua); // TODO: we probably need to do this for all args
        return this.evalInternal("EVAL", lua, args);
    }

    public async evalsha(sha: string, args?: { keys?: string[]; argv?: ValueType[]; }) {
        return this.evalInternal("EVALSHA", sha, args);
    }

    public async loadScript(lua: string) {
        lua = encodeURIComponent(lua); // TODO: we probably need to do this for all args
        const result = await fetch(this.url("SCRIPT", "LOAD", lua));
        const json = await result.json();
        const { SCRIPT: sha } = json;
        return sha;
    }

    private async evalInternal(
        op: "EVAL" | "EVALSHA", luaOrSha: string, args?: { keys?: string[]; argv?: ValueType[]; }) {
        const keys = args?.keys || [];
        const argv = args?.argv || [];
        const result = await fetch(this.url(op, luaOrSha, keys.length, ...keys, ...argv));
        const json = await result.json();
        const { EVAL: evalResult } = json;
        if (Array.isArray(evalResult)) {
            if (evalResult.length === 2 && evalResult[0] === false && evalResult[1].match(/^ERR /)) {
                throw new Error(evalResult[1]);
            }
        }
        return evalResult === null ? undefined : evalResult;
    }
}
