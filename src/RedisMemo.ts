export interface IOptions {
    cache?: boolean;
    bypass?: boolean;
}

export default class RedisMemo<TProps, TResult> {
    public readonly webdis: string;
    public readonly name: string;
    public readonly factory: (props: TProps) => Promise<TResult>;
    public readonly validate?: (result: TResult) => boolean;

    constructor(webdis: string, name: string, factory: (props: TProps) => Promise<TResult>,
        validate?: (result: TResult) => boolean) {
        this.webdis = webdis;
        this.name = name;
        this.factory = factory;
        this.validate = validate;
    }

    public async get(props: TProps, { cache, bypass }: IOptions = {}) {
        if (cache === undefined) { cache = true; }
        if (bypass === undefined) { bypass = false; }
        const key = `${this.name}:${encodeURIComponent(JSON.stringify(props).replace(/^"|"$/g, ""))}`;
        if (!bypass) {
            try {
                const url = `${this.webdis}/GET/${key}.txt`;
                const { cachedValue, success } = await this.go(url);
                if (success) {
                    const parse = JSON.parse(cachedValue) as TResult;
                    const valid = this.validate?.(parse) ?? "no validate func";
                    if (valid) {
                        return parse;
                    }
                } else {
                    console.warn(cachedValue);
                }
            } catch (error) {
                // console.warn({ error });
            }
        }
        const newValue = await this.factory(props);
        console.log({ newValue });
        if (cache) {
            const value = JSON.stringify(newValue);
            const putResult = await fetch(`${this.webdis}/SET/${key}`, { method: "put", body: value });
            console.log({ putResult });
        }
        return newValue;
    }

    private go(url: string): Promise<{ success: boolean, cachedValue: string; }> {
        return fetch(url).then(
            (response) => response.text()
                .then((cachedValue: string) => ({ cachedValue, success: true }),
                    (error) => ({ cachedValue: error, success: false })),
            (error) => ({ cachedValue: error.message, success: false }));
    }
}
