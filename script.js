function $$(selector) {
  return document.querySelectorAll(selector);
};

/*---Horizontal Scroll-------------*/
const horizontal = document.scrollingElement
window.addEventListener("wheel", (e) => {
  const target = e.target.closest(".image-group");
  if (target) {
    if (target.scrollHeight > target.clientHeight) {
      return;
    }
    e.preventDefault();
    horizontal.scrollLeft += e.deltaY;
    return;
  }
  
  e.preventDefault();
  horizontal.scrollLeft += e.deltaY;
}, { passive: false });

/*---Arrow Auto-Resize-------------*/
function resizeArrow() {
  const width = document.getElementsByClassName("images")[0].offsetWidth;
  const arrow = document.getElementsByClassName("arrow")[0];
  const arrow_line = document.getElementById("arrow-line");
  
  arrow.style.width = width + 48 + 'px';
  arrow_line.style.width = width + 48 + 'px';
}

resizeArrow();

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

/*---Image View--------------------*/
const previews = document.getElementsByClassName("image-preview");
const images = document.getElementsByClassName("image-view");
const scrim = document.getElementById("scrim");

for (let i = 0; i < previews.length; i++) {
  previews[i].addEventListener("click", () => {
    for (let j = 0; j < images.length; j++) {images[j].classList.add("hidden");} // hide all images

    images[i].classList.remove("hidden"); // show corresponding image
    scrim.classList.remove("hidden"); // show scrim
  });
}

scrim.addEventListener("click", () => {
  for (let j = 0; j < images.length; j++) {images[j].classList.add("hidden");} // hide all images
  scrim.classList.add("hidden"); // hide scrim
});