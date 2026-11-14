// A change of theme does not cut from one palette to the other: the new one
// soaks through the paper from where it was asked for, running ahead along
// some fibres and throwing a few drops in front of itself. The outline is
// drawn here, frame by frame, and clips the view transition's new snapshot
// (see the `soaking` rules in site.css).
const root = document.documentElement;
const calm = matchMedia("(prefers-reduced-motion: reduce)");
const LASTS = 1300; // keep in step with soak-hold in site.css
const POINTS = 200;
let soaking = null, // the transition under way
  missed = null; // where a press landed on it

// A closed, smooth outline through `points`. Every outline is wound the same
// way, so overlapping ones add up instead of cutting holes.
function outline(points) {
  const mid = (a, b) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  let path = `M${mid(points.at(-1), points[0])}`;
  points.forEach((point, i) => {
    path += `Q${point[0].toFixed(1)} ${point[1].toFixed(1)} ${mid(point, points[(i + 1) % points.length])}`;
  });
  return path + "Z";
}
const ring = (x, y, radius, count, reach = () => 1) =>
  outline(
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const r = radius * reach(angle);
      return [x + Math.cos(angle) * r, y + Math.sin(angle) * r];
    }),
  );

function spread(transition, x, y) {
  const far = Math.max(
    ...[0, innerWidth].flatMap((cx) => [0, innerHeight].map((cy) => Math.hypot(cx - x, cy - y))),
  );
  // The fibres the ink runs along: a few broad tongues and a fine fringe.
  const fibres = [3, 5, 8, 13, 21, 34, 55, 89].map((count) => ({
    count,
    size: 1 / count ** 0.75,
    phase: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 2.4,
  }));
  const drops = Array.from({ length: 16 }, () => ({
    angle: Math.random() * Math.PI * 2,
    away: (0.08 + Math.random() * 0.9) * far,
    lead: 30 + Math.random() * 70,
    size: 4 + Math.random() * 13,
  }));
  const since = performance.now();
  function draw(now) {
    if (soaking !== transition) return;
    const age = Math.min(1, (now - since) / LASTS);
    // Paper drinks fast at first, then slowly. The front ends past the far
    // corner by more than its own roughness, so nothing is left dry.
    const front = (far * 1.16 + 30) * (1 - (1 - age) ** 1.8);
    const rough = 0.2 * (1 - age * 0.55);
    let path = ring(x, y, front, POINTS, (angle) => {
      let run = 0;
      for (const fibre of fibres)
        run += fibre.size * Math.sin(fibre.count * angle + fibre.phase + fibre.drift * age);
      return 1 + rough * run;
    });
    // A drop appears just ahead of the front and is swallowed by it.
    for (const drop of drops) {
      const near = (front - (drop.away - drop.lead)) / drop.lead;
      if (near > 0 && near < 2.5)
        path += ring(
          x + Math.cos(drop.angle) * drop.away,
          y + Math.sin(drop.angle) * drop.away,
          drop.size * Math.min(1, near),
          14,
        );
    }
    root.style.setProperty("--soak", `path("${path}")`);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// Runs `change`, letting what it changes soak outwards from `origin`.
export function soak(origin, change) {
  if (!document.startViewTransition || calm.matches) {
    change();
    return;
  }
  const box = origin.getBoundingClientRect();
  root.classList.add("soaking");
  root.style.setProperty("--soak", "circle(0px)");
  // Starting over while the ink still runs abandons the earlier transition.
  const transition = (soaking = document.startViewTransition(change));
  transition.ready.then(
    () => spread(transition, box.left + box.width / 2, box.top + box.height / 2),
    () => {},
  );
  transition.finished.finally(() => {
    if (soaking !== transition) return;
    soaking = null;
    root.classList.remove("soaking");
    root.style.removeProperty("--soak");
  });
}

// While the two themes share the screen the browser gives every press to the
// root element, whatever lies under the pointer, so the page would be dead
// until the ink had finished. Instead a press finishes it at once, and the
// click it was the start of is handed to what was really pressed.
const at = ({ clientX, clientY }) => ({ clientX, clientY, view: window });
addEventListener(
  "pointerdown",
  (e) => {
    if (!soaking) return;
    soaking.skipTransition();
    missed = { x: e.clientX, y: e.clientY };
  },
  true,
);
addEventListener(
  "click",
  (e) => {
    const press = missed;
    missed = null;
    if (!press || e.target !== root || Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8)
      return;
    document
      .elementFromPoint(e.clientX, e.clientY)
      ?.dispatchEvent(new MouseEvent("click", { ...at(e), bubbles: true, cancelable: true }));
  },
  true,
);
