var path = document.location.pathname;

/*---Horizontal Scroll-------------*/
const horizontal = document.scrollingElement
window.addEventListener("wheel", (e) => {
  e.preventDefault();
  horizontal.scrollLeft += e.deltaY;
}, { passive: false });

/*---Theme-------------------------*/
function $$(selector) {
  return document.querySelectorAll(selector);
}

function currentTheme() {
  const theme = document.documentElement.dataset.theme;
  if (theme === "light" || theme === "dark") return theme;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch {}

  const showSun = theme === "light";
  $$("[data-icon-sun]").forEach(el => {
    el.classList.toggle("hidden", !showSun);
  });
  $$("[data-icon-moon]").forEach(el => {
    el.classList.toggle("hidden", showSun);
  });
}

$$("[data-theme-toggle]").forEach(btn =>
  btn.addEventListener("click", () => applyTheme(currentTheme() === "light" ? "dark" : "light"))
);

applyTheme(currentTheme());

var fs = require('fs');
var files = fs.readdirSync('C:/Users/Lukas/Desktop/Visual_Studio_Code/HTML/kühlschrank/assets/preview/2025/07-19');
// call loader on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => loadPreviewImages());