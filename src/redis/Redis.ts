import IRedis, { IEvalArgs } from "./IRedis";

export default class Redis {
    public static define(client: IRedis, lua: string) {
        const definer = client.loadScript(lua);
        const result = async (args?: IEvalArgs) => {
            const sha = await definer;
            return client.evalsha(sha, args);
        };
        return result;
    }
}
