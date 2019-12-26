// import chunk from "lodash/chunk";
// import map from "lodash/map";
// import isEqual from "lodash/takeWhile";
// import takeWhile from "lodash/takeWhile";
import zip from "lodash/zip";

// export default function volumize<T>(
//   minimumVolumeLength: number,
//   maxVolumeCount: number,
//   data: T[],
//   iterator: ArrayIterator<T, string>): Array<[string, string, T[]]> {
//   const result: Array<[string, string, T[]]> = [];
//   if ((data?.length ?? 0) === 0) {
//     return result;
//   }
//   const labels = map(data, iterator);

//   return result;
// }
function minDiff(a: string | undefined, b: string | undefined,
  { knownPreceeder }: { knownPreceeder?: string; } = {}): [string | undefined, string | undefined] {
  if (a === undefined) {
    if (b === undefined) {
      return [undefined, undefined];
    }
    return [undefined, b[0]];
  } else if (b === undefined) {
    if (knownPreceeder !== undefined) {
      const [, ar] = minDiff(knownPreceeder, a);
      return [ar, undefined];
    }
    return [a[0], undefined];
  }
  let aa = "";
  let bb = "";
  const zipped = zip(a.split(""), b.split(""));
  for (const [ca, cb] of zipped) {
    aa += ca;
    bb += cb;
    if (ca !== cb) {
      break;
    }
  }
  if (knownPreceeder) {
    const [, pa] = minDiff(knownPreceeder, a);
    if (pa && pa.length > aa.length) {
      aa = pa;
    }
  }
  return [aa, bb];
}

// export function volumizeLabels(
//   options: { volumeLength: number; } | { minVolumeLength: number, volumeCount: number; },
//   labels: string[]): Array<[string, string]> {
//   const result: Array<[string, string]> = [];
//   if ("volumeLength" in options) {
//     const labelChunks = chunk(labels);
//     const lastEnd = "";
//     labelChunks.forEach((chunk) => {
//       const first = chunk.shift();
//       const last = chunk.pop();

//     });
//   }
//   return result;
// }

export { minDiff };
