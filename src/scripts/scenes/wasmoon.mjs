// Wasmoon: a moon in a night sky. JavaScript values circle it and come out the
// other side as Lua values, while a console runs real Wasmoon calls against
// it. The moon is lit from wherever the pointer is, and its night side shows
// the bytes every WebAssembly module starts with.
import {
  TAU,
  clamp,
  lerp,
  span,
  out,
  back,
  smooth,
  rng,
  rgba,
  mix,
  box,
  disc,
  glow,
  sky,
  text,
  hl,
  code,
  length,
} from "./kit.mjs";

export const ink = "#f1efff";

const SYNTAX = { p: "#dcdaf7", k: "#ff9dbd", s: "#b9e4a6", n: "#ffc78a", f: "#9fd2ff", c: "#8d8fc4" };
const SNIPPETS = [
  ["lua.global.set('sum', (x, y) => x + y)", "await lua.doString('print(sum(10, 10))')", "20"],
  ["lua.global.set('user', { name: 'ceifa' })", "await lua.doString('return user.name')", "'ceifa'"],
  ["lua.global.set('sleep', ms => wait(ms))", "await lua.doString('sleep(1000):await()')", "resolved after 1s"],
].map(([a, b, result]) => ({ a: hl(a), b: hl(b), result }));
const VALUES = ["function", "{ table }", "'string'", "42", "Promise"];
const MAGIC = "00 61 73 6d 01 00 00 00 ";
const PERIOD = 7;
const SPEED = 42; // characters typed per second

export default function wasmoon({ W, H, fonts }) {
  const rand = rng(11);
  const stars = Array.from({ length: 150 }, () => ({
    x: rand() * 1.1 - 0.05,
    y: rand(),
    z: 0.25 + rand() * 0.75,
    r: 0.35 + rand() * 0.9,
    phase: rand() * TAU,
    speed: 0.7 + rand() * 2.2,
  }));
  const craters = [];
  while (craters.length < 17) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * 0.88;
    const c = { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.045 + rand() ** 2 * 0.17 };
    if (craters.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > o.r + c.r + 0.03)) craters.push(c);
  }
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const light = { x: -0.86, y: -0.5 };
  const R = 58;
  const RX = 116;
  const RY = 31;
  const TILT = -0.3;

  function moon(ctx, cx, cy, pulse) {
    glow(ctx, cx, cy, R * 2.5, "#b4aeff", 0.2 + pulse * 0.25);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = "#15173f";
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.font = mono(7.5, 600);
    ctx.fillStyle = rgba("#8f9bff", 0.42 + pulse * 0.4);
    for (let row = 0; row < 12; row++)
      ctx.fillText(MAGIC.repeat(4), cx - R - ((row * 23) % 36), cy - R + 9 + row * 10.5);
    // The day side: a soft terminator facing away from the light.
    const day = ctx.createRadialGradient(
      cx + light.x * R * 0.7,
      cy + light.y * R * 0.7,
      R * 0.05,
      cx + light.x * R * 0.25,
      cy + light.y * R * 0.25,
      R * 1.22,
    );
    day.addColorStop(0, "#fffdf3");
    day.addColorStop(0.42, "#ebe5d3");
    day.addColorStop(0.68, rgba("#b9b3cd", 0.8));
    day.addColorStop(0.86, rgba("#5a5796", 0.22));
    day.addColorStop(1, rgba("#2a2b66", 0));
    ctx.fillStyle = day;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    const toLight = Math.atan2(light.y, light.x);
    for (const c of craters) {
      const d = Math.hypot(c.x, c.y);
      const lit = clamp((c.x * light.x + c.y * light.y) * 0.85 + 0.5);
      const turn = Math.atan2(c.y, c.x);
      ctx.save();
      ctx.translate(cx + c.x * R, cy + c.y * R);
      ctx.rotate(turn);
      ctx.scale(Math.sqrt(1 - d * d), 1); // Foreshortened towards the limb.
      disc(ctx, 0, 0, c.r * R, rgba("#58557f", 0.1 + lit * 0.26));
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, c.r * R, toLight - turn - 1.2, toLight - turn + 1.2);
      ctx.strokeStyle = rgba("#2c2a55", 0.12 + lit * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, c.r * R, toLight - turn + Math.PI - 1.2, toLight - turn + Math.PI + 1.2);
      ctx.strokeStyle = rgba("#ffffff", lit * 0.6);
      ctx.stroke();
      ctx.restore();
    }
    const limb = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    limb.addColorStop(0, rgba("#0b0f2e", 0));
    limb.addColorStop(1, rgba("#0b0f2e", 0.42));
    ctx.fillStyle = limb;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
  }

  const orbit = (cx, cy, a) => [
    cx + Math.cos(a) * RX * Math.cos(TILT) - Math.sin(a) * RY * Math.sin(TILT),
    cy + Math.cos(a) * RX * Math.sin(TILT) + Math.sin(a) * RY * Math.cos(TILT),
  ];
  function ring(ctx, cx, cy, from, to) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const [x, y] = orbit(cx, cy, lerp(from, to, i / 40));
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = rgba("#c9c6ff", 0.38);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // A value on the orbit: JavaScript yellow on the left of the moon, Lua blue
  // on the right, smaller and dimmer while it passes behind.
  function value(ctx, cx, cy, i, t, front, intro) {
    const a = t * 0.42 + (i * TAU) / VALUES.length;
    const depth = Math.sin(a);
    if (depth > 0 !== front) return;
    const [x, y] = orbit(cx, cy, a);
    const lua = smooth(clamp(Math.cos(a) * 1.6 * 0.5 + 0.5));
    const size = (0.84 + 0.16 * depth) * intro;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.globalAlpha = (0.5 + 0.5 * smooth((depth + 1) / 2)) * intro;
    ctx.font = mono(9, 600);
    const w = ctx.measureText(VALUES[i]).width + 15;
    ctx.shadowColor = mix("#f4e06a", "#8d92ff", lua);
    ctx.shadowBlur = 9;
    box(ctx, -w / 2, -8.5, w, 17, 8.5, mix("#f4e06a", "#969bff", lua));
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.fillStyle = mix("#2c2600", "#0f1040", lua);
    ctx.fillText(VALUES[i], 0, 3.2);
    ctx.restore();
  }

  return (ctx, t, dt, p) => {
    const cx = W - 148 + p.nx * 5;
    const cy = H / 2 + 9 + (1 - out(span(t, 0, 1.1))) * 46 + p.ny * 3;
    const u = t % PERIOD;
    const snippet = SNIPPETS[Math.floor(t / PERIOD) % SNIPPETS.length];
    const typedA = 0.5;
    const typedB = typedA + length(snippet.a) / SPEED + 0.3;
    const sent = typedB + length(snippet.b) / SPEED + 0.15;
    const arrives = sent + 0.4;
    const answered = arrives + 0.75;
    const pulse = 1 - span(u, arrives, arrives + 0.9);
    const hit = u > arrives ? pulse : 0;

    // The light follows the pointer; left alone it drifts back to the left.
    let lx = -0.86;
    let ly = -0.5;
    if (p.inside) {
      const d = Math.hypot(p.x - cx, p.y - cy) || 1;
      lx = (p.x - cx) / d;
      ly = (p.y - cy) / d;
    }
    const turn = 1 - Math.exp(-dt * 6);
    light.x += (lx - light.x) * turn;
    light.y += (ly - light.y) * turn;
    const n = Math.hypot(light.x, light.y) || 1;
    light.x /= n;
    light.y /= n;

    sky(ctx, W, H, ["#090d26", "#131842", "#29245f"]);
    glow(ctx, W * 0.74, H * 0.2, 250, "#5c3fae", 0.32);
    glow(ctx, W * 0.12, H * 1.05, 230, "#1c6a88", 0.3);
    for (const s of stars) {
      const x = s.x * W - p.nx * 20 * s.z;
      const y = s.y * H - p.ny * 8 * s.z;
      const a = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))) * s.z;
      disc(ctx, x, y, s.r, rgba("#ffffff", a));
      if (s.r > 1.05) {
        ctx.fillStyle = rgba("#ffffff", a * 0.5);
        ctx.fillRect(x - 3.5, y - 0.3, 7, 0.6);
        ctx.fillRect(x - 0.3, y - 3.5, 0.6, 7);
      }
    }
    const fall = ((t + 2.2) % 5.4) / 0.8;
    if (fall < 1) {
      const x = W * 0.3 + fall * 190;
      const y = 12 + fall * 62;
      const trail = ctx.createLinearGradient(x - 62, y - 20, x, y);
      trail.addColorStop(0, rgba("#ffffff", 0));
      trail.addColorStop(1, rgba("#ffffff", 0.9 * Math.sin(fall * Math.PI)));
      ctx.strokeStyle = trail;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - 62, y - 20);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ring(ctx, cx, cy, Math.PI, TAU);
    VALUES.forEach((_, i) => value(ctx, cx, cy, i, t, false, back(span(t, 0.5 + i * 0.1, 1.1 + i * 0.1))));
    moon(ctx, cx, cy, hit);
    if (hit) {
      ctx.beginPath();
      ctx.arc(cx, cy, R + (1 - pulse) * 34, 0, TAU);
      ctx.strokeStyle = rgba("#d6d2ff", pulse * 0.7);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ring(ctx, cx, cy, 0, Math.PI);
    VALUES.forEach((_, i) => value(ctx, cx, cy, i, t, true, back(span(t, 0.5 + i * 0.1, 1.1 + i * 0.1))));

    // The console.
    const px = 36 - (1 - out(span(t, 0.15, 0.9))) * 22;
    const py = H - 121;
    const fade = span(t, 0.15, 0.7);
    ctx.globalAlpha = fade;
    box(ctx, px, py, 252, 98, 9, rgba("#0a0e2c", 0.62), rgba("#b4b8ff", 0.24));
    box(ctx, px + 11, py + 9, 8, 8, 2, "#f4e06a");
    text(ctx, "main.js", px + 25, py + 16.5, mono(8.5), rgba("#c9c9f5", 0.75));
    text(ctx, "Lua 5.4", px + 241, py + 16.5, mono(8.5), rgba("#c9c9f5", 0.55), "right");
    ctx.fillStyle = rgba("#b4b8ff", 0.16);
    ctx.fillRect(px + 1, py + 25, 250, 1);
    const gone = 1 - span(u, PERIOD - 0.5, PERIOD - 0.1);
    ctx.globalAlpha = fade * gone;
    ctx.font = mono(9.5);
    const a = code(ctx, snippet.a, px + 12, py + 44, SYNTAX, (u - typedA) * SPEED);
    const b = code(ctx, snippet.b, px + 12, py + 61, SYNTAX, (u - typedB) * SPEED);
    if (u < sent && u % 0.9 < 0.55) {
      ctx.fillStyle = "#dcdaf7";
      ctx.fillRect(u < typedB ? a + 1 : b + 1, py + (u < typedB ? 35 : 52), 1.2, 11);
    }
    if (u > answered) {
      const pop = back(span(u, answered, answered + 0.3));
      text(ctx, "→", px + 12, py + 81, mono(9.5), rgba("#c9c9f5", 0.6));
      ctx.save();
      ctx.translate(px + 26, py + 81);
      ctx.scale(pop, pop);
      text(ctx, snippet.result, 0, 0, mono(9.5, 600), "#b9e4a6");
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // The call crosses over to the moon, and the answer comes back.
    for (const [from, to, there] of [
      [sent, arrives, true],
      [arrives + 0.35, answered, false],
    ]) {
      const k = span(u, from, to);
      if (k <= 0 || k >= 1) continue;
      const e = there ? smooth(k) : 1 - smooth(k);
      const x0 = px + 252;
      const y0 = py + (there ? 57 : 77);
      const x = lerp(x0, cx - R * 0.8, e);
      const y = lerp(y0, cy, e) - Math.sin(e * Math.PI) * 22;
      glow(ctx, x, y, 13, there ? "#f4e06a" : "#b9e4a6", 0.85);
      disc(ctx, x, y, 2.4, "#ffffff");
    }
  };
}
