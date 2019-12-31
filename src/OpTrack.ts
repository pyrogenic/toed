interface ILogEntry {
    key: string;
    detail: string;
    start: number;
    end?: number;
}

type Op = "start" | "end";

class OpTrackImpl {
    public readonly listeners: Array<(op: Op, item: ILogEntry) => void> = [];
    private readonly logEntries: ILogEntry[] = [];

    public track(key: string, detail: string, promise: Promise<any>) {
        const item: ILogEntry = {
            detail,
            key,
            start: Date.now(),
        };
        const record = () => {
            item.end = Date.now();
            this.send("end", item);
        };
        promise.then(record, record);
        this.logEntries.push(item);
        this.send("start", item);
    }

    public history(key: string, width: number) {
        const logEntries = this.logEntries.filter(({key: e}) => e === key);
        const buckets: ILogEntry[][] = [];
        const now = Date.now();
        logEntries.forEach((entry) => {
           const bucketId = Math.floor((now - entry.start) / width);
           const bucket = buckets[bucketId] ?? (buckets[bucketId] = []);
           bucket.push(entry);
        });
        return buckets;
    }

    private send(op: Op, item: ILogEntry) {
        this.listeners.forEach((e) => {
            try {
                e(op, item);
            } catch (e) {
                // tslint:disable-next-line:no-console
                console.error(e);
            }
        });
    }
}

const OpTrack = new OpTrackImpl();

export default OpTrack;
