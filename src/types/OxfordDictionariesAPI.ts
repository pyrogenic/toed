// import {serializable, primitive, object, list, alias} from "serializr";

const OD_API_URL = "https://od-api.oxforddictionaries.com/api/v2";
const RESOURCE_NAME = "Oxford Dictionaries";
const API_NAME = "Oxford Dictionaries API";
export { OD_API_URL, RESOURCE_NAME, API_NAME }

// class OxfordMetadata {
//     @serializable(primitive())
//     public operation!: string; // "retrieve",
//     @serializable(primitive())
//     public provider!: string; // "Oxford University Press",
//     @serializable(primitive())
//     public schema!: string; // "RetrieveEntry",
// }

export enum OxfordLanguage {
    de = "de",
    el = "el",
    americanEnglish = "en-us",
    britishEnglish = "en-gb",
    es = "es",
    gu = "gu",
    hi = "hi",
    id = "id",
    ig = "ig",
    it = "it",
    lv = "lv",
    ms = "ms",
    nso = "nso",
    pt = "pt",
    qu = "qu",
    ro = "ro",
    sw = "sw",
    ta = "ta",
    te = "te",
    tg = "tg",
    tk = "tk",
    tn = "tn",
    tpi = "tpi",
    tt = "tt",
    ur = "ur",
    xh = "xh",
    yo = "yo",
    zh = "zh",
    zu = "zu",
}

// class CrossReference {
//     @serializable(primitive())
//     id!: string;
//     @serializable(primitive())
//     text!: string;
// }

// class ExampleSentence {
//     @serializable(primitive())
//     text!: string;
// }

// class Sense {
//     @serializable(list(object(CrossReference)))
//     registers?: CrossReference[];

//     @serializable(list(primitive()))
//     definitions?: string[];

//     @serializable(list(primitive()))
//     shortDefinitions?: string[];

//     @serializable(list(object(ExampleSentence)))
//     examples?: ExampleSentence[];

//     @serializable(primitive())
//     id?: string;

//     @serializable(list(object(Sense)))
//     subsenses?: Sense[];
// }

// class LexicalEntryEntry {
//     @serializable(list(object(Sense)))
//     senses?: Sense[];
// }

// class Pronounciation {
//     @serializable(list(primitive()))
//     dialects?: string[];

//     @serializable(primitive())
//     phoneticNotation!: "IPA" | "respell";

//     @serializable(primitive())
//     phoneticSpelling!: string;

//     @serializable(primitive())
//     audioFile?: string;
// }

// class LexicalEntry {
//     @serializable(alias("derivativeOf", list(object(CrossReference))))
//     parents?: CrossReference[];

//     @serializable(alias("derivatives", list(object(CrossReference))))
//     children?: CrossReference[];

//     @serializable(list(object(LexicalEntryEntry)))
//     entries?: LexicalEntryEntry[];

//     @serializable(primitive())
//     language!: OxfordLanguage;

//     @serializable(list(object(CrossReference)))
//     lexicalCategory!: CrossReference;

//     @serializable(list(object(Pronounciation)))
//     pronunciations?: Pronounciation[]

//     @serializable(primitive())
//     text!: string
// }

// enum ResultType {
//     headword = "headword",
// }

// class Result {
//     @serializable(primitive())
//     id!: string;
//     @serializable(primitive())
//     language!: OxfordLanguage;
//     @serializable(alias("lexicalEntries", list(object(LexicalEntry))))
//     results: LexicalEntry[] = [];
//     @serializable(primitive())
//     type!: ResultType;
//     @serializable(primitive())
//     word!: string;
// }

// class WordsResponse {
//     @serializable(object(OxfordMetadata))
//     metadata!: OxfordMetadata;

//     @serializable(primitive())
//     query!: string;

//     @serializable(list(object(Result)))
//     results: Result[] = [];

// }

// lookup babyishness
const REDIRECT = {

    "query": "babyishness",
    "results": [
        {
            "id": "babyishness",
            "language": "en-us",
            "lexicalEntries": [
                {
                    "derivativeOf": [
                        {
                            "id": "babyish",
                            "text": "babyish"
                        }
                    ],
                    "entries": [
                        {
                            "senses": [
                                {
                                    "id": "m_en_gbus0063660.015",
                                    "registers": [
                                        {
                                            "id": "derogatory",
                                            "text": "Derogatory"
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    "language": "en-us",
                    "lexicalCategory": {
                        "id": "noun",
                        "text": "Noun"
                    },
                    "text": "babyishness"
                }
            ],
            "type": "headword",
            "word": "babyishness"
        }
    ]
};

// lookup babyish

const RESULT = {
    "metadata": {
        "operation": "retrieve",
        "provider": "Oxford University Press",
        "schema": "RetrieveEntry"
    },
    "query": "babyish",
    "results": [
        {
            "id": "babyish",
            "language": "en-us",
            "lexicalEntries": [
                {
                    "derivatives": [
                        {
                            "id": "babyishly",
                            "text": "babyishly"
                        },
                        {
                            "id": "babyishness",
                            "text": "babyishness"
                        }
                    ],
                    "entries": [
                        {
                            "senses": [
                                {
                                    "definitions": [
                                        "(of appearance or behavior) characteristic of a baby"
                                    ],
                                    "examples": [
                                        {
                                            "text": "he pursed his mouth into a babyish pout"
                                        }
                                    ],
                                    "id": "m_en_gbus0063660.005",
                                    "registers": [
                                        {
                                            "id": "derogatory",
                                            "text": "Derogatory"
                                        }
                                    ],
                                    "shortDefinitions": [
                                        "typical of or suitable for baby"
                                    ],
                                    "subsenses": [
                                        {
                                            "definitions": [
                                                "(of clothes or toys) suitable for a baby"
                                            ],
                                            "examples": [
                                                {
                                                    "text": "he declared that dolls were silly, babyish things"
                                                }
                                            ],
                                            "id": "m_en_gbus0063660.008",
                                            "shortDefinitions": [
                                                "suitable for baby"
                                            ]
                                        }
                                    ],
                                    "thesaurusLinks": [
                                        {
                                            "entry_id": "babyish",
                                            "sense_id": "t_en_gb0001064.001"
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    "language": "en-us",
                    "lexicalCategory": {
                        "id": "adjective",
                        "text": "Adjective"
                    },
                    "pronunciations": [
                        {
                            "dialects": [
                                "American English"
                            ],
                            "phoneticNotation": "respell",
                            "phoneticSpelling": "ˈbābēiSH"
                        },
                        {
                            "audioFile": "http://audio.oxforddictionaries.com/en/mp3/babyish_us_1.mp3",
                            "dialects": [
                                "American English"
                            ],
                            "phoneticNotation": "IPA",
                            "phoneticSpelling": "ˈbeɪbiɪʃ"
                        }
                    ],
                    "text": "babyish"
                }
            ],
            "type": "headword",
            "word": "babyish"
        }
    ]
};