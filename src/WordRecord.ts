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
    return this.pipeline.process({notes: this.notes});
  }

  @observable
  public readonly notes: string[] = [];

  constructor(query: string, re: RetrieveEntry, pipeline: OxfordDictionariesPipeline) {
    this.q = query;
    this.re = re;
    this.pipeline = pipeline;
  }
}
