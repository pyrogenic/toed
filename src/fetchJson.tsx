import StorageMemo from "./StorageMemo";
import OpTrack from "./OpTrack";

export default async function fetchJson(url: string) {
  // tslint:disable: variable-name
  const app_id = localStorage.getItem("oed/app_id");
  const app_key = localStorage.getItem("oed/app_key");
  // tslint:enable: variable-name
  if (!app_id || !app_key) {
    throw new Error("missing app id or key");
  }
  console.warn("fetch " + url);
  const promise = fetch(url, { headers: { Accept: "application/json", app_id, app_key } });
  OpTrack.track("odapi", url, promise);
  const queryResult = await promise;
  return await queryResult.json();
}

const fetchMemo = new StorageMemo(localStorage, "fetchJson", fetchJson,
    (result) => typeof result === "object" && !("errno" in result));

export { fetchMemo };
