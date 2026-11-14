// tiktoken-node: a blade runs across a line of text and cuts it into tokens,
// each dropping its id. Move the pointer and the blade follows it, so the text
// can be cut and joined again by hand.
import { TAU, clamp, lerp, span, out, inOut, back, rng, rgba, box, disc, glow, sky, text } from "./kit.mjs";

export const ink = "#f1f5f3";

// What tiktoken's cl100k_base encoding returns for each text.
const SAMPLES = [
  { tokens: ["t", "ik", "token", " is", " great", "!"], ids: [83, 1609, 5963, 374, 2294, 0] },
  { tokens: ["ant", "idis", "establish", "ment", "arian", "ism"], ids: [519, 85342, 34500, 479, 8997, 2191] },
  { tokens: ["2", " +", " ", "2", " =", " ", "4"], ids: [17, 489, 220, 17, 284, 220, 19] },
];
const COLORS = ["#ff8fa8", "#ffd166", "#7ee0c0", "#8ab6ff", "#c9a6ff", "#ffad7a"];
const PERIOD = 6.4;
const GAP = 8;

export default function tiktoken({ W, H, fonts }) {
  const rand = rng(9);
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const sparks = [];
  let index = -1;
  let cut = [];
  let was = [];
  let moved = -9;
  let last = null;
  let blade = 0;

  function gear(ctx, x, y, r, turn) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * TAU) / 16;
      const d = i % 2 ? r : r * 0.72;
      ctx.lineTo(Math.cos(a - 0.1) * d, Math.sin(a - 0.1) * d);
      ctx.lineTo(Math.cos(a + 0.1) * d, Math.sin(a + 0.1) * d);
    }
    ctx.closePath();
    ctx.fillStyle = "#f28b54";
    ctx.fill();
    disc(ctx, 0, 0, r * 0.3, "#131a1e");
    ctx.restore();
  }

  return (ctx, t, dt, p) => {
    const u = t % PERIOD;
    const now = Math.floor(t / PERIOD) % SAMPLES.length;
    const { tokens, ids } = SAMPLES[now];
    if (now !== index) {
      index = now;
      cut = tokens.map(() => 0);
      was = tokens.map(() => false);
    }
    if (p.inside && last && Math.hypot(p.x - last.x, p.y - last.y) > 1.5) moved = t;
    last = { x: p.x, y: p.y };

    sky(ctx, W, H, ["#0f1518", "#182228"]);
    glow(ctx, W / 2, H * 0.55, 260, "#2b5a66", 0.3);
    ctx.fillStyle = rgba("#ffffff", 0.07);
    for (let x = 9 - ((p.nx * 5) % 18); x < W; x += 18) for (let y = 9; y < H; y += 18) ctx.fillRect(x, y, 1.2, 1.2);

    ctx.font = mono(23, 600);
    const widths = tokens.map((token) => ctx.measureText(token).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const left = (W - total) / 2;
    const base = [];
    widths.reduce((x, w, i) => ((base[i] = x), x + w), left);

    // The blade sweeps by itself, unless the pointer has just moved.
    const sweep = lerp(left - 34, left + total + 34, inOut(span(u, 0.7, 2.9)));
    const target = t - moved < 1.6 ? p.x : sweep;
    blade += (target - blade) * (1 - Math.exp(-dt * 16));
    const y = H / 2 + 12;
    tokens.forEach((_, i) => {
      const done = blade > base[i] + widths[i] - 3;
      if (done && !was[i])
        for (let n = 0; n < 7; n++)
          sparks.push({
            x: base[i] + widths[i],
            y: y - 8 + (rand() - 0.5) * 22,
            vx: (rand() - 0.3) * 90,
            vy: (rand() - 0.6) * 90,
            life: 0.3 + rand() * 0.3,
            color: COLORS[i % COLORS.length],
          });
      was[i] = done;
      cut[i] += ((done ? 1 : 0) - cut[i]) * (1 - Math.exp(-dt * 13));
    });
    const spread = cut.reduce((a, b) => a + b, 0) * GAP;
    const enter = out(span(u, 0, 0.45));
    const leave = span(u, PERIOD - 0.5, PERIOD - 0.1);
    const alpha = enter * (1 - leave);

    let shift = -spread / 2;
    let bladeShift = shift;
    tokens.forEach((token, i) => {
      const color = COLORS[i % COLORS.length];
      const x = base[i] + shift;
      const c = cut[i];
      const ty = y - (1 - enter) * 10 - leave * 16;
      ctx.globalAlpha = alpha;
      if (c > 0.01) {
        box(ctx, x - 2, ty - 23, widths[i] + 4, 33, 5, rgba(color, 0.2 * c));
        box(ctx, x - 2, ty + 7.5, widths[i] + 4, 2.5, 1.2, rgba(color, c));
      }
      ctx.font = mono(23, 600);
      ctx.fillStyle = "#f1f5f3";
      ctx.fillText(token, x, ty);
      // A cut token shows the spaces it carries.
      if (c > 0.3)
        [...token].forEach((ch, n) => {
          if (ch !== " ") return;
          const cw = widths[i] / token.length;
          disc(ctx, x + cw * (n + 0.5), ty - 7, 1.7, rgba(color, c));
        });
      if (c > 0.01) {
        const drop = back(clamp(c));
        ctx.globalAlpha = alpha * clamp(c * 1.4);
        ctx.fillStyle = rgba(color, 0.6);
        ctx.fillRect(x + widths[i] / 2 - 0.5, ty + 12, 1, 7 * drop);
        text(ctx, String(ids[i]), x + widths[i] / 2, ty + 20 + 11 * drop, mono(10, 600), color, "center");
      }
      shift += c * GAP;
      if (blade > base[i] + widths[i]) bladeShift = shift;
    });
    ctx.globalAlpha = 1;

    // The blade, with the gear that drives it.
    const bx = blade + bladeShift;
    const beam = ctx.createLinearGradient(0, y - 46, 0, y + 30);
    beam.addColorStop(0, rgba("#f28b54", 0.95));
    beam.addColorStop(1, rgba("#f28b54", 0));
    glow(ctx, bx, y - 10, 34, "#f28b54", 0.28);
    ctx.fillStyle = beam;
    ctx.fillRect(bx - 0.8, y - 44, 1.6, 74);
    gear(ctx, bx, y - 50, 9, blade * 0.06);

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      s.vy += 160 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      disc(ctx, s.x - spread / 2, s.y, 1.4, rgba(s.color, clamp(s.life * 3)));
    }

    // The count, and the call that produced it.
    const count = cut.filter((c) => c > 0.5).length;
    text(ctx, String(count), W - 36, 58, mono(27, 700), "#f1f5f3", "right");
    text(ctx, count === 1 ? "token" : "tokens", W - 36, 72, mono(9), rgba("#f1f5f3", 0.6), "right");
    text(ctx, "cl100k_base", W - 36, 84, mono(8.5), rgba("#f1f5f3", 0.38), "right");
    ctx.globalAlpha = alpha;
    ctx.font = mono(9.5);
    let x = 36;
    const put = (str, color) => {
      ctx.fillStyle = color;
      ctx.fillText(str, x, H - 27);
      x += ctx.measureText(str).width;
    };
    put("enc.", rgba("#f1f5f3", 0.6));
    put("encode", "#8ab6ff");
    put("(", rgba("#f1f5f3", 0.6));
    put(`"${tokens.join("")}"`, "#a9e3a0");
    put(") → [", rgba("#f1f5f3", 0.6));
    ids.forEach((id, i) => {
      put(String(id), rgba(COLORS[i % COLORS.length], 0.18 + 0.82 * cut[i]));
      if (i < ids.length - 1) put(", ", rgba("#f1f5f3", 0.4));
    });
    put("]", rgba("#f1f5f3", 0.6));
    ctx.globalAlpha = 1;
  };
}
