export type ValueType = string | number;
export type KeyType = string;

export interface IEvalArgs {
    keys?: KeyType[],
    argv?: ValueType[],
}

export default interface IRedis {
    flushdb(): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    get(key: KeyType): Promise<string | undefined>;
    set(key: KeyType, value: ValueType, options?: {
        ttl?: number,
        exists?: boolean,
    }): Promise<boolean>;
    sismember(key: KeyType, value: ValueType): Promise<boolean>;
    smembers(key: KeyType): Promise<ValueType[] | undefined>;
    eval(lua: string, args?: IEvalArgs): Promise<undefined | ValueType | ValueType[]>;
    evalsha(sha: string, args?: IEvalArgs): Promise<undefined | ValueType | ValueType[]>;
    loadScript(lua: string): Promise<string>;
}
