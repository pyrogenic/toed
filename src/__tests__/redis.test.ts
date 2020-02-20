import fs from "fs";
import Redis from "ioredis";
// const { promisify } = require("util");

const BS_PREAMBLE_LUA: string = fs.readFileSync("./src/redis/BS.preamble.lua", { encoding: "UTF-8" });
const BSADD_LUA: string = BS_PREAMBLE_LUA + fs.readFileSync("./src/redis/BSADD.lua", { encoding: "UTF-8" });
const BSREM_LUA: string = BS_PREAMBLE_LUA + fs.readFileSync("./src/redis/BSREM.lua", { encoding: "UTF-8" });

function expectError(promise: Promise<any>, matcher: string | RegExp) {
    return promise.then(() => { throw new Error("unexpectedly succeeded"); })
        .catch((error) => expect(error.message).toMatch(matcher));
}

describe("BSADD", () => {
    const client = new Redis({ db: 5 });
    beforeAll(async (cb) => await client.flushdb().then(cb.bind(null, undefined)));

    // const getAsync = promisify(client.get).bind(client);
    // const setAsync = promisify(client.set).bind(client);

    test("source exists", () => {
        expect(BSADD_LUA).toBeDefined();
    });

    test("set", async (cb) => {
        await client.set("test:set", "anything");
        expect(await client.get("test:set")).toEqual("anything");
        cb();
    });

    [["BSADD", BSADD_LUA], ["BSREM", BSREM_LUA]].forEach(([name, cmd]) => {
        test(`${name} errors`, async (cb) => {
            await expectError(client.eval
                (cmd, 0),
                /\Witem_set\W/);
            await expectError(client.eval
                (cmd, 1, "item-set"),
                /\Wmark_set\W/);
            await expectError(client.eval
                (cmd, 2, "item-set", "mark-set"),
                /\Witem\W/);
            await expectError(client.eval
                (cmd, 2, "item-set", "mark-set", "a1"),
                /\Wmark\W/);
            await expectError(client.eval
                (cmd, 2, "item-set", "mark-set", "a1", "a2"),
                /item_set.*form/);
            await expectError(client.eval
                (cmd, 2, "dictionary:hello", "mark-set", "a1", "a2"),
                /item_set.*form/);
            await expectError(client.eval
                (cmd, 2, "dictionary:hello:tags", "mark-set", "a1", "a2"),
                /mark_set.*form/);
            await expectError(client.eval
                (cmd, 2, "dictionary:hello:tags", "meta:tags", "a1", "a2"),
                /mark_set.*form/);
            await expectError(client.eval
                (cmd, 2, "dictionary:hello:tags", "meta:tags:heart", "a1", "a2"),
                "to add a2 to a1, dictionary:hello:tags must end in a1:tags");
            await expectError(client.eval
                (cmd, 2, "dictionary:hello:tags", "meta:tags:heart", "hello", "a2"),
                "to add a2 to dictionary:hello:tags, meta:tags:heart must end in tags:a2");
            cb();
        });
    });

    const itemKey = (word: string) => `dictionary:${word}:tags`;
    const markKey = (tag: string) => `meta:tags:${tag}`;

    test("BSADD", async (cb) => {
        let item = "hello";
        let mark = "heart";
        expect(await client.sismember(itemKey(item), mark)).toBeFalsy();
        expect(await client.sismember(markKey(mark), item)).toBeFalsy();
        expect(await client.eval(BSADD_LUA, 2, itemKey(item), markKey(mark), item, mark)).toEqual([1, 1]);
        expect(await client.sismember(itemKey(item), mark)).toBeTruthy();
        expect(await client.sismember(markKey(mark), item)).toBeTruthy();
        expect(await client.eval(BSADD_LUA, 2, itemKey(item), markKey(mark), item, mark)).toEqual([0, 0]);
        item = "goodbye";
        expect(await client.eval(BSADD_LUA, 2, itemKey(item), markKey(mark), item, mark)).toEqual([1, 1]);
        mark = "ping";
        expect(await client.eval(BSADD_LUA, 2, itemKey(item), markKey(mark), item, mark)).toEqual([1, 1]);
        expect((await client.smembers(itemKey("goodbye"))).sort()).toEqual(["heart", "ping"]);
        expect((await client.smembers(markKey("ping"))).sort()).toEqual(["goodbye"]);
        cb();
    });

    test("BSREM", async (cb) => {
        let item = "goodbye";
        let mark = "heart";
        expect((await client.smembers(markKey(mark))).sort()).toEqual(["goodbye", "hello"]);
        expect(await client.eval(BSREM_LUA, 2, itemKey(item), markKey(mark), item, mark)).toEqual([1, 1]);
        expect((await client.smembers(markKey(mark))).sort()).toEqual(["hello"]);
        cb();
    });
});
