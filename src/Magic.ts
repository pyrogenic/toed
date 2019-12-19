import isEqual from "lodash/isEqual";

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
        value: Array<ElementType<TContainer[TKey]>> | undefined,
        sorted?: ArraySetOrderRule<TElement>) {
    const result = value?.map((i) => arraySetAdd(container, key, i, sorted)).includes(true);
    if (result) { return true; }
    return false;
}

export type ArraySetOrderRule<TElement> = boolean | "mru" | Comparer<TElement>;

/** array set add */
export function arraySetAdd<
    TContainer,
    TElement,
    TKey extends ArrayPropertyNames<TContainer> &
        PropertyNamesOfType<TContainer, TElement[] | undefined>>(
    container: TContainer,
    key: TKey,
    value: ElementType<TContainer[TKey]>,
    sorted?: ArraySetOrderRule<TElement>) {
    const list = ensureArray(container, key);
    const index = typeof value !== "object" ? list.indexOf(value) : list.findIndex(isEqual.bind(null, value));
    if (index >= 0) {
        if (sorted !== "mru") {
            return false;
        } else {
            list.splice(index, 1);
        }
    }
    list.push(value);
    if (typeof sorted === "function") {
        list.sort(sorted);
    } else if (sorted === true) {
        list.sort();
    }
    return true;
}

export function arraySetRemove<
    TContainer,
    TElement,
    TKey extends ArrayPropertyNames<TContainer> &
        PropertyNamesOfType<TContainer, TElement[] | undefined>>(
    container: TContainer,
    key: TKey,
    value: ElementType<TContainer[TKey]>) {
    if (container[key] === undefined) {
        return false;
    }
    const list = ensureArray(container, key);
    const index = typeof value !== "object" ? list.indexOf(value) : list.findIndex(isEqual.bind(null, value));
    if (index >= 0) {
        list.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * @return true if the item is now in the list, false otherwise.
 */
export function arraySetToggle<
    TContainer,
    TElement,
    TKey extends ArrayPropertyNames<TContainer> &
        PropertyNamesOfType<TContainer, TElement[] | undefined>>(
    container: TContainer,
    key: TKey,
    value: ElementType<TContainer[TKey]>,
    sorted?: ArraySetOrderRule<TElement>) {
    if (container[key] === undefined) {
        arraySetAdd(container, key, value, sorted);
        return true;
    }
    const list = ensureArray(container, key);
    const index = typeof value !== "object" ? list.indexOf(value) : list.findIndex(isEqual.bind(null, value));
    if (index >= 0) {
        list.splice(index, 1);
        return false;
    }
    arraySetAdd(container, key, value, sorted);
    return true;
}

/** array set has */
export function arraySetHas<
    TContainer,
    TElement,
    TKey extends keyof ArrayPropertiesOfType<TContainer, TElement>>(
        container: ArrayPropertiesOfType<TContainer, TElement>,
        key: TKey,
        value: TElement) {
    const list = container[key];
    if (list === undefined) {
        return false;
    }
    return list.includes(value);
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
    [K in keyof TContainer]: Required<TContainer>[K] extends any[] ? K : never
}[keyof TContainer];
export type ArrayPropertyNamesOfType<TContainer, TElement> = {
    [K in keyof TContainer]: Required<TContainer>[K] extends TElement[] ? K : never
}[keyof TContainer];
export type MapPropertyNames<TContainer> = {
    [K in keyof TContainer]: Required<TContainer>[K] extends { [key: string]: any } ? K : never
}[keyof TContainer];
export type NonArrayPropertyNames<TContainer> = {
    [K in keyof TContainer]: Required<TContainer>[K] extends any[] ? never : K
}[keyof TContainer];
export type PlainPropertyNames<TContainer> = {
    [K in keyof TContainer]: Required<TContainer>[K] extends
    any[] | { [key: string]: any } ? never : K
}[keyof TContainer];

export type ArrayProperties<TContainer> = Pick<TContainer, ArrayPropertyNames<TContainer>>;
export type ArrayPropertiesOfType<TContainer, TElement> = {
    [K in keyof ArrayPropertyNamesOfType<TContainer, TElement>]?: TElement[];
};

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

export function ensureMap<
    TContainer,
    TKey extends MapPropertyNames<TContainer>>(
    container: TContainer,
    key: TKey): TContainer[TKey] {
    let value = container[key];
    if (container[key] === undefined) {
        value = {} as TContainer[TKey];
        container[key] = value;
    }
    return value;
}
