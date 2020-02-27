import IORedis from "../IORedis";
import behavesLikeRedis from "./IRedis.behavior";

describe("IORedis", () => {
    // note that this runs on a different DB so the two tests can run in parallel
    const client = new IORedis({ db: 6 });
    behavesLikeRedis(client);
});
