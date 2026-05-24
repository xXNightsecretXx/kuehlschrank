const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = 3000;

const server = http.createServer((req, res) => {
  let filePath;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  if (pathname === "/") {
    pathname = "/index.html";
  }

  filePath = path.join(__dirname, pathname);

  let stats;
  try {
    stats = fs.lstatSync(filePath);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.write('404 Not Found\n');
    res.end();
    return;
  }
  
  if (stats.isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.write('404 Not Found\n');
    res.end();
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("500 - Internal Server Error");
      return;
    }

    let contentType = "text/plain";
    if (filePath.endsWith(".html") || filePath.endsWith(".htm")) contentType = "text/html";
    if (filePath.endsWith(".css")) contentType = "text/css";
    if (filePath.endsWith(".js")) contentType = "application/javascript";
    if (filePath.endsWith(".webp")) contentType = "image/webp";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

server.listen(PORT);
