import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;

const MIMES = {
  ".html": "text/html",
  ".json": "application/json",
  ".jsonl": "application/json",
  ".js": "application/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const url = req.url === "/" ? "/visualization/chart.html" : req.url;
  const file = path.join(ROOT, url.split("?")[0]);
  if (!file.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = err.code === "ENOENT" ? 404 : 500;
      res.end();
      return;
    }
    const ext = path.extname(file);
    res.setHeader("Content-Type", MIMES[ext] || "application/octet-stream");
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/visualization/chart.html for the dashboard`);
});
