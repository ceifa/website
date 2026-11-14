export const SIZE = { width: 26, height: 30 };
export const MOTION = { speed: 220, jump: 690, gravity: 1500 };
// Highest ledge the walker climbs, or lowest it steps down to, without jumping.
const STEP = 10;
const spans = (x, floor) =>
  x + SIZE.width > floor.left + 2 && x < floor.right - 2;
const overlaps = (actor, floor) => spans(actor.x, floor);
// A solid floor is the top of a body that fills the space below it, so its
// side is a wall for anything whose body reaches below that top.
const wall = (actor, x, floor) =>
  floor.solid !== undefined &&
  spans(x, floor) &&
  !overlaps(actor, floor) &&
  floor.y < actor.y + SIZE.height - STEP &&
  floor.solid > actor.y;

export function jump(actor) {
  if (actor.ground === null) return false;
  actor.ground = null;
  actor.vy = -MOTION.jump;
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
  actor.vx += (direction * MOTION.speed - actor.vx) * Math.min(1, dt * 16);
  if (Math.abs(actor.vx) < 0.2) actor.vx = 0;
  const x = Math.max(
    4,
    Math.min(bounds.width - SIZE.width - 4, actor.x + actor.vx * dt),
  );
  if (floors.some((floor) => wall(actor, x, floor))) actor.vx = 0;
  else actor.x = x;
  if (actor.ground !== null) {
    const current = floors.find((item) => item.id === actor.ground);
    const feet = actor.y + SIZE.height;
    const floor =
      current?.solid === undefined
        ? current && overlaps(actor, current) && current
        : floors
            .filter(
              (item) =>
                item.solid !== undefined &&
                overlaps(actor, item) &&
                Math.abs(item.y - feet) <= STEP,
            )
            .sort((a, b) => a.y - b.y)[0];
    if (floor) {
      actor.y = floor.y - SIZE.height;
      actor.vy = 0;
      actor.ground = floor.id;
      return;
    }
    actor.ground = null;
  }
  const previousBottom = actor.y + SIZE.height;
  actor.vy = Math.min(950, actor.vy + MOTION.gravity * dt);
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
