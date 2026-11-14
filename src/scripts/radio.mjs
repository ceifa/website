// The footer radio plays while the resident sits in the armchair beside it.
const SRC = "/audio/adore.mp3";
// Quiet and muffled, like a radio left on in the background of the room.
const VOLUME = 0.12;
const lounge = document.getElementById("lounge");
const button = document.getElementById("radio");
let audio = null,
  graph = null,
  seated = false,
  muted = false,
  pauseTimer;
try {
  muted = localStorage.getItem("radio") === "off";
} catch {}

function setup() {
  audio = new Audio(SRC);
  audio.loop = true;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  const context = new Context();
  // Cut the lows and highs so it sounds small and far away.
  const highpass = new BiquadFilterNode(context, { type: "highpass", frequency: 160 });
  const lowpass = new BiquadFilterNode(context, { type: "lowpass", frequency: 1400, Q: 0.4 });
  const gain = new GainNode(context, { gain: 0 });
  context
    .createMediaElementSource(audio)
    .connect(highpass)
    .connect(lowpass)
    .connect(gain)
    .connect(context.destination);
  graph = { context, gain };
}
function fadeTo(level) {
  if (!graph) {
    audio.volume = level;
    return;
  }
  const { context, gain } = graph;
  gain.gain.setTargetAtTime(level, context.currentTime, 0.35);
}
// Browsers hold back sound until the visitor has clicked or typed something.
function retryOnGesture() {
  const retry = () => {
    removeEventListener("pointerdown", retry, true);
    removeEventListener("keydown", retry, true);
    update();
  };
  addEventListener("pointerdown", retry, true);
  addEventListener("keydown", retry, true);
}
function update() {
  const playing = seated && !muted;
  lounge.classList.toggle("on", seated);
  lounge.classList.toggle("playing", playing);
  button.setAttribute("aria-pressed", String(!muted));
  clearTimeout(pauseTimer);
  if (playing) {
    if (!audio) setup();
    audio.play().then(
      () => {
        graph?.context.resume();
        if (graph && graph.context.state !== "running" && !navigator.userActivation?.hasBeenActive)
          retryOnGesture();
        fadeTo(VOLUME);
      },
      (error) => error.name === "NotAllowedError" && retryOnGesture(),
    );
  } else if (audio && !audio.paused) {
    fadeTo(0);
    pauseTimer = setTimeout(() => audio.pause(), graph ? 1600 : 0);
  }
}

export function sit(value) {
  if (value === seated) return;
  seated = value;
  update();
}

button.hidden = false;
button.addEventListener("click", () => {
  muted = !muted;
  try {
    localStorage.setItem("radio", muted ? "off" : "on");
  } catch {}
  update();
});
