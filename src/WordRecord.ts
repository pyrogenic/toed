import { observable } from "mobx";
import IDictionaryEntry from "./IDictionaryEntry";
import IWordRecord, { ITags, ResultTags } from "./IWordRecord";
import OxfordDictionariesPipeline from "./OxfordDictionariesPipeline";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export default class WordRecord implements Required<IWordRecord> {
  public readonly q: string;
  public readonly re: RetrieveEntry;
  public readonly pipeline: OxfordDictionariesPipeline;

  @observable
  public result: Partial<IDictionaryEntry>;
  @observable
  public resultTags: ResultTags<IDictionaryEntry>;
  @observable
  public resultOriginal: Partial<IDictionaryEntry>;
  @observable
  public resultDiscarded: Partial<IDictionaryEntry>;
  @observable
  public allTags: ITags;
  @observable
  public pipelineNotes: string[];
  @observable
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
    this.pipelineNotes = [];
    this.notes = "";
    this.refresh();
  }

  public refresh() {
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
