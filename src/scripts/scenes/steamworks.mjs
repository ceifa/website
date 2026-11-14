// steamworks.js: a small platformer that plays itself, starring the page's
// resident. Every few stars the game calls steamworks.js, and Steam answers
// with an achievement.
import { TAU, clamp, span, out, back, rng, rgba, box, disc, text } from "./kit.mjs";

export const ink = "#fff6ea";

const SPEED = 96;
const GRAVITY = 780;
const HERO = 126;
const UNLOCKS = [
  [1, "FIRST_STAR", "First star"],
  [4, "STAR_STRUCK", "Star struck"],
  [8, "COLLECTOR", "Collector"],
  [13, "HOARDER", "Hoarder"],
  [19, "COMPLETIONIST", "Completionist"],
];
const SKY = ["#262a5a", "#4a3a78", "#8a4680", "#c8587a", "#ee8062", "#f7a968", "#fbcf8e"];

export default function steamworks({ W, H, fonts }) {
  const rand = rng(5);
  const ground = H - 34;
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const sans = (size, weight = 400) => `${weight} ${size}px ${fonts.site}`;
  // The level: obstacles to jump, a star over each, and a few along the floor.
  const obstacles = [];
  const stars = [];
  for (let x = 262; x < 30000; x += 175 + rand() * 105) {
    const spike = rand() < 0.55;
    obstacles.push({ x, spike });
    stars.push({ x, y: 57 });
    if (rand() < 0.6) for (let i = 0; i < 2; i++) stars.push({ x: x + 78 + i * 22, y: 14 });
  }
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 150 + rand() * 80, y: 14 + rand() * 46, w: 30 + rand() * 30 }));
  const sparks = [];
  const hero = { y: 0, vy: 0, squash: 0 };
  let collected = 0;
  let unlocked = -1;
  let unlockedAt = -9;
  let nextObstacle = 0;
  let last = null;

  const burst = (x, y, n, color, power = 70) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * TAU;
      const v = power * (0.4 + rand() * 0.6);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.35 + rand() * 0.35, color });
    }
  };
  function star(ctx, x, y, r, fill, turn = 0) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = turn - Math.PI / 2 + (i * Math.PI) / 5;
      const d = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function hills(ctx, scroll, base, height, color) {
    ctx.fillStyle = color;
    for (let x = 0; x < W; x += 3) {
      const wx = x + scroll;
      const y = base - height * (0.5 + 0.32 * Math.sin(wx * 0.012) + 0.18 * Math.sin(wx * 0.033 + 2));
      ctx.fillRect(x, Math.round(y / 3) * 3, 3, H);
    }
  }

  return (ctx, t, dt, p) => {
    const scroll = t * SPEED;
    const heroX = scroll + HERO;

    // Play: jump whatever is coming, collect whatever is within reach.
    while (obstacles[nextObstacle].x < heroX - 14) nextObstacle++;
    const ahead = obstacles[nextObstacle].x - heroX;
    if (hero.y === 0 && ahead < 35 && ahead > 10) {
      hero.vy = -268;
      hero.squash = 1;
      burst(HERO, ground, 5, "#ffe2b8", 40);
    }
    hero.vy += GRAVITY * dt;
    hero.y = Math.min(0, hero.y + hero.vy * dt);
    if (hero.y === 0 && hero.vy > 200) {
      hero.squash = -1;
      burst(HERO, ground, 6, "#ffe2b8", 45);
    }
    if (hero.y === 0) hero.vy = 0;
    hero.squash *= Math.exp(-dt * 9);
    for (const s of stars) {
      if (s.got || Math.abs(s.x - heroX) > 15 || Math.abs(ground - s.y - (ground + hero.y - 14)) > 20) continue;
      s.got = true;
      collected++;
      burst(s.x - scroll, ground - s.y, 9, "#fff0a8");
      const next = UNLOCKS[unlocked + 1] ?? [UNLOCKS.at(-1)[0] + (unlocked - UNLOCKS.length + 2) * 7];
      if (collected >= next[0]) {
        unlocked++;
        unlockedAt = t;
      }
    }
    // The pointer leaves a trail of dust.
    if (p.inside && last && Math.hypot(p.x - last.x, p.y - last.y) > 3)
      sparks.push({ x: p.x, y: p.y, vx: (rand() - 0.5) * 30, vy: -10 - rand() * 30, life: 0.5, color: "#ffffff" });
    last = { x: p.x, y: p.y };

    // Sky, sun, clouds, hills.
    const band = H / SKY.length;
    SKY.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1);
      // A dithered edge between the bands.
      ctx.fillStyle = SKY[i + 1] ?? color;
      for (let x = (i % 2) * 3; x < W; x += 6) ctx.fillRect(x, Math.floor((i + 1) * band) - 3, 3, 3);
    });
    const sunX = W - 150 - p.nx * 6;
    disc(ctx, sunX, ground - 38, 64, rgba("#ffe9c0", 0.16));
    disc(ctx, sunX, ground - 38, 40, "#ffe6b0");
    ctx.fillStyle = "#f7a968";
    for (let i = 0; i < 4; i++) ctx.fillRect(sunX - 44, ground - 34 + i * 9, 88, 2 + i);
    for (const c of clouds) {
      const x = ((((c.x - scroll * 0.08 - p.nx * 8) % (W + 120)) + W + 120) % (W + 120)) - 60;
      ctx.fillStyle = rgba("#ffd9cf", 0.5);
      ctx.fillRect(x, c.y, c.w, 6);
      ctx.fillRect(x + 6, c.y - 6, c.w - 18, 6);
      ctx.fillRect(x - 6, c.y + 6, c.w + 3, 3);
    }
    hills(ctx, scroll * 0.18 + p.nx * 10, ground - 6, 64, "#5c3a78");
    hills(ctx, scroll * 0.4 + 400 + p.nx * 18, ground + 6, 46, "#3a2b62");

    // The ground.
    ctx.fillStyle = "#231d44";
    ctx.fillRect(0, ground, W, H - ground);
    ctx.fillStyle = "#ff9f6e";
    ctx.fillRect(0, ground, W, 3);
    ctx.fillStyle = "#3a2f66";
    ctx.fillRect(0, ground + 3, W, 3);
    for (let x = -(scroll % 24); x < W; x += 24) {
      ctx.fillStyle = "#2f2757";
      ctx.fillRect(Math.round(x), ground + 12, 9, 3);
      ctx.fillRect(Math.round(x) + 14, ground + 22, 6, 3);
      ctx.fillStyle = "#ffc48f";
      ctx.fillRect(Math.round(x) + 5, ground - 3, 3, 3);
    }

    for (const o of obstacles) {
      const x = Math.round(o.x - scroll);
      if (x < -30 || x > W + 30) continue;
      if (o.spike) {
        ctx.fillStyle = "#f4ecff";
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 7 - 4, ground);
          ctx.lineTo(x + i * 7, ground - 15);
          ctx.lineTo(x + i * 7 + 4, ground);
          ctx.fill();
        }
      } else {
        box(ctx, x - 10, ground - 18, 20, 18, 0, "#8c5a4a", "#3a2030", 2);
        ctx.fillStyle = "#b9785a";
        ctx.fillRect(x - 7, ground - 15, 14, 3);
        ctx.fillStyle = "#3a2030";
        ctx.fillRect(x - 1, ground - 12, 2, 12);
      }
    }
    for (const s of stars) {
      const x = s.x - scroll;
      if (s.got || x < -20 || x > W + 20) continue;
      const y = ground - s.y + Math.sin(t * 4 + s.x) * 2;
      disc(ctx, x, y, 11, rgba("#fff3b0", 0.22));
      star(ctx, x, y, 7, "#fff0a0", Math.sin(t * 3 + s.x) * 0.25);
    }

    // The hero: the resident, with a stretch on the way up and a squash on landing.
    const stretch = 1 + hero.squash * 0.22 + clamp(-hero.vy / 1400, -0.1, 0.14);
    ctx.save();
    ctx.translate(HERO, ground + hero.y);
    const step = hero.y === 0 ? Math.sin(scroll * 0.22) : 0.7;
    ctx.fillStyle = "#e4627f";
    ctx.save();
    ctx.translate(-4, -6);
    ctx.rotate(step * 0.5);
    ctx.fillRect(-2, 0, 4, 6);
    ctx.restore();
    ctx.save();
    ctx.translate(4, -6);
    ctx.rotate(-step * 0.5);
    ctx.fillRect(-2, 0, 4, 6);
    ctx.restore();
    ctx.scale(1 / stretch, stretch);
    ctx.beginPath();
    ctx.roundRect(-10, -27, 20, 22, [6, 6, 4, 4]);
    ctx.fillStyle = "#f0708c";
    ctx.fill();
    ctx.fillStyle = rgba("#000000", 0.1);
    ctx.fillRect(7, -24, 3, 17);
    const blink = t % 3.1 > 3 ? 1 : 4;
    ctx.fillStyle = "#fffaf0";
    ctx.fillRect(-3, -20 + (4 - blink) / 2, 3, blink);
    ctx.fillRect(4, -20 + (4 - blink) / 2, 3, blink);
    ctx.restore();

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      s.vy += 220 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      ctx.fillStyle = rgba(s.color, clamp(s.life * 3));
      ctx.fillRect(Math.round(s.x / 3) * 3, Math.round(s.y / 3) * 3, 3, 3);
    }

    // The star count.
    const bump = 1 + 0.35 * (1 - span(t, unlockedAt, unlockedAt + 0.3));
    star(ctx, W - 76, 45, 6.5 * bump, "#fff0a0");
    text(ctx, String(collected).padStart(2, "0"), W - 64, 49.5, mono(13, 700), "#fff6ea");

    // The call, and Steam's answer.
    const since = t - unlockedAt;
    if (unlocked >= 0 && since < 4.6) {
      const [, id, name] = UNLOCKS[unlocked] ?? [0, "OVERACHIEVER", "Overachiever"];
      const call = `client.achievement.activate('${id}')`;
      const alpha = span(since, 0, 0.15) * (1 - span(since, 4.1, 4.5));
      ctx.globalAlpha = alpha;
      ctx.font = mono(9.5);
      const w = ctx.measureText(call).width;
      box(ctx, 30, 71, w + 14, 19, 4, rgba("#1a1433", 0.72));
      const shown = call.slice(0, Math.floor(since * 90));
      text(ctx, shown, 37, 84, mono(9.5), "#ffe9d2");
      ctx.globalAlpha = 1;
      const rise = back(span(since, 0.5, 0.95)) * (1 - out(span(since, 3.9, 4.3)));
      const tw = 186;
      const tx = W - tw - 30;
      const ty = H + 4 - rise * 68;
      const body = ctx.createLinearGradient(0, ty, 0, ty + 46);
      body.addColorStop(0, "#2f4d68");
      body.addColorStop(1, "#1b2838");
      ctx.shadowColor = rgba("#000000", 0.45);
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      box(ctx, tx, ty, tw, 46, 4, body);
      ctx.shadowColor = "transparent";
      box(ctx, tx + 0.5, ty + 0.5, tw - 1, 45, 4, null, rgba("#66c0f4", 0.5));
      const icon = ctx.createLinearGradient(tx, ty, tx + 34, ty + 34);
      icon.addColorStop(0, "#66c0f4");
      icon.addColorStop(1, "#2a6f97");
      box(ctx, tx + 6, ty + 6, 34, 34, 3, icon);
      const spin = out(span(since, 0.7, 1.5));
      star(ctx, tx + 23, ty + 23, 10 * back(span(since, 0.7, 1.1)), "#fff6c9", (1 - spin) * 3);
      text(ctx, "Achievement unlocked", tx + 48, ty + 19, sans(9.5), "#8fb6d6");
      text(ctx, name, tx + 48, ty + 34, sans(12.5, 650), "#ffffff");
    }

    // Scanlines and a vignette, like an old screen.
    ctx.fillStyle = rgba("#000000", 0.07);
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    const shade = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, W * 0.62);
    shade.addColorStop(0, rgba("#120a2a", 0));
    shade.addColorStop(1, rgba("#120a2a", 0.5));
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
  };
}
