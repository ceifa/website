// The text gives way, a piece at a time. Three jumps in a row on the same line
// shake that line's element loose: its words, and its icons and furniture,
// fall onto whatever lies beneath
// and heap up there, and the resident can stand on the heap. The element
// comes back when its fallen words or the place it left are clicked, or when
// the page is scrolled after the heap has lain a while. On the underside of
// the page everything falls the other way.
import { SIZE } from "./walker.mjs";
import { world } from "./inhabit.mjs";

const COLUMN = 6; // width of one column of a heap's height map
const GRAVITY = 1900;
const PACKING = 0.5; // how much of its height a word adds to the heap
const REACH = 5; // columns to either side a word looks at to judge the slope
const STEEP = 26; // a drop, over that distance, a word will not rest on
const CLIFF = 140; // a drop too deep to be a heap's side: words stay on top
const SUPPORT = 40; // how far below the highest ground still holds a word up
const PATIENCE = 60000; // how long a heap lies before scrolling may clear it
const root = document.documentElement;
const site = document.querySelector(".site");
const calm = matchMedia("(prefers-reduced-motion: reduce)");
const copied = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontStretch",
  "fontVariationSettings",
  "fontFeatureSettings",
  "letterSpacing",
  "textTransform",
  "color",
];
// What falls whole, beside the words: icons, and anything marked as a piece
// (the armchair, the radio).
const PIECE = "svg, [data-piece]";
// How an icon is drawn, copied onto each of its shapes: its own rules hang
// on classes of the page around it, which the copy leaves behind.
const drawn = [
  "fill",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "opacity",
  "transform",
  "transformOrigin",
];
const heaps = new Map(); // fallen element → its heap
let streak = { ground: null, count: 0, at: 0 },
  jumped = false,
  serial = 0;

const visible = (el) =>
  !el.checkVisibility || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });

// Every word and piece of an element that can be seen, with where it is on
// the page and how it is set.
function gather(element) {
  const words = [];
  const styles = new Map();
  const pieces = [
    ...(element.matches(PIECE) ? [element] : []),
    ...element.querySelectorAll(PIECE),
  ].filter((piece) => !piece.parentElement.closest(PIECE) && visible(piece));
  for (const piece of pieces) {
    const box = piece.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    words.push({
      piece,
      parent: piece,
      style: getComputedStyle(piece),
      left: box.left + scrollX,
      top: box.top + scrollY,
      width: box.width,
      height: box.height,
    });
  }
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode()) && words.length < 900; ) {
    const parent = node.parentElement;
    if (!node.nodeValue.trim() || parent.closest("script,style,noscript")) continue;
    // The notes of the radio go with the radio.
    if (parent.closest(PIECE)) continue;
    if (!visible(parent)) continue;
    for (const match of node.nodeValue.matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const box = range.getBoundingClientRect();
      if (box.width < 1) continue;
      if (!styles.has(parent)) styles.set(parent, getComputedStyle(parent));
      words.push({
        text: match[0],
        parent,
        style: styles.get(parent),
        left: box.left + scrollX,
        top: box.top + scrollY,
        width: box.width,
        height: box.height,
      });
    }
  }
  return words;
}

// A copy of a piece to fall in its place: inert, with nothing the page would
// find again (an id, a floor), and an icon drawn as it was.
function copy(piece) {
  const clone = piece.cloneNode(true);
  for (const el of [clone, ...clone.querySelectorAll("*")])
    for (const name of ["id", "data-land", "data-seat", "data-piece", "hidden"])
      el.removeAttribute(name);
  if (piece instanceof SVGElement) {
    const color = getComputedStyle(piece).color;
    const originals = [piece, ...piece.querySelectorAll("*")];
    [clone, ...clone.querySelectorAll("*")].forEach((el, i) => {
      const style = getComputedStyle(originals[i]);
      for (const name of drawn)
        el.style[name] = style[name] === color ? "currentColor" : style[name];
    });
    Object.assign(clone.style, { display: "block", width: "100%", height: "100%" });
  }
  clone.inert = true;
  return clone;
}

// What each column of the page offers to land on beneath an element whose
// lowest edge is at `lowest`: the nearest floor, or the edge of the page.
function beneath(element, lowest, up) {
  const fallen = (y) => (up ? -y : y);
  const columns = Math.ceil(world.bounds.width / COLUMN) + 1;
  const base = new Float32Array(columns).fill(fallen(world.level(world.bounds.bottom)));
  for (const floor of world.floors) {
    if (!floor.element || element.contains(floor.element)) continue;
    const y = fallen(world.level(floor.y));
    if (y < lowest - 2) continue;
    const last = Math.min(columns - 1, Math.floor(floor.right / COLUMN));
    for (let i = Math.max(0, Math.floor(floor.left / COLUMN)); i <= last; i++)
      base[i] = Math.min(base[i], y);
  }
  return base;
}

// A heap whose ground gave way under it, the words of another element that
// fell, say, falls again from where it lies, onto whatever is left beneath.
function slump(heap) {
  if (heap.up !== world.flipped || heap.leaving) return;
  const base = beneath(heap.element, heap.lowest, heap.up);
  const first = Math.floor(heap.left / COLUMN),
    last = Math.min(base.length - 1, Math.ceil(heap.right / COLUMN));
  let sunk = false;
  for (let i = first; i <= last; i++) if (base[i] > heap.base[i] + 1) sunk = true;
  if (!sunk) return;
  heap.base = base;
  heap.ground = base.slice();
  heap.since = performance.now();
  heap.last = 0;
  for (const word of heap.words) {
    word.settled = false;
    word.wait = Math.random() * 0.15;
    word.slides = word.tips = 0;
    word.vx = (Math.random() - 0.5) * 120;
    word.vy = 0;
    word.el.style.transition = "";
  }
  cancelAnimationFrame(heap.frame);
  heap.frame = requestAnimationFrame((now) => fall(heap, now));
}

function collapse(element) {
  // Part of a piece brings the whole piece down: the armchair's seat, say.
  element = element.parentElement?.closest("[data-piece]") ?? element;
  if (heaps.has(element) || calm.matches) return;
  const found = gather(element);
  if (!found.length) return;
  // Words fall in their own space, where down is always towards larger y:
  // the page as it is, or mirrored on the underside. `fallen` goes both ways.
  const up = world.flipped;
  const fallen = (y) => (up ? -y : y);
  const box = element.getBoundingClientRect();
  const place = {
    left: box.left + scrollX,
    top: box.top + scrollY,
    width: box.width,
    height: box.height,
  };
  const lowest = Math.max(fallen(place.top), fallen(place.top + place.height));
  const base = beneath(element, lowest, up);
  const origin = {
    x: world.actor.x + SIZE.width / 2,
    y: fallen(world.top() + (up ? 0 : SIZE.height)),
  };
  // A copy of each word, laid over the page where the word was, and a
  // clickable ghost of the place they all left.
  const overlay = document.createElement("div");
  overlay.className = "rubble";
  overlay.setAttribute("aria-hidden", "true");
  const ghost = document.createElement("div");
  ghost.className = "rubble-place";
  for (const side in place) ghost.style[side] = `${place[side]}px`;
  overlay.append(ghost);
  const words = found.map(({ text, piece, parent, style, left, top, width, height }) => {
    const el = document.createElement("span");
    if (piece) {
      el.append(copy(piece));
      el.style.color = style.color;
      el.style.width = `${width}px`;
    } else {
      el.textContent = text;
      for (const name of copied) el.style[name] = style[name];
      el.style.lineHeight = `${height}px`;
    }
    Object.assign(el.style, {
      left: `${left}px`,
      top: `${top}px`,
      height: `${height}px`,
    });
    overlay.append(el);
    const start = Math.min(fallen(top), fallen(top + height));
    return {
      el,
      parent,
      left,
      top: start,
      width,
      height,
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 220,
      vy: -Math.random() * 140,
      turn: 0,
      spin: (Math.random() - 0.5) * 5,
      slides: 0,
      tips: 0,
      // The collapse spreads out from where the resident landed.
      wait:
        Math.hypot(left + width / 2 - origin.x, start - origin.y) * 0.0011 +
        Math.random() * 0.12,
      settled: false,
    };
  });
  const heap = {
    id: serial++,
    element,
    overlay,
    words,
    up,
    lowest,
    place,
    base,
    ground: base.slice(), // the heap's surface, column by column
    // Words stay over the place they fell from, give or take.
    left: Math.max(0, place.left - 24),
    right: Math.min(world.bounds.width, place.left + place.width + 24),
    since: performance.now(),
    last: 0,
    frame: null,
    leaving: 0, // the timer that finishes putting the element back
  };
  overlay.addEventListener("click", () => restore(heap));
  document.body.append(overlay);
  element.style.visibility = "hidden";
  heaps.set(element, heap);
  world.terrain = terrain;
  world.measure();
  for (const other of heaps.values()) if (other !== heap) slump(other);
  heap.frame = requestAnimationFrame((now) => fall(heap, now));
}

// The ground without the fallen elements, and with the heaps on this side of
// the page: one solid floor per pair of columns, the slope eased so the
// resident can walk over it.
function terrain(floors) {
  const fallenAway = [...heaps.keys()];
  const ground = floors.filter(
    (floor) => !floor.element || !fallenAway.some((el) => el.contains(floor.element)),
  );
  const span = COLUMN * 2;
  for (const heap of heaps.values()) {
    if (heap.up !== world.flipped || heap.leaving) continue;
    const page = (y) => world.level(heap.up ? -y : y);
    // Each pair of columns: how high the heap stands, and on what.
    const tops = [],
      feet = [];
    for (let i = 0; i < heap.base.length; i += 2) {
      const j = Math.min(i + 1, heap.base.length - 1);
      tops.push(Math.max(heap.base[i] - heap.ground[i], heap.base[j] - heap.ground[j]));
      feet.push(Math.min(heap.base[i], heap.base[j]));
    }
    const eased = (i, from) =>
      Math.abs(feet[i] - feet[from]) < SUPPORT ? Math.max(tops[i], tops[from] - 8) : tops[i];
    for (let i = 1; i < tops.length; i++) tops[i] = eased(i, i - 1);
    for (let i = tops.length - 2; i >= 0; i--) tops[i] = eased(i, i + 1);
    tops.forEach((top, i) => {
      if (top < 3) return;
      ground.push({
        id: `rubble-${heap.id}-${i}`,
        rubble: true,
        left: i * span,
        right: (i + 1) * span,
        y: page(feet[i] - top),
        solid: page(feet[i]),
      });
    });
  }
  return ground;
}
// Rebuilds the ground, lifting the resident when a heap grew over its feet.
function settle() {
  world.measure();
  const { actor } = world;
  const feet = actor.y + SIZE.height;
  const over = world.floors.filter(
    (floor) =>
      floor.rubble &&
      floor.right > actor.x + 2 &&
      floor.left < actor.x + SIZE.width - 2 &&
      feet > floor.y + 1 &&
      actor.y < floor.solid,
  );
  if (!over.length) return;
  actor.y = Math.min(...over.map((floor) => floor.y)) - SIZE.height - 1;
  actor.vy = 0;
  actor.ground = null;
  world.wake();
}

function fall(heap, now) {
  const dt = Math.min(1 / 30, (now - (heap.last || now)) / 1000);
  const age = (now - heap.since) / 1000;
  heap.last = now;
  const { ground } = heap;
  const side = heap.up ? -1 : 1;
  let moving = 0,
    landed = false;
  for (const word of heap.words) {
    if (word.settled) continue;
    moving++;
    if (age < word.wait) {
      // Still hanging on: tremble.
      word.el.style.transform = `translate(${word.x + (Math.random() - 0.5) * 2}px, ${word.y * side + (Math.random() - 0.5) * 2}px) rotate(${word.turn * side}rad)`;
      continue;
    }
    word.vy += GRAVITY * dt;
    word.x += word.vx * dt;
    word.y += word.vy * dt;
    word.turn += word.spin * dt;
    const left = Math.max(heap.left, Math.min(heap.right - word.width, word.left + word.x));
    if (left !== word.left + word.x) {
      word.x = left - word.left;
      word.vx *= -0.4;
    }
    const first = Math.max(0, Math.floor(left / COLUMN)),
      last = Math.min(ground.length - 1, Math.floor((left + word.width) / COLUMN));
    // A word rests on what holds its middle up: the highest ground there and
    // whatever is nearly as high. It adds its volume to that, so words make
    // a heap and not a tower.
    const quarter = Math.floor((last - first) / 4);
    let high = Infinity;
    for (let i = first + quarter; i <= last - quarter; i++) high = Math.min(high, ground[i]);
    const holds = (i) => ground[i] - high < SUPPORT;
    let rest = 0,
      held = 0,
      from = Infinity,
      to = -Infinity;
    for (let i = first + quarter; i <= last - quarter; i++)
      if (holds(i)) {
        rest += ground[i];
        held++;
        from = Math.min(from, i);
        to = Math.max(to, i);
      }
    rest /= held;
    if (word.top + word.y + word.height >= rest) {
      const before = ground[Math.max(0, first - REACH)],
        after = ground[Math.min(ground.length - 1, last + REACH)];
      const drop = Math.max(before, after) - rest;
      // Caught by an edge, a card's over a gap say, with its middle beyond
      // it: it tips off that edge, not to balance there and grow a tower.
      const middle = (first + last) / 2;
      const away = middle < from - 0.5 ? -1 : middle > to + 0.5 ? 1 : 0;
      if (away && word.tips < 40) {
        word.vx = away * (80 + Math.random() * 60);
        word.vy = 0;
        word.y = rest - word.height - word.top;
        word.spin = away * 2.5;
        word.tips++;
      } else if (word.slides < 6 && drop > STEEP && drop < CLIFF) {
        // Too steep to stay: tumble down the lower side.
        word.vx = (before > after ? -1 : 1) * (120 + Math.random() * 140);
        word.vy = -120 - Math.random() * 90;
        word.y = rest - word.height - word.top;
        word.slides++;
      } else {
        word.settled = landed = true;
        word.y = rest - word.height * 0.85 - word.top;
        // Lie along the slope, where there is one.
        const slope = Math.abs(after - before) < CLIFF ? after - before : 0;
        word.turn =
          Math.atan2(slope, word.width + REACH * 2 * COLUMN) + (Math.random() - 0.5) * 0.35;
        word.el.style.transition = "transform .14s ease-out";
        for (let i = first; i <= last; i++) if (holds(i)) ground[i] -= word.height * PACKING;
        // Smooth the heap, but not the edges of what it lies on.
        for (let i = Math.max(1, first - 2); i <= Math.min(ground.length - 2, last + 2); i++)
          if (Math.abs(ground[i - 1] - ground[i + 1]) < SUPPORT)
            ground[i] = (ground[i - 1] + ground[i] * 2 + ground[i + 1]) / 4;
      }
    }
    word.el.style.transform = `translate(${word.x}px, ${word.y * side}px) rotate(${word.turn * side}rad)`;
  }
  if (landed) settle();
  heap.frame = moving ? requestAnimationFrame((next) => fall(heap, next)) : null;
}

// Sends an element's words back to their places, or with `now` just clears
// the heap away.
function restore(heap, now = false) {
  if (heap.leaving && !now) return;
  cancelAnimationFrame(heap.frame);
  clearTimeout(heap.leaving);
  const finish = () => {
    heap.element.style.visibility = "";
    heap.overlay.remove();
    heaps.delete(heap.element);
    if (!heaps.size) world.terrain = null;
    world.measure();
  };
  if (now) return finish();
  let longest = 0;
  for (const word of heap.words) {
    const delay = Math.random() * 220;
    const duration = 520 + Math.random() * 260;
    longest = Math.max(longest, delay + duration);
    word.el.style.transition = `transform ${duration}ms cubic-bezier(.3, 1.25, .5, 1) ${delay}ms`;
    word.el.style.transform = "none";
  }
  heap.leaving = setTimeout(finish, longest + 40);
  // What fell into the place the element takes back goes back too, and
  // does not stay buried in it.
  const { left, top, width, height } = heap.place;
  for (const other of heaps.values()) {
    if (other.leaving) continue;
    const buried = other.words.some(({ el }) => {
      const box = el.getBoundingClientRect();
      return (
        box.right + scrollX > left + 3 &&
        box.left + scrollX < left + width - 3 &&
        box.bottom + scrollY > top + 3 &&
        box.top + scrollY < top + height - 3
      );
    });
    if (buried) restore(other);
  }
  // The heap stops being ground as soon as it starts to leave.
  world.measure();
}
const clear = () => heaps.forEach((heap) => restore(heap, true));

// The nearest box around an element that can be moved: inline text cannot.
function block(element) {
  let box = element;
  while (getComputedStyle(box).display === "inline" && box.parentElement) box = box.parentElement;
  return box;
}

world.on("jump", () => (jumped = true));
world.on("land", ({ ground, driven }) => {
  const now = performance.now();
  const element = world.floors.find((floor) => floor.id === ground)?.element;
  // Only the visitor's own jumps count, and only on something of the page.
  const counts = jumped && driven && element;
  jumped = false;
  if (!counts) {
    streak = { ground: null, count: 0, at: 0 };
    return;
  }
  const same = ground === streak.ground && now - streak.at < 1700;
  streak = { ground, count: same ? streak.count + 1 : 1, at: now };
  // The second landing rattles the element, as a warning.
  if (streak.count === 2 && !calm.matches)
    block(element).animate(
      { transform: ["none", "translateY(4px)", "translateY(-2px)", "none"] },
      { duration: 220 },
    );
  if (streak.count < 3) return;
  streak.count = 0;
  collapse(element);
});
addEventListener(
  "scroll",
  () => {
    const now = performance.now();
    for (const heap of heaps.values()) if (now - heap.since > PATIENCE) restore(heap);
  },
  { passive: true },
);
// The words are copies in fixed places: when the page is laid out again, or
// left, they no longer belong where they are.
addEventListener("resize", clear);
new ResizeObserver(clear).observe(site);
document.addEventListener("page:leave", clear);
// A fallen word keeps the colour it was copied with, so it follows the theme.
function recolour() {
  for (const heap of heaps.values())
    for (const word of heap.words) word.el.style.color = getComputedStyle(word.parent).color;
}
new MutationObserver(recolour).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recolour);
