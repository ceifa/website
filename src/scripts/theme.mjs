// The header toggle. With no stored choice the page follows the system theme;
// the inline script in Layout.astro applies a stored one before first paint.
const root = document.documentElement;
const button = document.getElementById("theme-toggle");
const system = matchMedia("(prefers-color-scheme: dark)");
const systemTheme = () => (system.matches ? "dark" : "light");
const other = () =>
  (root.dataset.theme || systemTheme()) === "dark" ? "light" : "dark";

function label() {
  button.setAttribute("aria-label", `Switch to ${other()} theme`);
}
button.addEventListener("click", () => {
  const next = other();
  // Choosing what the system already shows goes back to following it.
  const stored = next === systemTheme() ? null : next;
  if (stored) root.dataset.theme = stored;
  else delete root.dataset.theme;
  try {
    if (stored) localStorage.setItem("theme", stored);
    else localStorage.removeItem("theme");
  } catch {}
  label();
});
system.addEventListener("change", label);
label();
button.hidden = false;
