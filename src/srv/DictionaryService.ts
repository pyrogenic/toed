import debugFactory from "debug";
import express from "express";
import http from "http";
import fetch from "node-fetch";

const debug = debugFactory("DictionaryService");
debug.enabled = true;

const port = (process.env.PORT ?? 5000) as number;

const FORWARD_HEADERS = ["access-control-request-method", "access-control-request-headers", "accept", "accept-encoding", "accept-language", "app_id", "app_key"];

class DictionaryService {
    // ref to Express instance
    public readonly express = express();

    constructor() {
        const router = express.Router();
        // placeholder route handler
        router.options("/", (req, res, next) => {
            if (req.headers["access-control-request-method"]) {
                res.setHeader("access-control-allow-methods", req.headers["access-control-request-method"]);
            }
            if (req.headers["access-control-request-headers"]) {
                res.setHeader("access-control-allow-headers", req.headers["access-control-request-headers"]);
            }
            res.statusCode = 204;
            res.end();
        });
        router.get(/^\/$/, (req, res, next) => {
            res.json({
                message: "Hello World!",
            });
        });
        router.get(/^\/api\//, async (req, res, next) => {
            debug(req);
            let proxyUrl = "https://od-api.oxforddictionaries.com";
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
        });
        this.express.use("/", router);
        this.express.use("/", router);
    }
}

const server = http.createServer(new DictionaryService().express);

server.listen(port, () => {
    debug(`Server running at ${server.address()}`);
});
