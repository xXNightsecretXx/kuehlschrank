const SALT = "35c29552e318015e";
const N = 4094;
const SERVERURL = location.protocol + "//" + location.host;

function $$(selector) {return document.querySelectorAll(selector);};

document.getElementsByTagName("html")[0].scrollTop = 0

async function sha512(str) {
  const buffer = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function stretch(str, n) {
  for (let i = 0; i < n; i++) {str = await(sha512(str));}
  return str;
}

/*---Theme-------------------------*/
function currentTheme() {
  let theme = document.documentElement.dataset.theme;
  if (theme === "light" || theme === "dark") return theme;

  theme = localStorage.theme;
  if (theme === "light" || theme === "dark") return theme;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?
    "light" : "dark";
};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {localStorage.setItem("theme", theme);} catch {}

  const showSun = theme === "light";
  document.getElementById("icon-sun" ).classList.toggle("hidden", !showSun);
  document.getElementById("icon-moon").classList.toggle("hidden",  showSun);
};

const themeToggle = document.getElementById("theme-toggle")
themeToggle.addEventListener("click", () => {
  applyTheme(currentTheme() === "light" ? "dark" : "light");
});

applyTheme(currentTheme());

/*---Title Scaling-----------------*/
const titleWidth = 396; // hardcoded because it's easier than calculating it
const title = document.getElementById("title");

function resizeTitle() {
  if (window.innerWidth < 396 + 32) {
    title.style.fontSize = (window.innerWidth - 32) / titleWidth * 2 + "em";
  }
}

resizeTitle();
window.addEventListener("resize", (e) => {resizeTitle();});

/*---Key Input---------------------*/
const keyInput = document.getElementById("key-input");
const keyInputWrapper = document.getElementById("key-input-wrapper-wrapper");
let key;

keyInput.addEventListener('keydown', e => {
  if (e.key == "Enter") {
    keyInputWrapper.style.display = "none";
    document.getElementsByTagName("body")[0].style["overflow-y"] = "auto";
    document.getElementsByTagName("body")[0].style["scrollbarGutter"] = "stable";
    stretch(keyInput.value + SALT, N).then(k => {
      key = k;
      afterKeyEnter();
    });
    keyInput.value = "";
  }
});

function afterKeyEnter() {
  generateSubdirs($$("[data-path]")[0].innerHTML).then(() => {
    addEventListeners();
  });
}

/*---Upload Assets-----------------*/
document.getElementById("upload").addEventListener("submit", (e) => {
  e.preventDefault();
  const file = document.getElementById("upload-file").files[0];
  if (file) {
    const reader = new FileReader();
    reader.readAsDataURL(document.getElementById("upload-file").files[0]);
    reader.addEventListener("load", () => {
      const data = Object.create(Object.prototype);
      data["date"] = document.getElementById("upload-date").value;
      data["alttext"] = document.getElementById("upload-alt-text").value;
      data["description"] = document.getElementById("upload-description").value;
      data["data"] = reader.result;

      fetch(SERVERURL, {
        method: "POST",
        headers: {
          "Authorization": key
        },
        body: JSON.stringify(data)
      });
    });
  }
})

/*---Edit Assets------------------*/
async function generateSubdirs(path) {
  if (path.endsWith(".webp")) {return;}

  let res = await fetch(SERVERURL + path, {method: "GET", headers: {"Authorization": key}});
  let data = await res.text();
  if (data.startsWith("{")) {
    data = JSON.parse(data);
    const directoryList = document.getElementById("delete-directory");

    let dir;
    for (dirName of data.data) {
      dir = document.createElement("div");
      dir.classList.add("delete-object");
      dir.appendChild(document.createTextNode(dirName));
      dir.tabIndex = 0;
      
      directoryList.appendChild(dir);
    }
  } else {
    console.error("Error:", data);
  }
}

function deleteElementsOfClass(cls) {
  var els = document.getElementsByClassName(cls);
  while(els[0]) {
      els[0].parentNode.removeChild(els[0]);
  }
}

function addEventListeners() {
  subdirectories = document.getElementsByClassName("delete-object");
  for (subdirectory of subdirectories) {
    subdirectory.addEventListener("click", (e) => {
      const deletionPath = $$("[data-path]")[0];
      deletionPath.innerHTML = deletionPath.innerHTML + "/" + e.target.innerHTML;
      deleteElementsOfClass("delete-object");
      generateSubdirs(deletionPath.innerHTML).then(() => {
        addEventListeners();
      });
    })
  }
}

document.getElementById("delete-up").addEventListener("click", (e) => {
  e.preventDefault();
  const deletionPath = $$("[data-path]")[0].innerHTML;
  if (deletionPath === "/assets/img") {return;}

  $$("[data-path]")[0].innerHTML = deletionPath.substring(0, deletionPath.lastIndexOf("/"));
  deleteElementsOfClass("delete-object");
  generateSubdirs($$("[data-path]")[0].innerHTML).then(() => {
    addEventListeners();
  });
});

document.getElementById("delete").addEventListener("submit", (e) => {
  e.preventDefault();
  const deletionPath = $$("[data-path]")[0].innerHTML;
  fetch(SERVERURL + deletionPath, {method: "DELETE", headers: {"Authorization": key}});
})

document.getElementById("edit").addEventListener("submit", (e) => {
  e.preventDefault();
  const editPath = $$("[data-path]")[0].innerHTML;

  const data = Object.create(Object.prototype);
  data["alttext"] = document.getElementById("edit-alt-text").value;
  data["description"] = document.getElementById("edit-description").value;

  fetch(SERVERURL + editPath, {
    method: "PATCH",
    headers: {
      "Authorization": key
    },
    body: JSON.stringify(data)
  });
})

/*---Upload Archive----------------*/
document.getElementById("archive-upload").addEventListener("submit", (e) => {
  e.preventDefault();
  
  const file = document.getElementById("archive-upload-file").files[0];
  if (file) {
    fetch(SERVERURL, {
      method: "PUT",
      headers: {
        "Authorization": key,
        "Content-Type": "application/zip"
      },
      body: file
    });
  }
});

/*---Download Archive--------------*/
async function downloadArchive() {
  const request = await fetch(SERVERURL + "/assets", {
    method: "GET",
    headers: {
      "Authorization": key,
    }
  });

  if (!request.ok) {
    console.error("Download failed: " + request.status);
    return;
  }

  const blob = await request.blob();
  const downloadUrl = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "assets.zip";
  
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
}

document.getElementById("download").addEventListener("submit", (e) => {
  e.preventDefault();
  downloadArchive();
});