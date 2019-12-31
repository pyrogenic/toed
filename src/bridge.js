const http = require('http');
const fs = require('fs');
const fetch = require('node-fetch');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = false;

const hostname = '127.0.0.1';
const port = 5000;

// 'host'
// 'connection'
// 'sec-fetch-mode'
// 'origin'
// 'user-agent'
// 'dnt'
// 'sec-fetch-site'
// 'referer'
const FORWARD_HEADERS = ['access-control-request-method', 'access-control-request-headers', 'accept', 'accept-encoding', 'accept-language', 'app_id', 'app_key']
// const EXAMPLE_HEADERS = {
//   headers: {
//     host: 'localhost:5000',
//     connection: 'keep-alive',
//     'sec-fetch-mode': 'cors',
//     'access-control-request-method': 'GET',
//     origin: 'http://localhost:3000',
//     'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
//     dnt: '1',
//     'access-control-request-headers': 'app_id,app_key',
//     accept: '*/*',
//     'sec-fetch-site': 'same-site',
//     referer: 'http://localhost:3000/',
//     'accept-encoding': 'gzip, deflate, br',
//     'accept-language': 'en-US,en;q=0.9'
//   }
// };

const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
        console.log({ headers: req.headers });
        if (req.headers['access-control-request-method']) {
            res.setHeader('access-control-allow-methods', req.headers['access-control-request-method']);
        }
        if (req.headers['access-control-request-headers']) {
            res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers']);
        }
        res.statusCode = 204;
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
    } else if (req.headers.referer.match(/\/mirror\//)) {
        const match = req.headers.referer.match(/(?<mirror>\/mirror\/[^/]+)/);
        const path = match.groups.mirror + req.url.split(/[?#]/)[0];
        res.statusCode = 200;
        res.end(fs.readFileSync("." + path));
        return;
    } else if (fs.existsSync("./src" + req.url)) {
        res.statusCode = 200;
        res.end(fs.readFileSync("./src" + req.url));
        return;
    } else {
        console.dir(req.headers);
        res.statusCode = 400;
        res.statusMessage = `bad scheme: ${req.url}`;
        res.end();
        return;
    }
    proxyUrl = `${proxyUrl}${req.url}`;
    const headers = { Accept: 'application/json' };
    FORWARD_HEADERS.forEach((h) => {
        const value = req.headers[h];
        if (value) {
            console.log(`Forwarding header: ${h}: ${value}`)
            headers[h] = value;
        }
    })
    try {
        let body = await new Promise((resolve) => {
            const buffer = [];
            req
                .on('data', (chunk) => {
                    buffer.push(chunk);
                })
                .on('end', () => {
                    resolve(Buffer.concat(buffer).toString());
                });
        });
        body = body ? body : undefined;
        const method = req.method;
        console.log({ method, proxyUrl, bodyLength: body ? body.length : undefined });
        const response = await fetch(proxyUrl, { method, headers, body });
        res.setHeader('Content-Type', response.headers.get('content-type'));
        res.statusCode = response.status;
        const data = await response.text();
        console.log({ responseLength: data ? data.length : undefined });
        res.end(data);
    } catch (error) {
        console.log({ error });
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(error));
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
}); 
