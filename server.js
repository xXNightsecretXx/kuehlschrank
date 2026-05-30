const fs = require("fs");
const fsp = require("fs").promises;
const http = require("http");
const path = require("path");

const PASSWORD = "9936a8971e2fe510e687bf944e73dd473d68d78826445b58a741499ebbc806a625849854cf0b310e6fe338e90590d4bd9d02ac30ef6487b1937bb39bc8eeb2a8";
const MAXLENGTH = 8388608;

function logMsg(type, msg) {
  // don't use for logging HTTP
  const time = new Date().toTimeString().split(' ')[0];
  if (type == "error" || type == "e")        {console.log(`[${time}] \x1b[97m\x1b[41m ERROR \x1b[0m ${msg}`)}
  else if (type == "warning" || type == "w") {console.log(`[${time}] \x1b[97m\x1b[43m WARNING \x1b[0m ${msg}`)}
  else                                       {console.log(`[${time}] \x1b[97m\x1b[46m INFO \x1b[0m ${msg}`)}
}

function yearElement(year) {
  return `<div class="year-wrapper image-wrapper">\
<h1 class="year">${year}</h1>\
<div class="pointer"></div><div class="pointer"></div><div class="year-spacer"></div></div>`
}

function dateElement(date, desc, imageURIs, imageAlts) {
  date = date.slice(3, 5) + "." + date.slice(0, 2) + ".";

  let imgStr = "";
  let imageAlt;
  let i = 0;
  for (imageURI of imageURIs) {
    imageAlt = imageAlts[i];
    imgStr = imgStr + `<img class="image-preview" tabindex=0 data-variable-tabindex src="${imageURI}" alt="${imageAlt}">`
  i++}

  let str = `<div class="image-wrapper image-wrapper-\${{SIDE}}\$">\
<div class="image-group" tabindex=0 data-variable-tabindex>${imgStr}</div>\
<div class="spacer"></div><div class="pointer"></div><div class="text-wrapper">\
  <h3 class="date">${date}</h3>\
  <p class="description">${desc}</p>\
</div></div>`;

  return str;
}

function imageElements(path, images, alts, descs) {
  let imgStr = "";
  let alt;
  let desc;
  let i = 0;
  for (image of images) {
    alt = alts[i];
    desc = descs[i];
    imgStr = imgStr + `<img class="image-view hidden" loading="lazy" src="${path + image}" alt="${alt}"><p class="caption hidden">${desc}</p>`
  i++}
  return imgStr;
}

//cursed basically-oneliner
async function buildTimeline() {
  const imageJSON = JSON.parse(await fsp.readFile("assets/imgconfig.json", "utf-8"));

  /*
    I know this looks scary:
      think: for each year/date/image look up the inner directories
      then return the path bottom-up
      also just ignore the brackets

     |for each year
     | |for each date
     | | |for each image
     | |then
     | | |
     |then
     | |

    this isn't even callback hell
    hoursWastedOnUnderstandingAndWritingTs = 3;
  */
  return fsp.readdir("assets/preview").then(years => {return (
    Promise.all(years.map(year => {return fsp.readdir(`assets/preview/${year}`).then(dates => {return (            /*  year promises */
      Promise.all(dates.map(date => {return fsp.readdir(`assets/preview/${year}/${date}`).then(images => {return ( /*  date promises */
        Promise.all(images.map(image => {                                                                          /* image promises */
          return `assets/preview/${year}/${date}/${image}`;
        })).then(imageURIs => {return dateElement(
          date, imageJSON[year][date][0]["alts"][0], imageURIs, imageJSON[year][date][0]["alts"]
        );})
      );});}))
    );}).then(dates => {
      return [yearElement(year), dates];
    });}))
  );})
  .then(htmlList => {return htmlList.flat(Infinity).join("").replace(/\$\{\{SIDE\}\}\$([^$]*)\$\{\{SIDE\}\}\$/g, 'top$1bottom');});
}

async function buildImageView() {
  const imageJSON = JSON.parse(await fsp.readFile("assets/imgconfig.json", "utf-8"));

  return fsp.readdir("assets/img").then(years => {return (
    Promise.all(years.map(year => {return fsp.readdir(`assets/img/${year}`).then(dates => {return (            /*  year promises */
      Promise.all(dates.map(date => {return fsp.readdir(`assets/img/${year}/${date}`).then(images => {return ( /*  date promises */
        imageElements(`assets/img/${year}/${date}/`, images, imageJSON[year][date][0]["alts"], imageJSON[year][date][0]["descriptions"])
      );});}))
    );});}))
  );})
  .then(htmlList => {return htmlList.flat(Infinity).join("");});
}

async function templateReplace(str, replace) {
  if (replace == "<!--{{TIMELINE}}-->") {
    return str.replace(replace, await buildTimeline());
  } else if (replace == "<!--{{IMAGE VIEW}}-->") {
    return str.replace(replace, await buildImageView());
  }
}

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.headers['content-length'] > MAXLENGTH) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("413 - Content Too Large");
    return;
  }

  if (req.method == "GET") {
    console.log("[" + new Date().toTimeString().split(' ')[0] + "] \x1b[97m\x1b[44m HTTP \x1b[0m "
                + (req.headers['X-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress)
                + " \x1b[97m\x1b[42m GET \x1b[0m " + req.url);

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
        templateReplace(content.toString("utf-8"), "<!--{{TIMELINE}}-->")
        .then(htmlStr => templateReplace(htmlStr, "<!--{{IMAGE VIEW}}-->"))
        .then(htmlStr => {
          res.writeHead(200, { "Content-Type": contentType });
          res.write(htmlStr);
          res.end();
        });
        return;
      }

      if (filePath.endsWith(".css")) contentType = "text/css";
      if (filePath.endsWith(".js")) contentType = "application/javascript";
      if (filePath.endsWith(".webp")) contentType = "image/webp";

      res.writeHead(200, { "Content-Type": contentType });
      res.write(content);
      res.end();
    });
  } else if (req.method == "POST") {
    console.log("[" + new Date().toTimeString().split(' ')[0] + "] \x1b[97m\x1b[44m HTTP \x1b[0m "
                + (req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress)
                + " \x1b[97m\x1b[45m POST \x1b[0m");

    let body = '';
    req.on('data', chunk => {body += chunk;});

    req.on('end', () => {
      try {
        body = JSON.parse(body)
      } catch (err) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("400 - Bad Request");
        logMsg("e", "Could not parse request content: " + err.message);
        return;
      }
      console.log('Body:', body);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Received');
    });
  } else {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("405 - Method Not Allowed");
    console.log("[" + new Date().toTimeString().split(' ')[0] + "] \x1b[97m\x1b[44m HTTP \x1b[0m "
                + (req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress)
                + " \x1b[97m\x1b[41m " + req.method + " \x1b[0m " + "\x1b[31m(405)\x1b[0m");
    return;
  }
});

server.listen(PORT);
