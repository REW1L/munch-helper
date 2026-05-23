import https from "node:https";

export function requestUrl(url, { method = "GET" } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method }, (res) => {
      let body = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          body,
          headers: res.headers,
          statusCode: res.statusCode ?? 0,
        });
      });
    });

    req.on("error", reject);
    req.end();
  });
}
