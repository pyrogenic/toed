type Diff<T, U> = T extends U ? never : T;  // Remove types from T that are assignable to U
type Filter<T, U> = T extends U ? T : never;  // Remove types from T that are not assignable to U

export type PropertyNamesOfType<T, P> = {
    [K in keyof Required<T>]: T[K] extends P ? K : never;
}[keyof T];

export type PropertiesOfType<T, P> = Pick<T, PropertyNamesOfType<T, P>>;

export type Comparer<T> = Parameters<T[]["sort"]>;

type ElementType<T> = T extends Array<infer E> ? E : never;

// type S = ElementType<string[]>;
// type TC = { a?: string[], b?: number };
// type TE = string;
// type OptionalArrayPropertyNamesOfType<TContainer, TElement> = OptionalPropertyNamesOfType<TContainer, TElement[]>;
// function arrayTest<TCC, TEE, K extends OptionalPropertyNamesOfType<TCC, TEE[]>, C extends {[_K in K]: TEE[]}>(
//     c: C,
//     k: K,
//     v: TEE) {
//     const a: TEE[] | undefined = c[k];
// }

/** array set add */
export function arraySetAdd<
    TContainer,
    TElement,
    TKey extends ArrayPropNames<TContainer> & PropertyNamesOfType<TContainer, TElement[] | undefined>>(
        container: TContainer,
        key: TKey,
        value: ElementType<TContainer[TKey]>,
        sorted?: boolean | Comparer<TElement>) {
    const list = ensureArray(container, key);
    if (list.includes(value)) {
        return false;
    }
    list.push(value);
    if (typeof sorted === "function") {
        list.sort(sorted);
    } else if (sorted) {
        list.sort();
    }
    return true;
}

export function arraySetClear<TContainer>(container: Pick<TContainer[], "slice" | "length">) {
    container.slice(0, container.length);
}

export function ensure<
    TContainer,
    TResult,
    TKey extends PropertyNamesOfType<TContainer, TResult | undefined>>(
        container: TContainer,
        key: TKey,
        factory: new () => TContainer[TKey]) {
    let value = container[key];
    if (container[key] === undefined) {
        value = new factory();
        container[key] = value;
    }
    return value;
}

type ArrayPropElementTypes<TContainer> = {
    [K in keyof TContainer]: TContainer[K] extends (Array<infer E> | undefined) ? E : never
}[keyof TContainer];
type ArrayPropNames<TContainer> = {
    [K in keyof TContainer]: TContainer[K] extends (Array<infer E> | undefined) ? K : never
}[keyof TContainer];
type ArrayProps<TContainer> = Pick<TContainer, ArrayPropNames<TContainer>>;

// type ITest = { a: string[], b: number, c?: Date[] };
// const t0: ArrayPropElementTypes<ITest> = "hi";
// const t1: ArrayPropElementTypes<ITest> = new Date();
// const t2: ArrayPropElementTypes<ITest> = 394;
// const t3: ArrayProps<ITest> = {};
export function ensureArray<
    TContainer,
    TKey extends ArrayPropNames<TContainer>,
    TElement extends ElementType<TContainer[TKey]>>(
        container: TContainer,
        key: TKey): TElement[] {
    let value = container[key];
    if (container[key] === undefined) {
        value = [] as TContainer[TKey];
        container[key] = value;
    }
    return value;
}
