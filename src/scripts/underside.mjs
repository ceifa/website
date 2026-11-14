// The underside: a resident that goes through the bottom of the page turns
// the sheet over. The other side wears the other theme, and there the
// resident walks beneath the lines, hanging from them. It gets through by
// dropping from the page's last ground, or by being pressed into the bottom
// edge and let go; from below, a jump back through that edge returns it.
import { SIZE } from "./walker.mjs";
import { world } from "./inhabit.mjs";
import { other, show } from "./theme.mjs";

const root = document.documentElement;
const site = document.querySelector(".site");
const resident = document.getElementById("resident");
const calm = matchMedia("(prefers-reduced-motion: reduce)");
let turning = false;

// The sheet turns about the middle of the window, wherever the page is
// scrolled to, the turn included.
const pivot = () =>
  (site.style.transformOrigin = `50% ${scrollY + innerHeight / 2 - site.offsetTop}px`);
// Seen flat, with no perspective: a page is far taller than the window, and
// turned in perspective its ends would swing past the viewer and stretch the
// scrolling area many times over.
const edgeOn = (from, to, duration, easing) =>
  site.animate({ transform: [`scaleY(${from})`, `scaleY(${to})`] }, { duration, easing }).finished;

// `through` is the edge of the page the resident slipped through.
async function turn(through) {
  if (turning) return;
  turning = true;
  const { actor } = world;
  const hide = resident.animate({ opacity: [1, 0] }, { duration: 150, fill: "forwards" });
  await hide.finished;
  pivot();
  addEventListener("scroll", pivot, { passive: true });
  if (!calm.matches) await edgeOn(1, 0, 300, "cubic-bezier(.55, 0, 1, .45)");
  // The other side's theme is where the visitor is, not what they chose.
  show(other(), false);
  world.flip(!world.flipped);
  root.toggleAttribute("data-underside", world.flipped);
  if (!calm.matches) await edgeOn(0, 1, 420, "cubic-bezier(0, .55, .45, 1)");
  removeEventListener("scroll", pivot);
  site.style.transformOrigin = "";
  // It comes out of the edge it went into: falling away from it where that
  // edge is the simulation's top, hopping out of it where it is the ground.
  const falls = (through === "bottom") === world.flipped;
  actor.y = falls ? 2 : world.bounds.bottom - SIZE.height;
  actor.vy = falls ? 60 : -520;
  // Unless the visitor has scrolled that edge away meanwhile: then it drops
  // in from the edge of the window instead.
  const top = world.top();
  if (top + SIZE.height < scrollY || top > scrollY + innerHeight) {
    actor.y = world.level(scrollY + (world.flipped ? innerHeight : 0)) + 2;
    actor.vy = 60;
  }
  actor.ground = null;
  hide.cancel();
  world.wake();
  turning = false;
}

// The simulation's "bottom" is the page's bottom edge above and its top edge below.
world.on("drop", (ground) => {
  if (ground !== "bottom" || turning) return false;
  turn(world.flipped ? "top" : "bottom");
  return true;
});
world.on("push", () => turn("bottom"));
world.on("frame", () => {
  const { actor } = world;
  if (world.flipped && !turning && actor.y < 3 && actor.vy < -40) {
    actor.vy = 0;
    turn("bottom");
  }
});
