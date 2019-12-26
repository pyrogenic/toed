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
type stringOrNot = string | undefined;
function minDiff(
  a: stringOrNot,
  b: stringOrNot,
  { preA, postB }: {
    preA?: string,
    postB?: string} = {}): [stringOrNot, stringOrNot] {
  if (a === undefined) {
    if (b === undefined) {
      return [undefined, undefined];
    }
    if (postB !== undefined) {
      const [br, ] = minDiff(b, postB);
      return [undefined, br];
    }
    return [undefined, b[0]];
  } else if (b === undefined) {
    if (preA !== undefined) {
      const [, ar] = minDiff(preA, a);
      return [ar, undefined];
    }
    return [a[0], undefined];
  }
  let aa = "";
  let bb = "";
  const zipped = zip(a.split(""), b.split(""));
  for (const [ca, cb] of zipped) {
    if (ca) { aa += ca; }
    if (cb) { bb += cb; }
    if (ca !== cb) {
      break;
    }
  }
  if (preA) {
    const [, pa] = minDiff(preA, a);
    if (pa && pa.length > aa.length) {
      aa = pa;
    }
  }
  if (postB) {
    const [pb, ] = minDiff(b, postB);
    if (pb && pb.length > aa.length) {
      bb = pb;
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
