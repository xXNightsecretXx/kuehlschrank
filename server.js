const fs = require("fs");
const http = require("http");
const path = require("path");

function yearElement(year) {
  return `<div class="year-wrapper image-wrapper">\
<h1 class="year">${year}</h1>\
<div class="pointer"></div><div class="pointer"></div><div class="year-spacer"></div></div>`
}

function dateElement(date, desc, imageURLs, imageAlts) {
  date = date.slice(3, 5) + "." + date.slice(0, 2) + ".";

  let imageAlt;
  let imgStr = "";
  let i = 0
  for (imageURL of imageURLs) {
    imageAlt = imageAlts[i];
    imgStr = imgStr + `<img class="image-preview" tabindex=0 data-variable-tabindex src="${imageURL}" alt="${imageAlt}">`
  i++}

  let str = `<div class="image-wrapper image-wrapper-bottom">\
<div class="image-group" tabindex=0 data-variable-tabindex>${imgStr}</div>\
<div class="spacer"></div><div class="pointer"></div><div class="text-wrapper">\
  <h3 class="date">${date}</h3>\
  <p class="description">${desc}</p>\
</div></div>`;

  return str;
}

async function buildTimeline() {
  let str = '';
  str += yearElement("2026");
  str += dateElement("05-23", "Milch seit August 2025 abgelaufen",
    ["assets/preview/2026/05-23/1.webp", "assets/preview/2026/05-23/2.webp"],
    ["Milch abgelaufen seit August 2025", "Eisflaschen"]
  );
  return str;
}

async function templateReplace(str, replace) {
  if (replace == "<!--{{TIMELINE}}-->") {
    const newStr = str.replace(replace, await buildTimeline());
    return newStr;
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
    res.write('404 - Not Found\n');
    res.end();
    return;
  }

  if (stats.isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.write('404 - Not Found\n');
    res.end();
    return;
  }

  const blockList = ["/assets/imgconfig.json", "/old/index-old.html"]
  if (blockList.indexOf(pathname) > -1) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.write('403 - Forbidden\n');
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
