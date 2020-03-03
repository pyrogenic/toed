import kue, { DoneCallback, Job } from "kue";
import yargs from "yargs";
// import Lookup, { ILookupProps } from "../Lookup";
import OxfordLanguage from "../types/OxfordLanguage";

const queue = kue.createQueue();
const JOB_NAME = "lookup";

interface ILookupJob extends Job {
    word?: string;
}

export function enequeLookup(locale: string, word: string) {
    const job = queue.create(JOB_NAME, {
        title: word,
        word,
    }).save((error: any) => {
        console.log({ jobId: job.id, error });
    });
}

function start(props: Partial<ILookupProps> & { apiBaseUrl: string, language: OxfordLanguage, word: string; }) {
    const { word } = props;
    // const {apiBaseUrl, language} = props;
    // const lookup = new Lookup(props);
    queue.process(JOB_NAME, (job: ILookupJob, done: DoneCallback) => {
        // lookup.get(apiBaseUrl, language, job.word!).then((result: ) => {
        // });
        job.log(`processing ${word}`);
    });
}

const argv = yargs
.command("add <word>", "add a word to the queue", (a) => (
    a
    .option("locale", {
        default: "en-us",
    })
    .positional("word", {
        description: "the word to add",
        type: "string",
    })
),
    ({word, locale}) => {
        console.log({add: {word, locale}});
        enequeLookup("en", word!);
    })
// .option('time', {
    //     alias: 't',
    //     description: 'Tell the present Time',
    //     type: 'boolean',
    // })
    .help()
    .alias("help", "h")
    .argv;

console.log(argv);

if (__filename.indexOf(argv.$0) >= 0) {
    process.exit(0);
}
// if (argv.time) {
//     console.log('The current time is: ', new Date().toLocaleTimeString());
// }
