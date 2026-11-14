// The resident's expressions: where it looks, how it feels, and the small
// things it does when left alone. Movement itself lives in inhabit.mjs.
const resident = document.getElementById("resident");
const pose = resident.querySelector(".pose");
const eyes = resident.querySelector(".eyes");
const fx = resident.querySelector(".resident-fx");
const lounge = document.getElementById("lounge");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
// How long it stays awake with nothing going on: less in the armchair.
const DROWSY = { standing: 30000, seated: 8000 };
let moodTimer,
  idleTimer = 0,
  quietAt = 0,
  pointer = null,
  face = { x: 0, y: 0 },
  gaze = "";

function play(element, frames, duration, easing = "ease-in-out") {
  if (reducedMotion.matches || document.hidden) return null;
  return element.animate(frames, { duration, easing });
}
// A glyph or a puff that drifts away from the resident and disappears.
function emit(text, from, to, duration, className = "") {
  const particle = document.createElement("i");
  particle.className = className;
  particle.textContent = text;
  fx.append(particle);
  const animation = play(
    particle,
    [
      { translate: from, opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, offset: 0.25 },
      { translate: to, opacity: 0, scale: 1.15 },
    ],
    duration,
    "ease-out",
  );
  const remove = () => particle.remove();
  if (animation) animation.finished.then(remove, remove);
  else remove();
}

export function feel(mood, duration) {
  clearTimeout(moodTimer);
  if (mood) resident.dataset.mood = mood;
  else delete resident.dataset.mood;
  if (duration) moodTimer = setTimeout(feel, duration);
}
export const heart = () =>
  emit("♥︎", "calc(-50% - 3px) -2px", "calc(-50% + 5px) -24px", 1100);
// A quick squish when it is picked for the keyboard.
export const pop = () =>
  play(
    pose,
    [
      { transform: "none" },
      { transform: "scale(1.14, 0.86)", offset: 0.3 },
      { transform: "scale(0.96, 1.05)", offset: 0.65 },
      { transform: "none" },
    ],
    260,
  );
const hop = () =>
  play(
    pose,
    [
      { transform: "none" },
      { transform: "translateY(-7px) scale(0.94, 1.08)", offset: 0.4 },
      { transform: "scale(1.1, 0.9)", offset: 0.8 },
      { transform: "none" },
    ],
    320,
  );
// A full turn in the air, for the length of a jump.
export function spin() {
  const turn = 360 * (Number(resident.style.getPropertyValue("--facing")) || 1);
  play(
    pose,
    [
      { transform: "rotate(0deg)", transformOrigin: "50% 55%" },
      { transform: `rotate(${turn}deg)`, transformOrigin: "50% 55%" },
    ],
    760,
    "cubic-bezier(0.35, 0.1, 0.45, 1)",
  );
}
// Squashes on touching down, harder the faster it fell, with dust from a long fall.
export function land(speed) {
  if (speed < 200) return;
  const force = Math.min(1, speed / 950);
  play(
    pose,
    [
      { transform: `scale(${1 + 0.24 * force}, ${1 - 0.28 * force})` },
      { transform: `scale(${1 - 0.06 * force}, ${1 + 0.07 * force})`, offset: 0.55 },
      { transform: "none" },
    ],
    300,
    "ease-out",
  );
  if (speed < 600) return;
  emit("", "-7px 25px", "-19px 20px", 420, "dust");
  emit("", "2px 25px", "14px 20px", 420, "dust");
}

// The eyes turn towards the mouse, a pixel or two.
function turnEyes() {
  let x = 0,
    y = 0;
  if (pointer) {
    const dx = pointer.x - face.x,
      dy = pointer.y - face.y,
      reach = Math.max(40, Math.hypot(dx, dy));
    x = Math.round((dx / reach) * 4) / 2;
    y = Math.round((dy / reach) * 3) / 2;
  }
  if (gaze === x + " " + y) return;
  gaze = x + " " + y;
  resident.style.setProperty("--look-x", x);
  resident.style.setProperty("--look-y", y);
}
// Called with where the resident's face is on screen whenever it moves.
export function look(x, y) {
  face = { x, y };
  turnEyes();
}
addEventListener(
  "pointermove",
  (e) => {
    if (e.pointerType !== "mouse") return;
    pointer = { x: e.clientX, y: e.clientY };
    turnEyes();
  },
  { passive: true },
);
document.documentElement.addEventListener("pointerleave", () => {
  pointer = null;
  turnEyes();
});

const fidgets = [
  // A look to one side, then the other.
  () =>
    play(
      eyes,
      [
        { translate: "-2px 0", offset: 0.15 },
        { translate: "-2px 0", offset: 0.42 },
        { translate: "2px 0", offset: 0.58 },
        { translate: "2px 0", offset: 0.85 },
      ],
      1700,
    ),
  // A curious tilt of the head.
  () =>
    play(
      pose,
      [
        { transform: "rotate(9deg)", offset: 0.25 },
        { transform: "rotate(9deg)", offset: 0.7 },
      ],
      1300,
    ),
  hop,
];
function idle() {
  idleTimer = 0;
  if (document.hidden) return;
  const seated = resident.classList.contains("sitting");
  // Busy with the music, or with a feeling that will pass.
  if ((seated && lounge.classList.contains("playing")) || resident.dataset.mood)
    return settle();
  if (performance.now() - quietAt >= (seated ? DROWSY.seated : DROWSY.standing))
    return feel("asleep");
  // No hopping in the armchair.
  fidgets[Math.floor(Math.random() * (seated ? 2 : 3))]();
  settle();
}
// The resident has come to rest: it fidgets now and then, and dozes off in the end.
export function settle() {
  if (idleTimer || resident.dataset.mood === "asleep") return;
  quietAt ||= performance.now();
  idleTimer = setTimeout(
    idle,
    resident.classList.contains("sitting")
      ? DROWSY.seated
      : 5000 + Math.random() * 5000,
  );
}
// Something happened: it moved, or was touched. Wakes it with a start.
export function stir() {
  clearTimeout(idleTimer);
  idleTimer = quietAt = 0;
  if (resident.dataset.mood !== "asleep") return;
  feel();
  emit("!", "-50% -2px", "-50% -17px", 700);
  hop();
}
const rouse = () => {
  stir();
  settle();
};
resident.addEventListener("pointerenter", () => {
  if (resident.dataset.mood === "asleep") rouse();
});
document.getElementById("radio").addEventListener("click", rouse);
