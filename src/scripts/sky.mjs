// The night sky's one event: now and then a star falls across the top of the
// page. Only at night, only while the sky is on screen, and never for readers
// who asked for less motion.
const star = document.getElementById("shooting-star");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const night = () =>
  getComputedStyle(document.documentElement).colorScheme === "dark";

function fall() {
  setTimeout(fall, 9000 + Math.random() * 16000);
  if (document.hidden || reducedMotion.matches || !night() || scrollY > 300)
    return;
  const side = Math.random() < 0.5 ? -1 : 1;
  const tilt = 14 + Math.random() * 16;
  // The tail grows out behind the head, then the whole streak burns out.
  const at = (x, length) =>
    `scaleX(${side}) rotate(${tilt}deg) translateX(${x}px) scaleX(${length})`;
  star.style.left = `${10 + Math.random() * 70}%`;
  star.style.top = `${4 + Math.random() * 34}%`;
  star.animate(
    [
      { transform: at(0, 0), opacity: 0 },
      { transform: at(90, 1), opacity: 0.7, offset: 0.35 },
      { transform: at(210, 1), opacity: 0.7, offset: 0.75 },
      { transform: at(270, 0.3), opacity: 0 },
    ],
    { duration: 800 + Math.random() * 400, easing: "ease-in" },
  );
}
setTimeout(fall, 2500 + Math.random() * 4000);
