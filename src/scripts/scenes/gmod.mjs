// garrysmod-docker: a sandbox. A shipping container throws out props that
// tumble with real (if small) rigid-body physics, and the pointer is a physics
// gun: it picks up the nearest prop, carries it, and throws it when flicked.
import { TAU, clamp, lerp, span, out, rng, rgba, box, disc, line, glow, sky, text } from "./kit.mjs";

export const ink = "#0e2c40";

const STEP = 1 / 120;
const GRAVITY = 1150;
const KINDS = ["crate", "melon", "barrel", "tire", "drum", "block", "crate", "melon"];
const SHAPES = {
  crate: [26, 26],
  barrel: [19, 29],
  drum: [19, 27],
  block: [30, 15],
  melon: 13,
  tire: 14,
};
const LOG = [
  "$ docker run -p 27015:27015/udp ceifa/garrysmod",
  "Garry's Mod server is up on :27015",
  "gm_construct · sandbox · 1/16 players",
];

export default function gmod({ W, H, fonts }) {
  const rand = rng(21);
  const ground = H - 27;
  const door = 150;
  const roof = ground - 62;
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const bodies = [];
  const clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 110 + rand() * 60, y: 10 + rand() * 60, s: 0.6 + rand() * 0.7 }));
  let clock = 0;
  let spawned = 0;
  let held = null;
  let undone = -9;

  // A body is a ring of points held rigid by a link between every pair.
  function spawn(kind) {
    const shape = SHAPES[kind];
    const round = typeof shape === "number";
    const outline = round
      ? Array.from({ length: 8 }, (_, i) => [Math.cos((i * TAU) / 8) * shape, Math.sin((i * TAU) / 8) * shape])
      : [
          [-shape[0] / 2, -shape[1] / 2],
          [shape[0] / 2, -shape[1] / 2],
          [shape[0] / 2, shape[1] / 2],
          [-shape[0] / 2, shape[1] / 2],
        ];
    const turn = rand() * TAU;
    const vx = (150 + rand() * 170) * STEP;
    const vy = -(150 + rand() * 170) * STEP;
    const spin = (rand() - 0.5) * 0.09;
    const ps = outline.map(([x, y]) => {
      const rx = x * Math.cos(turn) - y * Math.sin(turn);
      const ry = x * Math.sin(turn) + y * Math.cos(turn);
      const px = door + 20 + rx;
      const py = ground - 34 + ry;
      return { x: px, y: py, px: px - vx + ry * spin, py: py - vy - rx * spin };
    });
    const links = [];
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) links.push([ps[i], ps[j], Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y)]);
    bodies.push({ kind, ps, links, round, reach: round ? shape : Math.hypot(...shape) / 2, born: clock, gone: 0 });
  }
  function center(b) {
    let x = 0;
    let y = 0;
    for (const p of b.ps) {
      x += p.x;
      y += p.y;
    }
    return [x / b.ps.length, y / b.ps.length];
  }
  // Separating axes: if no edge normal keeps the two apart they overlap, and
  // the shallowest one says which edge to push which corner out of.
  function collide(a, b) {
    let depth = Infinity;
    let nx = 0;
    let ny = 0;
    let edge = null;
    let owner = null;
    for (const body of [a, b])
      for (let i = 0; i < body.ps.length; i++) {
        const p = body.ps[i];
        const q = body.ps[(i + 1) % body.ps.length];
        let ax = p.y - q.y;
        let ay = q.x - p.x;
        const l = Math.hypot(ax, ay) || 1;
        ax /= l;
        ay /= l;
        let minA = Infinity;
        let maxA = -Infinity;
        let minB = Infinity;
        let maxB = -Infinity;
        for (const v of a.ps) {
          const d = v.x * ax + v.y * ay;
          if (d < minA) minA = d;
          if (d > maxA) maxA = d;
        }
        for (const v of b.ps) {
          const d = v.x * ax + v.y * ay;
          if (d < minB) minB = d;
          if (d > maxB) maxB = d;
        }
        const gap = minA < minB ? minB - maxA : minA - maxB;
        if (gap > 0) return;
        if (-gap < depth) {
          depth = -gap;
          nx = ax;
          ny = ay;
          edge = [p, q];
          owner = body;
        }
      }
    const other = owner === a ? b : a;
    const [ex, ey] = center(owner);
    const [ox, oy] = center(other);
    if ((ox - ex) * nx + (oy - ey) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    let corner = null;
    let least = Infinity;
    for (const v of other.ps) {
      const d = (v.x - ex) * nx + (v.y - ey) * ny;
      if (d < least) {
        least = d;
        corner = v;
      }
    }
    const cx = nx * depth;
    const cy = ny * depth;
    const [p, q] = edge;
    const along = clamp(
      Math.abs(p.x - q.x) > Math.abs(p.y - q.y)
        ? (corner.x - cx - p.x) / (q.x - p.x)
        : (corner.y - cy - p.y) / (q.y - p.y),
    );
    const share = 1 / (along * along + (1 - along) * (1 - along));
    p.x -= cx * (1 - along) * 0.5 * share;
    p.y -= cy * (1 - along) * 0.5 * share;
    q.x -= cx * along * 0.5 * share;
    q.y -= cy * along * 0.5 * share;
    corner.x += cx * 0.5;
    corner.y += cy * 0.5;
  }
  function step(p) {
    for (const b of bodies)
      for (const q of b.ps) {
        const vx = (q.x - q.px) * 0.999;
        const vy = (q.y - q.py) * 0.999;
        q.px = q.x;
        q.py = q.y;
        q.x += vx;
        q.y += vy + GRAVITY * STEP * STEP;
      }
    if (held) {
      const [hx, hy] = center(held);
      const dx = (p.x - hx) * 0.1;
      const dy = (p.y - hy) * 0.1;
      for (const q of held.ps) {
        q.x += dx;
        q.y += dy;
        q.px += (q.x - q.px) * 0.16;
        q.py += (q.y - q.py) * 0.16;
      }
    }
    for (let pass = 0; pass < 3; pass++) {
      for (const b of bodies)
        for (const [m, n, rest] of b.links) {
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const d = Math.hypot(dx, dy) || 1;
          const k = ((d - rest) / d) * 0.5;
          m.x += dx * k;
          m.y += dy * k;
          n.x -= dx * k;
          n.y -= dy * k;
        }
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++) {
          const [ax, ay] = center(bodies[i]);
          const [bx, by] = center(bodies[j]);
          if (Math.hypot(ax - bx, ay - by) < bodies[i].reach + bodies[j].reach) collide(bodies[i], bodies[j]);
        }
      for (const b of bodies)
        for (const q of b.ps) {
          if (q.y > ground) {
            q.y = ground;
            q.px += (q.x - q.px) * 0.14;
          }
          if (q.x > W - 5) q.x = W - 5;
          // The container is solid: land on its roof, bounce off its doorway.
          if (q.x < door && q.y > roof) {
            if (q.py <= roof + 2) {
              q.y = roof;
              q.px += (q.x - q.px) * 0.14;
            } else q.x = door;
          }
          if (q.x < 5) q.x = 5;
        }
    }
  }

  const PROPS = {
    crate(ctx) {
      box(ctx, -13, -13, 26, 26, 1.5, "#c99455", "#7b4e24", 1.6);
      box(ctx, -9.5, -9.5, 19, 19, 0, null, "#9c6a36", 1.4);
      line(ctx, -9, 9, 9, -9, "#9c6a36", 2.4);
      line(ctx, -11, -11, -6, -11, rgba("#ffffff", 0.35), 1);
    },
    barrel(ctx) {
      box(ctx, -9.5, -14.5, 19, 29, 3, "#cf3f33", "#7d1d17", 1.4);
      ctx.fillStyle = "#8e251d";
      ctx.fillRect(-9.5, -8, 19, 2.2);
      ctx.fillRect(-9.5, 6, 19, 2.2);
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fillStyle = "#ffd23f";
      ctx.fill();
      ctx.fillStyle = rgba("#ffffff", 0.25);
      ctx.fillRect(-7, -12, 2.2, 24);
    },
    drum(ctx) {
      box(ctx, -9.5, -13.5, 19, 27, 3.5, "#3577c9", "#1c4683", 1.4);
      ctx.fillStyle = "#5c9be6";
      ctx.fillRect(-9.5, -7, 19, 2);
      ctx.fillRect(-9.5, 5, 19, 2);
      ctx.fillStyle = rgba("#ffffff", 0.28);
      ctx.fillRect(-7, -11, 2.2, 22);
    },
    block(ctx) {
      box(ctx, -15, -7.5, 30, 15, 1.5, "#aab1b7", "#6b7278", 1.4);
      box(ctx, -11, -4, 9, 8, 1.5, "#7c848b");
      box(ctx, 2, -4, 9, 8, 1.5, "#7c848b");
    },
    melon(ctx) {
      disc(ctx, 0, 0, 13.6, "#2f7d32");
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 13.6, 0, TAU);
      ctx.clip();
      ctx.strokeStyle = "#1d5a22";
      ctx.lineWidth = 2.6;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.abs(i) * 5.2 + 0.6, 14, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      disc(ctx, -4.5, -5.5, 3, rgba("#ffffff", 0.3));
    },
    tire(ctx) {
      disc(ctx, 0, 0, 14.6, "#26262b");
      disc(ctx, 0, 0, 8.4, "#9aa1aa");
      disc(ctx, 0, 0, 3, "#4a4f57");
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5;
        line(ctx, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * 8, Math.sin(a) * 8, "#5c626b", 1.6);
      }
      ctx.strokeStyle = "#3d3d44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 11.6, 0, TAU);
      ctx.stroke();
    },
  };

  return (ctx, t, dt, p) => {
    // Out with the oldest prop once the yard is full, like the undo key.
    const alive = bodies.filter((b) => !b.gone);
    if (t > 0.5 + spawned * 0.62 && alive.length < 8) spawn(KINDS[spawned++ % KINDS.length]);
    if (alive.length === 8 && t - alive[7].born > 3.2 && t - undone > 3.4) {
      alive[0].gone = t;
      undone = t;
    }
    for (let i = bodies.length - 1; i >= 0; i--)
      if (bodies[i].gone && t - bodies[i].gone > 0.3) {
        if (held === bodies[i]) held = null;
        bodies.splice(i, 1);
      }

    // The physics gun holds what is near the pointer and lets go of what gets away.
    if (!p.inside) held = null;
    else {
      if (held) {
        const [hx, hy] = center(held);
        if (held.gone || Math.hypot(p.x - hx, p.y - hy) > 80) held = null;
      }
      if (!held) {
        let best = 44;
        for (const b of bodies) {
          const [bx, by] = center(b);
          const d = Math.hypot(p.x - bx, p.y - by);
          if (!b.gone && d < best) {
            best = d;
            held = b;
          }
        }
      }
    }
    clock += dt;
    for (let n = 0; n < 6 && clock >= STEP; n++, clock -= STEP) step(p);
    clock %= STEP;

    sky(ctx, W, H, ["#4aa6e6", "#8fcdf2", "#d6eefa"]);
    glow(ctx, W - 96 - p.nx * 6, 40, 120, "#ffffff", 0.55);
    disc(ctx, W - 96 - p.nx * 6, 40, 15, "#fffdf0");
    for (const c of clouds) {
      const x = ((((c.x + t * 5 * c.s - p.nx * 14 * c.s) % (W + 160)) + W + 160) % (W + 160)) - 80;
      ctx.fillStyle = rgba("#ffffff", 0.82);
      for (const [dx, dy, r] of [
        [0, 0, 13],
        [15, -5, 16],
        [32, 0, 12],
        [16, 4, 14],
      ]) {
        ctx.beginPath();
        ctx.ellipse(x + dx * c.s, c.y + dy * c.s, r * c.s * 1.25, r * c.s * 0.7, 0, 0, TAU);
        ctx.fill();
      }
    }
    // gm_construct's skyline, far off.
    ctx.fillStyle = "#b9d6e6";
    for (const [x, w, h] of [
      [210, 46, 34],
      [262, 30, 52],
      [300, 60, 26],
      [392, 34, 44],
      [434, 70, 30],
    ])
      ctx.fillRect(x - p.nx * 9, ground - h, w, h);
    ctx.fillStyle = "#74b54e";
    ctx.fillRect(0, ground, W, H - ground);
    ctx.fillStyle = "#8fcc62";
    ctx.fillRect(0, ground, W, 3);
    ctx.fillStyle = rgba("#2f6b2a", 0.18);
    for (let x = 8; x < W; x += 34) ctx.fillRect(x, ground + 9 + ((x * 7) % 9), 16, 2);

    // The container, doors open.
    const intro = out(span(t, 0, 0.6));
    ctx.save();
    ctx.translate(-(1 - intro) * 150, 0);
    ctx.fillStyle = rgba("#000000", 0.16);
    ctx.fillRect(24, ground, door - 16, 4);
    box(ctx, 20, roof, door - 20, 62, 2, "#2f8fe0", "#135f9e", 1.6);
    ctx.fillStyle = "#1f74c0";
    for (let x = 28; x < door - 26; x += 9) ctx.fillRect(x, roof + 5, 4, 52);
    ctx.fillStyle = "#135f9e";
    ctx.fillRect(20, roof, door - 20, 4);
    ctx.fillRect(20, ground - 4, door - 20, 4);
    box(ctx, door - 22, roof + 4, 22, 54, 0, "#0b2e4d");
    // The whale, with its cargo.
    ctx.fillStyle = "#ffffff";
    for (const [cx, cy] of [
      [0, 0],
      [7, 0],
      [14, 0],
      [3.5, -7],
      [10.5, -7],
      [7, -14],
    ])
      ctx.fillRect(48 + cx, roof + 30 + cy, 5.6, 5.6);
    ctx.beginPath();
    ctx.moveTo(42, roof + 39);
    ctx.quadraticCurveTo(58, roof + 54, 78, roof + 42);
    ctx.quadraticCurveTo(84, roof + 38, 86, roof + 32);
    ctx.lineTo(80, roof + 39);
    ctx.lineTo(42, roof + 39);
    ctx.fill();
    const swing = out(span(t, 0.25, 0.8));
    ctx.fillStyle = "#2b86d4";
    ctx.strokeStyle = "#135f9e";
    ctx.lineWidth = 1.4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(door, roof + 31 + side * 27);
      ctx.lineTo(door + 20 * swing, roof + 31 + side * (27 + 7 * swing));
      ctx.lineTo(door + 20 * swing, roof + 31 + side * (1 + 7 * swing));
      ctx.lineTo(door, roof + 31 + side * 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    for (const b of bodies) {
      const [x, y] = center(b);
      const near = clamp(1 - (ground - y) / 110);
      ctx.fillStyle = rgba("#1d4a1c", 0.28 * near);
      ctx.beginPath();
      ctx.ellipse(x, ground + 2, b.reach * (1.3 - near * 0.3), 3, 0, 0, TAU);
      ctx.fill();
    }
    for (const b of bodies) {
      const [x, y] = center(b);
      const q = b.ps[0];
      const turn = b.round ? Math.atan2(q.y - y, q.x - x) : Math.atan2(b.ps[1].y - q.y, b.ps[1].x - q.x);
      const size = b.gone ? 1 - span(t, b.gone, b.gone + 0.3) : out(span(clock + t, b.born, b.born + 0.2));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(turn);
      ctx.scale(size || 0.01, size || 0.01);
      if (b === held) glow(ctx, 0, 0, b.reach + 16, "#7fe9ff", 0.75);
      PROPS[b.kind](ctx);
      ctx.restore();
    }

    // The physics gun, in the corner like a first-person view, and its beam.
    const gx = W - 46;
    const gy = H - 8;
    const [tx, ty] = held ? center(held) : [p.x, p.y];
    const aim = p.inside ? Math.atan2(ty - gy, tx - gx) : -2.3;
    const up = out(span(t, 0.2, 0.8));
    const mx = gx + Math.cos(aim) * 44;
    const my = gy + Math.sin(aim) * 44 + (1 - up) * 50;
    if (p.inside) {
      const d = Math.hypot(tx - mx, ty - my);
      const sway = Math.sin(t * 9) * Math.min(16, d * 0.12);
      const bx = lerp(mx, tx, 0.5) - Math.sin(aim) * sway;
      const by = lerp(my, ty, 0.5) + Math.cos(aim) * sway - d * 0.1;
      for (const [w, color] of [
        [9, rgba("#39d0ff", 0.22)],
        [4, rgba("#7fe9ff", held ? 0.75 : 0.35)],
        [1.3, rgba("#ffffff", held ? 0.95 : 0.5)],
      ]) {
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(bx, by, tx, ty);
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      glow(ctx, tx, ty, held ? 22 : 10, "#7fe9ff", held ? 0.6 : 0.5);
    }
    ctx.save();
    ctx.translate(gx, gy + (1 - up) * 50);
    ctx.rotate(aim);
    box(ctx, -14, -9, 44, 18, 4, "#3b4149", "#1e2227", 1.4);
    box(ctx, 22, -6, 16, 12, 3, "#565d66", "#1e2227", 1.2);
    box(ctx, -6, -11, 20, 5, 2, "#23272c");
    glow(ctx, 40, 0, 16, "#39d0ff", 0.9);
    disc(ctx, 40, 0, 4.2, "#dffaff");
    ctx.fillStyle = "#23272c";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(34, side * 6);
      ctx.lineTo(50, side * 9);
      ctx.lineTo(48, side * 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // The server console.
    const lines = LOG.filter((_, i) => t > 0.4 + i * 1.3);
    if (lines.length) {
      ctx.font = mono(8.5);
      const cw = ctx.measureText(LOG[0]).width + 18;
      const cx = W - cw - 28;
      ctx.globalAlpha = span(t, 0.4, 0.7);
      box(ctx, cx, 62, cw, 13 + lines.length * 12.5, 5, rgba("#0c2233", 0.74));
      lines.forEach((entry, i) => {
        const at = t - (0.4 + i * 1.3);
        const shown = i ? entry : entry.slice(0, Math.floor(at * 55));
        ctx.globalAlpha = i ? span(at, 0, 0.25) : 1;
        text(ctx, shown, cx + 9, 77 + i * 12.5, mono(8.5), i === 2 ? "#a8f0b4" : i ? "#eaf6ff" : "#9fd0ee");
      });
      ctx.globalAlpha = 1;
    }
    const hint = span(t, undone, undone + 0.2) * (1 - span(t, undone + 1.6, undone + 2));
    if (hint > 0) {
      ctx.globalAlpha = hint;
      box(ctx, 166, H - 22 - hint * 4, 78, 17, 4, rgba("#0c2233", 0.74));
      text(ctx, "Undone Prop", 205, H - 10 - hint * 4, mono(8.5), "#ffffff", "center");
      ctx.globalAlpha = 1;
    }
  };
}
