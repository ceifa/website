// sqlier: one model, three drivers. The query leaves the code, takes the
// branch of whichever driver is set, and the same row comes back every time.
// Point at a driver to switch to it.
import {
  TAU,
  clamp,
  lerp,
  span,
  out,
  back,
  smooth,
  rgba,
  box,
  disc,
  glow,
  sky,
  text,
  hl,
  code,
} from "./kit.mjs";

export const ink = "#3a2910";

const SYNTAX = { p: "#3a2910", k: "#b3305a", s: "#2f7a4f", n: "#a15c12", f: "#1f6480", c: "#9a8a6c" };
const DRIVERS = ["sqlite", "mysqloo", "file"];
const CYCLE = 2.7;
const INK = "#3a2910";

// The point a fraction k of the way along a polyline.
function along(points, k) {
  const lengths = points.slice(1).map((q, i) => Math.hypot(q[0] - points[i][0], q[1] - points[i][1]));
  let left = clamp(k) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i]) {
      const f = left / (lengths[i] || 1);
      return [lerp(points[i][0], points[i + 1][0], f), lerp(points[i][1], points[i + 1][1], f)];
    }
    left -= lengths[i];
  }
  return points.at(-1);
}

export default function sqlier({ W, H, fonts }) {
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const sans = (size, weight = 400) => `${weight} ${size}px ${fonts.site}`;
  const xs = [W - 214, W - 136, W - 58];
  const lift = [0, 0, 0];
  const agreed = [-9, -9, -9];
  let active = 0;
  let began = 0.6;
  let flipped = -9;
  let stamped = -9;

  const ART = {
    sqlite(ctx, work) {
      box(ctx, -15, -21, 30, 42, 3, "#fffefa", rgba(INK, 0.55), 1.3);
      ctx.fillStyle = "#4f9bd9";
      ctx.fillRect(-14.3, -20.3, 28.6, 9);
      for (let i = 0; i < 4; i++) {
        const on = work > 0 && Math.floor(work * 8) % 4 === i;
        box(ctx, -10, -6 + i * 6, [20, 14, 18, 10][i], 2.6, 1.3, on ? "#4f9bd9" : rgba(INK, 0.28));
      }
    },
    mysqloo(ctx, work) {
      for (let i = 2; i >= 0; i--) {
        const y = -14 + i * 12 - Math.sin(clamp(work) * Math.PI) * (2 - i) * 3;
        ctx.fillStyle = "#d98a32";
        ctx.fillRect(-17, y, 34, 9);
        ctx.beginPath();
        ctx.ellipse(0, y + 9, 17, 5, 0, 0, Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, y, 17, 5, 0, 0, TAU);
        ctx.fillStyle = "#ffc47c";
        ctx.fill();
        ctx.strokeStyle = rgba(INK, 0.5);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    file(ctx, work) {
      ctx.beginPath();
      ctx.roundRect(-18, -15, 16, 8, [3, 3, 0, 0]);
      ctx.fillStyle = "#d3a23a";
      ctx.fill();
      box(ctx, -18, -10, 36, 28, 3, "#d3a23a");
      box(ctx, -12, -15 - Math.sin(clamp(work) * Math.PI) * 9, 24, 22, 2, "#fffefa", rgba(INK, 0.4));
      for (let i = 0; i < 2; i++) box(ctx, -8, -10 + i * 5 - Math.sin(clamp(work) * Math.PI) * 9, 14, 2, 1, rgba(INK, 0.3));
      box(ctx, -18, -3, 36, 21, 3, "#f1c962", rgba(INK, 0.5), 1.2);
    },
  };

  return (ctx, t, dt, p) => {
    // Which driver: the one under the pointer, or the next one in turn.
    const pointed = p.inside && p.x > W - 262 ? xs.reduce((best, x, i) => (Math.abs(p.x - x) < Math.abs(p.x - xs[best]) ? i : best), 0) : -1;
    if (pointed >= 0 && pointed !== active) {
      active = pointed;
      began = t;
      flipped = t;
    } else if (t - began > CYCLE) {
      if (pointed < 0) {
        active = (active + 1) % 3;
        flipped = t;
      }
      began = t;
    }
    const since = t - began;
    const going = span(since, 0.2, 0.68);
    const work = span(since, 0.68, 1.12);
    const coming = span(since, 1.12, 1.6);
    if (since >= 1.6 && stamped < began) {
      stamped = t;
      agreed[active] = t;
    }

    sky(ctx, W, H, ["#f7f0dd", "#ecdfc0"]);
    glow(ctx, W * 0.7, H * 0.4, 240, "#ffffff", 0.5);
    ctx.fillStyle = rgba(INK, 0.045);
    for (let y = 12; y < H; y += 13) ctx.fillRect(0, y, W, 1);

    // Pipes: out of the code, along a bus, down to each driver.
    const cardX = 30 - (1 - out(span(t, 0, 0.7))) * 24;
    const start = [cardX + 228, H / 2 + 14];
    const route = (i) => [start, [cardX + 250, start[1]], [cardX + 268, 92], [xs[i], 92], [xs[i], 108]];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < 3; i++) {
      const on = i === active;
      ctx.beginPath();
      route(i).forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = on ? "#e09a2b" : rgba(INK, 0.22);
      ctx.lineWidth = on ? 3 : 2;
      ctx.setLineDash(on ? [] : [1, 6]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    DRIVERS.forEach((name, i) => {
      const on = i === active;
      lift[i] += ((on ? 1 : 0) - lift[i]) * (1 - Math.exp(-dt * 10));
      const k = lift[i];
      const appear = back(span(t, 0.25 + i * 0.12, 0.8 + i * 0.12));
      const y = 134 - k * 5;
      ctx.save();
      ctx.translate(xs[i] + p.nx * 2, y);
      ctx.fillStyle = rgba(INK, 0.12 + k * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 26 + k * 5, 24 - k * 3, 4, 0, 0, TAU);
      ctx.fill();
      if (k > 0.05) glow(ctx, 0, 0, 46, "#f5b041", 0.4 * k);
      ctx.globalAlpha = (0.5 + 0.5 * k) * clamp(appear);
      ctx.scale(appear * (1 + 0.07 * k * Math.sin(clamp(on ? work : 0) * Math.PI)), appear);
      ART[name](ctx, on ? work : 0);
      ctx.restore();
      text(ctx, name, xs[i], 178, mono(9.5, on ? 700 : 400), rgba(INK, 0.5 + 0.5 * k), "center");
      // A dot that fills once this driver has returned the row.
      const said = span(t, agreed[i], agreed[i] + 0.3);
      disc(ctx, xs[i], 188, 2.6, agreed[i] > 0 ? rgba("#2f7a4f", 0.35 + 0.65 * said) : rgba(INK, 0.18));
    });

    // The query goes out, the row comes back.
    if (going > 0 && going < 1) {
      const [x, y] = along(route(active), smooth(going));
      glow(ctx, x, y, 14, "#f5b041", 0.9);
      box(ctx, x - 6, y - 3.5, 12, 7, 3.5, "#e09a2b");
    }
    if (coming > 0 && coming < 1) {
      const [x, y] = along(route(active), 1 - smooth(coming));
      glow(ctx, x, y, 14, "#4caf7a", 0.9);
      box(ctx, x - 6, y - 3.5, 12, 7, 3.5, "#2f7a4f");
    }

    // The code, and the row it got.
    const cy = 69;
    const ch = H - cy - 17;
    ctx.globalAlpha = span(t, 0, 0.5);
    ctx.shadowColor = rgba("#6b4a12", 0.25);
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    box(ctx, cardX, cy, 228, ch, 8, "#fffdf6");
    ctx.shadowColor = "transparent";
    box(ctx, cardX, cy, 228, ch, 8, null, rgba(INK, 0.16));
    ctx.font = mono(9);
    let x = code(ctx, hl('sqlier.Initialize("db", '), cardX + 12, cy + 20, SYNTAX);
    const flip = span(t, flipped, flipped + 0.3);
    const name = `"${DRIVERS[active]}"`;
    const w = ctx.measureText(name).width;
    box(ctx, x - 2, cy + 10, w + 4, 14, 3, rgba("#f5b041", 0.35 + 0.4 * (1 - flip)));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 2, cy + 9, w + 4, 16);
    ctx.clip();
    ctx.fillStyle = SYNTAX.s;
    ctx.fillText(name, x, cy + 20 + (1 - out(flip)) * 12);
    ctx.restore();
    ctx.fillStyle = SYNTAX.p;
    ctx.fillText(")", x + w + 1, cy + 20);
    code(ctx, hl("local User = sqlier.Model({ … })"), cardX + 12, cy + 34, SYNTAX);
    code(ctx, hl('User:find({ Name = "ceifa" }, show)'), cardX + 12, cy + 48, SYNTAX);
    ctx.fillStyle = rgba(INK, 0.12);
    ctx.fillRect(cardX + 12, cy + 58, 204, 1);
    ["Id", "Name", "Rank"].forEach((head, i) => {
      const hx = cardX + 12 + [0, 34, 96][i];
      text(ctx, head, hx, cy + 72, sans(8, 600), rgba(INK, 0.5));
      text(ctx, ["2", "ceifa", "donator"][i], hx, cy + 87, mono(10, 600), INK);
    });
    const stamp = span(t, stamped, stamped + 0.35);
    if (stamped > 0) {
      const size = stamp < 1 ? back(stamp) : 1;
      ctx.save();
      ctx.translate(cardX + 204, cy + 80);
      ctx.scale(size, size);
      disc(ctx, 0, 0, 9, "#2f7a4f");
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-4, 0.5);
      ctx.lineTo(-1, 3.5);
      ctx.lineTo(4.5, -3);
      ctx.stroke();
      ctx.restore();
    }
    const count = agreed.filter((at) => at > 0).length;
    text(
      ctx,
      count ? `same row from ${count} of 3 drivers` : "waiting for the first driver",
      cardX + 12,
      cy + ch - 9,
      sans(8.5),
      rgba(INK, 0.6),
    );
    ctx.globalAlpha = 1;
  };
}
