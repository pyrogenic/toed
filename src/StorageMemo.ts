
export interface IOptions {
    cache?: boolean;
    bypass?: boolean;
}

export default class StorageMemo<TProps, TResult> {
    public readonly storage: Storage;
    public readonly name: string;
    public readonly factory: (props: TProps) => Promise<TResult>;

    constructor(storage: Storage, name: string, factory: (props: TProps) => Promise<TResult>) {
        this.storage = storage;
        this.name = name;
        this.factory = factory;
    }

    public async get(props: TProps, {cache, bypass}: IOptions = {}) {
        if (cache === undefined) { cache = true; }
        if (bypass === undefined) { bypass = false; }
        const key = `${this.name}/${JSON.stringify(props)}`;
        const cachedValue = !bypass && this.storage.getItem(key);
        if (cachedValue) {
            return JSON.parse(cachedValue) as TResult;
        }
        const newValue = await this.factory(props);
        if (cache) {
            this.storage.setItem(key, JSON.stringify(newValue));
        }
        return newValue;
    }
}
