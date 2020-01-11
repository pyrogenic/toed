# toed

Oxford Dictionaries TypesScript Client

- [src/types/odmodel_to_ts.rb] script to convert the [human-readable schema](src/types/words.odmodel)
- [src/types/gen] typings generated from the [human-readable schema](src/types/words.odmodel)

| Component | Source | License | Notes |
| --- | --- | --- | --- |
| [words.odmodel](src/types/words.odmodel) | model extracted from Oxford Dictionary’s API [documentation](https://developer.oxforddictionaries.com/documentation#/words) | [Oxford Dictionaries API Terms and Conditions](https://developer.oxforddictionaries.com/api-terms-and-conditions) | To find the schemas, select `GET /words` > Successful Response > _Model_ (not _Example Value_)
| [bad-words.txt](src/bad-words.txt) | [Luis von Ahn's Research Group](https://www.cs.cmu.edu/~biglou/resources/) at CMU | _unspecified_ | |

## Screenshots

![screenshot](https://user-images.githubusercontent.com/26445088/71867327-94683c00-30be-11ea-862d-caae630255c4.png)

## TODO

- [x] "undefined" tag not removed when refresh finds definition
- [x] missing pronunciations for cross-referenced origins
- [x] scoring (e.g. crapper) so between two pass-3 options, one with no pass-2 tags preferred over one with a pass-2 tag
