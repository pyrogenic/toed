import assert from "assert";
import { config as configEnvironment } from "dotenv";
import kue, { DoneCallback, Job } from "kue";
import nodeFetch from "node-fetch";
import { alias, deserialize, primitive, serializable } from "serializr";
import yargs from "yargs";
import IORedis from "../redis/IORedis";
import OxfordLanguage from "../types/OxfordLanguage";
import LookupCoordinator from "./LookupCoordinator";

configEnvironment();

class LookupEnv {
    @serializable(alias("OD_URL", primitive()))
    public url!: string;
    @serializable(alias("OD_API_URL", primitive()))
    public apiUrl!: string;
    @serializable(alias("OD_APP_ID", primitive()))
    public appId!: string;
    @serializable(alias("OD_APP_KEY", primitive()))
    public appKey!: string;
    @serializable(alias("OD_APP_ENTERPRISE", primitive()))
    public enterprise!: boolean;
}

const LOOKUP_ENV_KEYS: Array<keyof LookupEnv> = [
    "url",
    "apiUrl",
    "appId",
    "appKey",
    "enterprise",
];

const ENV = deserialize(LookupEnv, process.env);

LOOKUP_ENV_KEYS.forEach((key) => assert.notStrictEqual(ENV[key], undefined, `Missing environment variable '${key}'`));

const queue = kue.createQueue();
const JOB_NAME = "lookup";

interface ILookupJob extends Job {
    word?: string;
}

export async function enequeLookup(language: OxfordLanguage, word: string) {
    return new Promise((resolve, reject) => {
        const job = queue.create(JOB_NAME, {
            language,
            title: `${word} (${language})`,
            word,
        }).save((error: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(job.id);
            }
        });
    });
}

const coercedFetch = nodeFetch as unknown as typeof fetch;
const harness = new LookupCoordinator({ redis: new IORedis({ db: 2 }), fetch: coercedFetch, ...ENV });

function start() {
    queue.process(JOB_NAME, (job: ILookupJob, done: DoneCallback) => {
        const { data: { word, language } } = job;
        job.log(`processing ${word} in ${language}`);
        harness.getWord(word, [language])
            .then((result) => {
                job.log(`processed ${word} in ${language}`);
                job.log(JSON.stringify(result));
                done(undefined, result);
            })
            .catch((error) => {
                job.error(error);
                done(error);
            });
    });
    kue.app.listen(3005);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const argv = yargs
    .command("add <word>", "add a word to the queue", (a) => (
        a
            .option("language", {
                choices: Object.values(OxfordLanguage),
                default: "en-us",
            })
            .positional("word", {
                description: "the word to add",
                type: "string",
            })
    ),
        ({ word, language }) => {
            enequeLookup(language as OxfordLanguage, word!).then(() => process.exit());
        })
    .command("kue", "run the queue (also starts the web front end)", {
        apiBaseUrl: {
            alias: "url",
            default: "https://od-api.oxforddictionaries.com/api/v2",
        },
    }, start)
    .command("env", "display the environment setup", {}, () => {
        // tslint:disable-next-line:no-console
        console.info(ENV);
        process.exit();
    })
    .help()
    .alias("help", "h")
    .argv;
