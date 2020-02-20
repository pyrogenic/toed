import fs from "fs";
import Redis from "ioredis";
// const { promisify } = require("util");

const BSADD_LUA: string = fs.readFileSync("./src/redis/BSADD.lua", { encoding: "UTF-8" });

function expectError(promise: Promise<any>, matcher: string | RegExp) {
    return promise.then(() => { throw new Error("unexpectedly succeeded"); })
        .catch((error) => expect(error.message).toMatch(matcher));
}

describe("BSADD", () => {
    const client = new Redis({db: 5});
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

    test("errors", async (cb) => {
        await expectError(client.eval
            (BSADD_LUA, 0),
            /\Witem_set\W/);
        await expectError(client.eval
            (BSADD_LUA, 1, "item-set"),
            /\Wmark_set\W/);
        await expectError(client.eval
            (BSADD_LUA, 2, "item-set", "mark-set"),
            /\Witem\W/);
        await expectError(client.eval
            (BSADD_LUA, 2, "item-set", "mark-set", "a1"),
            /\Wmark\W/);
        await expectError(client.eval
            (BSADD_LUA, 2, "item-set", "mark-set", "a1", "a2"),
            /item_set.*form/);
        await expectError(client.eval
            (BSADD_LUA, 2, "dictionary:hello", "mark-set", "a1", "a2"),
            /item_set.*form/);
        await expectError(client.eval
            (BSADD_LUA, 2, "dictionary:hello:tags", "mark-set", "a1", "a2"),
            /mark_set.*form/);
        await expectError(client.eval
            (BSADD_LUA, 2, "dictionary:hello:tags", "meta:tags", "a1", "a2"),
            /mark_set.*form/);
        await expectError(client.eval
            (BSADD_LUA, 2, "dictionary:hello:tags", "meta:tags:heart", "a1", "a2"),
            "to add a2 to a1, dictionary:hello:tags must end in a1:tags");
        await expectError(client.eval
            (BSADD_LUA, 2, "dictionary:hello:tags", "meta:tags:heart", "hello", "a2"),
            "to add a2 to dictionary:hello:tags, meta:tags:heart must end in tags:a2");
        cb();
    });
});
