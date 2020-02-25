import Webdis from "../redis/Webdis";
import behavesLikeRedis from "./IRedis.shared.test";

describe("Webdis", () => {
    const client = new Webdis("http://localhost:7385");
    behavesLikeRedis(client);
});
