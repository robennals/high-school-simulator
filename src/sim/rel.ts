import { ABILITIES, ABILITY_QUALITY, type Look } from './content';
import { clamp } from './rng';
import type { Rel, Student, Tag, World } from './types';

/** How strongly a look signals identity: high when few wear it, near zero when most of the school does. */
export function lookSignal(world: World, look: Look): number {
  return (1 - (world.lookShare[look] ?? 0)) ** 3;
}

export function updateLookShares(world: World) {
  world.lookShare = {};
  for (const s of world.students) world.lookShare[s.look] = (world.lookShare[s.look] ?? 0) + 1 / world.students.length;
}

/**
 * How inviting `wearer`'s shirt makes them look to `viewer` (1 = neutral). Different shirts make it
 * easier for different people to come over: a funny graphic tee draws people who like funny, outgoing
 * people; a fan tee draws fans of the thing (and puts off people who mock it); a hoodie keeps people
 * away.
 */
export function approachability(viewer: Student, wearer: Student): number {
  switch (wearer.shirtStyle) {
    case 'graphic':
      return clamp(1 + 0.5 * viewer.admires.funny + 0.4 * (viewer.traits.E - 0.5), 0.9, 1.7);
    case 'hoodie':
      return 0.6;
    case 'fan':
      return wearer.shirt === null ? 1 : clamp(1 + 0.8 * viewer.opinions[wearer.shirt], 0.4, 1.8);
    default:
      return 1;
  }
}

/** Get what `a` thinks of `b`, creating a first impression if they've never met. */
export function meet(world: World, a: Student, b: Student): Rel {
  let r = a.rels.get(b.id);
  if (r) return r;
  let impression = 0;
  // You can see style and athletic build at a glance; the rest you learn.
  impression += 0.15 * (b.abilities.style - 0.4) * a.admires.stylish;
  impression += 0.05 * (b.abilities.athletics - 0.4) * a.admires.athletic;
  impression += world.rng.normal(0, 0.03);
  // Clothes: dressing like me reads as "one of us"; a shirt about something I love (or mock) colors my view.
  let warmth = a.gender === b.gender ? 0.02 * a.sameGenderPref : 0;
  // How much a look says depends on how rare it is: if everyone dresses that way, it says nothing.
  const signal = lookSignal(world, b.look);
  warmth += a.look === b.look ? 0.1 * signal : -0.03 * a.conformity * signal;
  if (b.shirt !== null) warmth += 0.06 * a.opinions[b.shirt];
  // A funny tee reads as fun and friendly; a hoodie reads as a little closed-off.
  if (b.shirtStyle === 'graphic') warmth += 0.02;
  if (b.shirtStyle === 'hoodie') warmth -= 0.03;
  r = {
    aff: warmth,
    trust: 0,
    resp: impression,
    fear: 0,
    fam: 0.02,
    pub: 0,
    given: 0,
    hurt: 0,
    owed: 0,
    tags: {},
    said: null,
  };
  a.rels.set(b.id, r);
  return r;
}

export function rel(world: World, a: number, b: number): Rel {
  return meet(world, world.students[a], world.students[b]);
}

/** Read-only peek; undefined if they've never met. */
export function peek(world: World, a: number, b: number): Rel | undefined {
  return world.students[a].rels.get(b);
}

/** How much you know in class right now: ability plus the work you've put in. */
export function schoolKnowledge(s: Student): number {
  return 0.5 * s.abilities.academics + 0.5 * s.grades;
}

/** Private overall regard. */
export function priv(r: Rel): number {
  return 0.5 * r.aff + 0.3 * r.resp + 0.2 * r.trust;
}

/** How a judgment moves: big when you barely know someone, smaller once you do. */
export function novelty(r: Rel): number {
  return 1.3 - 0.6 * r.fam;
}

/** Nudge a -1..1 value, slowing down near the ends. */
export function nudge(x: number, d: number): number {
  return clamp(x + d * (d > 0 ? 1 - x : 1 + x), -1, 1);
}

/** Nudge a 0..1 value. */
export function nudge01(x: number, d: number): number {
  return clamp(x + d * (d > 0 ? 1 - x : x), 0, 1);
}

export function tag(r: Rel, t: Tag, d: number) {
  r.tags[t] = clamp((r.tags[t] ?? 0) + d, 0, 1);
}

export function tagOf(r: Rel | undefined, t: Tag): number {
  return r?.tags[t] ?? 0;
}

export function pairKey(a: number, b: number): number {
  return a < b ? a * 100000 + b : b * 100000 + a;
}

/** "I respect what you're good at": an ability on display, as seen by someone. */
export function displayAbility(world: World, viewer: Student, shown: Student, ability: (typeof ABILITIES)[number], strength: number, wt: number) {
  const r = meet(world, viewer, shown);
  const q = ABILITY_QUALITY[ability];
  r.resp = nudge(r.resp, wt * strength * (viewer.admires[q] - 0.25) * 0.12 * novelty(r));
}
