// Eleven: a message leaves a chat app, crosses the gateway and reaches an
// agent working in a folder on your own machine; the tools it runs show up in
// that folder, and the answer streams back to the phone.
import { TAU, lerp, span, out, back, smooth, rng, rgba, box, disc, glow, sky, text, wrap } from "./kit.mjs";

export const ink = "#f4f0ff";

const PERIOD = 9.4;
const TALKS = [
  {
    app: "Telegram",
    tint: "#2aabee",
    ask: "Did the tests pass?",
    tools: ["read  package.json", "bash  npm test"],
    result: "212 passed, 0 failed",
    answer: "Yes. All 212 tests are green.",
  },
  {
    app: "Discord",
    tint: "#5865f2",
    ask: "Ship the fix for the blog",
    tools: ["edit  src/pages/post.astro", "bash  npm run deploy"],
    result: "deployed in 41s",
    answer: "Done. The fix is live.",
  },
];

export default function eleven({ W, H, fonts }) {
  const rand = rng(4);
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const sans = (size, weight = 400) => `${weight} ${size}px ${fonts.site}`;
  const dust = Array.from({ length: 40 }, () => ({ x: rand() * W, y: rand() * H, r: 0.5 + rand(), phase: rand() * TAU }));

  function bubble(ctx, words, x, y, max, mine, tint, shown = Infinity) {
    ctx.font = sans(8.6);
    const { placed, rows } = wrap(ctx, words, max - 14);
    const w = Math.max(...placed.map((q) => q.x + q.w)) + 14;
    const h = rows * 11 + 9;
    box(ctx, mine ? x - w : x, y, w, h, 7, mine ? tint : "#ffffff");
    ctx.fillStyle = mine ? "#ffffff" : "#231a3a";
    placed.forEach((q, i) => {
      if (i < shown) ctx.fillText(q.word, (mine ? x - w : x) + 7 + q.x, y + 12.5 + q.row * 11);
    });
    return h;
  }

  return (ctx, t, dt, p) => {
    const u = t % PERIOD;
    const talk = TALKS[Math.floor(t / PERIOD) % TALKS.length];
    const mid = H / 2 + 14;
    const phoneX = W - 132 + p.nx * 6;
    const phoneW = 100;
    const workX = 30 - (1 - out(span(t, 0, 0.7))) * 24;
    const workW = 226;
    const nodeX = (30 + workW + W - 132) / 2 + 6 + p.nx * 3;

    sky(ctx, W, H, ["#141127", "#20183c", "#2c1d4a"]);
    glow(ctx, nodeX, mid, 210, "#7a4ce0", 0.3);
    glow(ctx, W, 0, 220, talk.tint, 0.18);
    for (const d of dust)
      disc(ctx, d.x - p.nx * 10 * d.r, d.y, d.r, rgba("#d9ceff", 0.1 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3 + d.phase))));

    // The wire through the gateway, and what travels on it.
    const a = [workX + workW, mid];
    const b = [phoneX, mid];
    ctx.setLineDash([2, 5]);
    ctx.lineDashOffset = -t * 10;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.strokeStyle = rgba("#b9a6ff", 0.4);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    const packet = (k, color, wobble = 0) => {
      if (k <= 0 || k >= 1) return;
      const x = lerp(b[0], a[0], k);
      const y = mid + Math.sin(k * 14 + wobble) * 3;
      glow(ctx, x, y, 12, color, 0.9);
      disc(ctx, x, y, 2.6, "#ffffff");
    };
    packet(smooth(span(u, 1.35, 2.25)), talk.tint);
    for (let i = 0; i < 6; i++) packet(1 - smooth(span(u, 4.25 + i * 0.17, 5.0 + i * 0.17)), "#c9b8ff", i);

    // The gateway.
    const relay = Math.max(1 - span(u, 1.8, 2.3), 0) * (u > 1.75 ? 1 : 0) + (u > 4.5 && u < 5.9 ? 0.5 + 0.5 * Math.sin(u * 16) : 0);
    const grow = back(span(t, 0.2, 0.8));
    ctx.save();
    ctx.translate(nodeX, mid);
    ctx.scale(grow, grow);
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.5 + i / 2) % 1;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + k * 22, 0, TAU);
      ctx.strokeStyle = rgba("#b9a6ff", (1 - k) * 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.shadowColor = "#9b7bff";
    ctx.shadowBlur = 14 + relay * 16;
    box(ctx, -19, -19, 38, 38, 11, "#2b1f55", rgba("#b9a6ff", 0.7), 1.4);
    ctx.shadowBlur = 0;
    text(ctx, "11", 0, 7.5, `600 22px ${fonts.display}`, "#efe9ff", "center");
    ctx.restore();
    text(ctx, "eleven", nodeX, mid + 34, mono(8.5, 600), rgba("#d9ceff", 0.85), "center");
    text(ctx, "127.0.0.1:1111", nodeX, mid + 45, mono(7.5), rgba("#d9ceff", 0.45), "center");

    // The folder the agent works in.
    const wy = 70;
    const wh = H - wy - 17;
    ctx.globalAlpha = span(t, 0, 0.5);
    box(ctx, workX, wy, workW, wh, 8, rgba("#0d0b1c", 0.8), rgba("#b9a6ff", 0.24));
    ctx.beginPath();
    ctx.roundRect(workX + 10, wy + 8, 6, 3, [1.5, 1.5, 0, 0]);
    ctx.roundRect(workX + 10, wy + 10, 12, 8, 1.5);
    ctx.fillStyle = "#e8c15a";
    ctx.fill();
    text(ctx, "~/code/site", workX + 28, wy + 17, mono(8.5, 600), "#efe9ff");
    const busy = u > 2.3 && u < 4.2;
    disc(ctx, workX + workW - 54, wy + 14, 2.4, busy ? "#ffd27a" : "#7ee0a1");
    text(ctx, busy ? "working" : "idle", workX + workW - 47, wy + 17, mono(8), rgba("#efe9ff", 0.6));
    ctx.fillStyle = rgba("#b9a6ff", 0.16);
    ctx.fillRect(workX + 1, wy + 25, workW - 2, 1);
    const gone = 1 - span(u, PERIOD - 0.9, PERIOD - 0.4);
    const rows = [
      [2.3, 2.95, talk.tools[0]],
      [2.95, 4.0, talk.tools[1]],
    ];
    rows.forEach(([from, to, tool], i) => {
      if (u < from) return;
      const y = wy + 42 + i * 14;
      ctx.globalAlpha = span(u, from, from + 0.2) * gone;
      if (u < to) {
        ctx.beginPath();
        ctx.arc(workX + 15, y - 3, 3.2, t * 9, t * 9 + 4.4);
        ctx.strokeStyle = "#ffd27a";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else text(ctx, "✓", workX + 11, y, mono(9, 700), "#7ee0a1");
      const [verb, arg] = tool.split("  ");
      text(ctx, verb, workX + 25, y, mono(8.8, 600), "#c9b8ff");
      text(ctx, arg, workX + 53, y, mono(8.8), "#efe9ff");
    });
    if (u > 4.0) {
      ctx.globalAlpha = span(u, 4.0, 4.2) * gone;
      text(ctx, talk.result, workX + 25, wy + 70, mono(8.8), "#7ee0a1");
      ctx.globalAlpha = span(u, 4.25, 4.45) * gone;
      text(ctx, "→", workX + 11, wy + 86, mono(9, 700), "#c9b8ff");
      text(ctx, `reply to ${talk.app}`, workX + 25, wy + 86, mono(8.8), rgba("#efe9ff", 0.75));
    }
    ctx.globalAlpha = 1;

    // The phone.
    const py = 22 + (1 - out(span(t, 0.1, 0.8))) * 40 + p.ny * 2;
    const ph = H - 34;
    ctx.globalAlpha = span(t, 0.1, 0.5);
    ctx.shadowColor = rgba("#000000", 0.5);
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    box(ctx, phoneX, py, phoneW, ph, 15, "#0b0916");
    ctx.shadowColor = "transparent";
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(phoneX + 4, py + 4, phoneW - 8, ph - 8, 11.5);
    ctx.clip();
    ctx.fillStyle = "#efeaf7";
    ctx.fillRect(phoneX, py, phoneW, ph);
    ctx.fillStyle = talk.tint;
    ctx.fillRect(phoneX, py, phoneW, 30);
    disc(ctx, phoneX + 18, py + 17, 7, rgba("#ffffff", 0.28));
    text(ctx, "11", phoneX + 18, py + 20.2, `600 9px ${fonts.display}`, "#ffffff", "center");
    text(ctx, "my agent", phoneX + 30, py + 16, sans(8.6, 650), "#ffffff");
    text(ctx, talk.app, phoneX + 30, py + 25, sans(7, 500), rgba("#ffffff", 0.8));
    const right = phoneX + phoneW - 10;
    let y = py + 38;
    const max = phoneW - 22;
    if (u > 1.3) {
      ctx.globalAlpha = span(u, 1.3, 1.5) * gone;
      ctx.save();
      const pop = back(span(u, 1.3, 1.6));
      ctx.translate(right, y);
      ctx.scale(pop, pop);
      const h = bubble(ctx, talk.ask.split(" "), 0, 0, max, true, talk.tint);
      ctx.restore();
      y += h + 6;
    }
    if (u > 2.3 && u < 4.55) {
      ctx.globalAlpha = span(u, 2.3, 2.5);
      box(ctx, phoneX + 10, y, 30, 17, 7, "#ffffff");
      for (let i = 0; i < 3; i++) disc(ctx, phoneX + 18 + i * 7, y + 8.5 - Math.max(0, Math.sin(t * 7 - i * 0.9)) * 2.5, 1.8, "#8f85a8");
    }
    if (u >= 4.55) {
      const words = talk.answer.split(" ");
      ctx.globalAlpha = gone;
      bubble(ctx, words, phoneX + 10, y, max, false, talk.tint, Math.ceil(span(u, 4.55, 5.75) * words.length));
    }
    // The message being written.
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(phoneX, py + ph - 28, phoneW, 28);
    box(ctx, phoneX + 9, py + ph - 23, phoneW - 34, 15, 7.5, "#efeaf7");
    const draft = u < 1.3 ? talk.ask.slice(0, Math.floor(span(u, 0.45, 1.2) * talk.ask.length)) : "";
    ctx.save();
    ctx.beginPath();
    ctx.rect(phoneX + 13, py + ph - 23, phoneW - 42, 15);
    ctx.clip();
    ctx.font = sans(8);
    const over = Math.max(0, ctx.measureText(draft).width - (phoneW - 46));
    text(ctx, draft || (u > 1.3 ? "Message" : ""), phoneX + 15 - over, py + ph - 12.5, sans(8), draft ? "#231a3a" : "#a59cba");
    ctx.restore();
    disc(ctx, phoneX + phoneW - 15, py + ph - 15.5, 7, talk.tint);
    ctx.beginPath();
    ctx.moveTo(phoneX + phoneW - 18, py + ph - 12.5);
    ctx.lineTo(phoneX + phoneW - 11.5, py + ph - 15.5);
    ctx.lineTo(phoneX + phoneW - 18, py + ph - 18.5);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  };
}
