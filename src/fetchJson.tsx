import StorageMemo from "./StorageMemo";

export default async function fetchJson(url: string) {
  // tslint:disable: variable-name
  const app_id = localStorage.getItem("oed/app_id");
  const app_key = localStorage.getItem("oed/app_key");
  // tslint:enable: variable-name
  if (!app_id || !app_key) {
    throw new Error("missing app id or key");
  }
  const queryResult = await fetch(url, { headers: { Accept: "application/json", app_id, app_key } });
  const result = await queryResult.json();
  return result;
}

const fetchMemo = new StorageMemo(localStorage, "fetchJson", fetchJson);

export { fetchMemo };
