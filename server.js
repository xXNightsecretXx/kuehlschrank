const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const cleanPath = requestPath.split("?")[0].split("#")[0];
  let filePath = path.normalize(path.join(__dirname, cleanPath));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("403 - Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 - Not Found");
        return;
      }
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("500 - Internal Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = "text/plain";
    if (ext === ".html" || ext === ".htm") contentType = "text/html";
    else if (ext === ".css") contentType = "text/css";
    else if (ext === ".js") contentType = "application/javascript";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".txt") contentType = "text/plain";
    else if (ext === ".webp") contentType = "image/webp";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

server.listen(PORT);
