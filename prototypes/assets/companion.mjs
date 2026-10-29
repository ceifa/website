import { SIZE, MOTION } from "./walker.mjs";

const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const margin = SIZE.width / 2 + 3;
const center = (floor) => (floor.left + floor.right) / 2;
const safeX = (floor, x) => clamp(x, floor.left + margin, floor.right - margin);
const directionTo = (actor, x) =>
  Math.abs(x - actor.x - SIZE.width / 2) < 3 && Math.abs(actor.vx) < 8
    ? 0
    : clamp(
        ((x - actor.x - SIZE.width / 2) * 4 - actor.vx * 0.7) / MOTION.speed,
        -1,
        1,
      );

export function choosePerch(floors, view, previousId) {
  const candidates = floors.filter(
    (floor) =>
      floor.id !== "bottom" &&
      floor.right - floor.left >= 50 &&
      floor.y > view.top + 95 &&
      floor.y < view.top + view.height - 65,
  );
  if (!candidates.length) return null;
  const score = (floor) =>
    Math.abs(floor.y - (view.top + view.height * 0.55)) -
    (floor.interest || 0) * 36;
  candidates.sort((a, b) => score(a) - score(b));
  const previous = candidates.find((floor) => floor.id === previousId);
  const floor =
    previous && score(previous) <= score(candidates[0]) + 65
      ? previous
      : candidates[0];
  return {
    id: floor.id,
    x: safeX(floor, floor.left + (floor.right - floor.left) * 0.72),
  };
}

function connection(from, to, floors) {
  const dy = to.y - from.y;
  if (from.id === to.id || Math.abs(dy) < 5 || to.id === "bottom") return null;
  if (dy > 0) {
    const left = Math.max(from.left, to.left) + margin;
    const right = Math.min(from.right, to.right) - margin;
    if (left > right || dy > 440) return null;
    const x = (left + right) / 2;
    if (
      floors.some(
        (floor) =>
          floor.id !== from.id &&
          floor.id !== to.id &&
          floor.y > from.y + 3 &&
          floor.y < to.y - 2 &&
          x + SIZE.width / 2 > floor.left + 2 &&
          x - SIZE.width / 2 < floor.right - 2,
      )
    )
      return null;
    return { from: from.id, to: to.id, kind: "drop", launchX: x, aimX: x };
  }
  const rise = -dy;
  const discriminant = MOTION.jump ** 2 - 2 * MOTION.gravity * rise;
  if (discriminant < 0) return null;
  const duration = (MOTION.jump + Math.sqrt(discriminant)) / MOTION.gravity;
  const aimX = safeX(to, center(from));
  const launchX = safeX(from, aimX);
  if (Math.abs(aimX - launchX) > MOTION.speed * duration - 25) return null;
  return { from: from.id, to: to.id, kind: "jump", launchX, aimX };
}

export function findRoute(floors, fromId, toId, failed = new Set()) {
  if (fromId === toId) return [];
  const usable = floors.filter(
    (floor) => floor.right - floor.left >= margin * 2,
  );
  const source = usable.find((floor) => floor.id === fromId);
  const goal = usable.find((floor) => floor.id === toId);
  if (!source || !goal) return [];
  const queue = [{ floor: source, route: [] }],
    visited = new Set([fromId]);
  const neighbors = [...usable].sort(
    (a, b) => Math.abs(a.y - goal.y) - Math.abs(b.y - goal.y),
  );
  for (let i = 0; i < queue.length; i++) {
    const { floor, route } = queue[i];
    for (const next of neighbors) {
      if (visited.has(next.id) || failed.has(floor.id + ":" + next.id))
        continue;
      const edge = connection(floor, next, usable);
      if (!edge) continue;
      const path = [...route, edge];
      if (next.id === toId) return path;
      visited.add(next.id);
      queue.push({ floor: next, route: path });
    }
  }
  return [];
}

export class Companion {
  constructor(goal, view, now) {
    this.goal = goal;
    this.viewTop = view.top;
    this.scrollAt = now;
    this.startAt = now + 950;
    this.failed = new Set();
    this.transition = null;
    this.outsideAt = null;
    this.floors = null;
  }
  scrolled(now) {
    this.scrollAt = now;
  }
  reset() {
    this.transition = null;
    this.failed.clear();
  }
  decide(actor, floors, view, now) {
    const shifted = Math.abs(view.top - this.viewTop) > 65;
    const currentGoal = floors.find((floor) => floor.id === this.goal?.id);
    const goalVisible =
      currentGoal &&
      currentGoal.y > view.top + 75 &&
      currentGoal.y < view.top + view.height - 35;
    if (shifted || !goalVisible) {
      const next = choosePerch(floors, view, shifted ? null : this.goal?.id);
      if (next && (next.id !== this.goal?.id || shifted)) {
        this.goal = next;
        this.reset();
      }
      this.viewTop = view.top;
      this.startAt = 0;
    }
    if (this.floors !== floors) {
      this.floors = floors;
      this.reset();
    }
    const outside =
      actor.y + SIZE.height < view.top - 145 ||
      actor.y > view.top + view.height + 145;
    if (!outside) this.outsideAt = null;
    else {
      this.outsideAt ??= now;
      const readyAt = Math.max(this.outsideAt + 650, this.scrollAt + 180);
      if (now >= readyAt && this.goal) {
        this.outsideAt = null;
        this.reset();
        return {
          mode: "arriving",
          direction: 0,
          reenter: {
            x: this.goal.x - SIZE.width / 2,
            y: view.top - SIZE.height - 8,
          },
          needsFrame: true,
        };
      }
      if (actor.ground !== null)
        return { mode: "catching-up", direction: 0, wakeAt: readyAt };
    }
    if (now < this.startAt)
      return { mode: "watching", direction: 0, wakeAt: this.startAt };
    if (!this.goal) return { mode: "resting", direction: 0 };
    if (actor.ground === null) {
      if (this.transition) this.transition.airborne = true;
      return {
        mode: "jumping",
        direction: directionTo(actor, this.transition?.aimX ?? this.goal.x),
      };
    }
    if (this.transition?.airborne) {
      if (actor.ground === this.transition.from)
        this.failed.add(this.transition.from + ":" + this.transition.to);
      this.transition = null;
    }
    if (actor.ground === this.goal.id) {
      this.transition = null;
      const direction = directionTo(actor, this.goal.x);
      return { mode: direction ? "wandering" : "resting", direction };
    }
    if (!this.transition) {
      this.transition =
        findRoute(floors, actor.ground, this.goal.id, this.failed)[0] || null;
    }
    if (!this.transition) return { mode: "watching", direction: 0 };
    const direction = directionTo(actor, this.transition.launchX);
    if (
      Math.abs(actor.x + SIZE.width / 2 - this.transition.launchX) > 7 ||
      Math.abs(actor.vx) > 28
    )
      return { mode: "walking", direction };
    return {
      mode: this.transition.kind === "jump" ? "jumping" : "following",
      direction: directionTo(actor, this.transition.aimX),
      jump: this.transition.kind === "jump",
      drop: this.transition.kind === "drop",
      needsFrame: true,
    };
  }
}
