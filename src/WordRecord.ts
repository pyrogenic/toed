import { computed, observable, trace } from "mobx";
import IWordRecord from "./IWordRecord";
import OxfordDictionariesPipeline from "./OxfordDictionariesPipeline";
import RetrieveEntry from "./types/gen/RetrieveEntry";

export default class WordRecord implements IWordRecord {
  public readonly q: string;
  public readonly re: RetrieveEntry;
  public readonly pipeline: OxfordDictionariesPipeline;

  @observable
  public result = {};

  @observable
  public resultTags = {};

  @observable
  public allTags = {};

  @observable
  public pipelineNotes = [];

  @observable
  public notes = "";

  constructor(query: string, re: RetrieveEntry, pipeline: OxfordDictionariesPipeline) {
    this.q = query;
    this.re = re;
    this.pipeline = pipeline;
    this.refresh();
  }

  public refresh() {
    this.pipeline.process(this);
  }
}
