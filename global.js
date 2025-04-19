console.log("IT’S ALIVE!");

// Helper function to querySelectorAll as an array
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Pages for navigation
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "https://github.com/Ctt011", title: "GitHub" },
];

// Set base path for local vs GitHub Pages
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/your-repo-name/"; // Replace with your actual GitHub repo name if needed

// Create and insert <nav>
let nav = document.createElement("nav");
document.body.prepend(nav);

// Build nav links
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith("http") ? BASE_PATH + url : url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

// Add color scheme switcher
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

// Get reference to select element
const select = document.querySelector(".color-scheme select");

// Set color scheme and remember preference
function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
  localStorage.colorScheme = scheme;
}

// Load saved preference on page load
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

// Update scheme when user changes it
select.addEventListener("input", (e) => {
  setColorScheme(e.target.value);
});
