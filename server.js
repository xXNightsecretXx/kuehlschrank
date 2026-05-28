const fs = require("fs");
const http = require("http");
const path = require("path");

async function buildTimeline() {
  return "string"
}

async function templateReplace(str, replace) {
  if (replace == "<!--{{TIMELINE}}-->") {
    const newStr = str.replace(replace, await buildTimeline())
    return newStr
  }
}

const PORT = 3000;

const server = http.createServer((req, res) => {
  // parse URL
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;
  if (pathname === "/") {
    pathname = "/index.html";
  }
  const filePath = path.join(__dirname, pathname);

  // check if file exists and is not a directory
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

  // read file and serve
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("500 - Internal Server Error");
      return;
    }

    let contentType = "text/plain";

    if (filePath.endsWith(".html") || filePath.endsWith(".htm")) {
      contentType = "text/html";
      content = templateReplace(content.toString("utf-8"), "<!--{{TIMELINE}}-->");
      content.then(resolve => {
        res.writeHead(200, { "Content-Type": contentType });
        res.write(resolve);
        res.end();
      })
      return;
    }

    if (filePath.endsWith(".css")) contentType = "text/css";
    if (filePath.endsWith(".js")) contentType = "application/javascript";
    if (filePath.endsWith(".webp")) contentType = "image/webp";

    res.writeHead(200, { "Content-Type": contentType });
    res.write(content);
    res.end();
  });
});

server.listen(PORT);
