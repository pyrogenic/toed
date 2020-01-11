export default function stringify(data: Parameters<JSON["stringify"]>[0]): string {
  return JSON.stringify(data, null, 4);
}
