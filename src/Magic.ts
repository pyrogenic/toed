import upperFirst from "lodash/upperFirst";
import words from "lodash/words";

export * from "@pyrogenic/asset";

export function titleCase(str?: string) {
    return words(str).map(upperFirst).join(" ");
}
