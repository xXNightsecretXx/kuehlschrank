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

keyInput.addEventListener('keydown', e => {
  if (e.key == "Enter") {
    keyInputWrapper.style.display = 'none';
    const inputValue = document.getElementById("userInput").value;
  }
});