/**
 * The world for the card rules: making the school, reading and changing Bond and Respect, and
 * applying a card's effects by the printed rules (first impressions, the depth rule, taking sides).
 */
import { ABILITIES, ABILITY_BUDGET, ABILITY_MAX_POINTS, HERITAGES, INTERESTS, LOOKS, LOOK_SHIRT_TOPICS, OPINION_TOPICS, type Ability, type Look } from '../sim/content';
import { Rng, clamp } from '../sim/rng';
import { BOND_MAX, BOND_MIN, CASUAL_CAP, ENERGY_MAX, ENERGY_WAKE, LEVEL, RESPECT_MAX, RESPECT_MIN, RESPECT_START } from './rules';
import type { Person, Personality, Quality, Side, World } from './types';

export const PERIODS = 6;
const SECTIONS = 8;
const FEEDERS = 5;
const QUALITIES: Quality[] = ['funny', 'athletic', 'smart', 'creative', 'stylish', 'techy'];

/** The quality each ability shows. */
export const SHOWS: Record<Ability, Quality> = { humor: 'funny', athletics: 'athletic', academics: 'smart', arts: 'creative', style: 'stylish', tech: 'techy' };

// ---------------------------------------------------------------- reading the relationship state

export function bond(w: World, a: number, b: number): number {
  return w.bond[a * w.n + b];
}

export function respect(w: World, from: number, to: number): number {
  return w.respect[from * w.n + to];
}

export function isFriend(w: World, a: number, b: number): boolean {
  return a !== b && bond(w, a, b) >= LEVEL.friends;
}

export function isClose(w: World, a: number, b: number): boolean {
  return a !== b && bond(w, a, b) >= LEVEL.close;
}

export function friendsOf(w: World, a: number): number[] {
  const out: number[] = [];
  for (let b = 0; b < w.n; b++) if (isFriend(w, a, b)) out.push(b);
  return out;
}

export function closeFriendsOf(w: World, a: number): number[] {
  const out: number[] = [];
  for (let b = 0; b < w.n; b++) if (isClose(w, a, b)) out.push(b);
  return out;
}

function setBond(w: World, a: number, b: number, v: number) {
  const x = clamp(Math.round(v), BOND_MIN, BOND_MAX);
  w.bond[a * w.n + b] = x;
  w.bond[b * w.n + a] = x;
}

/** Record that everyone in a conversation spent time together today (the fading rule counts this). */
export function together(w: World, members: number[]) {
  for (const a of members) for (const b of members) if (a !== b) w.contact[a * w.n + b] = w.day;
}

function touch(w: World, a: number, b: number) {
  w.contact[a * w.n + b] = w.day;
  w.contact[b * w.n + a] = w.day;
}

/** Whether `a` is drawn to `b` romantically: a fixed, random few of the other gender (about 1 in 8). */
export function drawnTo(w: World, a: number, b: number): boolean {
  if (w.people[a].gender === w.people[b].gender || !w.people[a].romantic) return false;
  let h = (a * 73856093) ^ (b * 19349663) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) % 8 === 0;
}

export function count(w: World, key: string, by = 1) {
  w.tally.set(key, (w.tally.get(key) ?? 0) + by);
}

// ---------------------------------------------------------------- effects

/** What a card does, as a list of changes, before the school rules are applied. */
export interface Effects {
  /**
   * hearsay: not a first impression and not time together (you weren't there).
   * amongFriends: the depth rule doesn't apply (they already are Friends).
   */
  bond: { a: number; b: number; d: number; deep?: boolean; hearsay?: boolean; amongFriends?: boolean }[];
  respect: { from: number; to: number; d: number }[];
  energy: { id: number; d: number }[];
}

export function noEffects(): Effects {
  return { bond: [], respect: [], energy: [] };
}

/**
 * Apply a card's effects by the printed rules.
 *
 * - **First impressions count double** (§8 rule 1): the first time a pair's Bond changes, the change is
 *   doubled — plus *One of us* (same look: +1), good Style (Style 3+: +1), and *Sharp* (an edgy
 *   person's first card with someone of lower Standing: −1).
 * - **The depth rule** (§2): a casual card can't raise a Bond past 7, and a deep one can only once both
 *   have opened up to each other. (Friends bonding over a put-down are already past it.)
 * - **Same gender** (first impressions): +1 between people of the same gender.
 * - **Taking sides** (§8 rule 5): when the card's player lowers someone's Bond, that person's Friends
 *   who are present lose 1 Bond with the player; their Enemies who are present gain 1.
 */
export function applyEffects(w: World, fx: Effects, actor: number, present: number[]) {
  const n = w.n;
  for (const { a, b, hearsay } of fx.bond) if (!hearsay) touch(w, a, b);
  for (const e of fx.bond) {
    if (e.a === e.b) continue;
    let d = e.d;
    const key = e.a * n + e.b;
    if (!w.met[key] && !e.hearsay) {
      w.met[key] = 1;
      w.met[e.b * n + e.a] = 1;
      d *= 2;
      if (e.a === actor || e.b === actor) {
        const other = e.a === actor ? e.b : e.a;
        const me = w.people[actor];
        if (me.look === w.people[other].look && d > 0) d += 1;
        // Same gender: at this age, friendships mostly start with your own.
        if (me.gender === w.people[other].gender && d > 0) d += 1;
        if (me.abilities.style >= 3 && d > 0) d += 1;
        if (me.personality.A === -1 && w.standing[other] < w.standing[actor]) d -= 1;
      }
    }
    if (e.deep && d > 0) {
      w.deepContact[e.a * n + e.b] = w.day;
      w.deepContact[e.b * n + e.a] = w.day;
    }
    const now = bond(w, e.a, e.b);
    // Both ways: you can't become Friends until you've both opened up to each other.
    const mutual = w.openedUp[e.a * n + e.b] && w.openedUp[e.b * n + e.a];
    let next = now + d;
    if (d > 0 && !e.amongFriends && (!e.deep || !mutual)) next = Math.min(next, Math.max(now, CASUAL_CAP));
    setBond(w, e.a, e.b, next);
    // Taking sides.
    if (d < 0 && (e.a === actor || e.b === actor)) {
      const victim = e.a === actor ? e.b : e.a;
      for (const p of present) {
        if (p === actor || p === victim) continue;
        const pv = bond(w, p, victim);
        if (pv >= LEVEL.friends) setBond(w, actor, p, bond(w, actor, p) - 1);
        else if (pv <= -3) setBond(w, actor, p, bond(w, actor, p) + 1);
      }
    }
  }
  for (const e of fx.respect) {
    if (e.from === e.to) continue;
    const k = e.from * n + e.to;
    w.respect[k] = clamp(w.respect[k] + e.d, RESPECT_MIN, RESPECT_MAX);
  }
  for (const e of fx.energy) {
    const p = w.people[e.id];
    p.energy = clamp(p.energy + e.d, 0, ENERGY_MAX);
  }
}

// ---------------------------------------------------------------- making the school

function side(rng: Rng, pOne: number, pOther: number): Side {
  const r = rng.next();
  return r < pOne ? 1 : r < pOne + pOther ? -1 : 0;
}

function randomPersonality(rng: Rng): Personality {
  const a = rng.pick(QUALITIES);
  let b = rng.pick(QUALITIES);
  while (b === a) b = rng.pick(QUALITIES);
  return {
    E: side(rng, 0.35, 0.35),
    A: side(rng, 0.4, 0.25),
    C: side(rng, 0.35, 0.35),
    N: side(rng, 0.35, 0.35),
    O: side(rng, 0.35, 0.35),
    statusDrive: rng.pick([0, 1, 1, 2] as const),
    admires: [a, b],
  };
}

/** A random 12-point buy, max 5 per ability. */
function pointBuy(rng: Rng): Record<Ability, number> {
  const out = Object.fromEntries(ABILITIES.map((a) => [a, 0])) as Record<Ability, number>;
  for (let left = ABILITY_BUDGET; left > 0; ) {
    const a = rng.pick(ABILITIES);
    if (out[a] < ABILITY_MAX_POINTS) {
      out[a]++;
      left--;
    }
  }
  return out;
}

function lookFor(rng: Rng, ab: Record<Ability, number>, p: Personality): Look {
  const weights: Record<Look, number> = {
    sporty: ab.athletics,
    preppy: ab.style + p.statusDrive,
    alt: p.A === -1 ? 3 : 0.5,
    artsy: ab.arts,
    techy: ab.tech,
    plain: 2,
  };
  return LOOKS[rng.weighted(LOOKS.map((l) => weights[l]))];
}

export interface WorldOptions {
  students: number;
  seed: number;
}

export function createWorld(opts: WorldOptions): World {
  const rng = new Rng(opts.seed);
  const n = opts.students;
  const people: Person[] = [];
  for (let id = 0; id < n; id++) {
    const gender = rng.chance(0.5) ? 'boy' : 'girl';
    const heritage = rng.pick(HERITAGES);
    const personality = randomPersonality(rng);
    const abilities = pointBuy(rng);
    const interests = new Map<(typeof INTERESTS)[number], 1 | 2>();
    for (const i of rng.shuffle([...INTERESTS]).slice(0, 1 + rng.int(3))) interests.set(i, rng.chance(0.3) ? 2 : 1);
    const opinions = new Int8Array(OPINION_TOPICS.length);
    for (let t = 0; t < opinions.length; t++) opinions[t] = clamp(Math.round(rng.normal(0, 1.1)), -2, 2);
    const look = lookFor(rng, abilities, personality);
    // A fan shirt about something they love that goes with their look; otherwise by personality.
    const fanTopics = LOOK_SHIRT_TOPICS[look].filter((t) => opinions[t] === 2);
    const shirtStyle = fanTopics.length && rng.chance(0.4) ? 'fan' : personality.E === 1 && rng.chance(0.4) ? 'graphic' : (personality.E === -1 || personality.N === 1) && rng.chance(0.4) ? 'hoodie' : 'plain';
    people.push({
      id,
      name: `${rng.pick(gender === 'boy' ? heritage.boys : heritage.girls)} ${rng.pick(heritage.last)}`,
      gender,
      feeder: rng.int(FEEDERS),
      look,
      shirt: { style: shirtStyle, topic: shirtStyle === 'fan' ? rng.pick(fanTopics) : null },
      personality,
      abilities,
      interests,
      opinions,
      energy: ENERGY_WAKE,
      nextWake: ENERGY_WAKE,
      grades: clamp(3 + abilities.academics + (personality.C === 1 ? 1 : 0) + rng.int(2), 0, 10),
      parentBar: 3 + rng.int(4),
      activity: null,
      partner: -1,
      stories: new Set(),
      gossipThisWeek: 0,
      openUpsThisWeek: 0,
      favors: new Map(),
      used: new Map(),
      earned: new Map(),
      practiceProgress: 0,
      lastEvening: null,
      phoneNights: 0,
      lastRumor: -99,
      meanCostUntil: -1,
      romantic: rng.chance(0.6),
    });
  }
  const w: World = {
    rng,
    n,
    people,
    day: 0,
    bond: new Int8Array(n * n),
    respect: new Int8Array(n * n).fill(RESPECT_START),
    met: new Uint8Array(n * n),
    contact: new Int16Array(n * n).fill(-1),
    deepContact: new Int16Array(n * n).fill(-1),
    standing: new Int8Array(n).fill(3),
    stories: [],
    week: { warm: new Uint8Array(n * n), coupleTime: new Map() },
    tally: new Map(),
    putdowns: [],
    romances: [],
    sections: Array.from({ length: PERIODS }, () => {
      const s = new Int16Array(n);
      for (let i = 0; i < n; i++) s[i] = rng.int(SECTIONS);
      return s;
    }),
    standingHistory: [],
    knows: new Uint8Array(n * n),
    openedUp: new Uint8Array(n * n),
    claims: new Map(),
    hangouts: [],
  };
  // Middle-school friendships: people from the same school already know each other — a few as Close
  // friends, many as Friendly faces.
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      if (people[a].feeder !== people[b].feeder) continue;
      const sameGender = people[a].gender === people[b].gender;
      const r = rng.next();
      const v = r < (sameGender ? 0.04 : 0.01) ? LEVEL.close + rng.int(2) : r < (sameGender ? 0.25 : 0.1) ? LEVEL.friendly + rng.int(3) : 0;
      if (v) {
        setBond(w, a, b, v);
        w.met[a * n + b] = w.met[b * n + a] = 1;
        // Old friends start the year as if they'd just spent time together.
        w.deepContact[a * n + b] = w.deepContact[b * n + a] = 0;
        if (v >= LEVEL.close) w.openedUp[a * n + b] = w.openedUp[b * n + a] = 1;
      }
    }
  return w;
}
