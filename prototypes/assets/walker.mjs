export const SIZE = { width: 26, height: 30 };
const overlaps = (actor, floor) =>
  actor.x + SIZE.width > floor.left + 2 && actor.x < floor.right - 2;

export function jump(actor) {
  if (actor.ground === null) return false;
  actor.ground = null;
  actor.vy = -690;
  return true;
}

export function drop(actor) {
  if (actor.ground === null) return false;
  actor.ground = null;
  actor.y += 4;
  actor.vy = 80;
  return true;
}

export function step(actor, floors, bounds, dt, direction) {
  actor.vx += (direction * 220 - actor.vx) * Math.min(1, dt * 16);
  if (Math.abs(actor.vx) < 0.2) actor.vx = 0;
  actor.x = Math.max(
    4,
    Math.min(bounds.width - SIZE.width - 4, actor.x + actor.vx * dt),
  );
  if (actor.ground !== null) {
    const floor = floors.find((item) => item.id === actor.ground);
    if (floor && overlaps(actor, floor)) {
      actor.y = floor.y - SIZE.height;
      actor.vy = 0;
      return;
    }
    actor.ground = null;
  }
  const previousBottom = actor.y + SIZE.height;
  actor.vy = Math.min(950, actor.vy + 1500 * dt);
  actor.y += actor.vy * dt;
  if (actor.vy >= 0) {
    const landed = floors
      .filter(
        (floor) =>
          overlaps(actor, floor) &&
          previousBottom <= floor.y + 2 &&
          actor.y + SIZE.height >= floor.y,
      )
      .sort((a, b) => a.y - b.y)[0];
    if (landed) {
      actor.y = landed.y - SIZE.height;
      actor.vy = 0;
      actor.ground = landed.id;
    }
  }
  if (actor.y + SIZE.height > bounds.bottom) {
    actor.y = bounds.bottom - SIZE.height;
    actor.vy = 0;
    actor.ground = "bottom";
  }
}
