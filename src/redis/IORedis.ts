import Redis from "ioredis";
import IRedis, {KeyType, ValueType} from "./IRedis";

export default class IORedis implements IRedis {
    private redis: Redis.Redis;

    constructor(options?: Redis.RedisOptions) {
        this.redis = new Redis(options);
    }

    public async flushdb() {
        const result = await this.redis.flushdb();
        return result === "OK";
    }

    public async get(key: KeyType): Promise<string | undefined> {
        const result = await this.redis.get(key);
        if (result === null) {
            return undefined;
        }
        return result;
    }

    public async set(key: KeyType, value: ValueType, options: {
        ttl?: number | undefined; exists?: boolean | undefined; } = {}): Promise<boolean> {
        const {ttl, exists} = options;
        const args: any[] = [];
        if (ttl !== undefined) {
            args.push("EX", ttl);
        }
        if (exists !== undefined) {
            args.push(exists ? "XX" : "NX");
        }
        const result = await this.redis.set(key, value, ...args);
        return result === "OK";
    }

    public async eval(lua: string, args?: { keys?: string[]; argv?: ValueType[]; }) {
        const keys = args?.keys || [];
        const argv = args?.argv || [];
        const result = await this.redis.eval(lua, keys.length, ...keys, ...argv)
        return result === null ? undefined : result;
    }
}
