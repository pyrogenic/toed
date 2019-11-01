import { computed, observable } from "mobx";
import IWordRecord from "./IWordRecord";
import OxfordDictionariesPipeline from "./OxfordDictionariesPipeline";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export default class WordRecord implements IWordRecord {
  public readonly q: string;
  public readonly re: RetrieveEntry;

  public readonly pipeline: OxfordDictionariesPipeline;

  @computed
  public get result() {
    return this.pipeline.process({pipelineNotes: this.pipelineNotes});
  }

  @observable
  public readonly pipelineNotes = [];

  @observable
  public readonly notes = "";

  constructor(query: string, re: RetrieveEntry, pipeline: OxfordDictionariesPipeline) {
    this.q = query;
    this.re = re;
    this.pipeline = pipeline;
  }
}
