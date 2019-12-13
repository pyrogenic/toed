# toed

Oxford Dictionaries TypesScript Client

- [src/types/words.odmodel] model extracted from Oxford Dictionary’s API [documentation](https://developer.oxforddictionaries.com/documentation#/words) (`GET /words` > Successful Response > _Model_ (not _Example Value_)
- [src/types/odmodel_to_ts.rb] script to convert the [human-readable schema](src/types/words.odmodel)
- [src/types/gen] typings generated from the [human-readable schema](src/types/words.odmodel)

| Component | Source | License |
| === | === | === |
| [src/bad-words.txt] | [Luis von Ahn's Research Group](https://www.cs.cmu.edu/~biglou/resources/) at CMU | _unspecified_ |
