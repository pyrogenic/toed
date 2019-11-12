type Diff<T, U> = T extends U ? never : T;  // Remove types from T that are assignable to U
type Filter<T, U> = T extends U ? T : never;  // Remove types from T that are not assignable to U

export type PropertyNamesOfType<T, P> = {
    [K in keyof Required<T>]: T[K] extends P ? K : never;
}[keyof T];

export type PropertiesOfType<T, P> = Pick<T, PropertyNamesOfType<T, P>>;

export type Comparer<T> = Parameters<T[]["sort"]>;

type ElementType<T> = T extends Array<infer E> ? E : never;

export function arraySetAddAll<
    TContainer,
    TElement,
    TKey extends ArrayPropertyNames<TContainer> &
    PropertyNamesOfType<TContainer, TElement[] | undefined>>(
        container: TContainer,
        key: TKey,
        value: Array<ElementType<TContainer[TKey]>>,
        sorted?: boolean | Comparer<TElement>) {
    const result = value.map((i) => arraySetAdd(container, key, i, sorted)).includes(true);
    if (result) { return true; }
    return false;
}

/** array set add */
export function arraySetAdd<
    TContainer,
    TElement,
    TKey extends ArrayPropertyNames<TContainer> &
    PropertyNamesOfType<TContainer, TElement[] | undefined>>(
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

// type IQ = {a?: string[]};
// type tt = PropertyNamesOfType<IQ, Pick<any[], "slice" | "length"> | undefined>;
// const ttt: tt = "a";
// const iq: IQ = {};
// const q = iq[ttt];

export function arraySetClear<
    TContainer,
    TKey extends PropertyNamesOfType<TContainer, Pick<any[], "slice" | "length"> | undefined>>(
        container: TContainer,
        key: TKey) {
    const set: Pick<any[], "slice" | "length"> | undefined = container[key];
    if (set !== undefined) {
        set.slice(0, set.length);
    }
    return set;
}

export function ensure<
    TContainer,
    TResult,
    TKey extends PropertyNamesOfType<TContainer, TResult | undefined>>(
        container: TContainer,
        key: TKey,
        factory: new () => Required<TContainer>[TKey]): Required<TContainer>[TKey] {
    let value = container[key];
    if (container[key] === undefined) {
        value = new factory();
        container[key] = value;
    }
    return value;
}

export type ArrayPropertyNames<TContainer> = {
    [K in keyof TContainer]: TContainer[K] extends (any[] | undefined) ? K : never
}[keyof TContainer];
export type MapPropertyNames<TContainer> = {
    [K in keyof TContainer]: TContainer[K] extends ({ [key: string]: any } | undefined) ? K : never
}[keyof TContainer];
export type NonArrayPropertyNames<TContainer> = {
    [K in keyof TContainer]: TContainer[K] extends (any[] | undefined) ? never : K
}[keyof TContainer];
export type PlainPropertyNames<TContainer> = {
    [K in keyof TContainer]: TContainer[K] extends
    (any[] |
        undefined) |
    ({ [key: string]: any } |
        undefined) ? never : K
}[keyof TContainer];
export type ArrayProperties<TContainer> = Pick<TContainer, ArrayPropertyNames<TContainer>>;
export type MapProperties<TContainer> = Pick<TContainer, MapPropertyNames<TContainer>>;
export type NonArrayProperties<TContainer> = Pick<TContainer, NonArrayPropertyNames<TContainer>>;
export type PlainProperties<TContainer> = Pick<TContainer, PlainPropertyNames<TContainer>>;
export type ArrayPropertyElementTypes<TContainer> = {
    [K in ArrayPropertyNames<TContainer>]: ElementType<TContainer[K]>
}[keyof ArrayProperties<TContainer>];

export function ensureArray<
    TContainer,
    TKey extends ArrayPropertyNames<TContainer>,
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
