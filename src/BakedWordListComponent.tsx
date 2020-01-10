import compact from "lodash/compact";
import uniq from "lodash/uniq";
import React from "react";
import App from "./App";

export default function BakedWordListComponent({ label, url, WordListComponent, except, }: {
  label: string;
  url: string;
  WordListComponent: App["WordListComponent"];
  except: string[];
}) {
  const [words, setWords] = React.useState([] as string[]);
  React.useEffect(() => {
    fetch(url).then((r) => r.text()).then((text) => setWords(uniq(compact(text.split("\n")))));
  }, [url]);
  return <WordListComponent label={label} words={words} except={except} />;
}
