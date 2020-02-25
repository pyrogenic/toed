import IORedis from "../redis/IORedis";
import behavesLikeRedis from "./IRedis.behavior";

describe("IORedis", () => {
    const client = new IORedis({ db: 5 });
    behavesLikeRedis(client);
});
