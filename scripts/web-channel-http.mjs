import https from "node:https";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 30_000;

export function requestUrl(url, { method = "GET" } = {}, _redirectCount = 0) {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    return Promise.reject(new Error(`Only https:// URLs are supported, got ${parsed.protocol}`));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (_redirectCount >= MAX_REDIRECTS) {
          resolve({ body: "", headers: res.headers, statusCode: res.statusCode });
          return;
        }
        const target = new URL(res.headers.location, url).toString();
        const redirectMethod = [301, 302, 303].includes(res.statusCode) ? "GET" : method;
        res.resume();
        resolve(requestUrl(target, { method: redirectMethod }, _redirectCount + 1));
        return;
      }

      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        resolve({ body, headers: res.headers, statusCode: res.statusCode ?? 0 });
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}
