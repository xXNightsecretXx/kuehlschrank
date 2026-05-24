function $$(selector) {
  return document.querySelectorAll(selector);
};

/*---Horizontal Scroll-------------*/
const horizontal = document.scrollingElement
window.addEventListener("wheel", (e) => {
  const target = e.target.closest(".image-group");
  if (target) return; // Allow vertical scroll on image-group
  
  e.preventDefault();
  horizontal.scrollLeft += e.deltaY;
}, { passive: false });

/*---Theme-------------------------*/
function currentTheme() {
  const theme = document.documentElement.dataset.theme;
  if (theme === "light" || theme === "dark") return theme;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

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
};

$$("[data-theme-toggle]").forEach(btn =>
  btn.addEventListener("click", () => applyTheme(currentTheme() === "light" ? "dark" : "light"))
);

applyTheme(currentTheme());