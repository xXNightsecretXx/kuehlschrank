import {ZipArchive} from "archiver";
import crypto from "crypto";
import fs from "fs";
import {promises as fsp} from "fs";
import http from "http";
import path from "path";
import {dirname} from "path";
import sharp from "sharp";
import {ulid} from "ulid";
import {fileURLToPath} from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const KEY = "3878c50010ee4778249d7cc5da91086860e986b488c4685e94c41a133155149f4e6eeeb699163532f9c39564b61c06b0855ebcea4f4612e0ab4b4dfdbe039e68";
const MAXLENGTH = Infinity;
const PORT = 3000;

function logMsg(type, msg) {
  // don't use for logging HTTP
  const time = new Date().toTimeString().split(' ')[0];
  if (type == "error" || type == "e")        {console.log(`[${time}] \x1b[97m\x1b[41m ERROR \x1b[0m ${msg}`)}
  else if (type == "ferror" || type == "fe") {console.log(`[${time}] \x1b[97m\x1b[41m FATAL ERROR \x1b[0m ${msg}`)}
  else if (type == "warning" || type == "w") {console.log(`[${time}] \x1b[97m\x1b[43m WARNING \x1b[0m ${msg}`)}
  else                                       {console.log(`[${time}] \x1b[97m\x1b[46m INFO \x1b[0m ${msg}`)}
}

function authenticateRequest(req, res) {
  let key = req.headers["authorization"];
  logMsg("i", "Authorization of " + req.method + " request...");
  if (!key || crypto.createHash('sha512').update(key).digest('hex') != KEY) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("401 - Unauthorized");
    logMsg("w", "401 Authorization failed with key: " + key)
    return true;
  }
  logMsg("i", "Authorization succeeded")
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
  for (let imageURI of imageURIs) {
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
  for (let image of images) {
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
          date, imageJSON[year][date]["alts"][0], imageURIs, imageJSON[year][date]["alts"]
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
        imageElements(`assets/img/${year}/${date}/`, images, imageJSON[year][date]["alts"], imageJSON[year][date]["descriptions"])
      );});}))
    );});}))
  );})
  .then(htmlList => {return htmlList.flat(Infinity).join("");});
}

async function templateReplace(str, replace, res) {
  if (replace == "<!--{{TIMELINE}}-->") {
    return str.replace(replace, await buildTimeline().catch(err => {
      logMsg("w", "imgconfig.json missing contents");
    }))
  } else if (replace == "<!--{{IMAGE VIEW}}-->") {
    return str.replace(replace + "Something went wrong.", await buildImageView().catch(err => {
      logMsg("w", "imgconfig.json missing contents");
    }))
    .replace('<meta http-equiv="refresh" content="1">', "");
  }
}

//-----------------------------------------------------------------------------

async function updateImgConfig(date, alttext, description) {
  const imgconfigPath = __dirname + "/assets/imgconfig.json";

  if (isNaN(new Date(date)) || date.indexOf(" ") > -1) {throw new Error("invalid date");}

  const imageJSONFile = await fsp.readFile(imgconfigPath, "utf-8");
  let imageJSON = JSON.parse(imageJSONFile);
  
  const year = date.slice(0, 4);
  date = date.slice(5, 10);

  if (!imageJSON[year]) {imageJSON[year] = {};}
  if (!imageJSON[date]) {imageJSON[year][date] = {"alts": [], "descriptions": []};}

  imageJSON[year][date]["alts"].push(alttext);
  imageJSON[year][date]["descriptions"].push(description);

  await fsp.writeFile(imgconfigPath, JSON.stringify(imageJSON, null, 4));

  return imageJSONFile;
}

async function updateImg(date, data) {
  if (isNaN(new Date(date)) || date.indexOf(" ") > -1) {throw new Error("invalid date");}
  const _ulid = ulid()
  const mainPath = __dirname + `/assets/img/${date.slice(0, 4)}/${date.slice(5, 10)}`
  const previewPath = __dirname + `/assets/preview/${date.slice(0, 4)}/${date.slice(5, 10)}`

  await Promise.all([
    fsp.mkdir(mainPath, {recursive: true}),
    fsp.mkdir(previewPath, {recursive: true})
  ]);

  const binaryString = atob(data);
  let bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const buffer = bytes.buffer

  await Promise.all([
    sharp(buffer)
    .webp()
    .toFile(`${mainPath}/${_ulid}.webp`),

    sharp(buffer)
    .resize(128)
    .webp({quality: 50})
    .toFile(`${previewPath}/${_ulid}.webp`)
  ]);
  return [`${mainPath}/${_ulid}.webp`, `${previewPath}/${_ulid}.webp`]
}

//-----------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  if (req.headers["content-length"] > MAXLENGTH) {
    res.writeHead(413, { "Content-Type": "text/plain" });
    res.end("413 - Content Too Large");
    return;
  }
  
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  } else if (req.method == "GET") {
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

    // download ZIP
    if (pathname== "/assets") {
      if (authenticateRequest(req, res)) {return;}

      res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Disposition": "attachment; filename=\"assets.zip\""
      });

      const archive = new ZipArchive({zlib: {level: 6}});

      archive.on("error", (err) => {
          res.end();
          logMsg("e", err.message);
      });

      archive.pipe(res);
      archive.directory(filePath, false);
      archive.finalize();
      return;
    }

    // check if file exists and is not a directory
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
                + (req.headers['X-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress)
                + " \x1b[97m\x1b[45m POST \x1b[0m");

    if (authenticateRequest(req, res)) {return;}

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

      if (!(body.date && body.alttext && body.description && body.data)) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("400 - Bad Request: Missing field");
        logMsg("e", "Error while processing request: Missing Field");
        return;
      }

      const base64Image = body.data.split('base64,').pop();
      try {atob(base64Image)} catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("400 - Bad Request: invalid base64 string");
        logMsg("e", "Error while processing request: invalid base64 string");
        return;
      }

      if (isNaN(new Date(body.date)) || body.date.indexOf(" ") > -1) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("400 - Bad Request: invalid date");
        logMsg("e", "Error while processing request: invalid date");
        return;
      }
      
      const textPromise = updateImgConfig(body.date, body.alttext, body.description);
      const imagePromise = updateImg(body.date, base64Image);

      Promise.allSettled([textPromise, imagePromise]).then((results) => {
        const textResult = results[0];
        const imageResult = results[1];

        if (textResult.status === "fulfilled" && imageResult.status === "fulfilled") {
          logMsg("i", "Image successfully saved")
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end();
          return;
        }

        if (imageResult.status === "rejected") {
          const error = imageResult.reason;

          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 - Internal Server Error");
          logMsg("e", "Error while processing request: " + error.message);

          if (textResult.status === "fulfilled") {
            const before = textResult.value;
            fsp.writeFile(__dirname + "/assets/imgconfig.json", before).catch((innerError) => {
              logMsg("fe", "Could not reset imgconfig.json: " + innerError.message + " because " + error.message);
            });
          }
          return;
        }

        if (textResult.status === "rejected") {
          const error = textResult.reason;
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 - Internal Server Error: Error while processing text");
          logMsg("e", "Error while processing request: " + error.message);
        }
      });
    });
  } else {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("405 - Method Not Allowed");
    console.log("[" + new Date().toTimeString().split(' ')[0] + "] \x1b[97m\x1b[44m HTTP \x1b[0m "
                + (req.headers['X-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress)
                + " \x1b[97m\x1b[41m " + req.method + " \x1b[0m " + "\x1b[31m(405)\x1b[0m");
    return;
  }
});

server.listen(PORT);