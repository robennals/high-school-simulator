/**
 * Where everyone stands at each point in the day, from what the simulation actually did:
 * before-school groups in the hallway and courtyard, and after school at practice, rehearsal,
 * the lab, or behind the gym. (Lunch seating comes straight from the cafeteria tables.)
 */
import * as THREE from 'three';
import type { ActivityId } from '../sim/content';
import { ELIGIBILITY_GRADE, isAbsent } from '../sim/day';
import type { World } from '../sim/types';
import { AREAS, areaCenter, circle, pointIn, type Place, type Spot } from './scene';

/**
 * Before school, people stand along four lanes: two down the hallway, two across the courtyard.
 * Groups are laid out one after another along a lane with uneven gaps, so the crowd looks scattered
 * rather than gridded.
 */
const LANES = (() => {
  const hall = AREAS.hallway;
  const yard = AREAS.courtyard;
  const hm = (hall.z0 + hall.z1) / 2;
  const ym = (yard.z0 + yard.z1) / 2;
  return [
    { x0: hall.x0 + 1, x1: hall.x1 - 1, z: hm - 1.3, wall: hall.z0 + 0.5 },
    { x0: hall.x0 + 1, x1: hall.x1 - 1, z: hm + 1.3, wall: hall.z1 - 0.5 },
    { x0: yard.x0 + 1, x1: yard.x1 - 1, z: ym - 1.2, wall: yard.z0 + 0.5 },
    { x0: yard.x0 + 1, x1: yard.x1 - 1, z: ym + 1.2, wall: yard.z1 - 0.5 },
  ];
})();

/** A fixed pseudo-random number in [0, 1) for a spot, so the layout doesn't jump around between redraws. */
function jitter(i: number, salt = 0): number {
  return (((i + 1) * 2654435761 + salt * 40503) % 1000) / 1000;
}

/**
 * Before school: one list of people per spot (most spots empty). Someone on their own stands near the
 * wall, facing off in some direction — looking at their phone, or around for someone they know. Two
 * people face each other. Three or more stand in a circle sized to fit.
 */
export function hallwayGroupSpots(groups: number[][]): Map<number, Spot> {
  const spots = new Map<number, Spot>();
  // First pass: give each group a lane and a stretch of it, with uneven gaps.
  const used = LANES.map(() => 0);
  const placed: { i: number; ids: number[]; lane: number; mid: number; radius: number }[] = [];
  groups.forEach((ids, i) => {
    if (!ids.length) return;
    const n = ids.length;
    const radius = 0.55 + 0.14 * n;
    const width = n === 1 ? 0.9 : n === 2 ? 1.4 : 2 * radius;
    // The least-full lane, so the crowd spreads over the hallway and the courtyard.
    const lane = used.reduce((best, u, k) => (u / (LANES[k].x1 - LANES[k].x0) < used[best] / (LANES[best].x1 - LANES[best].x0) ? k : best), 0);
    const gap = 0.6 + 1.6 * jitter(i);
    placed.push({ i, ids, lane, mid: used[lane] + gap + width / 2, radius });
    used[lane] += gap + width;
  });
  // Second pass: squeeze any lane that ran past its end, so nobody stands outside.
  for (const { i, ids, lane: li, mid, radius } of placed) {
    const lane = LANES[li];
    const length = lane.x1 - lane.x0;
    const x = lane.x0 + mid * Math.min(1, length / used[li]);
    const n = ids.length;
    if (n === 1) {
      const pos = new THREE.Vector3(x, 0, lane.wall + (lane.z - lane.wall) * 0.3 * jitter(i, 1));
      const a = jitter(i, 2) * Math.PI * 2;
      spots.set(ids[0], { pos, face: new THREE.Vector3(pos.x + Math.cos(a), 0, pos.z + Math.sin(a)) });
    } else if (n === 2) {
      const z = lane.z + (jitter(i, 3) - 0.5) * 0.8;
      const a = new THREE.Vector3(x - 0.45, 0, z);
      const b = new THREE.Vector3(x + 0.45, 0, z);
      spots.set(ids[0], { pos: a, face: b });
      spots.set(ids[1], { pos: b, face: a });
    } else circle(new THREE.Vector3(x, 0, lane.z + (jitter(i, 4) - 0.5) * 0.6), n, radius).forEach((p, k) => spots.set(ids[k], p));
  }
  return spots;
}

/** Where the player stands while deciding who to walk up to: just inside the front doors, at the end of the hallway. */
export const HALLWAY_ENTRANCE = new THREE.Vector3(AREAS.hallway.x1 - 0.6, 0, (AREAS.hallway.z0 + AREAS.hallway.z1) / 2);

/** Before school: everyone where they stood (one list of people per spot). */
export function morningSpots(world: World): Map<number, Spot> {
  const groups: number[][] = [];
  for (const s of world.students) {
    const t = s.lastTable.hallway;
    if (isAbsent(world, s) || t === undefined) continue;
    (groups[t] ??= []).push(s.id);
  }
  return hallwayGroupSpots(Array.from(groups, (g) => g ?? []));
}

const ACTIVITY_PLACE: Record<ActivityId, Exclude<Place, 'campus'>> = {
  'soccer-boys': 'field',
  'soccer-girls': 'field',
  band: 'bandRoom',
  drama: 'theater',
  robotics: 'robotics',
};

/** Where the player's after-school choice takes them. */
export function afternoonPlace(world: World): Place {
  const p = world.player!;
  const me = world.students[p.id];
  if (p.afterSchool === 'activity' && me.activity) return ACTIVITY_PLACE[me.activity];
  if (p.afterSchool === 'gym') return 'behindGym';
  if (p.afterSchool === 'hangout') return 'courtyard';
  return 'campus';
}

/**
 * After school: teams and clubs at practice, the crowd behind the gym, and the player (with whoever
 * they hung out with). Everyone else has gone home.
 */
export function afternoonSpots(world: World, behindGym: Set<number>, hungOutWith: number[]): Map<number, Spot> {
  const spots = new Map<number, Spot>();
  const p = world.player;
  for (const s of world.students) {
    if (isAbsent(world, s) || !s.activity || s.grades < ELIGIBILITY_GRADE) continue;
    if (p && s.id === p.id && p.afterSchool !== 'activity') continue;
    const place = ACTIVITY_PLACE[s.activity];
    if (place === 'field') {
      // Girls practice on one half, boys on the other.
      const half = s.activity === 'soccer-girls' ? 0 : 1;
      const a = AREAS.field;
      const w = (a.x1 - a.x0) / 2;
      spots.set(s.id, { pos: new THREE.Vector3(a.x0 + half * w + 3 + Math.random() * (w - 6), 0, a.z0 + 4 + Math.random() * (a.z1 - a.z0 - 8)), face: areaCenter('field') });
    } else if (place === 'theater') {
      const a = AREAS.theater;
      spots.set(s.id, { pos: new THREE.Vector3(a.x0 + 2 + Math.random() * (a.x1 - a.x0 - 4), 0.7, a.z0 + 2 + Math.random() * 2), face: new THREE.Vector3((a.x0 + a.x1) / 2, 0, a.z1) });
    } else spots.set(s.id, { pos: pointIn(place, 2.5), face: areaCenter(place) });
  }
  const crowd = [...behindGym].filter((id) => !isAbsent(world, world.students[id]));
  circle(areaCenter('behindGym'), crowd.length, 1.2 + crowd.length * 0.15).forEach((spot, i) => spots.set(crowd[i], spot));
  if (p && p.afterSchool === 'hangout') {
    const group = [p.id, ...hungOutWith];
    circle(new THREE.Vector3(12, 0, 26), group.length).forEach((spot, i) => spots.set(group[i], spot));
  }
  return spots;
}

/** The title screen: lunch in the cafeteria, and the soccer teams out on the field. */
export function titleSpots(world: World, lunch: Map<number, Spot>): Map<number, Spot> {
  const spots = new Map(lunch);
  const a = AREAS.field;
  for (const s of world.students) {
    if (s.activity !== 'soccer-boys' && s.activity !== 'soccer-girls') continue;
    spots.set(s.id, { pos: new THREE.Vector3(a.x0 + 3 + Math.random() * (a.x1 - a.x0 - 6), 0, a.z0 + 4 + Math.random() * (a.z1 - a.z0 - 8)), face: areaCenter('field') });
  }
  return spots;
}
