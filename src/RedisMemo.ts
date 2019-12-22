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

    public get = async (props: TProps, { cache, bypass }: IOptions = {}) => {
        if (cache === undefined) { cache = true; }
        if (bypass === undefined) { bypass = false; }
        const key = `${this.name}:${encodeURIComponent(JSON.stringify(props).replace(/^"|"$/g, ""))}`;
        if (!bypass) {
            const url = `${this.webdis}/GET/${key}.txt`;
            const { cachedValue, success } = await this.go(url);
            if (success) {
                const parse = JSON.parse(cachedValue) as TResult;
                const valid = this.validate?.(parse) ?? "no validate func";
                if (valid) {
                    return parse;
                }
            }
        }
        console.log({ passingOn: props });
        const newValue = await this.factory(props);
        console.log({ newValue });
        if (cache) {
            const value = JSON.stringify(newValue);
            const putResult = await fetch(`${this.webdis}/SET/${key}`, {
                body: value,
                headers: {
                    "Content-Type": "text/plain",
                },
                method: "PUT",
             });
            console.log({ putResult });
        }
        return newValue;
    }

    private go(url: string): Promise<{ success: boolean, cachedValue: string; }> {
        const catchError = (error: Error) => {
            console.log({ error });
            return { cachedValue: error.message, success: false };
        };
        return fetch(url).then(
            (response) => {
                const {ok: success, status} = response;
                console.log({ success, status });
                return response.text()
                    .then(
                        (cachedValue: string) => ({ cachedValue, success }),
                        catchError);
            },
            catchError);
    }
}
