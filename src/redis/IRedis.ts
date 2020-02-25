export type ValueType = string | number;
export type KeyType = string;

export default interface IRedis {
    flushdb(): Promise<boolean>;
    get(key: KeyType): Promise<string | undefined>;
    set(key: KeyType, value: ValueType, options?: {
        ttl?: number,
        exists?: boolean,
    }): Promise<boolean>;
    sismember(key: KeyType, value: ValueType): Promise<boolean>;
    smembers(key: KeyType): Promise<ValueType[] | undefined>;
    eval(lua: string, args?: {
        keys?: KeyType[],
        argv?: ValueType[],
    }): Promise<undefined | ValueType | ValueType[]>;
}
