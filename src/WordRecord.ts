import IDictionaryEntry from "./IDictionaryEntry";
import IWordRecord, { ITags, ResultTags } from "./IWordRecord";
import OxfordDictionariesPipeline from "./OxfordDictionariesPipeline";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export default class WordRecord implements Required<IWordRecord> {
  public readonly q: string;
  public readonly re: RetrieveEntry;
  public readonly pipeline: OxfordDictionariesPipeline;

  public result: Partial<IDictionaryEntry>;
  public resultTags: ResultTags<IDictionaryEntry>;
  public resultOriginal: Partial<IDictionaryEntry>;
  public resultDiscarded: Partial<IDictionaryEntry>;
  public resultDiscardedTags: ResultTags<IDictionaryEntry>;
  public allTags: ITags;
  public pipelineNotes: string[];
  public notes: string;

  constructor(query: string, re: RetrieveEntry, pipeline: OxfordDictionariesPipeline) {
    this.q = query;
    this.re = re;
    this.pipeline = pipeline;
    this.allTags = {};
    this.result = {};
    this.resultTags = {};
    this.resultOriginal = {};
    this.resultDiscarded = {};
    this.resultDiscardedTags = {};
    this.pipelineNotes = [];
    this.notes = "";
    this.refresh();
  }

  public refresh() {
    this.allTags = {};
    this.result.entry_rich = undefined;
    this.result.definitions = undefined;
    this.result.pronunciation_ipa = undefined;
    this.result.audio_file = undefined;
    this.result.example = undefined;
    this.result.etymology = undefined;
    this.resultTags = {};
    this.resultOriginal = {};
    this.resultDiscarded = {};
    this.pipelineNotes = [];
    this.pipeline.process(this);
  }
}
