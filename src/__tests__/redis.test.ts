import fs from "fs";
import Redis from "ioredis";
import IORedis from "../redis/IORedis";
import IRedis from "../redis/IRedis";

const BISET_LUA: string = fs.readFileSync("./src/redis/BISET.lua", { encoding: "UTF-8" });

function expectError(promise: Promise<any>, matcher: string | RegExp) {
    return promise.then(() => { throw new Error("unexpectedly succeeded"); })
        .catch((error) => expect(error.message).toMatch(matcher));
}

function behavesLikeRedis(client: IRedis) {
    beforeAll(async (cb) => await client.flushdb().then(cb.bind(null, undefined)));

    test("get nothing", async (cb) => {
        expect(await client.get("test:garbage")).toBeUndefined();
        cb();
    });

    test("set & get", async (cb) => {
        expect(await client.set("test:set", "anything")).toEqual(true);
        expect(await client.get("test:set")).toEqual("anything");
        await client.set("test:set", "anything");
        cb();
    });

    test("set nx", async (cb) => {
        expect(await client.set("test:set:nx", "anything")).toEqual(true);
        expect(await client.get("test:set:nx")).toEqual("anything");
        expect(await client.set("test:set:nx", "nothing", {exists: false})).toEqual(false);
        expect(await client.get("test:set:nx")).toEqual("anything");
        cb();
    });

    test("set xx", async (cb) => {
        expect(await client.set("test:set:xx", "anything", {exists: true})).toEqual(false);
        expect(await client.get("test:set:xx")).toBeUndefined();
        await client.set("test:set:xx", "nothing");
        expect(await client.set("test:set:xx", "anything", {exists: true})).toEqual(true);
        expect(await client.get("test:set:xx")).toEqual("anything");
        cb();
    });

    test("eval", async (cb) => {
        expect(await client.eval("")).toEqual(undefined);
        expect(await client.eval("return 1")).toEqual(1);
        expect(await client.eval("return {1}")).toEqual([1]);
        expect(await client.eval("return ARGV[1]", {argv: ["hello"]})).toEqual("hello");
        await client.set("test:eval:1", 1);
        expect(await client.eval("return redis.call('GET', KEYS[1])", {keys: ["test:eval:1"]})).toEqual("1");
        expect(await client.eval("return redis.call(ARGV[1], KEYS[1])", {
            argv: ["GET"],
            keys: ["test:eval:1"],
        })).toEqual("1");
        expect(await client.eval("return redis.call(ARGV[1], KEYS[1])", {
            argv: ["INCR"],
            keys: ["test:eval:1"],
        })).toEqual(2);
        cb();
    });
}

describe("IORedis", () => {
    const client = new IORedis({ db: 5 });
    behavesLikeRedis(client);
});

describe("BISET", () => {
    const client = new Redis({ db: 5 });
    beforeAll(async (cb) => await client.flushdb().then(cb.bind(null, undefined)));

    test("source exists", () => {
        expect(BISET_LUA).toBeDefined();
    });

    test("set", async (cb) => {
        await client.set("test:set", "anything");
        expect(await client.get("test:set")).toEqual("anything");
        cb();
    });

    ["ADD", "REM"].forEach((op) => {
        test(`BISET ${op} errors`, async (cb) => {
            await expectError(client.eval
                (BISET_LUA, 0),
                /\Witem_set\W/);
            await expectError(client.eval
                (BISET_LUA, 1, "item-set"),
                /\Wmark_set\W/);
            await expectError(client.eval
                (BISET_LUA, 2, "item-set", "mark-set"),
                /\Wmissing op\W/);
            await expectError(client.eval
                (BISET_LUA, 2, "item-set", "mark-set", op),
                /\Witem\W/);
            await expectError(client.eval
                (BISET_LUA, 2, "item-set", "mark-set", op, "a1"),
                /\Wmark\W/);
            await expectError(client.eval
                (BISET_LUA, 2, "item-set", "mark-set", op, "a1", "a2"),
                /item_set.*form/);
            await expectError(client.eval
                (BISET_LUA, 2, "dictionary:hello", "mark-set", "nonsense", "a1", "a2"),
                /\Wnonsense\W.*ADD or REM/);
            await expectError(client.eval
                (BISET_LUA, 2, "dictionary:hello", "mark-set", op, "a1", "a2"),
                /item_set.*form/);
            await expectError(client.eval
                (BISET_LUA, 2, "dictionary:hello:tags", "mark-set", op, "a1", "a2"),
                /mark_set.*form/);
            await expectError(client.eval
                (BISET_LUA, 2, "dictionary:hello:tags", "meta:tags", op, "a1", "a2"),
                /mark_set.*form/);
            await expectError(client.eval
                (BISET_LUA, 2, "dictionary:hello:tags", "meta:tags:heart", op, "a1", "a2"),
                "to add a2 to a1, dictionary:hello:tags must end in a1:tags");
            await expectError(client.eval
                (BISET_LUA, 2, "dictionary:hello:tags", "meta:tags:heart", op, "hello", "a2"),
                "to add a2 to dictionary:hello:tags, meta:tags:heart must end in tags:a2");
            cb();
        });
    });

    const itemKey = (word: string) => `dictionary:${word}:tags`;
    const markKey = (tag: string) => `meta:tags:${tag}`;

    test("BISET ADD", async (cb) => {
        let item = "hello";
        let mark = "heart";
        expect(await client.sismember(itemKey(item), mark)).toBeFalsy();
        expect(await client.sismember(markKey(mark), item)).toBeFalsy();
        expect(await client.eval(BISET_LUA, 2, itemKey(item), markKey(mark), "ADD", item, mark)).toEqual([1, 1]);
        expect(await client.sismember(itemKey(item), mark)).toBeTruthy();
        expect(await client.sismember(markKey(mark), item)).toBeTruthy();
        expect(await client.eval(BISET_LUA, 2, itemKey(item), markKey(mark), "ADD", item, mark)).toEqual([0, 0]);
        item = "goodbye";
        expect(await client.eval(BISET_LUA, 2, itemKey(item), markKey(mark), "ADD", item, mark)).toEqual([1, 1]);
        mark = "ping";
        expect(await client.eval(BISET_LUA, 2, itemKey(item), markKey(mark), "ADD", item, mark)).toEqual([1, 1]);
        expect((await client.smembers(itemKey("goodbye"))).sort()).toEqual(["heart", "ping"]);
        expect((await client.smembers(markKey("ping"))).sort()).toEqual(["goodbye"]);
        cb();
    });

    test("BISET REM", async (cb) => {
        const item = "goodbye";
        const mark = "heart";
        expect((await client.smembers(markKey(mark))).sort()).toEqual(["goodbye", "hello"]);
        expect(await client.eval(BISET_LUA, 2, itemKey(item), markKey(mark), "REM", item, mark)).toEqual([1, 1]);
        expect((await client.smembers(markKey(mark))).sort()).toEqual(["hello"]);
        cb();
    });
});
