let centerX = window.innerWidth / 2;

function $$(selector) {
  return document.querySelectorAll(selector);
};

/*---Horizontal Scroll-------------*/
const horizontal = document.scrollingElement
window.addEventListener("wheel", (e) => {
  const target = e.target.closest(".image-group");
  if (target) {
    if (target.scrollHeight > target.clientHeight) {return;}
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

/*---Title Scaling-----------------*/
const titleWidth = 396; // hardcoded because it's easier than calculating it
const title = document.getElementById("title");

function resizeTitle() {
  if (window.innerWidth < 396 + 32) {
    title.style.fontSize = (window.innerWidth - 32) / titleWidth * 2 + "em";
  }
}

/*---Image View--------------------*/
const previews = document.getElementsByClassName("image-preview");
const images = document.getElementsByClassName("image-view");
const captions = document.getElementsByClassName("caption");
const scrim = document.getElementById("scrim");

for (let i = 0; i < previews.length; i++) {
  previews[i].addEventListener("click", () => {
    for (let j = 0; j < images.length; j++) {
      captions[j].classList.add("hidden");
      images[j].classList.add("hidden");
    } // hide all images

    captions[i].classList.remove("hidden"); // show corresponding caption
    images[i].classList.remove("hidden"); // show corresponding image
    scrim.classList.remove("hidden"); // show scrim
  });
}

scrim.addEventListener("click", () => {
  for (let j = 0; j < images.length; j++) {
    captions[j].classList.add("hidden");
    images[j].classList.add("hidden");
  } // hide all images and captions
  scrim.classList.add("hidden"); // hide scrim
});

/*---Auto Year---------------------*/
function setCurrentYear() {
  const years = document.getElementsByClassName("year");
  const indicator = document.getElementById("year-indicator");
  const currentYear = getRightmostLeftElement(years).innerHTML;
  indicator.innerHTML = currentYear;
}

function getRightmostLeftElement(divs) { // gets the rightmost div left the center
  let result;

  for (const div of divs) {
    const divPos = div.getBoundingClientRect().left + div.getBoundingClientRect().width / 2;

    if (divPos < centerX) {result = div;} else {break;}
  }
  return result;
}

setCurrentYear();
window.addEventListener("scroll", (e) => {setCurrentYear()})
window.addEventListener("resize", (e) => {centerX = window.innerWidth / 2; setCurrentYear(); resizeTitle()})