// Small drawing and timing helpers shared by the project scenes.
export const TAU = Math.PI * 2;
export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
// How far t is through [a, b], from 0 to 1.
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const out = (t) => 1 - (1 - t) ** 3;
export const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const back = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
export const smooth = (t) => t * t * (3 - 2 * t);

// A seeded generator, so a scene looks the same on every hover.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function rgba(hex, alpha = 1) {
  const [r, g, b] = channels(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
export function mix(from, to, t) {
  const a = channels(from);
  const b = channels(to);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
}

export function rr(ctx, x, y, w, h, r = 0) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
export function box(ctx, x, y, w, h, r, fill, stroke, width = 1) {
  rr(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
export function disc(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}
export function line(ctx, x1, y1, x2, y2, stroke, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}
export function glow(ctx, x, y, r, hex, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, alpha));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
export function sky(ctx, W, H, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
export function text(ctx, str, x, y, font, fill, align = "left") {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
  ctx.textAlign = "left";
}
export function width(ctx, str, font) {
  ctx.font = font;
  return ctx.measureText(str).width;
}

const KEYWORDS =
  "local|function|end|return|if|then|else|endif|await|async|const|let|new|or|and|not|true|false|nil|for|in|do";
const TOKEN = new RegExp(
  [
    "(--.*$)", // comment
    "('(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\"|`[^`]*`)", // string
    "\\b(\\d+(?:\\.\\d+)?)\\b", // number
    `\\b(${KEYWORDS})\\b`, // keyword
    "([A-Za-z_]\\w*)(?=\\()", // call
    "(\\{[{%]-?|-?[%}]\\})", // Liquid delimiter
    "(\\s+|\\w+|[^\\s\\w])", // anything else
  ].join("|"),
  "gm",
);
const KINDS = ["c", "s", "n", "k", "f", "d", "p"];
// Splits a line of code into [text, kind] parts for `code`.
export function hl(source) {
  const parts = [];
  for (const match of source.matchAll(TOKEN)) {
    const kind = KINDS[match.slice(1).findIndex((group) => group !== undefined)];
    const last = parts.at(-1);
    if (last && last[1] === kind) last[0] += match[0];
    else parts.push([match[0], kind]);
  }
  return parts;
}
// Draws highlighted parts with the current font, up to `shown` characters.
// Returns the x where the text ended.
export function code(ctx, parts, x, y, colors, shown = Infinity) {
  for (const [str, kind] of parts) {
    if (shown <= 0) break;
    const piece = shown < str.length ? str.slice(0, Math.max(0, Math.floor(shown))) : str;
    ctx.fillStyle = colors[kind] ?? colors.p;
    ctx.fillText(piece, x, y);
    x += ctx.measureText(piece).width;
    shown -= str.length;
  }
  return x;
}
export const length = (parts) => parts.reduce((n, [str]) => n + str.length, 0);

// Lays words out left to right with the current font, breaking at `max`.
// Returns each word's place and the number of lines.
export function wrap(ctx, words, max) {
  const space = ctx.measureText(" ").width;
  const placed = [];
  let x = 0;
  let row = 0;
  for (const word of words) {
    const w = ctx.measureText(word).width;
    if (x && x + w > max) {
      x = 0;
      row++;
    }
    placed.push({ word, x, row, w });
    x += w + space;
  }
  return { placed, rows: row + 1 };
}
