const SALT = "35c29552e318015e"
const N = 4094

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
const keyInputWrapper = document.getElementById("key-input-wrapper");
let key;

keyInput.addEventListener('keydown', e => {
  if (e.key == "Enter") {
    keyInputWrapper.style.display = 'none';
    stretch(keyInput.value + SALT, N).then(key => console.log(key));
  }
});