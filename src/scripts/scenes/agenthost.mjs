// agenthost: an agent is asked to publish a report. It makes the one request
// that takes, the files rise into the cloud, and the private link it answers
// with opens as a page. Asked again, it updates the same page.
import { TAU, clamp, lerp, span, out, back, smooth, rng, rgba, box, disc, glow, sky, text, width } from "./kit.mjs";

export const ink = "#0f3a3a";

const PERIOD = 10;
// What the agent is asked on the first lap and on every one after it.
const TURNS = [
  { ask: "publish the report on agenthost", doing: "Publishing", done: "Published. It is private:" },
  { ask: "update it with the new numbers", doing: "Updating", done: "Updated, on the same link:" },
];
// When the request is sent, the tool call starts and the answer begins.
const ENTERED = 1.6;
const TOOL = 1.9;
const ANSWERED = 3.4;
const TERMINAL = 226;
const CLAUDE = "#d97757";
const DIM = "#8b877c";
const FILES = [
  ["md", "#4f8fd9"],
  ["css", "#e58a3c"],
  ["png", "#4caf7a"],
];
const BARS = [
  [0.45, 0.7, 0.55, 0.85, 0.62],
  [0.6, 0.5, 0.8, 0.7, 0.95],
];

export default function agenthost({ W, H, fonts }) {
  const rand = rng(8);
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const sans = (size, weight = 400) => `${weight} ${size}px ${fonts.site}`;
  const clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 130 + rand() * 60, y: 14 + rand() * 40, s: 0.5 + rand() * 0.5 }));

  function cloud(ctx, x, y, s, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (const [dx, dy, r] of [
      [-22, 6, 15],
      [-6, -6, 20],
      [14, -2, 17],
      [28, 8, 12],
      [4, 10, 16],
    ])
      ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s, 0, 0, TAU);
    ctx.fill();
  }
  // Claude Code's mark: eight short rays.
  function spark(ctx, x, y, r, turn, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  function file(ctx, x, y, size, label, color, turn) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    ctx.scale(size, size);
    ctx.beginPath();
    ctx.moveTo(-9, -12);
    ctx.lineTo(4, -12);
    ctx.lineTo(9, -7);
    ctx.lineTo(9, 12);
    ctx.lineTo(-9, 12);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = rgba("#0f3a3a", 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    box(ctx, -9, 2, 18, 8, 0, color);
    text(ctx, label, 0, 8.6, mono(6.5, 700), "#ffffff", "center");
    ctx.restore();
  }

  return (ctx, t, dt, p) => {
    const u = t % PERIOD;
    const first = t < PERIOD;
    const round = Math.floor(t / PERIOD);
    // After the first run the page is already up: each lap republishes it.
    const sentAt = 2.2;
    const landed = 3.15;
    const opened = first ? span(u, landed, landed + 0.5) : 1;
    const hubX = (30 + TERMINAL + W - 226) / 2 + p.nx * 4;
    const hubY = 50;

    sky(ctx, W, H, ["#cfeee9", "#e4f6ef", "#f4fbf3"]);
    glow(ctx, W * 0.85, 10, 190, "#ffffff", 0.8);
    for (const c of clouds) {
      const x = ((((c.x + t * 4 * c.s - p.nx * 16 * c.s) % (W + 140)) + W + 140) % (W + 140)) - 70;
      cloud(ctx, x, c.y, c.s, rgba("#ffffff", 0.75));
    }

    // The agent: a Claude Code session that is asked to publish, runs the one
    // request agenthost needs, and answers with the link.
    const turn = TURNS[first ? 0 : 1];
    const tx = 30 - (1 - out(span(t, 0, 0.7))) * 24;
    const ty = 82;
    const tw = TERMINAL;
    const th = H - ty - 17;
    const asked = u >= ENTERED;
    const working = asked && u < ANSWERED;
    const shown = span(t, 0, 0.5);
    const gone = 1 - span(u, PERIOD - 0.6, PERIOD - 0.2);
    ctx.globalAlpha = shown;
    ctx.shadowColor = rgba("#0f3a3a", 0.28);
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 7;
    box(ctx, tx, ty, tw, th, 8, "#1b1a18");
    ctx.shadowColor = "transparent";
    spark(ctx, tx + 14, ty + 12, 4.2, working ? t * 2.4 : 0, CLAUDE);
    text(ctx, "Claude Code", tx + 23, ty + 15, mono(8.3, 700), "#f0ede4");
    text(ctx, "~/code/site", tx + tw - 11, ty + 15, mono(8), DIM, "right");

    const row = (n) => ty + 29.5 + n * 11.3;
    ctx.globalAlpha = shown * gone;
    if (asked) {
      text(ctx, ">", tx + 11, row(0), mono(8.3), DIM);
      text(ctx, turn.ask, tx + 21, row(0), mono(8.3), "#b9b5a9");
    }
    if (u > TOOL) {
      // The tool call: the dot blinks while it runs and turns green when it returns.
      const returned = u > landed;
      disc(ctx, tx + 13.5, row(1) - 2.8, 2.4, returned ? "#6cc56a" : rgba("#f0ede4", t % 0.7 < 0.4 ? 1 : 0.25));
      text(ctx, "Bash", tx + 21, row(1), mono(8.3, 700), "#f0ede4");
      text(ctx, "(curl -X PUT … /shares/report)", tx + 21 + width(ctx, "Bash", mono(8.3, 700)), row(1), mono(8.3), "#f0ede4");
      if (returned) {
        ctx.globalAlpha = shown * gone * span(u, landed, landed + 0.2);
        ctx.beginPath();
        ctx.moveTo(tx + 23, row(2) - 8);
        ctx.lineTo(tx + 23, row(2) - 3);
        ctx.lineTo(tx + 28, row(2) - 3);
        ctx.strokeStyle = DIM;
        ctx.lineWidth = 1;
        ctx.stroke();
        text(ctx, '{ "url": "https://ceifa-report.ag…" }', tx + 33, row(2), mono(8.3), DIM);
        ctx.globalAlpha = shown * gone;
      }
    }
    if (working) {
      // Claude Code's spinner line.
      const y = row(u > landed ? 3 : u > TOOL ? 2 : 1);
      spark(ctx, tx + 13.5, y - 2.8, 3.4, t * 5, CLAUDE);
      const label = `${turn.doing}…`;
      text(ctx, label, tx + 21, y, mono(8.3), CLAUDE);
      text(ctx, ` (${Math.floor(u - ENTERED)}s · esc to interrupt)`, tx + 21 + width(ctx, label, mono(8.3)), y, mono(8.3), DIM);
    } else if (asked) {
      const said = turn.done.slice(0, Math.floor(span(u, ANSWERED, ANSWERED + 0.5) * turn.done.length));
      disc(ctx, tx + 13.5, row(3) - 2.8, 2.4, "#f0ede4");
      text(ctx, said, tx + 21, row(3), mono(8.3), "#f0ede4");
      const link = "ceifa-report.agenthost.page".slice(0, Math.floor(span(u, ANSWERED + 0.5, ANSWERED + 1) * 27));
      text(ctx, link, tx + 21, row(4), mono(8.3), "#7fd8cb");
      if (link) box(ctx, tx + 21, row(4) + 1.8, width(ctx, link, mono(8.3)), 0.8, 0, rgba("#7fd8cb", 0.7));
    }
    // The prompt box, where the request is typed.
    ctx.globalAlpha = shown;
    box(ctx, tx + 7, ty + th - 22, tw - 14, 15.5, 4, null, "#4b4841");
    text(ctx, ">", tx + 13, ty + th - 11, mono(8.3), DIM);
    const draft = asked ? "" : turn.ask.slice(0, Math.floor(span(u, 0.5, ENTERED - 0.15) * turn.ask.length));
    text(ctx, draft, tx + 23, ty + th - 11, mono(8.3), "#f0ede4");
    if (t % 1 < 0.55 || (!asked && u > 0.5))
      box(ctx, tx + 23.5 + width(ctx, draft, mono(8.3)), ty + th - 19, 4.2, 9.5, 0, rgba("#f0ede4", 0.75));
    ctx.globalAlpha = 1;

    // The cloud it publishes to, and the files on their way up.
    const bump = FILES.reduce((most, _, i) => Math.max(most, 1 - span(u, sentAt + 0.45 + i * 0.18, sentAt + 0.85 + i * 0.18)), 0);
    const puff = u > sentAt + 0.45 && u < landed + 0.4 ? bump : 0;
    const float = Math.sin(t * 1.3) * 2.5;
    const grow = back(span(t, 0.2, 0.9));
    cloud(ctx, hubX, hubY + 4 + float, 1.28 * grow, rgba("#7fc8c0", 0.35));
    cloud(ctx, hubX, hubY + float, (1.25 + puff * 0.1) * grow, "#ffffff");
    text(ctx, "agenthost", hubX + 2, hubY + 8 + float, sans(9.5, 700), rgba("#0f3a3a", 0.8 * clamp(grow)), "center");
    FILES.forEach(([label, color], i) => {
      const k = span(u, sentAt + i * 0.18, sentAt + 0.5 + i * 0.18);
      if (k <= 0 || k >= 1) return;
      const e = smooth(k);
      const x = lerp(tx + tw - 22, hubX, e);
      const y = lerp(ty + 30, hubY + float, e) - Math.sin(e * Math.PI) * (14 + i * 7);
      file(ctx, x, y, 1 - e * 0.45, label, color, (e - 0.5) * (i - 1) * 0.9);
    });
    // The link coming back down to the browser.
    const link = span(u, landed - 0.45, landed);
    const bx = W - 30 - 196 + p.nx * 5;
    const by = 80 + (1 - out(opened)) * 14;
    const bw = 196;
    const bh = H - 80 - 14;
    if (link > 0 && link < 1) {
      const e = smooth(link);
      const x = lerp(hubX + 20, bx + 40, e);
      const y = lerp(hubY + float, by + 12, e) - Math.sin(e * Math.PI) * 16;
      glow(ctx, x, y, 14, "#2aa197", 0.9);
      disc(ctx, x, y, 3, "#ffffff");
    }

    // The page behind the link.
    if (opened > 0) {
      ctx.globalAlpha = clamp(opened * 1.5);
      ctx.save();
      ctx.translate(bx + bw / 2, by + bh / 2);
      ctx.scale(0.86 + 0.14 * back(opened), 0.86 + 0.14 * back(opened));
      ctx.translate(-bw / 2, -bh / 2);
      ctx.shadowColor = rgba("#0f3a3a", 0.3);
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      box(ctx, 0, 0, bw, bh, 8, "#ffffff");
      ctx.shadowColor = "transparent";
      box(ctx, 0, 0, bw, 23, [8, 8, 0, 0], "#e3efec");
      box(ctx, 8, 5, bw - 16, 13.5, 6.75, "#ffffff");
      // A padlock: the link is private.
      const locked = first ? back(span(u, landed + 0.5, landed + 0.85)) : 1;
      ctx.save();
      ctx.translate(17.5, 12);
      ctx.scale(locked, locked);
      box(ctx, -3.6, -1, 7.2, 5.6, 1.4, "#2aa197");
      ctx.beginPath();
      ctx.arc(0, -1, 2.3, Math.PI, 0);
      ctx.strokeStyle = "#2aa197";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
      text(ctx, "ceifa-report", 25, 15, mono(8), "#0f3a3a");
      ctx.font = mono(8);
      text(ctx, ".agenthost.page", 25 + ctx.measureText("ceifa-report").width, 15, mono(8), rgba("#0f3a3a", 0.5));

      const born = first ? landed + 0.35 : -9;
      text(ctx, "Q3 report", 14, 42, `600 13px ${fonts.display}`, "#0f3a3a");
      const draw = (k) => span(u, born + k, born + k + 0.35);
      box(ctx, 14, 48, 62 * draw(0.1), 3.5, 1.75, "#d7e6e2");
      // The chart: it grows in, and changes when the share is published again.
      const from = BARS[(round + 1) % 2];
      const to = BARS[round % 2];
      const swap = first ? 1 : smooth(span(u, landed, landed + 0.6));
      BARS[0].forEach((_, i) => {
        const height = lerp(from[i], to[i], swap) * 38 * (first ? out(draw(0.25 + i * 0.07)) : 1);
        box(ctx, 16 + i * 17, 100 - height, 11, height, [2.5, 2.5, 0, 0], i === 4 ? "#2aa197" : "#9dd6cf");
      });
      ctx.fillStyle = "#d7e6e2";
      ctx.fillRect(12, 100, 88, 1);
      for (let i = 0; i < 5; i++) box(ctx, 112, 58 + i * 9.5, [66, 58, 70, 44, 62][i] * draw(0.3 + i * 0.06), 3.5, 1.75, "#d7e6e2");
      if (!first && u > landed && u < landed + 1.8) {
        ctx.globalAlpha = span(u, landed, landed + 0.2) * (1 - span(u, landed + 1.4, landed + 1.8));
        box(ctx, bw - 62, 31, 50, 14, 7, "#2aa197");
        text(ctx, "updated", bw - 37, 40.6, sans(8, 600), "#ffffff", "center");
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  };
}
