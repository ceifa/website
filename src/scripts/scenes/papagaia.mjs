// papagaia: a parrot (a papagaia) dictates into an app. Its words cross over
// as a sound wave and land in the text field; then the selection is rewritten
// in place. The parrot keeps an eye on the pointer.
import { TAU, clamp, lerp, span, out, rng, rgba, box, disc, glow, sky, text, wrap } from "./kit.mjs";

export const ink = "#f2fbe6";

const TAKES = [
  ["so um i think we should ship the new parser on friday", "I think we should ship the new parser on Friday."],
  ["ok tell her the uh the build is green and we can merge", "Tell her the build is green and we can merge."],
].map(([raw, clean]) => ({ raw: raw.split(" "), clean: clean.split(" ") }));
const PERIOD = 10;
const SPEAK = [0.7, 3.5];

export default function papagaia({ W, H, fonts }) {
  const rand = rng(3);
  const sans = (size, weight = 400) => `${weight} ${size}px ${fonts.site}`;
  const leaves = Array.from({ length: 13 }, () => ({
    x: rand() * W,
    y: rand() < 0.5 ? -10 - rand() * 20 : H + 10 + rand() * 20,
    len: 70 + rand() * 90,
    turn: rand() * TAU,
    z: 0.3 + rand() * 0.7,
    sway: rand() * TAU,
  })).sort((a, b) => a.z - b.z);
  const motes = Array.from({ length: 26 }, () => ({ x: rand() * W, y: rand() * H, z: 0.3 + rand() * 0.7, phase: rand() * TAU }));
  const look = { x: 0.6, y: 0, tilt: 0 };
  let voice = 0;

  function leaf(ctx, l, t, p) {
    ctx.save();
    ctx.translate(l.x - p.nx * 26 * l.z, l.y - p.ny * 10 * l.z);
    ctx.rotate(l.turn + Math.sin(t * 0.7 + l.sway) * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(l.len * 0.3, -l.len * 0.3, l.len * 0.8, -l.len * 0.22, l.len, 0);
    ctx.bezierCurveTo(l.len * 0.8, l.len * 0.22, l.len * 0.3, l.len * 0.3, 0, 0);
    ctx.fillStyle = `rgb(${Math.round(lerp(12, 36, l.z))},${Math.round(lerp(58, 128, l.z))},${Math.round(lerp(46, 74, l.z))})`;
    ctx.fill();
    ctx.strokeStyle = rgba("#000000", 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(l.len - 6, 0);
    ctx.stroke();
    ctx.restore();
  }

  function parrot(ctx, x, y, t) {
    const bob = voice * 1.6 + Math.sin(t * 2.1) * 0.8;
    ctx.save();
    ctx.translate(x, y);
    // Tail feathers.
    for (const [lean, len, color] of [
      [-13, 58, "#2a66d0"],
      [-5, 66, "#1f9a45"],
      [4, 54, "#d8423f"],
    ]) {
      ctx.beginPath();
      ctx.moveTo(-9, -16);
      ctx.quadraticCurveTo(lean - 13, 12, lean - 15, len * 0.74);
      ctx.quadraticCurveTo(lean + 1, 18, 5, -12);
      ctx.fillStyle = color;
      ctx.fill();
    }
    // Feet on the branch.
    ctx.strokeStyle = "#8d8f96";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const fx of [-5, 6]) {
      ctx.beginPath();
      ctx.moveTo(fx, -8);
      ctx.lineTo(fx, 1);
      ctx.moveTo(fx - 4, 2);
      ctx.lineTo(fx + 4, 2);
      ctx.stroke();
    }
    // Body, belly and wing.
    ctx.save();
    ctx.translate(0, -38 - bob);
    ctx.rotate(0.2);
    const coat = ctx.createLinearGradient(-22, 0, 22, 0);
    coat.addColorStop(0, "#1f9443");
    coat.addColorStop(1, "#63d058");
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 32, 0, 0, TAU);
    ctx.fillStyle = coat;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, 6, 9, 20, -0.1, 0, TAU);
    ctx.fillStyle = rgba("#c8f58a", 0.5);
    ctx.fill();
    ctx.save();
    ctx.rotate(-0.16 - voice * 0.05);
    ctx.beginPath();
    ctx.ellipse(-9, 4, 13, 26, 0, 0, TAU);
    ctx.fillStyle = "#17803a";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-9, 20, 9, 12, 0, 0, Math.PI);
    ctx.fillStyle = "#2a66d0";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-6, -15, 8, 6, 0.3, 0, TAU);
    ctx.fillStyle = "#e2494a";
    ctx.fill();
    ctx.strokeStyle = rgba("#0c4a20", 0.55);
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-9, -4 + i * 7, 9, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    // Head.
    ctx.save();
    ctx.translate(10, -76 - bob * 1.4);
    ctx.rotate(look.tilt);
    disc(ctx, 0, 0, 17.5, "#3bbb51");
    ctx.beginPath();
    ctx.arc(0, 0, 17.5, -2.75, -0.75);
    ctx.quadraticCurveTo(2, -9, -15, -7);
    ctx.fillStyle = "#3b82e6";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, 3, 10, 9, 0.2, 0, TAU);
    ctx.fillStyle = "#ffd94f";
    ctx.fill();
    // Beak: the upper half lifts a little, the lower half drops as it talks.
    ctx.save();
    ctx.translate(13, 3);
    ctx.save();
    ctx.rotate(0.12 + voice * 0.55);
    ctx.beginPath();
    ctx.moveTo(-2, 1);
    ctx.quadraticCurveTo(7, 3, 10, 9);
    ctx.quadraticCurveTo(3, 12, -3, 8);
    ctx.closePath();
    ctx.fillStyle = "#3d3a36";
    ctx.fill();
    ctx.restore();
    ctx.rotate(-voice * 0.16);
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.bezierCurveTo(9, -12, 19, -3, 15, 10);
    ctx.quadraticCurveTo(11, 3, -2, 3);
    ctx.closePath();
    const horn = ctx.createLinearGradient(0, -10, 14, 8);
    horn.addColorStop(0, "#fbefd0");
    horn.addColorStop(1, "#b79f73");
    ctx.fillStyle = horn;
    ctx.fill();
    disc(ctx, 3, -4.5, 1.1, "#8a7650");
    ctx.restore();
    // Eye.
    disc(ctx, 3, -4, 6.2, "#fffdf6");
    disc(ctx, 3 + look.x * 2.2, -4 + look.y * 2.2, 3.3, "#17120e");
    disc(ctx, 2 + look.x * 2.2, -5.2 + look.y * 2.2, 1, "#ffffff");
    if (t % 3.7 > 3.58) {
      ctx.beginPath();
      ctx.arc(3, -4, 6.4, 0, TAU);
      ctx.fillStyle = "#2f9f48";
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  return (ctx, t, dt, p) => {
    const u = t % PERIOD;
    const take = TAKES[Math.floor(t / PERIOD) % TAKES.length];
    const said = span(u, ...SPEAK) * take.raw.length;
    const speaking = u > SPEAK[0] && u < SPEAK[1];
    // Each word is a burst of two or three beats.
    const beat = speaking ? 0.35 + 0.65 * Math.abs(Math.sin(said * Math.PI * 2.5)) * (0.6 + 0.4 * Math.sin(said * 1.7) ** 2) : 0;
    voice += (beat - voice) * (1 - Math.exp(-dt * 22));
    const bx = 112;
    const by = H - 34;
    const dx = p.inside ? p.x - (bx + 12) : 200;
    const dy = p.inside ? p.y - (by - 78) : speaking ? 0 : -20;
    const d = Math.hypot(dx, dy) || 1;
    const turn = 1 - Math.exp(-dt * 8);
    look.x += (dx / d - look.x) * turn;
    look.y += (dy / d - look.y) * turn;
    look.tilt += (clamp((dy / d) * 0.3, -0.28, 0.28) + (speaking ? 0 : Math.sin(t * 0.9) * 0.08) - look.tilt) * turn;

    sky(ctx, W, H, ["#082019", "#0f3a2c", "#1a5a3f"]);
    glow(ctx, W * 0.62, -30, 260, "#d8f59a", 0.22);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const x = W * 0.38 + i * 62 - p.nx * 12;
      ctx.moveTo(x, -10);
      ctx.lineTo(x + 26, -10);
      ctx.lineTo(x - 92, H + 10);
      ctx.lineTo(x - 136, H + 10);
      ctx.fillStyle = rgba("#e9ffb0", 0.035 + 0.012 * Math.sin(t * 0.8 + i));
      ctx.fill();
    }
    ctx.restore();
    for (const l of leaves) leaf(ctx, l, t, p);
    for (const m of motes) {
      const x = (((m.x + t * 6 * m.z - p.nx * 20 * m.z) % W) + W) % W;
      const y = m.y + Math.sin(t * 0.8 + m.phase) * 9;
      disc(ctx, x, y, 0.8 + m.z, rgba("#f3ffb8", 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + m.phase))));
    }

    // The branch and the parrot.
    const rise = out(span(t, 0, 0.7));
    ctx.save();
    ctx.translate(0, (1 - rise) * 60);
    ctx.beginPath();
    ctx.moveTo(-10, by + 13);
    ctx.quadraticCurveTo(90, by - 7, 222, by + 9);
    ctx.strokeStyle = "#4a2f1e";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.strokeStyle = "#6a4530";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, by + 10);
    ctx.quadraticCurveTo(90, by - 10, 222, by + 6);
    ctx.stroke();
    parrot(ctx, bx, by, t);
    ctx.restore();

    // The app.
    const ax = 312;
    const ay = 70;
    const aw = W - ax - 30;
    const ah = H - ay - 24;
    const slide = out(span(t, 0.2, 0.85));
    const mouthX = bx + 38;
    const mouthY = by - 76;
    ctx.save();
    ctx.translate((1 - slide) * 40 + p.nx * 3, 0);
    ctx.globalAlpha = slide;

    // The voice, as rings off the beak and a wave into the app.
    if (voice > 0.02) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.6 + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(mouthX - 6, mouthY, 8 + k * 30, -0.75, 0.75);
        ctx.strokeStyle = rgba("#fff1a6", (1 - k) * voice * 0.9);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const k = i / 60;
        const x = lerp(mouthX + 34, ax + 2, k);
        const y = lerp(mouthY, ay + 36, k) + Math.sin(k * 26 - t * 16) * 11 * voice * Math.sin(k * Math.PI);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      const wave = ctx.createLinearGradient(mouthX + 34, 0, ax, 0);
      wave.addColorStop(0, rgba("#fff1a6", 0));
      wave.addColorStop(0.3, rgba("#fff1a6", voice));
      wave.addColorStop(1, rgba("#ffffff", voice));
      ctx.strokeStyle = wave;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.shadowColor = rgba("#000000", 0.35);
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    box(ctx, ax, ay, aw, ah, 9, "#fbfdf6");
    ctx.shadowColor = "transparent";
    box(ctx, ax, ay, aw, 24, [9, 9, 0, 0], "#e8efe2");
    for (let i = 0; i < 3; i++) disc(ctx, ax + 13 + i * 10, ay + 12, 3, ["#f0786c", "#f3c14b", "#6cc56a"][i]);
    text(ctx, "New message", ax + 44, ay + 15.5, sans(9.5, 500), "#5a6b5f");

    const selecting = span(u, 4.3, 4.9);
    const rewriting = span(u, 5.1, 5.75);
    const rewritten = u > 5.75;
    const gone = 1 - span(u, PERIOD - 0.7, PERIOD - 0.2);
    // What the daemon is doing.
    const state = speaking ? "listening" : rewritten || u < SPEAK[0] ? "" : u > 4.2 ? "rewriting" : "";
    if (state) {
      const sw = state === "listening" ? 62 : 64;
      box(ctx, ax + aw - sw - 8, ay + 5, sw, 14, 7, state === "listening" ? "#e5484d" : "#2f7d4f");
      disc(ctx, ax + aw - sw - 1, ay + 12, 2.2, rgba("#ffffff", 0.5 + 0.5 * Math.sin(t * 9)));
      text(ctx, state, ax + aw - sw + 5, ay + 15, sans(8.5, 600), "#ffffff");
    }
    ctx.font = sans(12);
    const pad = 13;
    const words = rewritten ? take.clean : take.raw;
    const { placed } = wrap(ctx, words, aw - pad * 2);
    const shown = rewritten ? words.length : Math.ceil(said);
    ctx.globalAlpha = slide * gone;
    // The selection grows over the dictated words, one row at a time.
    if (!rewritten && selecting > 0) {
      const picked = placed.slice(0, Math.ceil(selecting * words.length));
      for (let row = 0; row <= picked.at(-1).row; row++) {
        const end = picked.findLast((w) => w.row === row);
        ctx.fillStyle = rgba("#3b82e6", 0.26);
        ctx.fillRect(ax + pad - 2, ay + 33.5 + row * 18, end.x + end.w + 4, 16);
      }
    }
    placed.forEach((w, i) => {
      if (i >= shown) return;
      const x = ax + pad + w.x;
      const y = ay + 45 + w.row * 18;
      const fresh = rewritten ? span(u, 5.75 + i * 0.035, 6 + i * 0.035) : span(said, i, i + 0.9);
      ctx.globalAlpha = slide * gone * fresh * (rewriting > 0 && !rewritten ? 1 - rewriting * 0.7 : 1);
      ctx.fillStyle = "#1c2b24";
      ctx.fillText(w.word, x, y + (1 - out(fresh)) * 4);
      ctx.globalAlpha = slide * gone;
    });
    // A shimmer runs across the text while it is rewritten.
    if (rewriting > 0 && rewriting < 1) {
      const x = ax + rewriting * aw;
      const beam = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
      beam.addColorStop(0, rgba("#7ed957", 0));
      beam.addColorStop(0.5, rgba("#7ed957", 0.55));
      beam.addColorStop(1, rgba("#7ed957", 0));
      ctx.fillStyle = beam;
      ctx.fillRect(Math.max(ax, x - 40), ay + 28, Math.min(80, ax + aw - x + 40), ah - 34);
    }
    const last = placed[Math.min(shown, placed.length) - 1];
    if (last && t % 1 < 0.55 && !selecting)
      box(ctx, ax + pad + last.x + last.w + 2, ay + 34 + last.row * 18, 1.4, 14, 0, "#1c2b24");
    // The shortcut that does it.
    const press = span(u, 4.85, 5.0) * (1 - span(u, 5.0, 5.3));
    const keys = span(u, 4.2, 4.5) * (1 - span(u, 6.2, 6.6));
    if (keys > 0) {
      ctx.globalAlpha = slide * keys;
      const kx = ax + aw - 68;
      const ky = ay + ah - 26;
      box(ctx, kx, ky + 3, 56, 16, 4, "#b8c4b6");
      box(ctx, kx, ky + press * 3, 56, 16, 4, "#ffffff", "#b8c4b6");
      text(ctx, "shortcut", kx + 28, ky + 11.5 + press * 3, sans(8.5, 600), "#33443a", "center");
    }
    ctx.restore();
  };
}
