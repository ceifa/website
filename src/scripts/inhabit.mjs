import { SIZE, jump, drop, step } from "./walker.mjs";
import { Companion, findRoute } from "./companion.mjs";
import { sit } from "./radio.mjs";
import { feel, heart, land, look, pop, settle, spin, stir } from "./mood.mjs";

const resident = document.getElementById("resident");
const site = document.querySelector(".site");
const actor = { x: 0, y: 0, vx: 0, vy: 0, ground: null };
const keys = new Set();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const viewport = () => ({ top: scrollY, height: innerHeight });
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
// How a throw turns the pointer's speed into the resident's, in px/s.
const THROW = { gain: 0.65, min: 40, across: 860, up: 830, down: 660 };
let companion = null,
  autoTimer,
  manualTimer,
  manualUntil = 0,
  behavior = "watching";
const horizontalKeys = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  d: "right",
};
const actionKeys = {
  " ": jump,
  ArrowUp: jump,
  w: jump,
  ArrowDown: drop,
  s: drop,
};
const keyName = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
let floors = [],
  bounds,
  active = false,
  tamed = false,
  drag = null,
  frame = null;
let lastTime = 0,
  inputAt = 0,
  tapAt = -1000,
  stroked = 0,
  strokedAt = 0;

function measure() {
  floors = [...document.querySelectorAll("[data-land]")].flatMap((el, i) => {
    if (el.closest("details:not([open])") && !el.closest("summary")) return [];
    if (el.dataset.contour) {
      // A cut-out image is a solid body: one floor per column of its silhouette,
      // each solid down to the image's bottom edge.
      const box = el.getBoundingClientRect();
      if (!box.width) return [];
      const columns = JSON.parse(el.dataset.contour);
      const width = box.width / columns.length;
      return columns.map((top, j) => ({
        id: `land-${i}-${j}`,
        element: el,
        interest: 0,
        left: box.left + scrollX + j * width,
        right: box.left + scrollX + (j + 1) * width,
        y: box.top + scrollY + top * box.height,
        solid: box.bottom + scrollY,
      }));
    }
    const font = parseFloat(getComputedStyle(el).fontSize);
    return [...el.getClientRects()]
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r, j) => ({
        id: `land-${i}-${j}`,
        element: el,
        seat: el.hasAttribute("data-seat"),
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
  const airborne = !drag && actor.ground === null;
  resident.classList.toggle("rising", airborne && actor.vy < -80);
  resident.classList.toggle("falling", airborne && actor.vy > 80);
  const seated =
    !drag &&
    Math.abs(actor.vx) < 10 &&
    !!floors.find((floor) => floor.id === actor.ground)?.seat;
  resident.classList.toggle("sitting", seated);
  sit(seated);
  if (Math.abs(actor.vx) > 10)
    resident.style.setProperty("--facing", actor.vx > 0 ? 1 : -1);
  look(actor.x + SIZE.width / 2 - scrollX, actor.y + 12 - scrollY);
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
function select(value, resume = false) {
  active = value;
  keys.clear();
  if (value) manualActivity();
  if (resume) {
    manualUntil = 0;
    clearTimeout(manualTimer);
    companion?.reset();
  }
  resident.setAttribute("aria-pressed", String(active));
  wake();
}
function tick(now) {
  frame = null;
  if (drag || document.hidden) return;
  const dt = lastTime ? Math.min(1 / 30, (now - lastTime) / 1000) : 1 / 60;
  lastTime = now;
  const autonomous =
    !active && now >= manualUntil && !reducedMotion.matches && companion;
  const command = autonomous
    ? companion.decide(actor, floors, viewport(), now, tamed)
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
  const fall = actor.ground === null ? actor.vy : null;
  step(actor, floors, bounds, dt, direction);
  const touchedDown = fall !== null && actor.ground !== null;
  if (touchedDown) {
    actor.thrown = false;
    land(fall);
  }
  const landed = autonomous && touchedDown;
  render();
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
  ) {
    stir();
    frame = requestAnimationFrame(tick);
    return;
  }
  settle();
  if (command.wakeAt) {
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
  resident.dataset.pointer = "";
  select(false);
  manualActivity();
  stir();
  actor.thrown = false;
  drag = {
    startX: e.pageX,
    startY: e.pageY,
    offsetX: e.pageX - actor.x,
    offsetY: e.pageY - actor.y,
    moved: false,
    // The last few places the pointer was, and how far it has gone in all.
    trail: [{ t: e.timeStamp, x: e.pageX, y: e.pageY }],
    travel: 0,
    still: 0,
  };
  resident.setPointerCapture(e.pointerId);
});
// Stroking it back and forth with the mouse, no button held, makes it happy.
// Each move counts for little, so a pointer just passing over is not a stroke.
function pet(e) {
  if (e.pointerType !== "mouse" || e.buttons) return;
  if (e.timeStamp - strokedAt > 400) stroked = 0;
  strokedAt = e.timeStamp;
  stroked += Math.min(12, Math.hypot(e.movementX, e.movementY));
  if (stroked < 70) return;
  stroked = 0;
  stir();
  feel("happy", 1500);
  heart();
  manualActivity();
  wake();
}
resident.addEventListener("pointermove", (e) => {
  if (!drag) return pet(e);
  if (Math.hypot(e.pageX - drag.startX, e.pageY - drag.startY) > 4)
    drag.moved = tamed = true;
  if (!drag.moved) return;
  manualActivity();
  // Held by the head, the body swings behind the pointer and settles when it stops.
  const last = drag.trail.at(-1);
  const elapsed = Math.max(1, e.timeStamp - last.t);
  drag.travel += Math.hypot(e.pageX - last.x, e.pageY - last.y);
  drag.trail.push({ t: e.timeStamp, x: e.pageX, y: e.pageY });
  if (drag.trail.length > 8) drag.trail.shift();
  resident.style.setProperty(
    "--swing",
    clamp(((e.pageX - last.x) / elapsed) * -26, -34, 34).toFixed(1),
  );
  clearTimeout(drag.still);
  drag.still = setTimeout(() => resident.style.setProperty("--swing", 0), 70);
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
});
// Called with the time of the pointerup, or with nothing when the drag is cancelled.
function release(at) {
  if (!drag) return;
  const { moved, trail, travel, still } = drag;
  drag = null;
  clearTimeout(still);
  resident.style.removeProperty("--swing");
  if (moved || at === undefined) {
    actor.vy = 0;
    // Let go while the pointer is still moving and it is thrown that way.
    const from = trail.find((point) => at - point.t < 110),
      to = trail.at(-1);
    if (moved && from && to.t > from.t && at - to.t < 60) {
      // It takes a fraction of the pointer's speed, which is far beyond its
      // own, and a slow hand just sets it down.
      const gain = (THROW.gain * 1000) / (to.t - from.t);
      const vx = (to.x - from.x) * gain,
        vy = (to.y - from.y) * gain;
      if (Math.hypot(vx, vy) > THROW.min) {
        actor.vx = clamp(vx, -THROW.across, THROW.across);
        actor.vy = clamp(vy, -THROW.up, THROW.down);
        actor.thrown = true;
      }
    }
    // Shaken about for long enough, it comes out dizzy.
    if (travel > 2400) feel("dizzy", 2800);
    select(false);
  } else {
    // A second tap right after the first is a somersault.
    const flip = at - tapAt < 350 && jump(actor);
    tapAt = flip ? -1000 : at;
    if (flip) spin();
    else pop();
    select(true);
    resident.focus({ preventScroll: true });
  }
  render();
  wake();
}
resident.addEventListener("pointerup", (e) => release(e.timeStamp));
// A fast pull leaves whatever was under the resident, a link say, where the
// press began. The browser would start dragging that, cancelling this drag.
document.addEventListener("dragstart", (e) => drag && e.preventDefault());
resident.addEventListener("blur", () => delete resident.dataset.pointer);
resident.addEventListener("pointercancel", () => release());
resident.addEventListener("click", (e) => {
  if (e.detail === 0) select(!active);
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    select(false, true);
    return;
  }
  const direction = horizontalKeys[keyName(e)];
  const action = actionKeys[keyName(e)];
  if (
    (!direction && !action) ||
    resident.hidden ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.target.isContentEditable ||
    (e.target !== resident &&
      e.target.closest("a,button,input,textarea,select,summary"))
  )
    return;
  e.preventDefault();
  if (!active) select(true);
  if (direction) keys.add(direction);
  else if (!e.repeat) action(actor);
  inputAt = performance.now();
  manualActivity();
  wake();
});
window.addEventListener("keyup", (e) => {
  const direction = horizontalKeys[keyName(e)];
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
document.addEventListener("click", (e) => {
  if (e.target.closest("a,summary")) select(false, true);
});
let screenY = 0;
document.addEventListener("page:leave", () => {
  screenY = actor.y - scrollY;
});
// The resident keeps its place on screen and falls onto the new page.
document.addEventListener("page:enter", () => {
  drag = null;
  actor.y = scrollY + Math.max(40, Math.min(innerHeight - 120, screenY));
  actor.vy = 0;
  actor.ground = null;
  if (companion) companion.goal = null;
  measure();
});
window.addEventListener(
  "scroll",
  () => {
    companion?.scrolled(performance.now());
    wake();
  },
  { passive: true },
);
window.addEventListener("resize", measure);
document.addEventListener("toggle", measure, true);
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
