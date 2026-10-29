import { SIZE, jump, drop, step } from "./walker.mjs";
import { Companion, findRoute } from "./companion.mjs";

const resident = document.getElementById("resident");
const whisper = document.getElementById("whisper");
const site = document.querySelector(".site");
const actor = { x: 0, y: 0, vx: 0, vy: 0, ground: null };
const keys = new Set();
const found = new Set();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const viewport = () => ({ top: scrollY, height: innerHeight });
let companion = null,
  autoTimer,
  manualTimer,
  manualUntil = 0,
  behavior = "watching";
const discoveries = [...document.querySelectorAll("[data-discovery]")];
const horizontalKeys = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  d: "right",
};
let discoveryPositions = [];
let floors = [],
  bounds,
  active = false,
  drag = null,
  frame = null;
let lastTime = 0,
  bubbleTimer,
  bubbleAnchor,
  inputAt = 0;

function measure() {
  floors = [...document.querySelectorAll("[data-land]")].flatMap((el, i) => {
    if (el.closest("details:not([open])") && !el.closest("summary")) return [];
    const font = parseFloat(getComputedStyle(el).fontSize);
    return [...el.getClientRects()]
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r, j) => ({
        id: `land-${i}-${j}`,
        element: el,
        interest:
          el.closest("h1,h2,h3") || el.classList.contains("section-heading")
            ? 2
            : el.classList.contains("feature-project")
              ? 1
              : 0,
        left: r.left + scrollX,
        right: r.right + scrollX,
        y:
          scrollY +
          (el.dataset.land === "bottom"
            ? r.bottom
            : r.top + (el.dataset.land === "text" ? font * 0.17 : 0)),
      }));
  });
  discoveryPositions = discoveries.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      el,
      x: r.left + scrollX + r.width / 2,
      y: r.top + scrollY + r.height / 2,
    };
  });
  bounds = {
    width: document.documentElement.clientWidth,
    bottom:
      Math.max(innerHeight, site.getBoundingClientRect().bottom + scrollY) - 5,
  };
  floors.push({ id: "bottom", left: 0, right: bounds.width, y: bounds.bottom });
  wake();
}
function render() {
  resident.dataset.behavior = drag ? "held" : active ? "playing" : behavior;
  resident.style.transform = `translate(${actor.x}px, ${actor.y}px)`;
  resident.classList.toggle(
    "walking",
    Math.abs(actor.vx) > 20 && actor.ground !== null && !drag,
  );
  resident.classList.toggle("dragging", !!drag?.moved);
  if (Math.abs(actor.vx) > 10)
    resident.style.setProperty("--facing", actor.vx > 0 ? 1 : -1);
  if (!whisper.hidden && !bubbleAnchor) positionBubble();
}
function positionBubble() {
  const r = bubbleAnchor?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : actor.x + SIZE.width / 2 - scrollX;
  const y = r ? r.top - 8 : actor.y - scrollY - 12;
  const w = whisper.offsetWidth;
  whisper.style.left =
    Math.max(w / 2 + 14, Math.min(innerWidth - w / 2 - 14, x)) + "px";
  const below = y < whisper.offsetHeight + 15;
  whisper.style.top =
    (below ? Math.max(15, y + 65) : Math.min(innerHeight - 15, y)) + "px";
  whisper.style.transform = below
    ? "translateX(-50%)"
    : "translate(-50%, -100%)";
}
function say(text, anchor = null, duration = 6000) {
  clearTimeout(bubbleTimer);
  bubbleAnchor = anchor;
  whisper.textContent = text;
  whisper.hidden = false;
  positionBubble();
  bubbleTimer = setTimeout(() => {
    whisper.hidden = true;
  }, duration);
}
function manualActivity() {
  manualUntil = performance.now() + 6500;
  clearTimeout(manualTimer);
  clearTimeout(autoTimer);
  manualTimer = setTimeout(() => {
    if (drag) return;
    active = false;
    keys.clear();
    resident.setAttribute("aria-pressed", "false");
    companion?.reset();
    wake();
  }, 6500);
}
function select(value, hint = false, resume = false) {
  active = value;
  keys.clear();
  if (value) manualActivity();
  if (resume) {
    manualUntil = 0;
    clearTimeout(manualTimer);
    companion?.reset();
  }
  resident.setAttribute("aria-pressed", String(active));
  if (active && hint)
    say(
      matchMedia("(pointer: coarse)").matches
        ? "Me arrasta pela página."
        : "← → andar · espaço pular · ↓ descer · Esc soltar",
      null,
      4500,
    );
  wake();
}
function discover() {
  for (const { el, x, y } of discoveryPositions) {
    if (found.has(el)) continue;
    const dx = actor.x + SIZE.width / 2 - x;
    const dy = actor.y + SIZE.height - y;
    if (Math.hypot(dx, dy) < 43) {
      found.add(el);
      say(el.dataset.discovery, el, 8500);
      break;
    }
  }
}
function tick(now) {
  frame = null;
  if (drag || document.hidden) return;
  const dt = lastTime ? Math.min(1 / 30, (now - lastTime) / 1000) : 1 / 60;
  lastTime = now;
  const autonomous =
    !active && now >= manualUntil && !reducedMotion.matches && companion;
  const command = autonomous
    ? companion.decide(actor, floors, viewport(), now)
    : { mode: now < manualUntil ? "waiting" : "watching", direction: 0 };
  behavior = command.mode;
  if (command.reenter) {
    actor.x = Math.max(
      4,
      Math.min(bounds.width - SIZE.width - 4, command.reenter.x),
    );
    actor.y = command.reenter.y;
    actor.vx = 0;
    actor.vy = 100;
    actor.ground = null;
  }
  if (command.jump) jump(actor);
  if (command.drop) drop(actor);
  const direction = active
    ? Number(keys.has("right")) - Number(keys.has("left"))
    : command.direction;
  const wasAirborne = actor.ground === null;
  step(actor, floors, bounds, dt, direction);
  const landed = autonomous && wasAirborne && actor.ground !== null;
  render();
  discover();
  if (active && now - inputAt < 1800) {
    const screenY = actor.y - scrollY;
    const delta =
      screenY < 95
        ? screenY - 95
        : screenY > innerHeight - 115
          ? screenY - (innerHeight - 115)
          : 0;
    if (delta) window.scrollBy({ top: delta * 0.18, behavior: "instant" });
  }
  if (
    direction ||
    landed ||
    command.needsFrame ||
    actor.ground === null ||
    Math.abs(actor.vx) > 0.2
  )
    frame = requestAnimationFrame(tick);
  else if (command.wakeAt) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(wake, Math.max(0, command.wakeAt - now));
  }
}
function wake() {
  if (frame === null && !drag && bounds) {
    lastTime = 0;
    frame = requestAnimationFrame(tick);
  }
}
resident.addEventListener("pointerdown", (e) => {
  if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
  select(false);
  manualActivity();
  drag = {
    startX: e.pageX,
    startY: e.pageY,
    offsetX: e.pageX - actor.x,
    offsetY: e.pageY - actor.y,
    moved: false,
  };
  resident.setPointerCapture(e.pointerId);
  whisper.hidden = true;
});
resident.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (Math.hypot(e.pageX - drag.startX, e.pageY - drag.startY) > 4)
    drag.moved = true;
  if (!drag.moved) return;
  manualActivity();
  actor.x = Math.max(
    4,
    Math.min(bounds.width - SIZE.width - 4, e.pageX - drag.offsetX),
  );
  actor.y = Math.max(
    5,
    Math.min(bounds.bottom - SIZE.height, e.pageY - drag.offsetY),
  );
  actor.ground = null;
  actor.vx = actor.vy = 0;
  render();
  discover();
});
function release(cancelled = false) {
  if (!drag) return;
  const moved = drag.moved;
  drag = null;
  if (moved || cancelled) {
    actor.vy = 0;
    select(false);
  } else {
    select(true, true);
    resident.focus({ preventScroll: true });
  }
  render();
  wake();
}
resident.addEventListener("pointerup", () => release());
resident.addEventListener("pointercancel", () => release(true));
resident.addEventListener("click", (e) => {
  if (e.detail === 0) select(!active, !active);
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    select(false, false, true);
    whisper.hidden = true;
    return;
  }
  if (
    !active ||
    (e.target !== resident &&
      e.target.closest("a,button,input,textarea,select,summary"))
  )
    return;
  const direction = horizontalKeys[e.key];
  if (direction) {
    e.preventDefault();
    keys.add(direction);
    inputAt = performance.now();
    manualActivity();
    wake();
  }
  if (["ArrowDown", "s"].includes(e.key)) {
    e.preventDefault();
    if (!e.repeat) drop(actor);
    inputAt = performance.now();
    manualActivity();
    wake();
  }
  if ([" ", "ArrowUp", "w"].includes(e.key)) {
    e.preventDefault();
    if (!e.repeat) jump(actor);
    inputAt = performance.now();
    manualActivity();
    wake();
  }
});
window.addEventListener("keyup", (e) => {
  const direction = horizontalKeys[e.key];
  if (direction) {
    keys.delete(direction);
    wake();
  }
});
window.addEventListener("blur", () => select(false));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) select(false);
  else wake();
});
document.addEventListener("focusin", (e) => {
  if (active && e.target !== resident) select(false);
});
document.querySelectorAll("a,summary").forEach((el) =>
  el.addEventListener("click", () => {
    select(false, false, true);
    whisper.hidden = true;
  }),
);
discoveries.forEach((el) =>
  el.addEventListener("click", () => say(el.dataset.discovery, el, 8500)),
);
window.addEventListener(
  "scroll",
  () => {
    if (!whisper.hidden) positionBubble();
    companion?.scrolled(performance.now());
    wake();
  },
  { passive: true },
);
window.addEventListener("resize", measure);
document
  .querySelectorAll("details")
  .forEach((el) => el.addEventListener("toggle", measure));
await document.fonts.ready;
measure();
const perch = floors.find((f) => f.element?.id === "first-perch");
actor.x = Math.max(
  perch.left + 3,
  Math.min(perch.right - SIZE.width - 3, perch.right - 100),
);
actor.y = perch.y - SIZE.height;
actor.ground = perch.id;
resident.hidden = false;
render();
new ResizeObserver(measure).observe(site);
const firstHop =
  floors
    .filter(
      (floor) =>
        floor.y > 75 &&
        floor.y < perch.y - 10 &&
        findRoute(floors, perch.id, floor.id).length > 0,
    )
    .sort((a, b) => b.y - a.y)[0] || perch;
companion = new Companion(
  {
    id: firstHop.id,
    x: firstHop.left + (firstHop.right - firstHop.left) * 0.72,
  },
  viewport(),
  performance.now(),
);
reducedMotion.addEventListener("change", () => {
  clearTimeout(autoTimer);
  companion.reset();
  wake();
});
wake();
