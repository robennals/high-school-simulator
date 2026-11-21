import {
  ABILITIES,
  ABILITY_BUDGET,
  ABILITY_MAX_POINTS,
  FEEDER_SCHOOLS,
  HAIR_COLORS,
  HERITAGES,
  INTERESTS,
  OPINION_TOPICS,
  QUALITIES,
  LOOKS,
  favoriteShirtTopic,
  type Ability,
  type ShirtStyle,
  type Look,
} from './content';
import { meet, updateLookShares } from './rel';
import { Rng, clamp } from './rng';
import type { Gender, PlayerSetup, SimConfig, Student, World } from './types';

export const PERIODS = 6;
export const SECTION_SIZE = 25;
/** Desks per classroom: six rows of six, so there are open desks scattered around the room. */
export const DESKS = 36;
export const SEAT_ROW = 6;

export function createWorld(cfg: SimConfig): World {
  const rng = new Rng(cfg.seed);
  const students: Student[] = [];
  for (let id = 0; id < cfg.students; id++) students.push(createStudent(rng, id));
  if (cfg.player) applyPlayerSetup(students[0], cfg.player);
  // Strategy experiments can fix what kind of shirt someone wears (a fan shirt is about their favorite thing).
  for (const [id, style] of cfg.forcedShirt ?? []) {
    const s = students[id];
    s.shirtStyle = style;
    s.shirt = style === 'fan' ? favoriteShirtTopic(s.opinions, s.look) : null;
  }
  const world: World = {
    cfg,
    rng,
    day: 0,
    students,
    stories: [],
    log: [],
    hangout: new Map(),
    lastHangout: new Map(),
    tally: {},
    nextStoryId: 0,
    startedLonely: new Set(),
    lookShare: {},
    putdownsByDecile: { strategic: new Array(10).fill(0), lashOut: new Array(10).fill(0) },
    stoodUpFor: new Set(),
    events: [],
    prompts: [],
    player: cfg.player ? { id: 0, signup: null, afterSchool: 'activity', hangoutWith: [], callFriends: [], weekendHost: null, weekend: 'out' } : undefined,
  };
  updateLookShares(world);
  assignClasses(world);
  seedMiddleSchoolTies(world);
  // From here on, randomness is "what happens": a separate seed gives the same school different luck.
  if (cfg.eventSeed !== undefined) world.rng = new Rng(cfg.eventSeed);
  return world;
}

/**
 * The human player's character replaces student 0. They arrive from a small school, knowing nobody —
 * the situation the game is for.
 */
function applyPlayerSetup(s: Student, setup: PlayerSetup) {
  s.first = setup.first;
  s.last = setup.last;
  s.gender = setup.gender;
  s.traits = { ...setup.traits };
  for (const a of ABILITIES) s.abilities[a] = setup.abilityPoints[a] / ABILITY_MAX_POINTS;
  s.look = setup.look;
  s.ownLook = setup.look;
  s.shirt = setup.shirt;
  s.shirtStyle = setup.shirtStyle;
  // You wear a shirt about something you love.
  if (setup.shirt !== null) s.opinions[setup.shirt] = Math.max(0.7, s.opinions[setup.shirt]);
  for (const i of INTERESTS) s.interests[i] = setup.interests.includes(i) ? 0.7 : Math.min(s.interests[i], 0.2);
  s.feeder = FEEDER_SCHOOLS.length - 1;
  s.fitness = clamp(0.2 + 0.3 * s.abilities.athletics, 0, 1);
  s.poise = clamp(0.1 + 0.25 * s.traits.E, 0, 1);
  s.grades = clamp(0.3 + 0.35 * s.abilities.academics + 0.25 * s.traits.C, 0, 1);
}

/** Spread the fixed ability budget with one or two strengths, like an NPC's D&D point buy. */
export function pointBuy(rng: Rng): Record<Ability, number> {
  const points: Record<Ability, number> = { athletics: 0, academics: 0, humor: 0, arts: 0, style: 0, tech: 0 };
  let left = ABILITY_BUDGET;
  const favorites = rng.shuffle([...ABILITIES]).slice(0, 2);
  const weights = ABILITIES.map((a) => (favorites.includes(a) ? 4 : 1));
  while (left > 0) {
    const a = ABILITIES[rng.weighted(weights)];
    if (points[a] < ABILITY_MAX_POINTS) {
      points[a]++;
      left--;
    }
  }
  const out = { ...points };
  for (const a of ABILITIES) out[a] = points[a] / ABILITY_MAX_POINTS;
  return out;
}

/** A record with one value per key, built by calling `value` for each. */
function recordOf<K extends string>(keys: readonly K[], value: (k: K) => number): Record<K, number> {
  const out: Partial<Record<K, number>> = {};
  for (const k of keys) out[k] = value(k);
  return out as Record<K, number>; // every key in `keys` was just assigned
}

export function createStudent(rng: Rng, id: number): Student {
  const gender: Gender = id % 2 === 0 ? 'boy' : 'girl';
  const heritage = rng.pick(HERITAGES);
  const first = rng.pick(gender === 'boy' ? heritage.boys : heritage.girls);
  const last = rng.pick(heritage.last);
  // About 5% come from a small school or homeschool and know almost nobody.
  const feeder = rng.chance(0.05) ? FEEDER_SCHOOLS.length - 1 : rng.int(FEEDER_SCHOOLS.length - 1);

  const traits = { O: rng.trait(), C: rng.trait(), E: rng.trait(), A: rng.trait(), N: rng.trait() };
  const abilities = pointBuy(rng);

  const admires = recordOf(QUALITIES, () => rng.trait(0.4, 0.2));
  admires.kind = clamp(admires.kind + 0.3 * (traits.A - 0.5), 0, 1);
  admires.edgy = clamp(admires.edgy - 0.4 * (traits.A - 0.5), 0, 1);

  const interests = recordOf(INTERESTS, () => (rng.chance(0.3) ? rng.trait(0.6, 0.2) : rng.trait(0.1, 0.08)));
  if (abilities.athletics > 0.5) interests.soccer = Math.max(interests.soccer, rng.trait(0.6));
  if (abilities.tech > 0.5) interests.coding = Math.max(interests.coding, rng.trait(0.6));
  if (abilities.style > 0.5) interests.fashion = Math.max(interests.fashion, rng.trait(0.6));

  const opinions = OPINION_TOPICS.map(() => clamp(rng.normal(0, 0.5), -1, 1));
  // Agreeable students are a little warmer toward school things; edgy ones mock them.
  opinions[0] = clamp(opinions[0] + 0.4 * (traits.A - 0.5) - 0.3 * (traits.O - 0.5), -1, 1);

  const statusDrive = rng.trait(0.5, 0.2);
  // Starting look follows what you're into, with some randomness.
  const lookWeights: Record<Look, number> = {
    sporty: abilities.athletics * 2,
    preppy: abilities.style + statusDrive,
    alt: (1 - traits.A) * traits.O * 2,
    artsy: abilities.arts * 2,
    techy: abilities.tech * 2,
    plain: 0.8,
  };
  const look = LOOKS[rng.weighted(LOOKS.map((l) => lookWeights[l]))];
  const favorite = favoriteShirtTopic(opinions, look);
  const shirt = opinions[favorite] > 0.5 && rng.chance(0.4) ? favorite : null;
  const shirtStyle: ShirtStyle = shirt !== null ? 'fan' : traits.E > 0.65 && rng.chance(0.4) ? 'graphic' : (traits.E < 0.35 || traits.N > 0.7) && rng.chance(0.4) ? 'hoodie' : 'plain';
  return {
    id,
    first,
    last,
    gender,
    skin: rng.pick(heritage.skin),
    hair: rng.int(HAIR_COLORS),
    feeder,
    traits,
    statusDrive,
    loyalty: clamp(rng.trait() * 0.6 + traits.A * 0.2 + traits.C * 0.2, 0, 1),
    conformity: clamp(0.25 + 0.3 * (1 - traits.O) + 0.25 * traits.N + rng.normal(0, 0.1), 0.05, 0.9),
    threshold: rng.range(0.3, 0.8),
    gossipy: clamp(0.3 * (1 - traits.A) + 0.3 * traits.E + 0.3 * statusDrive + rng.normal(0, 0.1), 0, 1),
    sameGenderPref: rng.trait(0.6, 0.2),
    look,
    ownLook: look,
    shirtStyle,
    shirt,
    admires,
    abilities,
    interests,
    opinions,
    activity: null,
    sections: [],
    seats: [],
    energy: 1,
    stress: 0,
    fitness: clamp(0.2 + 0.3 * abilities.athletics + rng.normal(0, 0.08), 0, 1),
    poise: clamp(0.1 + 0.25 * traits.E + rng.normal(0, 0.08), 0, 1),
    ruleBreaking: clamp(0.15 + 0.35 * (1 - traits.C) + 0.2 * (1 - traits.A) + 0.1 * traits.O + rng.normal(0, 0.12) - 0.25, 0, 1),
    grades: clamp(0.3 + 0.35 * abilities.academics + 0.25 * traits.C + rng.normal(0, 0.08), 0, 1),
    parentStrictness: rng.trait(0.5, 0.2),
    groundedUntil: -1,
    phoneHabit: rng.trait(0.3, 0.15),
    recentEvenings: [],
    absentUntil: -1,
    gone: false,
    parentBarBoost: 0,
    strictUntil: -1,
    newUntil: -1,
    tutoredUntil: -1,
    fixTarget: null,
    fixUntil: -1,
    stickCloseUntil: -1,
    studiedTonight: false,
    lastTable: {},
    lastMates: {},
    refSet: [],
    group: -1,
    bullyAttempts: 0,
    bullyWins: 0,
    inTroubleUntil: -1,
    crush: null,
    crushStep: 0,
    partner: null,
    status: 0.5,
    statusLastWeek: 0.5,
    statusRaw: 1,
    foundation: { liked: 0, admired: 0, feared: 0 },
    rels: new Map(),
    knownStories: [],
    counts: { aloneLunches: 0, targeted: 0, dominated: 0, putdowns: 0, shoves: 0, reports: 0, defended: 0, defenseWon: 0, phoneNights: 0, approachedForShirt: 0, stressTotal: 0, behindGym: 0, caught: 0 },
  };
}

/** A new student joins mid-semester: from a small school, knowing nobody, sitting at the back of each class. */
export function addStudent(world: World): Student {
  const s = createStudent(world.rng, world.students.length);
  s.feeder = FEEDER_SCHOOLS.length - 1;
  const sections = Math.ceil(world.students.length / SECTION_SIZE);
  for (let p = 0; p < PERIODS; p++) {
    s.sections[p] = world.rng.int(sections);
    s.seats[p] = openDesks(world, p, s.sections[p])[0] ?? DESKS + world.students.filter((o) => o.sections[p] === s.sections[p]).length;
  }
  world.students.push(s);
  return s;
}

/** Desks nobody is sitting at in one class (a period and section), in random order. */
export function openDesks(world: World, period: number, section: number): number[] {
  const taken = new Set(world.students.filter((o) => !o.gone && o.sections[period] === section).map((o) => o.seats[period]));
  return world.rng.shuffle(Array.from({ length: DESKS }, (_, i) => i).filter((d) => !taken.has(d)));
}

/** A new seating chart: everyone gets new neighbors in classes from `fromPeriod` on (same sections). */
export function reseat(world: World, fromPeriod: number) {
  for (let p = fromPeriod; p < PERIODS; p++) {
    const bySection = new Map<number, Student[]>();
    for (const s of world.students) bySection.set(s.sections[p], [...(bySection.get(s.sections[p]) ?? []), s]);
    for (const list of bySection.values()) {
      const desks = world.rng.shuffle(Array.from({ length: Math.max(DESKS, list.length) }, (_, i) => i));
      list.forEach((s, i) => (s.seats[p] = desks[i]));
    }
  }
}

function assignClasses(world: World) {
  const { rng, students } = world;
  const sections = Math.ceil(students.length / SECTION_SIZE);
  for (let p = 0; p < PERIODS; p++) {
    // Rough tracking: period 0 and 1 classes are sorted partly by academics.
    const order = rng.shuffle(students.map((s) => s.id));
    if (p < 2) order.sort((a, b) => students[b].abilities.academics + rng.normal(0, 0.3) - students[a].abilities.academics);
    order.forEach((id, i) => (students[id].sections[p] = Math.floor(i / SECTION_SIZE) % sections));
  }
  // Each class fills a random selection of the desks, leaving open ones scattered around.
  reseat(world, 0);
}

/** Students from the same middle school already know each other; some are already friends. */
function seedMiddleSchoolTies(world: World) {
  const { rng, students } = world;
  const smallSchool = FEEDER_SCHOOLS.length - 1;
  for (const a of students) {
    if (a.feeder === smallSchool) continue;
    const schoolmates = students.filter((b) => b.id !== a.id && b.feeder === a.feeder);
    for (const b of schoolmates) {
      if (!rng.chance(0.5)) continue;
      const r = meet(world, a, b);
      r.fam = rng.range(0.2, 0.45);
      r.aff = rng.normal(0.02, 0.12);
      r.resp += rng.normal(0, 0.1);
    }
    // A few existing close friendships, mostly same gender.
    const friends = rng.shuffle(schoolmates.filter((b) => (b.gender === a.gender ? true : rng.chance(0.2)))).slice(0, 1 + rng.int(3));
    for (const b of friends) {
      for (const [x, y] of [
        [a, b],
        [b, a],
      ] as const) {
        const r = meet(world, x, y);
        r.fam = Math.max(r.fam, rng.range(0.6, 0.9));
        r.aff = Math.max(r.aff, rng.range(0.35, 0.7));
        r.trust = Math.max(r.trust, rng.range(0.25, 0.6));
      }
    }
  }
  // Everyone starts with their public stance equal to their private view.
  for (const s of students) for (const r of s.rels.values()) r.pub = r.aff * 0.5 + r.resp * 0.3 + r.trust * 0.2;
}
