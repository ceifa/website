// demoon: a Lua file runs on Node. The program steps through its lines: it
// requires a Node module, parks on a promise for one lap of the event loop,
// then serves requests. Moving the pointer sends requests of your own.
import { TAU, clamp, lerp, span, out, back, smooth, rng, rgba, box, disc, glow, sky, text, hl, code } from "./kit.mjs";

export const ink = "#ecfbe6";

const SYNTAX = { p: "#d8ead4", k: "#ff9dbd", s: "#f3d28a", n: "#ffc78a", f: "#8fd7ff", c: "#6f8f77" };
const SOURCE = [
  "local http = require('http')",
  "local port = os.getenv('PORT') or 8080",
  "sleep(1000):await()",
  "http.createServer(async(function(req, res)",
  "  res:write('Hello World!')",
  "end)):listen(port)",
].map(hl);
// When each line starts running. The await holds its line for a second.
const AT = [1.1, 1.8, 2.3, 3.5, 3.5, 3.7];
const UP = 4.0;

export default function demoon({ W, H, fonts }) {
  const rand = rng(17);
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const stars = Array.from({ length: 60 }, () => ({ x: rand() * W, y: rand() * H, r: 0.4 + rand() * 0.8, phase: rand() * TAU }));
  const requests = [];
  let auto = UP + 0.4;
  let last = null;
  let asked = 0;

  function hexagon(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) ctx.lineTo(x + Math.sin((i * TAU) / 6) * r, y - Math.cos((i * TAU) / 6) * r);
    ctx.closePath();
  }

  return (ctx, t, dt, p) => {
    const hx = W - 126 + p.nx * 5;
    const hy = H / 2 + 12 + p.ny * 3;
    const serving = t > UP;

    // Requests: a few on their own, and one wherever the pointer goes.
    if (serving && t > auto) {
      auto = t + 0.9 + rand() * 0.9;
      requests.push({ x: W + 8, y: 60 + rand() * (H - 110), born: t });
    }
    if (serving && p.inside && (!last || Math.hypot(p.x - last.x, p.y - last.y) > 34) && t - asked > 0.22) {
      if (last && Math.hypot(p.x - hx, p.y - hy) > 70) {
        requests.push({ x: p.x, y: p.y, born: t });
        asked = t;
      }
      last = { x: p.x, y: p.y };
    }

    sky(ctx, W, H, ["#08110d", "#0d1f17", "#12301f"]);
    glow(ctx, hx, hy, 190, "#3f8f3a", 0.3);
    for (const s of stars)
      disc(ctx, s.x - p.nx * 6, s.y, s.r, rgba("#dfffd6", 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.6 + s.phase))));

    // The event loop, and whatever is going around it.
    const intro = out(span(t, 0.1, 0.9));
    const RING = 68;
    ctx.save();
    ctx.globalAlpha = intro;
    ctx.beginPath();
    ctx.arc(hx, hy, RING, 0, TAU);
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = -t * 14;
    ctx.strokeStyle = rgba("#9be07a", 0.4);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    const tickAt = t * 3.4;
    for (let i = 0; i < 9; i++) {
      const a = tickAt - i * 0.09;
      disc(ctx, hx + Math.cos(a) * RING, hy + Math.sin(a) * RING, 2.2 - i * 0.2, rgba("#9be07a", 0.8 - i * 0.085));
    }
    // The promise from sleep(1000): one lap, one second.
    const lap = span(t, AT[2] + 0.1, AT[2] + 1.1);
    if (lap > 0 && t < AT[2] + 1.4) {
      const a = -Math.PI / 2 + lap * TAU;
      ctx.beginPath();
      ctx.arc(hx, hy, RING, -Math.PI / 2, a);
      ctx.strokeStyle = rgba("#ffd27a", 0.9 * (1 - span(t, AT[2] + 1.1, AT[2] + 1.4)));
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
      if (lap < 1) {
        const ox = hx + Math.cos(a) * RING;
        const oy = hy + Math.sin(a) * RING;
        glow(ctx, ox, oy, 18, "#ffd27a", 0.9);
        disc(ctx, ox, oy, 4.5, "#fff3d0");
        text(ctx, `${Math.round(lap * 1000)}ms`, hx, hy - RING - 9, mono(9, 600), "#ffd27a", "center");
      } else {
        const pop = span(t, AT[2] + 1.1, AT[2] + 1.4);
        ctx.beginPath();
        ctx.arc(hx, hy - RING, 4 + pop * 16, 0, TAU);
        ctx.strokeStyle = rgba("#ffd27a", 1 - pop);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Node's hexagon with the moon in it.
    const lit = serving ? 0.5 + 0.5 * out(span(t, UP, UP + 0.5)) : 0.5;
    const R = 47;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(back(span(t, 0.15, 0.75)), back(span(t, 0.15, 0.75)));
    hexagon(ctx, 0, 0, R);
    ctx.fillStyle = rgba("#16351f", 0.9);
    ctx.fill();
    ctx.strokeStyle = rgba("#8fd16a", lit);
    ctx.lineWidth = 3.2;
    ctx.lineJoin = "round";
    ctx.shadowColor = "#8fd16a";
    ctx.shadowBlur = serving ? 18 : 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
    glow(ctx, 0, -3, 44, "#fff4c9", 0.35);
    disc(ctx, 0, -3, 21, "#fbf1cf");
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -3, 21, 0, TAU);
    ctx.clip();
    disc(ctx, 13, -11, 21, rgba("#16351f", 0.82));
    for (const [cx, cy, r] of [
      [-9, -9, 4],
      [-4, 6, 5.5],
      [-13, 2, 2.5],
      [-1, -15, 2.2],
    ])
      disc(ctx, cx, cy - 3, r, rgba("#b7a877", 0.55));
    ctx.restore();
    text(ctx, serving ? ":8080" : "node", 0, 33, mono(8.5, 700), rgba("#8fd16a", lit), "center");
    ctx.restore();
    ctx.restore();

    // require('http'): a module drops in from node_modules.
    const fetched = span(t, AT[0] + 0.05, AT[0] + 0.55);
    if (fetched > 0 && fetched < 1) {
      const k = smooth(fetched);
      const x = lerp(W - 46, hx, k);
      const y = lerp(22, hy - 4, k) - Math.sin(k * Math.PI) * 14;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(k * 3);
      ctx.scale(1 - k * 0.5, 1 - k * 0.5);
      box(ctx, -12, -9, 24, 18, 3, "#d9534f");
      text(ctx, "http", 0, 3, mono(8, 700), "#ffffff", "center");
      ctx.restore();
    }

    for (let i = requests.length - 1; i >= 0; i--) {
      const r = requests[i];
      const age = t - r.born;
      if (age > 1.5) {
        requests.splice(i, 1);
        continue;
      }
      const there = smooth(span(age, 0, 0.45));
      const home = smooth(span(age, 0.55, 1.2));
      if (age < 0.5) {
        const x = lerp(r.x, hx, there);
        const y = lerp(r.y, hy, there);
        glow(ctx, x, y, 9, "#8fd7ff", 0.9);
        disc(ctx, x, y, 2.4, "#eaf8ff");
      } else {
        const x = lerp(hx, r.x, home);
        const y = lerp(hy, r.y, home) - Math.sin(home * Math.PI) * 12;
        ctx.globalAlpha = clamp(Math.min(1, (age - 0.5) * 6) * (1 - span(age, 1.2, 1.5)));
        ctx.font = mono(8.5, 600);
        const w = ctx.measureText("Hello World!").width + 12;
        box(ctx, clamp(x - w / 2, 4, W - w - 4), y - 9, w, 16, 8, "#eafbe6");
        text(ctx, "Hello World!", clamp(x, 4 + w / 2, W - w / 2 - 4), y + 2.5, mono(8.5, 600), "#12301f", "center");
        ctx.globalAlpha = 1;
      }
    }

    // The file, and where the program is in it.
    const px = 30 - (1 - out(span(t, 0, 0.7))) * 24;
    const py = 64;
    const pw = 272;
    const ph = H - py - 15;
    ctx.globalAlpha = span(t, 0, 0.5);
    box(ctx, px, py, pw, ph, 8, rgba("#07100b", 0.72), rgba("#9be07a", 0.22));
    const typed = "$ demoon app.lua".slice(0, Math.floor(span(t, 0.3, 0.95) * 16));
    text(ctx, typed, px + 11, py + 15, mono(9, 600), "#9be07a");
    ctx.fillStyle = rgba("#9be07a", 0.16);
    ctx.fillRect(px + 1, py + 22, pw - 2, 1);
    const running = AT.findLastIndex((at) => t >= at);
    SOURCE.forEach((parts, i) => {
      const y = py + 37 + i * 12.8;
      const active = i === running && !serving;
      const ran = t >= AT[i];
      if (active || (serving && i >= 3)) {
        const hold = i === 2 ? 1 : serving ? 0.35 + 0.15 * Math.sin(t * 3) : 1;
        box(ctx, px + 4, y - 9.6, pw - 8, 12.8, 3, rgba(i === 2 ? "#ffd27a" : "#9be07a", 0.2 * hold));
        if (active) box(ctx, px + 4, y - 9.6, 2.2, 12.8, 1, i === 2 ? "#ffd27a" : "#9be07a");
      }
      text(ctx, String(i + 1), px + 19, y, mono(9), rgba("#d8ead4", 0.35), "right");
      ctx.font = mono(9);
      ctx.globalAlpha = span(t, 0, 0.5) * (ran ? 1 : 0.55);
      code(ctx, parts, px + 27, y, SYNTAX);
      ctx.globalAlpha = span(t, 0, 0.5);
    });
    if (serving) {
      ctx.globalAlpha = span(t, UP, UP + 0.3);
      text(ctx, "Your server is running on port 8080!", px + 11, py + ph - 9, mono(9), "#9be07a");
    }
    ctx.globalAlpha = 1;
  };
}
