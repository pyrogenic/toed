import kue, { DoneCallback, Job } from "kue";
import yargs from "yargs";
import { ILookupProps } from "../Lookup";
// import Lookup, { ILookupProps } from "../Lookup";
import OxfordLanguage from "../types/OxfordLanguage";

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

function start(props: Partial<ILookupProps> & { apiBaseUrl: string; }) {
    // const {apiBaseUrl, language} = props;
    // const lookup = new Lookup(props);
    queue.process(JOB_NAME, (job: ILookupJob, done: DoneCallback) => {
        // lookup.get(apiBaseUrl, language, job.word!).then((result: ) => {
        // });
        const { data: {word, language} } = job;
        job.log(`processing ${word} in ${language}`);
        done(undefined, "test-result");
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
    .help()
    .alias("help", "h")
    .argv;

// console.log(argv);
