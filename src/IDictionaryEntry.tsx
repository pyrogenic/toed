export default interface IDictionaryEntry {
  entry_rich: string;
  definitions: {
    [partOfSpeech: string]: string[];
  };
  pronunciation_ipa: string;
  audio_file: string;
  example: string;
  etymology: string;
}
