import IORedis from "../redis/IORedis";
import Webdis from "../redis/Webdis";
import behavesLikeRedis from "./IRedis.shared.test";

describe("IORedis", () => {
    const client = new IORedis({ db: 5 });
    behavesLikeRedis(client);
});

describe("Webdis", () => {
    const client = new Webdis("http://localhost:7385");
    // // let cp!: ChildProcess;
    // // beforeAll((cb) => {
    //     // cp = child_process.spawn("submodules/webdis/webdis", ["webdis-test.json"], {
    //     //     stdio: "pipe",
    //     // });
    //     // client = ;
    //     // console.log(cp.stdout?.read());
    //     // cb();
    // });
    behavesLikeRedis(client);
});
