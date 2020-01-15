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
- [x] sense tags should _not_ cascade to subsenses (e.g. _addict_ has `narcotics` in sense but then "an enthusiastic devotee of a specified thing or activity" as a subsense)
- [x] shouldn't reject as inexact pluralizations (e.g. _asses_ -> _ass_)
- [ ] should deal with untagged plurals (e.g. _gis_ -> _gi_)
- [ ] investigate `medicine` / `anatomy` (_abortion_, _oral_)
- [x] "other" `lexicalCategory` (e.g. _geez_ -> _jeez_)
- [ ] deal with multiple discouraged tags vs. single "buggered" -> "bugger"
- [ ] checkmark should record final value and alert if tag change would change result

## Redis Design

### BiSet

Suite of ops for bidirectional set membership / tagging:
- BSADD set-key member // tag member 
  - SADD set-key member
  - SADD reverse:set:member set-key
- BSREM set-key member // tag member 
  - SREM set-key member
  - SREM reverse:set:member set-key

- BHSET hash-key member value // tag member 
  - HSET hash-key member value
  - HSET reverse:hash:member hash-key value
- BHDEL hash-key member 
  - HDEL hash-key member
  - HDEL reverse:hash:member hash-key
