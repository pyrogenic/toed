import debugFactory from "debug";
import fs from "fs";
import http from "http";
import fetch from "node-fetch";

const debug = debugFactory("DictionaryService");
debug.enabled = true;

const port = (process.env.PORT ?? 5000) as number;

const FORWARD_HEADERS = ["access-control-request-method", "access-control-request-headers", "accept", "accept-encoding", "accept-language", "app_id", "app_key"];

const app: http.RequestListener = async (req, res) => {
    if (req.method === "OPTIONS") {
        debug({ headers: req.headers });
        if (req.headers["access-control-request-method"]) {
            res.setHeader("access-control-allow-methods", req.headers["access-control-request-method"]);
        }
        if (req.headers["access-control-request-headers"]) {
            res.setHeader("access-control-allow-headers", req.headers["access-control-request-headers"]);
        }
        res.statusCode = 204;
        res.end();
        return;
    }
    if (req.url === undefined) {
        res.statusCode = 400; // "Bad Request"
        res.statusMessage = "no url";
        res.end();
        return;
    }
    let proxyUrl;
    if (req.url.match(/^\/api\//)) {
        proxyUrl = "https://od-api.oxforddictionaries.com";
    } else if (req.url.match(/^\/[A-Z]+($|\/)/)) {
        proxyUrl = "http://localhost:7379";
    } else if (req.url.match(/^\/mirror/)) {
        res.statusCode = 200;
        res.end(fs.readFileSync("." + req.url));
        return;
    } else {
        const match = req.headers?.referer?.match(/(?<mirror>\/mirror\/[^/]+)/);
        if (match) {
            const path = match?.groups?.mirror + req.url.split(/[?#]/)[0];
            res.statusCode = 200;
            res.end(fs.readFileSync("." + path));
            return;
        } else if (fs.existsSync("./src" + req.url)) {
            res.statusCode = 200;
            res.end(fs.readFileSync("./src" + req.url));
            return;
        } else {
            debug(req.headers);
            res.statusCode = 400;
            res.statusMessage = `bad scheme: ${req.url}`;
            res.end();
            return;
        }
    }
    proxyUrl = `${proxyUrl}${req.url}`;
    const headers: HeadersInit = { Accept: "application/json" };
    FORWARD_HEADERS.forEach((h) => {
        const value = req.headers[h];
        if (typeof value === "string") {
            debug(`Forwarding header: ${h}: ${value}`);
            headers[h] = value;
        }
    });
    try {
        const body: string | undefined = await new Promise((resolve) => {
            const buffer: Uint8Array[] = [];
            req
                .on("data", (chunk) => {
                    buffer.push(chunk);
                })
                .on("end", () => {
                    if (buffer.length === 0) {
                        resolve(undefined);
                    }
                    resolve(Buffer.concat(buffer).toString());
                });
        });
        const method = req.method;
        debug({ method, proxyUrl, bodyLength: body?.length ?? "none" });
        const response = await fetch(proxyUrl, { method, headers, body });
        const contentType = response.headers?.get("content-type");
        if (contentType) { res.setHeader("Content-Type", contentType); }
        res.statusCode = response.status;
        const data = await response.text();
        debug({ responseLength: data ? data.length : undefined });
        res.end(data);
    } catch (error) {
        debug({ error });
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(error));
    }
};

const server = http.createServer(app);

server.listen(port, () => {
    debug(`Server running at ${server.address()}`);
});
