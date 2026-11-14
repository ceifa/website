// monaco-liquid: a Liquid template being edited. The session plays what the
// package adds to Monaco: highlighting, autocomplete from the schema, a type
// on hover and a squiggle when a tag is left open. The preview renders the
// template as it changes. Point at user.name or user.isAdmin for its type.
import { TAU, clamp, lerp, span, out, back, rgba, box, disc, glow, sky, text } from "./kit.mjs";

export const ink = "#e8f5f1";

const COLORS = { d: "#5fd7c4", k: "#ff9dbd", v: "#9fd2ff", p: "#e9eef2", h: "#7f97ad", t: "#c5d0d6" };
const TYPES = { name: "string", age: "number", isAdmin: "boolean" };
const PERIOD = 11;
const WORD = /(\{[{%]|[%}]\})|(<\/?[a-z0-9]*>?)|([A-Za-z_]+)|(\s+)|(.)/g;

// Splits a template line into [text, kind] parts: Liquid delimiters, tag
// names, variables and properties inside them, HTML tags and text outside.
function parse(source) {
  const parts = [];
  let liquid = false;
  let dotted = false;
  for (const m of source.matchAll(WORD)) {
    let kind = "t";
    if (m[1]) {
      kind = "d";
      liquid = m[1][0] === "{";
    } else if (!liquid) kind = m[2] ? "h" : "t";
    else if (m[3]) kind = /^(if|else|endif)$/.test(m[3]) ? "k" : dotted ? "p" : "v";
    if (!m[4]) dotted = m[5] === ".";
    parts.push([m[0], kind]);
  }
  return parts;
}
const typing = (str, u, from, to) => str.slice(0, Math.floor(span(u, from, to) * str.length + 0.001));

export default function monaco({ W, H, fonts }) {
  const mono = (size, weight = 400) => `${weight} ${size}px ${fonts.mono}`;
  const sans = (size, weight = 400) => `${weight} ${size}px ${fonts.site}`;
  let rendered = "";
  let renderedAt = -9;

  return (ctx, t, dt, p) => {
    const u = t % PERIOD;
    const accepted = u >= 2.3;
    const expr = typing("{{ user.", u, 0.7, 1.35) + (accepted ? "name" : "") + typing(" }}</p>", u, 2.45, 3.0);
    const closing = u < 5.6 ? "{% endif %}" : u < 7.4 ? "{% endif %}".slice(0, Math.round((1 - span(u, 5.6, 6.0)) * 11)) : typing("{% endif %}", u, 7.4, 8.0);
    const lines = [
      "{% if user.isAdmin %}",
      "  <h1>Welcome back, {{ user.name }}!</h1>",
      "{% else %}",
      "  <p>Hello, " + expr,
      closing,
    ];
    const broken = closing !== "{% endif %}";
    const admin = u > 8.8;
    const menu = u >= 1.35 && u < 2.3;
    const picked = u > 1.75 && u < 2.05 ? 1 : 0;
    const caret = u < 5.3 ? [3, lines[3].length] : u < 8.3 ? [4, closing.length] : null;

    sky(ctx, W, H, ["#0c1a1c", "#12292b"]);
    glow(ctx, W * 0.8, H * 1.1, 240, "#2aa197", 0.28);
    glow(ctx, W * 0.1, -20, 200, "#3a5f8a", 0.25);

    const ex = 30;
    const ey = 71 + (1 - out(span(t, 0, 0.6))) * 18;
    const ew = W - 60;
    const eh = H - 71 - 13;
    const split = 302;
    ctx.globalAlpha = span(t, 0, 0.4);
    ctx.shadowColor = rgba("#000000", 0.4);
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    box(ctx, ex, ey, ew, eh, 8, "#152225");
    ctx.shadowColor = "transparent";
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ex, ey, ew, eh, 8);
    ctx.clip();
    ctx.fillStyle = "#0f1a1c";
    ctx.fillRect(ex, ey, ew, 20);
    ctx.fillStyle = "#152225";
    ctx.fillRect(ex, ey, 112, 20);
    ctx.fillStyle = "#5fd7c4";
    ctx.fillRect(ex, ey, 112, 1.5);
    // A drop, for Liquid.
    ctx.beginPath();
    ctx.moveTo(ex + 14, ey + 5);
    ctx.bezierCurveTo(ex + 20, ey + 12, ex + 18, ey + 16, ex + 14, ey + 16);
    ctx.bezierCurveTo(ex + 10, ey + 16, ex + 8, ey + 12, ex + 14, ey + 5);
    ctx.fillStyle = "#5fd7c4";
    ctx.fill();
    text(ctx, "welcome.liquid", ex + 24, ey + 13.5, sans(9.5), "#dfe9ea");

    // The code.
    const targets = [];
    lines.forEach((source, i) => {
      const y = ey + 36 + i * 14;
      if (caret?.[0] === i) {
        ctx.fillStyle = rgba("#ffffff", 0.045);
        ctx.fillRect(ex, y - 10, split, 14);
      }
      text(ctx, String(i + 1), ex + 20, y, mono(9), rgba("#c5d0d6", caret?.[0] === i ? 0.8 : 0.32), "right");
      ctx.font = mono(9.5);
      let x = ex + 30;
      for (const [str, kind] of parse(source)) {
        ctx.fillStyle = COLORS[kind];
        ctx.fillText(str, x, y);
        const w = ctx.measureText(str).width;
        if (kind === "p" && TYPES[str]) targets.push({ x, y, w, name: str });
        x += w;
      }
      if (caret?.[0] === i && (t % 1 < 0.55 || u < 3.1)) {
        ctx.fillStyle = "#e9eef2";
        ctx.fillRect(x + 0.5, y - 9, 1.3, 12);
      }
      if (caret?.[0] === i) caret.x = x;
      // The open tag gets the squiggle while its endif is gone.
      if (i === 0 && broken && u > 6.05) {
        const end = ex + 30 + ctx.measureText("{% if user.isAdmin %}").width;
        ctx.beginPath();
        for (let sx = ex + 30; sx <= end; sx += 2) ctx.lineTo(sx, y + 3 + (Math.round((sx - ex) / 2) % 2) * 2);
        ctx.strokeStyle = "#ff6b7a";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    });

    // The preview.
    const px = ex + split;
    const pw = ew - split;
    ctx.fillStyle = "#f5faf7";
    ctx.fillRect(px, ey + 20, pw, eh - 20);
    ctx.fillStyle = "#0f1a1c";
    ctx.fillRect(px, ey, pw, 20);
    text(ctx, "Preview", px + 10, ey + 13.5, sans(9.5), "#9fb3b5");
    box(ctx, px + pw - 92, ey + 4.5, 84, 11, 5.5, "#1d3033");
    text(ctx, `isAdmin: ${admin}`, px + pw - 50, ey + 12.7, mono(7.5), admin ? "#5fd7c4" : "#9fb3b5", "center");
    disc(ctx, px + pw - 86, ey + 10, 2, admin ? "#5fd7c4" : "#56696b");
    const output = admin ? "Welcome back, Gabriel!" : "Hello, " + (accepted && u >= 3.0 ? "Gabriel" : "");
    if (output !== rendered) {
      rendered = output;
      renderedAt = t;
    }
    const fresh = span(t, renderedAt, renderedAt + 0.5);
    ctx.save();
    ctx.globalAlpha *= broken && u > 6.05 ? 0.3 : 1;
    if (admin) text(ctx, output, px + 14, ey + 51, `600 13.5px ${fonts.display}`, "#16302b");
    else text(ctx, output, px + 14, ey + 48, sans(12), "#16302b");
    for (let i = 0; i < 3; i++) box(ctx, px + 14, ey + 66 + i * 9, [120, 142, 84][i], 4, 2, "#dbe7e1");
    ctx.restore();
    if (fresh < 1) {
      ctx.beginPath();
      ctx.arc(px + 14 + 60, ey + 46, fresh * 70, 0, TAU);
      ctx.strokeStyle = rgba("#2aa197", (1 - fresh) * 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (broken && u > 6.05) {
      box(ctx, px + 12, ey + eh - 40, pw - 24, 18, 4, "#ffe3e3");
      text(ctx, "template does not parse", px + 20, ey + eh - 28, sans(9, 500), "#b3261e");
    }

    // The status bar.
    ctx.fillStyle = broken && u > 6.05 ? "#5a1f2a" : "#1b4b47";
    ctx.fillRect(ex, ey + eh - 14, split, 14);
    text(ctx, "Liquid", ex + 10, ey + eh - 4, sans(8.5, 500), "#dff5f1");
    text(
      ctx,
      broken && u > 6.05 ? "✕ 1 problem: 'if' is never closed" : "✓ no problems",
      ex + split - 10,
      ey + eh - 4,
      sans(8.5, 500),
      "#dff5f1",
      "right",
    );
    ctx.restore();

    // Autocomplete, straight from the schema.
    if (menu && caret?.x) {
      const k = back(span(u, 1.35, 1.55));
      const mx = caret.x - 6;
      const my = ey + 36 + 3 * 14 + 6;
      ctx.globalAlpha = clamp(k);
      ctx.shadowColor = rgba("#000000", 0.5);
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 5;
      box(ctx, mx, my, 142, 47 * k, 5, "#1d3033", rgba("#5fd7c4", 0.4));
      ctx.shadowColor = "transparent";
      if (k > 0.9)
        Object.entries(TYPES).forEach(([name, type], i) => {
          if (i === picked) box(ctx, mx + 3, my + 3 + i * 13.6, 136, 13.6, 3, rgba("#5fd7c4", 0.22));
          box(ctx, mx + 8, my + 6.5 + i * 13.6, 7, 7, 1.5, "#9fd2ff");
          text(ctx, name, mx + 21, my + 13 + i * 13.6, mono(9), "#e9eef2");
          text(ctx, type, mx + 135, my + 13 + i * 13.6, mono(8.5), "#7f97ad", "right");
        });
    }

    // A type on hover: under the pointer if it is on a property, otherwise
    // the session shows one by itself.
    let over = p.inside ? targets.find((r) => p.x > r.x - 2 && p.x < r.x + r.w + 2 && p.y > r.y - 11 && p.y < r.y + 4) : null;
    let show = over ? 1 : 0;
    if (!over && u > 3.5 && u < 5.2) {
      over = targets.find((r) => r.name === "name");
      show = span(u, 3.9, 4.05) * (1 - span(u, 5.0, 5.2));
      const k = out(span(u, 3.5, 3.9));
      const cx = lerp(over.x + 70, over.x + over.w / 2, k);
      const cy = lerp(over.y + 50, over.y - 1, k);
      ctx.globalAlpha = span(u, 3.5, 3.6) * (1 - span(u, 5.0, 5.2));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + 11);
      ctx.lineTo(cx + 3, cy + 8.5);
      ctx.lineTo(cx + 5.5, cy + 13);
      ctx.lineTo(cx + 7.2, cy + 12.2);
      ctx.lineTo(cx + 4.8, cy + 7.8);
      ctx.lineTo(cx + 8.5, cy + 7.6);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#0c1a1c";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }
    if (over && show > 0) {
      ctx.globalAlpha = show;
      const label = `(property) ${over.name}: ${TYPES[over.name]}`;
      ctx.font = mono(8.5);
      const w = ctx.measureText(label).width + 16;
      const tx = clamp(over.x - 6, ex + 4, W - w - 34);
      box(ctx, over.x, over.y + 2, over.w, 1.2, 0, "#9fd2ff");
      box(ctx, tx, over.y - 31, w, 17, 4, "#1d3033", rgba("#5fd7c4", 0.5));
      text(ctx, "(property) ", tx + 8, over.y - 19.5, mono(8.5), "#7f97ad");
      const at = tx + 8 + ctx.measureText("(property) ").width;
      text(ctx, `${over.name}: `, at, over.y - 19.5, mono(8.5), "#e9eef2");
      text(ctx, TYPES[over.name], at + ctx.measureText(`${over.name}: `).width, over.y - 19.5, mono(8.5), "#5fd7c4");
    }
    ctx.globalAlpha = 1;
  };
}
