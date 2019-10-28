import { observable } from "mobx";
import { IDictionaryEntry } from "./App";
class WordRecord {
  @observable
  public word: string;
  @observable
  public dictionaryEntry: Partial<IDictionaryEntry> = {};
  @observable
  public notes: string = "";
  constructor(word: string) {
    this.word = word;
  }
}
