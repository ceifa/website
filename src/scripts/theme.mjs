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
button.addEventListener("click", () => soak(button, () => show(other())));
system.addEventListener("change", label);
label();
button.hidden = false;
