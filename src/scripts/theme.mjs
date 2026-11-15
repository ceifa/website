// The header toggle. With no stored choice the page follows the system theme;
// the inline script in Layout.astro applies a stored one before first paint.
import { soak } from "./ink.mjs";

const root = document.documentElement;
const button = document.getElementById("theme-toggle");
const system = matchMedia("(prefers-color-scheme: dark)");
const systemTheme = () => (system.matches ? "dark" : "light");
export const other = () =>
  (root.dataset.theme || systemTheme()) === "dark" ? "light" : "dark";

function label() {
  button.setAttribute("aria-label", `Switch to ${other()} theme`);
}
// Shows a theme. Only a kept one becomes the visitor's stored choice.
export function show(theme, keep = true) {
  // Showing what the system already shows goes back to following it.
  const chosen = theme === systemTheme() ? null : theme;
  if (chosen) root.dataset.theme = chosen;
  else delete root.dataset.theme;
  if (keep)
    try {
      if (chosen) localStorage.setItem("theme", chosen);
      else localStorage.removeItem("theme");
    } catch {}
  label();
}
// Pictures drawn for one theme, like the portrait on /about, wait hidden for
// the other one, and a lazy image that is hidden never loads. Once the page has
// loaded they are fetched and decoded too, so a change of theme finds them
// ready instead of blinking in a moment later.
const themed = () => document.querySelectorAll(".portrait img");
function warm() {
  for (const img of themed()) {
    img.loading = "eager";
    img.decode().catch(() => {});
  }
}
if (document.readyState === "complete") warm();
else addEventListener("load", warm, { once: true });
document.addEventListener("page:enter", warm);
// The switch waits for them, but never long enough to be felt.
function ready() {
  warm();
  return Promise.race([
    Promise.all([...themed()].map((img) => img.decode().catch(() => {}))),
    new Promise((done) => setTimeout(done, 250)),
  ]);
}
button.addEventListener("click", () =>
  soak(button, async () => {
    await ready();
    show(other());
  }),
);
system.addEventListener("change", label);
label();
button.hidden = false;
