import { arraySetAdd, arraySetAddAll, ensure, ensureArray } from "../Magic";

class Container {
    public req: string[] = [];
    public opt?: string[];
}

describe("ensure", () => {
    test("simple", () => {
        const cc: {c?: Container} = {};
        expect(cc).toHaveProperty("c", undefined);
        expect(ensure(cc, "c", Container)).toBeInstanceOf(Container);
        expect(cc.c).toHaveProperty("req", []);
    });

    test("partial", () => {
        const cc: Partial<{c: Container}> = {};
        expect(cc).toHaveProperty("c", undefined);
        expect(ensure(cc, "c", Container)).toBeInstanceOf(Container);
        expect(cc.c).toHaveProperty("req", []);
    });

    test("array", () => {
        const cc: {c?: string[]} = {};
        expect(cc).toHaveProperty("c", undefined);
        expect(ensureArray(cc, "c")).toEqual([]);
        expect(cc).toHaveProperty("c", []);
    });

    test("array partial", () => {
        const cc: Partial<{c: string[]}> = {};
        expect(cc).toHaveProperty("c", undefined);
        expect(ensureArray(cc, "c")).toEqual([]);
        expect(cc).toHaveProperty("c", []);
    });

    test("array Pick", () => {
        const cc: Pick<{c?: string[]}, "c"> = {};
        expect(cc).toHaveProperty("c", undefined);
        expect(ensureArray(cc, "c")).toEqual([]);
        expect(cc).toHaveProperty("c", []);
    });
});

describe("Array Sets", () => {
    let container!: Container;

    beforeEach(() => container = new Container());
    const keys: Array<keyof Container> = ["req", "opt"];
    keys.forEach((prop: keyof Container) => {
        describe(prop, () => {
            it("basic", () => {
                expect(container).toHaveProperty(prop, prop === "req" ? [] : undefined);
                expect(arraySetAdd(container, prop, "1")).toBeTruthy();
                expect(container).toHaveProperty(prop, ["1"]);
            });

            it("multiple adds", () => {
                expect(arraySetAdd(container, prop, "1")).toBeTruthy();
                expect(container).toHaveProperty(prop, ["1"]);
                expect(arraySetAdd(container, prop, "1")).toBeFalsy();
                expect(container).toHaveProperty(prop, ["1"]);
                expect(arraySetAdd(container, prop, "2")).toBeTruthy();
                expect(container).toHaveProperty(prop, ["1", "2"]);
                expect(arraySetAdd(container, prop, "2")).toBeFalsy();
                expect(container).toHaveProperty(prop, ["1", "2"]);
                expect(arraySetAdd(container, prop, "1")).toBeFalsy();
                expect(container).toHaveProperty(prop, ["1", "2"]);
            });

            it("multiple adds", () => {
                expect(arraySetAdd(container, prop, "1")).toBeTruthy();
                expect(container).toHaveProperty(prop, ["1"]);
                expect(arraySetAdd(container, prop, "1")).toBeFalsy();
                expect(container).toHaveProperty(prop, ["1"]);
                expect(arraySetAddAll(container, prop, ["2", "2"])).toBeTruthy();
                expect(container).toHaveProperty(prop, ["1", "2"]);
                expect(arraySetAddAll(container, prop, ["2", "1"])).toBeFalsy();
                expect(container).toHaveProperty(prop, ["1", "2"]);
                expect(arraySetAdd(container, prop, "1")).toBeFalsy();
                expect(container).toHaveProperty(prop, ["1", "2"]);
            });

            it("sorting", () => {
                arraySetAdd(container, prop, "c");
                arraySetAdd(container, prop, "a");
                expect(container).toHaveProperty(prop, ["c", "a"]);
                arraySetAdd(container, prop, "d", true);
                expect(container).toHaveProperty(prop, ["a", "c", "d"]);
            });
        });
    });
});