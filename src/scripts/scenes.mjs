// Project scenes. A hovered or focused card on /projects grows into a stage
// and plays a canvas scene about its project. Each scene is its own module in
// ./scenes, loaded the first time its card needs it.
//
// The stage is laid out at its full size from the start and only clipped down
// to the card, so the page never reflows: the resident stands on these cards.
const scenes = {
  wasmoon: () => import("./scenes/wasmoon.mjs"),
  steamworks: () => import("./scenes/steamworks.mjs"),
  gmod: () => import("./scenes/gmod.mjs"),
  papagaia: () => import("./scenes/papagaia.mjs"),
  tiktoken: () => import("./scenes/tiktoken.mjs"),
  demoon: () => import("./scenes/demoon.mjs"),
  monaco: () => import("./scenes/monaco.mjs"),
  sqlier: () => import("./scenes/sqlier.mjs"),
  eleven: () => import("./scenes/eleven.mjs"),
  agenthost: () => import("./scenes/agenthost.mjs"),
};
// Scenes are drawn for a stage this big; the canvas scales them to fit a
// narrower one, and a wider or taller one gives them the extra room.
const DESIGN = { width: 547, height: 200 };
// Where a scene expects the card's title: its top left corner, in scene units.
const TITLE = { x: 36, y: 35 };
const hover = matchMedia("(hover: hover)");
const calm = matchMedia("(prefers-reduced-motion: reduce)");
const runs = new Map();

function fonts() {
  const title = document.querySelector(".project-card h2");
  return {
    site: getComputedStyle(document.body).fontFamily,
    display: getComputedStyle(title).fontFamily,
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", monospace',
  };
}

function start(card) {
  if (!hover.matches || calm.matches || !scenes[card.dataset.scene]) return;
  let run = runs.get(card);
  if (run) {
    // Back before the stage finished closing: carry on with the same scene.
    clearTimeout(run.closing);
    if (run.draw) card.classList.add("live");
    return;
  }
  run = { card, client: null };
  runs.set(card, run);
  // A pointer that only passes over the card opens nothing.
  run.opening = setTimeout(() => open(run), 70);
}

async function open(run) {
  const { card } = run;
  let stage = card.querySelector(".stage");
  if (!stage) {
    stage = document.createElement("span");
    stage.className = "stage";
    stage.setAttribute("aria-hidden", "true");
    stage.innerHTML = "<canvas></canvas>";
    card.prepend(stage);
  }
  let scene;
  try {
    scene = await scenes[card.dataset.scene]();
  } catch {
    runs.delete(card);
    return;
  }
  if (runs.get(card) !== run) return;
  const canvas = stage.querySelector("canvas");
  const size = canvas.getBoundingClientRect();
  const scale = Math.min(size.width / DESIGN.width, size.height / DESIGN.height);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(size.width * dpr);
  canvas.height = Math.round(size.height * dpr);
  const ctx = canvas.getContext("2d");
  const W = size.width / scale;
  const H = size.height / scale;
  run.draw = scene.default({ W, H, fonts: fonts() });
  // The title scales with the scene and moves to the corner it keeps free.
  const title = card.querySelector(".project-title").getBoundingClientRect();
  card.style.setProperty("--scene-ink", scene.ink);
  card.style.setProperty("--scene-scale", scale);
  card.style.setProperty(
    "--title-move",
    `${TITLE.x * scale - (title.left - size.left)}px ${TITLE.y * scale - (title.top - size.top)}px`,
  );
  stage.offsetWidth; // Flush, so the stage opens from its closed state.
  card.classList.add("live");

  // The pointer in scene coordinates. nx and ny run from -1 to 1 across the
  // stage and ease back to 0 when the pointer leaves or was never there.
  const pointer = { x: W / 2, y: H / 2, nx: 0, ny: 0, inside: false };
  let time = 0;
  let last = 0;
  const tick = (now) => {
    run.frame = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    time += dt;
    pointer.inside = !!run.client;
    let nx = 0;
    let ny = 0;
    if (run.client) {
      const at = canvas.getBoundingClientRect();
      const x = (run.client.x - at.left) / scale;
      const y = (run.client.y - at.top) / scale;
      const follow = 1 - Math.exp(-dt * 18);
      pointer.x += (x - pointer.x) * follow;
      pointer.y += (y - pointer.y) * follow;
      nx = (x / W) * 2 - 1;
      ny = (y / H) * 2 - 1;
    }
    const settle = 1 - Math.exp(-dt * 5);
    pointer.nx += (nx - pointer.nx) * settle;
    pointer.ny += (ny - pointer.ny) * settle;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    run.draw(ctx, time, dt, pointer);
    ctx.restore();
  };
  run.frame = requestAnimationFrame(tick);
}

function stop(card, now = false) {
  const run = runs.get(card);
  if (!run) return;
  clearTimeout(run.opening);
  clearTimeout(run.closing);
  card.classList.remove("live");
  const end = () => {
    cancelAnimationFrame(run.frame);
    runs.delete(card);
  };
  // Keep drawing while the stage closes.
  if (run.draw && !now) run.closing = setTimeout(end, 500);
  else end();
}

const cardOf = (target) => target.closest?.(".project-card[data-scene]");
document.addEventListener("pointerover", (e) => {
  const card = cardOf(e.target);
  if (!card || e.pointerType === "touch") return;
  if (!card.contains(e.relatedTarget)) start(card);
  const run = runs.get(card);
  if (run) run.client = { x: e.clientX, y: e.clientY };
});
document.addEventListener("pointermove", (e) => {
  const run = runs.get(cardOf(e.target));
  if (run) run.client = { x: e.clientX, y: e.clientY };
});
document.addEventListener("pointerout", (e) => {
  const card = cardOf(e.target);
  if (!card || card.contains(e.relatedTarget)) return;
  const run = runs.get(card);
  if (run) run.client = null;
  if (!card.matches(":focus-visible")) stop(card);
});
document.addEventListener("focusin", (e) => {
  const card = cardOf(e.target);
  if (card?.matches(":focus-visible")) start(card);
});
document.addEventListener("focusout", (e) => {
  const card = cardOf(e.target);
  if (card && !card.matches(":hover")) stop(card);
});
document.addEventListener("page:leave", () => {
  for (const card of [...runs.keys()]) stop(card, true);
});

// Fetch the scenes ahead of the first hover, once the page is idle.
function warm() {
  if (!hover.matches || calm.matches || !document.querySelector(".project-card[data-scene]")) return;
  for (const load of Object.values(scenes)) load().catch(() => {});
}
const idle = window.requestIdleCallback ?? ((run) => setTimeout(run, 400));
idle(warm);
document.addEventListener("page:enter", () => idle(warm));
