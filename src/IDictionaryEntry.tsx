import IDefinitions from "./IDefinitions";

export default interface IDictionaryEntry {
  entry_rich: string;
  definitions: IDefinitions;
  pronunciation_ipa: string;
  audio_file: string;
  example: string;
  etymology: string;
}
