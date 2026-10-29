const pages = new Map();
const internal = (a) =>
  a.origin === location.origin &&
  !a.target &&
  !a.hasAttribute("download") &&
  /(\.html|\/)$/.test(a.pathname);

function load(url) {
  if (!pages.has(url))
    pages.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      }),
    );
  return pages.get(url);
}

async function go(url, scroll) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(await load(url), "text/html");
  } catch {
    pages.delete(url);
    location.href = url;
    return false;
  }
  const main = doc.querySelector("main");
  if (!main) {
    location.href = url;
    return false;
  }
  document.dispatchEvent(new Event("page:leave"));
  document.title = doc.title;
  document
    .querySelector(".header nav")
    .replaceWith(doc.querySelector(".header nav"));
  document.querySelector("main").replaceWith(main);
  // Parsed scripts never run; recreate them so in-article demos work.
  for (const old of main.querySelectorAll("script")) {
    const script = document.createElement("script");
    script.textContent = old.textContent;
    old.replaceWith(script);
  }
  const target =
    new URL(url).hash && document.getElementById(new URL(url).hash.slice(1));
  if (target) target.scrollIntoView({ behavior: "instant" });
  else scrollTo({ top: scroll, behavior: "instant" });
  main.focus({ preventScroll: true });
  document.dispatchEvent(new Event("page:enter"));
  return true;
}

history.scrollRestoration = "manual";
document.addEventListener("click", async (e) => {
  const a = e.target.closest("a[href]");
  if (
    !a ||
    !internal(a) ||
    e.defaultPrevented ||
    e.button ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  )
    return;
  if (a.pathname === location.pathname && a.hash) return;
  e.preventDefault();
  history.replaceState({ scroll: scrollY }, "");
  if (await go(a.href, 0)) history.pushState({ scroll: 0 }, "", a.href);
});
addEventListener("popstate", (e) => go(location.href, e.state?.scroll ?? 0));
for (const type of ["pointerover", "focusin"])
  document.addEventListener(type, (e) => {
    const a = e.target.closest?.("a[href]");
    if (a && internal(a)) load(a.href).catch(() => pages.delete(a.href));
  });
