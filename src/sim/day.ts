import { ABILITIES, ACTIVITIES, INTERESTS, LOOKS, favoriteShirtTopic, type ActivityDef, type Look } from './content';
import { examSoon, runConversation } from './conversation';
import { PERIODS, SEAT_ROW } from './generate';
import { applyAct } from './perceive';
import { approachability, displayAbility, lookSignal, meet, novelty, nudge, nudge01, peek, schoolKnowledge, updateLookShares } from './rel';
import { clamp, sigmoid } from './rng';
import { detectGroups, nightly, peerDrift, resetWeek, updateRefSets } from './social';
import { count, createStory, forgetOldStories, isStoryworthy, tellStory } from './stories';
import { storyteller } from './storyteller';
import type { Act, EveningChoice, Student, Witness, World } from './types';

/** Simulate one day. School days have classes, lunch and activities; weekends have hangouts and parties. */
export function runDay(world: World) {
  startDay(world);
  if (isSchoolDay(world)) {
    morning(world);
    const lunch = seatLunch(world);
    finishLunch(world, lunch);
    afternoon(world);
  } else {
    weekendDay(world);
  }
  endDay(world);
}

/*
 * The day in phases, so the game can stop between them for the player's decisions.
 * runDay is exactly these, in this order.
 */

export function isSchoolDay(world: World): boolean {
  return world.day % 7 < 5;
}

export function startDay(world: World) {
  for (const s of world.students) s.energy = clamp(s.energy, 0.2, 1);
  if (world.day === 0) joinActivities(world);
  if (world.cfg.storyteller !== false) storyteller(world);
}

/** Out of school today: sick, or moved away. */
export function isAbsent(world: World, s: Student): boolean {
  return s.gone || world.day < s.absentUntil;
}

/** Before school in the hallway, then the three morning classes. */
export function morning(world: World) {
  hallwayBeforeSchool(world);
  morningClasses(world);
}

/**
 * Before school, people stand wherever they like: lots of spots, small groups. Nobody has to join a
 * group, so people who don't know anyone (or don't feel like talking) stand on their own.
 */
const HALLWAY_SPOTS = 100;
const HALLWAY_CAP = 8;

/** Hanging around the hallway and courtyard before the bell. */
export function hallwayBeforeSchool(world: World) {
  freeTime(world, 'hallway', HALLWAY_SPOTS, HALLWAY_CAP, 2);
}

/** Before school with a human player: everyone else finds their group first, so the player can see who's where. */
export function seatHallway(world: World): LunchSeating {
  return seat(world, 'hallway', HALLWAY_SPOTS, HALLWAY_CAP, world.player?.id);
}

/** Before-school chatter; the player's own group is returned so the game can play it. */
export function finishHallway(world: World, seating: LunchSeating, skipPlayer = false): PlayerTable | null {
  recordSeating(world, seating, 'hallway');
  return talkAtTables(world, seating.tables, 'hallway', 2, skipPlayer ? world.player!.id : undefined);
}

/** Who sits right next to the player in one class (a period). */
export function playerClassNeighbors(world: World, period: number): number[] {
  const me = world.students[world.player!.id];
  const occupants = deskOccupants(world, period, me.sections[period]);
  return deskNeighbors(me.seats[period])
    .map((d) => occupants.get(d))
    .filter((id): id is number => id !== undefined && !isAbsent(world, world.students[id]));
}

export function morningClasses(world: World) {
  classes(world, 0, 3);
}

/** One class period: for a game that walks the player through the day one class at a time. */
export function classPeriod(world: World, period: number) {
  classes(world, period, period + 1);
}

/** Just the after-school part of the afternoon (when the game runs the afternoon classes itself). */
export function afterSchoolTime(world: World) {
  afterSchool(world, world.day % 7, Math.floor(world.day / 7));
}

/**
 * The player asks someone to walk to class with them. Someone who likes you says yes; with anyone
 * else it's a gamble that depends on your confidence, your standing, and whether your shirt is
 * something they're into. A no isn't a scene — they're just walking with someone else.
 */
export function askToWalkWith(world: World, target: number): boolean {
  const me = world.students[world.player!.id];
  const them = world.students[target];
  const feel = them.rels.get(me.id)?.pub ?? 0;
  if (feel > 0.15) return true;
  const shirtPull = approachability(them, me) - 1;
  const p = 0.3 + 0.3 * me.traits.E + 0.25 * me.status + 0.2 * me.poise + 0.3 * shirtPull + 2 * feel;
  return world.rng.chance(clamp(p, 0.05, 0.95));
}

/** Who's in one of the player's classes (a period), apart from the player. */
export function classmates(world: World, period: number): number[] {
  const me = world.students[world.player!.id];
  return world.students.filter((s) => s.id !== me.id && !isAbsent(world, s) && s.sections[period] === me.sections[period]).map((s) => s.id);
}

const LUNCH_CAP = 8;
const LUNCH_ROUNDS = 6;

/** Lunch tables as they fill up. With a human player, everyone else sits first, so the player can see who's where. */
export interface LunchSeating {
  tables: number[][];
  at: Map<number, number>;
}

export function seatLunch(world: World): LunchSeating {
  return seat(world, 'lunch', Math.ceil(world.students.length / 7), LUNCH_CAP, world.player?.id);
}

/** The player can pull up a chair at a full table. */
export const PLAYER_LUNCH_CAP = LUNCH_CAP + 1;

/**
 * The player walks up to a table. Joining a table where nobody knows you is a gamble, and someone
 * may tell you the seat is saved. Returns whether you got in.
 */
export function playerTriesTable(world: World, seating: LunchSeating, ti: number, place: 'lunch' | 'hallway' = 'lunch'): boolean {
  const s = world.students[world.player!.id];
  const t = seating.tables[ti];
  if (t.length >= (place === 'lunch' ? PLAYER_LUNCH_CAP : HALLWAY_CAP + 1)) return false;
  if (t.length === 0 || tryJoin(world, s, t, place)) {
    t.push(s.id);
    seating.at.set(s.id, ti);
    return true;
  }
  return false;
}

/** The player sits at the emptiest table. */
export function playerSitsAlone(world: World, seating: LunchSeating) {
  const id = world.player!.id;
  const ti = seating.tables.reduce((best, t, i) => (t.length < seating.tables[best].length ? i : best), 0);
  seating.tables[ti].push(id);
  seating.at.set(id, ti);
}

/** Who the player ends up talking with at lunch (the game plays this conversation interactively). */
export interface PlayerTable {
  members: number[];
  onlookers: number[];
}

/**
 * Lunch conversations. Everyone's run automatically, except — when `skipPlayer` is set — the conversation
 * the player is part of, which is returned so the game can play it with the player.
 */
export function finishLunch(world: World, seating: LunchSeating, skipPlayer = false): PlayerTable | null {
  recordSeating(world, seating, 'lunch');
  return talkAtTables(world, seating.tables, 'lunch', LUNCH_ROUNDS, skipPlayer ? world.player!.id : undefined);
}

/** The three afternoon classes, then activities, hanging out, or going home. */
export function afternoon(world: World) {
  classes(world, 3, PERIODS);
  afterSchool(world, world.day % 7, Math.floor(world.day / 7));
}

export function weekendDay(world: World) {
  weekend(world, world.day % 7, Math.floor(world.day / 7));
}

/** Evening, overnight updates, and (on Sundays) the weekly ones. Advances to the next day. */
export function endDay(world: World) {
  const dow = world.day % 7;
  evening(world);
  nightly(world);
  forgetOldStories(world);
  if (dow === 6) {
    parentsCheckGrades(world);
    for (const s of world.students) s.statusLastWeek = s.status;
    peerDrift(world);
    detectGroups(world);
    updateRefSets(world);
    chooseClothes(world);
    resetWeek(world);
  }
  world.day++;
}

/**
 * Free time (hallway before school, lunch): everyone arrives in random order and picks a
 * table by who's already there. Joining a table where nobody likes you can fail.
 */
function freeTime(world: World, place: string, nTables: number, cap: number, rounds: number) {
  const seating = seat(world, place, nTables, cap);
  recordSeating(world, seating, place);
  talkAtTables(world, seating.tables, place, rounds);
}

/** Everyone (except `skip`) arrives in random order and picks a table by who's already there. */
function seat(world: World, place: string, nTables: number, cap: number, skip?: number): LunchSeating {
  const { rng, students } = world;
  const tables: number[][] = Array.from({ length: nTables }, () => []);
  const at = new Map<number, number>();
  for (const s of rng.shuffle([...students])) {
    if (s.id === skip || isAbsent(world, s)) continue;
    let tried = 0;
    const scores = tables.map((t, i) => tableScore(world, s, t, i, place, cap));
    if (place === 'hallway') {
      // Standing on your own is one choice, not one per empty spot: keep only one empty spot in the running
      // (where I stood last time, if it's free).
      const mine = s.lastTable[place];
      const keep = mine !== undefined && tables[mine]?.length === 0 ? mine : tables.findIndex((t) => t.length === 0);
      tables.forEach((t, i) => t.length === 0 && i !== keep && (scores[i] = -Infinity));
    }
    while (tried < 2) {
      const ti = softmaxPick(world, scores);
      const t = tables[ti];
      if (t.length === 0 || tryJoin(world, s, t, place)) {
        t.push(s.id);
        at.set(s.id, ti);
        break;
      }
      scores[ti] = -Infinity;
      tried++;
    }
    if (!at.has(s.id)) {
      // Nobody let me in: sit at the emptiest table.
      const ti = tables.reduce((best, t, i) => (t.length < tables[best].length ? i : best), 0);
      tables[ti].push(s.id);
      at.set(s.id, ti);
    }
  }
  return { tables, at };
}

function recordSeating(world: World, { tables, at }: LunchSeating, place: string) {
  const { students } = world;
  for (const [id, ti] of at) {
    const s = students[id];
    if (place === 'lunch' && tables[ti].length === 1) s.counts.aloneLunches++;
    if (place === 'lunch') noticeDitching(world, s, tables[ti]);
    s.lastTable[place] = ti;
    s.lastMates[place] = tables[ti].filter((x) => x !== id);
  }
}

function talkAtTables(world: World, tables: number[][], place: string, rounds: number, skip?: number): PlayerTable | null {
  let skipped: PlayerTable | null = null;
  tables.forEach((t, ti) => {
    if (t.length < 2) return;
    const nearby = (tables[ti - 1] ?? []).concat(tables[ti + 1] ?? []);
    for (const group of splitConversations(world, t)) {
      const onlookers = t.filter((x) => !group.includes(x)).concat(nearby);
      if (skip !== undefined && group.includes(skip)) skipped = { members: group, onlookers };
      else runConversation(world, group, onlookers, place, rounds, { hangout: true });
    }
  });
  return skipped;
}

function tableScore(world: World, s: Student, table: number[], ti: number, place: string, cap: number): number {
  if (table.length >= cap) return -Infinity;
  if (table.length === 0) {
    // In the hallway, standing on your own is a normal thing to do — especially if you're reserved.
    const alone = place === 'hallway' ? -0.05 + 0.4 * (1 - s.traits.E) + 0.25 * s.traits.N : -0.3 + 0.2 * (1 - s.traits.E);
    return alone + (s.lastTable[place] === ti ? 0.2 : 0);
  }
  let score = 0;
  for (const o of table) {
    const r = peek(world, s.id, o);
    const other = world.students[o];
    const sameGender = other.gender === s.gender ? 0.25 * s.sameGenderPref : -0.1 * s.sameGenderPref;
    // An inviting shirt draws me over, especially to someone I don't know yet; a hoodie, or a shirt about
    // something I mock, puts me off.
    score += 0.35 * (approachability(s, other) - 1) * (r ? 0.5 : 1);
    if (!r) {
      // At lunch you need a seat somewhere; in the hallway, walking up to strangers is a choice few make.
      score += (place === 'hallway' ? -0.3 : -0.05) + sameGender * 0.5 + 0.3 * s.statusDrive * (other.status - 0.5);
      continue;
    }
    score += r.aff * 1.2 + r.resp * 0.3 + 0.6 * s.statusDrive * (other.status - 0.5) - r.fear * 0.5 + sameGender;
    if (other.look === s.look) score += 0.2 * lookSignal(world, s.look);
    if (s.partner === o) score += 1;
    if (s.crush === o) score += 0.3;
    // I'm glad to sit with someone who's helped me.
    score += 0.6 * r.owed;
  }
  score /= Math.sqrt(table.length);
  // Standing around, a big circle is hard to be part of: people drift off into smaller groups.
  if (place === 'hallway') score -= 0.035 * Math.max(0, table.length - 2) ** 2;
  if (s.lastTable[place] === ti) score += 0.4; // habit
  return score;
}

function softmaxPick(world: World, scores: number[]): number {
  const max = Math.max(...scores.filter((x) => Number.isFinite(x)));
  return world.rng.weighted(scores.map((x) => (Number.isFinite(x) ? Math.exp((x - max) / 0.25) : 0)));
}

/** Walk up and say "hey". Works if someone there likes you; otherwise it's a gamble, and someone may freeze you out. */
function tryJoin(world: World, s: Student, table: number[], place: string): boolean {
  let warmest = -1;
  for (const o of table) warmest = Math.max(warmest, peek(world, o, s.id)?.pub ?? 0);
  if (warmest > 0.15) return true;
  // The rule-breaking crowd takes almost anyone: they have no standing to protect.
  if (table.some((o) => world.students[o].ruleBreaking > 0.6 && world.students[o].statusDrive < 0.6)) return true;
  // Someone edgy and status-hungry at the table may freeze out a lower-status stranger.
  for (const o of table) {
    const other = world.students[o];
    const dominance = other.statusDrive * (1 - other.traits.A);
    if (other.status - s.status > 0.2 && dominance > 0.3 && world.rng.chance(dominance * 0.25)) {
      const act: Act = { kind: 'exclude', actor: o, target: s.id, place, day: world.day };
      const ws: Witness[] = table.filter((x) => x !== o).map((id) => ({ id, wt: 1 }));
      ws.push({ id: s.id, wt: 1 });
      applyAct(world, act, ws);
      if (isStoryworthy(act, world)) createStory(world, act, ws);
      return false;
    }
  }
  // Clothes help: looking like the table; wearing a shirt someone there loves (they have something to ask me);
  // or someone there wearing a shirt I love (I have an easy opener — their shirt starts the conversation for me).
  const lookMatch = (lookSignal(world, s.look) * table.filter((o) => world.students[o].look === s.look).length) / table.length;
  // How inviting my shirt looks to the people at the table (a hoodie makes walking up harder).
  const myShirtFans = table.reduce((t, o) => t + approachability(world.students[o], s) - 1, 0) / table.length;
  const wearers = table.filter((o) => world.students[o].shirt !== null && s.opinions[world.students[o].shirt!] > 0.3);
  const theirShirtOpener = Math.max(0, ...wearers.map((o) => s.opinions[world.students[o].shirt!]));
  // Standing around, someone on their own is usually glad of the company; a pair is easy to join too.
  const small = place === 'hallway' ? 0.3 / table.length : 0;
  const p = 0.35 + 0.3 * s.traits.E + 0.3 * s.status + 2 * warmest + 0.2 * lookMatch + 0.3 * myShirtFans + 0.4 * theirShirtOpener + 0.25 * s.poise + small;
  if (world.rng.chance(clamp(p, 0.05, 0.95))) {
    for (const o of wearers) noteShirtApproach(world, s, world.students[o]);
    for (const o of table) applyAct(world, { kind: 'greet', actor: s.id, target: o, place, day: world.day }, [{ id: o, wt: 1 }]);
    return true;
  }
  return false;
}

/** Leaving your usual friends' table for a higher-status one gets noticed. */
function noticeDitching(world: World, s: Student, newTable: number[]) {
  const before = s.lastMates.lunch;
  if (!before || before.length === 0) return;
  const avgStatus = (ids: number[]) => ids.reduce((t, i) => t + world.students[i].status, 0) / Math.max(1, ids.length);
  const leftBehind = before.filter((b) => !newTable.includes(b) && (peek(world, b, s.id)?.aff ?? 0) > 0.4);
  if (leftBehind.length === 0) return;
  if (avgStatus(newTable.filter((x) => x !== s.id)) < avgStatus(before) + 0.15) return;
  // Only counts as ditching once it becomes a pattern-worthy event; keep it occasional.
  if (!world.rng.chance(0.3)) return;
  for (const b of leftBehind) {
    const act: Act = { kind: 'ditch', actor: s.id, target: b, place: 'lunch', day: world.day };
    applyAct(world, act, [{ id: b, wt: 1 }]);
  }
  count(world, 'ditches');
}

/** Split a big table into conversations of at most five, grouping people who like each other. */
function splitConversations(world: World, table: number[]): number[][] {
  if (table.length <= 5) return [table];
  const rest = world.rng.shuffle([...table]);
  const a = [rest.shift()!];
  const b = [rest.shift()!];
  for (const x of rest) {
    const toA = a.reduce((t, y) => t + (peek(world, x, y)?.aff ?? 0), 0) / a.length;
    const toB = b.reduce((t, y) => t + (peek(world, x, y)?.aff ?? 0), 0) / b.length;
    (toA >= toB && a.length < 5 ? a : b.length < 5 ? b : a).push(x);
  }
  return [a, b];
}

/** Classes: you sit near the same people every day, which slowly builds familiarity. Teachers suppress trouble. */
/** The desks next to a desk: left and right in the same row, and directly in front and behind. */
export function deskNeighbors(desk: number): number[] {
  const out: number[] = [];
  if (desk % SEAT_ROW !== 0) out.push(desk - 1);
  if ((desk + 1) % SEAT_ROW !== 0) out.push(desk + 1);
  if (desk - SEAT_ROW >= 0) out.push(desk - SEAT_ROW);
  out.push(desk + SEAT_ROW);
  return out;
}

/** Who sits at each desk in one class (a period and section). */
export function deskOccupants(world: World, period: number, section: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of world.students) if (!s.gone && s.sections[period] === section) out.set(s.seats[period], s.id);
  return out;
}

function classes(world: World, from: number, to: number) {
  const { rng, students } = world;
  for (let p = from; p < to; p++) {
    const sections = new Map<number, Student[]>();
    for (const s of students) {
      if (isAbsent(world, s)) continue;
      const list = sections.get(s.sections[p]) ?? [];
      list[s.seats[p]] = s;
      sections.set(s.sections[p], list);
    }
    for (const seats of sections.values()) {
      for (let i = 0; i < seats.length; i++) {
        const s = seats[i];
        if (!s) continue;
        const neighbors = deskNeighbors(i).map((d) => seats[d]).filter((x): x is Student => !!x);
        for (const n of neighbors) {
          const r = meet(world, s, n);
          r.fam = nudge01(r.fam, 0.006);
        }
        // An inviting shirt on a neighbor makes me more likely to start a chat — with them.
        const appeal = neighbors.map((n) => approachability(s, n));
        // The player decides who they talk to in class themselves (the game asks them).
        if (s.id !== world.player?.id && neighbors.length && rng.chance((0.2 * (0.5 + s.traits.E) + 0.15 * (Math.max(...appeal) - 1)) * Math.min(1.5, Math.max(...appeal)))) {
          const n = neighbors[rng.weighted(appeal.map((x) => x * x))];
          if (approachability(s, n) > 1.2) noteShirtApproach(world, s, n);
          // Being talked to in class is a distraction from the lesson, and tiring for reserved people.
          n.grades = clamp(n.grades - 0.003, 0, 1);
          s.grades = clamp(s.grades - 0.001, 0, 1);
          n.stress += 0.04 * (1 - n.traits.E);
          runConversation(world, [s.id, n.id], neighbors.filter((x) => x !== n).map((x) => x.id), 'class', 2, { teacher: true });
        }
        // Struggling with the work, I ask whoever nearby knows it best — especially before exams.
        if (neighbors.length && s.grades < 0.45 && rng.chance(examSoon(world) ? 0.08 : 0.025)) {
          const helper = neighbors.reduce((a, b) => (schoolKnowledge(b) > schoolKnowledge(a) ? b : a));
          if (schoolKnowledge(helper) > schoolKnowledge(s) + 0.15) {
            const help: Act = { kind: 'help', actor: helper.id, target: s.id, place: 'class', day: world.day, ability: 'academics' };
            applyAct(world, help, [{ id: s.id, wt: 1 }, ...neighbors.filter((n) => n !== helper).map((n) => ({ id: n.id, wt: 0.3 }))]);
            meet(world, helper, s).given += 0.1;
            count(world, 'askedForHelp');
          }
        }
        // Answering well in class shows academics to the people who already notice you.
        if (rng.chance(0.04 * s.abilities.academics)) for (const n of neighbors) displayAbility(world, n, s, 'academics', s.abilities.academics, 1);
      }
    }
  }
}

function joinActivities(world: World) {
  const { rng, students } = world;
  const forced = world.cfg.forcedActivity;
  if (forced) for (const [id, activity] of forced) students[id].activity = activity;
  const player = world.player;
  for (const def of ACTIVITIES) {
    const want = students.filter((s) => {
      if (s.activity || forced?.has(s.id) || (def.gender && s.gender !== def.gender)) return false;
      // The player tries out for what they signed up for, and nothing else.
      if (player && s.id === player.id) return player.signup === def.id;
      const interest = def.interest ? s.interests[def.interest] : 0;
      const appeal = s.abilities[def.ability] * 0.8 + interest * 0.5 + (def.id === 'drama' ? s.traits.E * 0.3 : 0) + rng.normal(0, 0.2);
      return appeal > 0.75;
    });
    // Tryouts: limited spots go to the most skilled (with some luck on the day).
    const ranked = def.tryout ? want.sort((a, b) => b.abilities[def.ability] + rng.normal(0, 0.1) - a.abilities[def.ability]) : rng.shuffle(want);
    for (const s of ranked.slice(0, def.capacity)) s.activity = def.id;
  }
}

function afterSchool(world: World, dow: number, week: number) {
  const { rng, students } = world;
  const busy = new Set<number>();
  world.playerAfternoon = null;
  for (const def of ACTIVITIES) {
    // No pass, no play: students whose grades have fallen too low sit out until they recover.
    const members = students.filter((s) => s.activity === def.id && !isAbsent(world, s) && s.grades >= ELIGIBILITY_GRADE && !(world.player?.id === s.id && world.player.afterSchool !== 'activity'));
    if (members.length < 2) continue;
    members.forEach((m) => busy.add(m.id));
    if (dow < 4) practice(world, def, members);
    else if (def.id.startsWith('soccer') && week >= 2 && week <= 12 && week % 2 === 0) {
      showcase(world, def, members, def.showcaseName);
      // The pep band plays at home games too.
      if (def.id === 'soccer-girls') {
        const band = ACTIVITIES.find((a) => a.id === 'band')!;
        showcase(world, band, students.filter((s) => s.activity === 'band'), 'the soccer game');
      }
    }
    else if (def.showcaseWeek === week) showcase(world, def, members, def.showcaseName);
  }
  const player = world.player;
  // A player heading home is busy; one hanging out looks for friends below.
  if (player && player.afterSchool === 'home') busy.add(player.id);
  behindTheGym(world, busy);
  // Everyone else: go home, or hang out with a friend or two.
  for (const s of rng.shuffle(students.filter((x) => !busy.has(x.id) && !isGrounded(world, x) && !isAbsent(world, x)))) {
    const isPlayer = player?.id === s.id;
    if (isPlayer && player!.afterSchool !== 'hangout') continue;
    if (busy.has(s.id) || (!isPlayer && !rng.chance(0.25 * s.traits.E))) continue;
    // The player hangs out with whoever said yes today, if anyone; otherwise friends who are free.
    const invited = isPlayer ? player!.hangoutWith.filter((b) => !busy.has(b) && !isGrounded(world, students[b])) : [];
    const friends = invited.length
      ? invited
      : [...s.rels].filter(([b, r]) => r.aff > 0.3 && !busy.has(b) && !isGrounded(world, students[b])).sort((x, y) => y[1].aff - x[1].aff).slice(0, 1 + rng.int(2)).map((x) => x[0]);
    if (friends.length === 0) continue;
    const group = [s.id, ...friends];
    group.forEach((g) => busy.add(g));
    // The player plays their own hangout in the game.
    if (isPlayer) world.playerAfternoon = { place: 'after school', groups: [friends], rounds: 4, private: true };
    else runConversation(world, group, [], 'after school', 4, { hangout: true, private: true });
  }
  if (player) player.hangoutWith = [];
}

/**
 * Weekly: what to wear. Conformists drift toward the look of the people they're close to and watch.
 * Shirts: wear one about something you love — unless the people you watch mock it and you care what they think.
 */
function chooseClothes(world: World) {
  const { rng, students } = world;
  updateLookShares(world);
  for (const s of students) {
    if (world.player?.id === s.id) continue; // the player dresses themselves, every morning
    const circle = [...s.rels].filter(([, r]) => r.aff > 0.4 && r.trust > 0.2).map((x) => x[0]);
    // Close friends count fully; the people I watch (often higher status) count half.
    const tally = new Map<Look, number>();
    for (const id of circle) tally.set(students[id].look, (tally.get(students[id].look) ?? 0) + 1);
    for (const id of s.refSet) tally.set(students[id].look, (tally.get(students[id].look) ?? 0) + 0.5);
    const total = [...tally.values()].reduce((t, x) => t + x, 0);
    const [common, votes] = total > 0 ? [...tally].sort((a, b) => b[1] - a[1])[0] : [s.ownLook, 0];
    const majority = total > 0 ? votes / total : 0;
    let next = s.look;
    // Once a look is everywhere it stops saying anything; people who want to stand out move on from it.
    const standOut = (1 - s.conformity) * (0.5 + 0.5 * s.traits.O);
    const tooCommon = (world.lookShare[s.look] ?? 0) > 0.3;
    if (tooCommon && rng.chance(0.4 * standOut)) {
      const rarer = LOOKS.filter((l) => (world.lookShare[l] ?? 0) < (world.lookShare[s.look] ?? 0));
      next = rarer.includes(s.ownLook) ? s.ownLook : rarer.length ? rng.pick(rarer) : s.look;
    }
    // Switch to the circle's look only when most of them share it, it still means something, and more readily if you're a conformist.
    else if (common !== s.look && majority > 0.5 && rng.chance(s.conformity * (majority - 0.5) * 2 * lookSignal(world, common))) next = common;
    // Otherwise, drift back to your own taste when your circle doesn't share one look.
    else if (s.look !== s.ownLook && majority < 0.5 && rng.chance(0.3 * (1 - s.conformity))) next = s.ownLook;
    if (next !== s.look) {
      s.look = next;
      count(world, 'lookChanges');
    }
    // Only shirts that go with today's look.
    const favorite = favoriteShirtTopic(s.opinions, s.look);
    const watched = [...circle, ...s.refSet];
    const circleView = watched.length ? watched.reduce((t, id) => t + students[id].opinions[favorite], 0) / watched.length : 0;
    const wantsTo = s.opinions[favorite] > 0.4 && rng.chance(0.3 + 0.4 * s.traits.O);
    const worried = circleView < -0.1 && rng.chance(s.conformity);
    const forced = world.cfg.forcedShirt?.get(s.id);
    // A fan shirt if you love something and your friends won't mock it; otherwise outgoing people go for a
    // funny tee, and reserved, sensitive or stressed people for a hoodie.
    s.shirtStyle =
      forced ??
      (wantsTo && !worried
        ? 'fan'
        : s.traits.E > 0.65 && rng.chance(0.4)
          ? 'graphic'
          : (s.traits.E < 0.35 || s.traits.N > 0.7 || s.stress > 0.5) && rng.chance(0.4)
            ? 'hoodie'
            : 'plain');
    s.shirt = s.shirtStyle === 'fan' ? favorite : null;
  }
}

/** Someone came over to the wearer because of their shirt (counted only if they barely knew each other). */
function noteShirtApproach(world: World, approacher: Student, wearer: Student) {
  if ((peek(world, approacher.id, wearer.id)?.fam ?? 0) >= 0.2) return;
  wearer.counts.approachedForShirt++;
  count(world, 'shirtApproaches');
}

/** How many close friends someone has (aff and trust both well above zero). */
function closeFriendCount(s: Student): number {
  let n = 0;
  for (const r of s.rels.values()) if (r.aff > 0.4 && r.trust > 0.2) n++;
  return n;
}

/** People close enough to spend an evening with: I like and trust them, and they like me back. */
export function closeFriendsOf(world: World, s: Student): number[] {
  const out: number[] = [];
  for (const [b, r] of s.rels) if (r.aff > 0.4 && r.trust > 0.2 && (peek(world, b, s.id)?.aff ?? 0) > 0.3) out.push(b);
  return out;
}

/**
 * The rule-breaking crowd hangs out behind the gym instead of going home or doing homework.
 * It's the easiest group to get into — kids with few friends get pulled in by anyone there they
 * like — and sneaking off together bonds fast. Everyone else respects it less, and sometimes a
 * teacher catches them: detention, a hit to grades, and parents may ground them.
 */
function behindTheGym(world: World, busy: Set<number>) {
  const { rng, students } = world;
  const player = world.player;
  const regulars = students.filter((s) => {
    if (busy.has(s.id) || isGrounded(world, s) || isAbsent(world, s)) return false;
    if (player?.id === s.id) return player.afterSchool === 'gym';
    return rng.chance(sigmoid(8 * (s.ruleBreaking - 0.6)));
  });
  const going = new Set(regulars.map((s) => s.id));
  for (const s of students) {
    if (busy.has(s.id) || going.has(s.id) || isGrounded(world, s) || isAbsent(world, s) || player?.id === s.id) continue;
    const likesSomeoneThere = regulars.some((r) => (peek(world, s.id, r.id)?.aff ?? 0) > 0.2);
    const lonely = closeFriendCount(s) <= 1;
    if (likesSomeoneThere && rng.chance((lonely ? 0.4 : 0.1) * (0.5 + s.ruleBreaking))) going.add(s.id);
  }
  if (going.size < 2) return;
  const crowd = rng.shuffle([...going]);
  crowd.forEach((id) => {
    busy.add(id);
    students[id].counts.behindGym++;
  });
  const caught = rng.chance(0.12);
  // The player picks who to hang with back there, and plays that conversation in the game.
  const pid = player?.id;
  if (pid !== undefined && going.has(pid)) {
    const others = crowd.filter((x) => x !== pid);
    const groups: number[][] = [];
    for (let i = 0; i < others.length; i += 5) groups.push(others.slice(i, i + 5));
    world.playerAfternoon = { place: 'behind the gym', groups, rounds: 3, private: false };
    skipConsequences(world, students[pid], caught);
  }
  const crowdWithoutPlayer = crowd.filter((x) => x !== pid);
  for (let i = 0; i < crowdWithoutPlayer.length; i += 5) {
    const group = crowdWithoutPlayer.slice(i, i + 5);
    if (group.length < 2) continue;
    runConversation(world, group, crowd.filter((x) => !group.includes(x)), 'behind the gym', 4, { hangout: true });
    bondOverRules(world, group);
    const act: Act = { kind: 'sneakoff', actor: group[0], target: -1, place: 'behind the gym', day: world.day, caught };
    // It isn't secret: people walking past see who hangs out back there. Sneaking off also means skipping last period.
    const passersby: Witness[] = [];
    for (let k = 0; k < 6; k++) {
      const p = rng.int(students.length);
      if (!going.has(p)) passersby.push({ id: p, wt: 0.5 });
    }
    for (const a of group) {
      applyAct(world, { ...act, actor: a }, passersby);
      students[a].grades = clamp(students[a].grades - 0.004, 0, 1);
    }
    if (caught) {
      createStory(world, act, group.map((id) => ({ id, wt: 1 })));
      for (const id of group) {
        const s = students[id];
        s.counts.caught++;
        s.grades = clamp(s.grades - 0.03, 0, 1);
        s.stress += 0.2;
        if (rng.chance(0.1 + 0.3 * s.parentStrictness)) s.groundedUntil = world.day + 7;
      }
      count(world, 'caughtSkipping');
    }
  }
}

/** Breaking rules together is a shared risk, a costly signal: it bonds fast. */
export function bondOverRules(world: World, group: number[]) {
  const { students } = world;
  for (const a of group)
    for (const b of group) {
      if (a === b) continue;
      const r = meet(world, students[a], students[b]);
      r.aff = nudge(r.aff, 0.04 * novelty(r));
      r.trust = nudge(r.trust, 0.05 * novelty(r));
    }
}

/** What skipping last period behind the gym costs the player: seen by passersby, a missed class, and maybe getting caught. */
function skipConsequences(world: World, s: Student, caught: boolean) {
  const { rng, students } = world;
  const passersby: Witness[] = [];
  for (let k = 0; k < 6; k++) passersby.push({ id: rng.int(students.length), wt: 0.5 });
  applyAct(world, { kind: 'sneakoff', actor: s.id, target: -1, place: 'behind the gym', day: world.day, caught }, passersby.filter((w) => w.id !== s.id));
  s.grades = clamp(s.grades - 0.004, 0, 1);
  if (caught) {
    s.counts.caught++;
    s.grades = clamp(s.grades - 0.03, 0, 1);
    s.stress += 0.2;
    if (rng.chance(0.1 + 0.3 * s.parentStrictness)) s.groundedUntil = world.day + 7;
  }
}

function practice(world: World, def: ActivityDef, members: Student[]) {
  const { rng } = world;
  // Where you rank on the team matters: the strongest shine, the weakest ride the bench and struggle.
  const ranked = [...members].sort((a, b) => a.abilities[def.ability] - b.abilities[def.ability]);
  const struggling = new Set(ranked.slice(0, Math.floor(ranked.length / 3)));
  for (const m of members) {
    m.abilities[def.ability] = clamp(m.abilities[def.ability] + 0.001, 0, 1);
    const playingTime = struggling.has(m) ? 0.5 : 1;
    // Conditioning and poise build with diminishing returns — less if you're on the bench.
    m.fitness = clamp(m.fitness + (def.builds.fitness ?? 0) * playingTime * (1 - m.fitness), 0, 1);
    m.poise = clamp(m.poise + (def.builds.poise ?? 0) * playingTime * (1 - m.poise), 0, 1);
    // A hard practice burns off stress; struggling to keep up adds some.
    if (def.builds.fitness) {
      m.stress *= 0.93;
      m.energy = clamp(m.energy - 0.15, 0, 1); // physically tiring
    }
    if (struggling.has(m)) m.stress += 0.03;
  }
  // The player picks which group to hang with at practice, and plays that conversation in the game.
  const pid = world.player?.id;
  const order = rng.shuffle(members.map((m) => m.id).filter((id) => id !== pid));
  const groups: number[][] = [];
  for (let i = 0; i < order.length; i += 4) groups.push(order.slice(i, i + 4));
  for (const group of groups) if (group.length >= 2) runConversation(world, group, order.filter((x) => !group.includes(x)).slice(0, 6), def.name, 3, { hangout: true });
  if (pid !== undefined && members.some((m) => m.id === pid)) world.playerAfternoon = { place: def.name, groups, rounds: 3, private: false };
  // Teammates see who's good.
  const best = members.reduce((a, b) => (a.abilities[def.ability] + rng.normal(0, 0.1) > b.abilities[def.ability] ? a : b));
  for (const m of members) if (m !== best) displayAbility(world, m, best, def.ability, best.abilities[def.ability], 0.5);
}

/** A public event: a crowd watches, and whoever shines earns respect from people who value that. */
function showcase(world: World, def: ActivityDef, members: Student[], event: string) {
  const { rng, students } = world;
  const crowd = students.filter((s) => !members.includes(s) && !isAbsent(world, s) && (rng.chance(0.25) || members.some((m) => (peek(world, s.id, m.id)?.aff ?? 0) > 0.4)));
  const star = members.reduce((a, b) => (a.abilities[def.ability] + rng.normal(0, 0.15) > b.abilities[def.ability] + rng.normal(0, 0.15) ? a : b));
  const act: Act = { kind: 'star', actor: star.id, target: -1, place: event, day: world.day, ability: def.ability };
  const ws: Witness[] = crowd.map((c) => ({ id: c.id, wt: 0.4 })).concat(members.filter((m) => m !== star).map((m) => ({ id: m.id, wt: 1 })));
  applyAct(world, act, ws);
  if (rng.chance(0.4)) createStory(world, act, ws);
  for (const c of crowd) for (const m of members) if (m !== star && rng.chance(0.2)) displayAbility(world, c, m, def.ability, m.abilities[def.ability], 0.3);
}

function weekend(world: World, dow: number, week: number) {
  const { rng, students } = world;
  // Grounded students stay home all weekend; so does a player who chose to.
  const busy = new Set<number>(students.filter((s) => isGrounded(world, s) || isAbsent(world, s)).map((s) => s.id));
  const player = world.player;
  if (player && player.weekend === 'home') busy.add(player.id);
  // Saturday: plans the player said yes to.
  if (player && dow === 5 && player.weekendHost !== null && !busy.has(player.weekendHost) && !busy.has(player.id)) {
    const host = students[player.weekendHost];
    const others = closeFriendsOf(world, host).filter((f) => f !== player.id && !busy.has(f)).slice(0, 2);
    const group = [host.id, player.id, ...others];
    group.forEach((g) => busy.add(g));
    runConversation(world, group, [], 'a weekend hangout', 6, { hangout: true, private: true });
    world.onStory?.(`You hung out at ${host.first}'s on Saturday${others.length ? ` with ${others.map((f) => students[f].first).join(' and ')}` : ''}.`, group.filter((g) => g !== player.id), true);
  }
  if (player && dow === 6) player.weekendHost = null;
  if (dow === 5 && week % 3 === 2) party(world, busy);
  for (const host of rng.shuffle([...students])) {
    const isPlayer = player?.id === host.id;
    if (busy.has(host.id) || (!isPlayer && !rng.chance(0.12 + 0.25 * host.traits.E))) continue;
    let invitees = [...host.rels].filter(([b, r]) => r.aff > 0.3 && !busy.has(b)).sort((x, y) => y[1].aff - x[1].aff).slice(0, 2 + rng.int(3)).map((x) => x[0]);
    // Climbing the invite ladder with a crush: bring them along with the group.
    if (host.crush !== null && !busy.has(host.crush) && host.crushStep < 2 && !invitees.includes(host.crush)) invitees.push(host.crush);
    invitees = invitees.filter((i) => {
      const r = peek(world, i, host.id);
      return (r?.aff ?? 0) > 0.1 && rng.chance(0.75);
    });
    if (host.crush !== null && invitees.includes(host.crush)) host.crushStep = Math.min(3, host.crushStep + 1);
    if (invitees.length === 0) continue;
    for (const i of invitees) meet(world, world.students[i], host).aff = nudge(meet(world, world.students[i], host).aff, 0.02);
    const group = [host.id, ...invitees];
    group.forEach((g) => busy.add(g));
    runConversation(world, group, [], 'a weekend hangout', 6, { hangout: true, private: true });
    if (host.crush !== null && host.crushStep >= 2 && invitees.includes(host.crush) && rng.chance(0.4)) askOut(world, host, 'a weekend hangout', group.filter((g) => g !== host.id && g !== host.crush));
  }
}

/** A popular, outgoing student throws a party. Getting invited is a status signal. */
function party(world: World, busy: Set<number>) {
  const { rng, students } = world;
  const host = [...students].sort((a, b) => b.status + b.traits.E * 0.3 - (a.status + a.traits.E * 0.3))[rng.int(3)];
  const invited = students
    .filter((s) => s !== host && !busy.has(s.id))
    .map((s) => [s, (peek(world, host.id, s.id)?.pub ?? -0.2) + s.status * 0.6 + rng.normal(0, 0.2)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.round(students.length * 0.2))
    .map((x) => x[0])
    .filter(() => rng.chance(0.8));
  const guests = [host, ...invited];
  guests.forEach((g) => busy.add(g.id));
  for (const g of invited) {
    const r = meet(world, g, host);
    r.aff = nudge(r.aff, 0.03);
  }
  world.log.push(`(party at ${host.first} ${host.last[0]}.'s, ${guests.length} people)`);
  const spots: number[][] = [[], [], [], [], [], []];
  for (const g of rng.shuffle(guests)) spots[rng.int(spots.length)].push(g.id);
  for (const spot of spots) {
    if (spot.length < 2) continue;
    for (let i = 0; i < spot.length; i += 5) {
      const convo = spot.slice(i, i + 5);
      runConversation(world, convo, spot.filter((x) => !convo.includes(x)), 'the party', 6, { hangout: true });
    }
  }
  for (const g of guests) if (g.crush !== null && guests.some((x) => x.id === g.crush) && g.crushStep >= 1 && rng.chance(0.25)) askOut(world, g, 'the party', guests.filter((x) => x !== g).slice(0, 8).map((x) => x.id));
}

/**
 * Asking someone out. Saying yes depends on how they feel, but a public ask also pressures them:
 * people not sure how they feel tend to say no in front of others.
 */
function askOut(world: World, s: Student, place: string, audience: number[]) {
  if (s.crush === null || s.partner !== null) return;
  const t = world.students[s.crush];
  if (t.partner !== null) {
    s.crush = null;
    return;
  }
  const r = meet(world, t, s);
  const feel = r.aff + 0.4 * r.resp + 0.2 * s.status - 0.5;
  const publicPressure = audience.length > 0 && feel < 0.25 ? 0.6 : 1;
  const yes = world.rng.chance(sigmoid(6 * feel) * publicPressure);
  const skippedLadder = s.crushStep < 2;
  const act: Act = { kind: 'askout', actor: s.id, target: t.id, place, day: world.day, success: yes, skippedLadder };
  const ws: Witness[] = [{ id: t.id, wt: 1 }, ...audience.map((id) => ({ id, wt: 1 }))];
  applyAct(world, act, ws);
  if (audience.length > 0 || yes) createStory(world, act, ws);
  if (yes) {
    s.partner = t.id;
    t.partner = s.id;
    t.crush = s.id;
    count(world, 'couples');
  } else {
    s.stress += audience.length > 0 ? 0.4 : 0.15;
    s.crush = null;
    s.crushStep = 0;
    count(world, 'rejections');
  }
}

/**
 * One school night's effect on grades. Grades only go up on nights you study — toward what your
 * ability allows, less if you're distracted by a phone habit or cramming night after night.
 * Nights without homework let them slide, slowly, toward a floor; they never rise on their own.
 */
function updateGrades(world: World, s: Student, studied: boolean, fresh: number) {
  if (studied) {
    const ceiling = 0.45 + 0.55 * s.abilities.academics - 0.3 * s.phoneHabit;
    // A friend helping you catch up makes your own studying go further — but you still have to study.
    const tutored = world.day < s.tutoredUntil ? 1.6 : 1;
    if (s.grades < ceiling) s.grades = clamp(s.grades + 0.025 * fresh * tutored * (ceiling - s.grades), 0, 1);
  } else {
    const floor = 0.05 + 0.2 * s.abilities.academics;
    if (s.grades > floor) s.grades = clamp(s.grades - 0.012 * (s.grades - floor), 0, 1);
  }
}

/** Below this, a student can't take part in their activity until their grades come back up. */
export const ELIGIBILITY_GRADE = 0.22;

/** Midterms and finals (0-based week numbers). */
const EXAM_WEEKS = [7, 15];

export function isGrounded(world: World, s: Student): boolean {
  return s.groundedUntil > world.day;
}

/** The grade below which my parents get unhappy. Stricter parents set a higher bar. */
export function gradeBar(s: Student): number {
  return 0.25 + 0.2 * s.parentStrictness + s.parentBarBoost;
}

/**
 * Homework versus everything else. Conscientious kids study; status-hungry, outgoing kids feel the pull
 * of their friends. Exams and slipping grades push toward studying. Studying means not seeing friends tonight.
 */
function chooseStudy(world: World, s: Student): boolean {
  const week = Math.floor(world.day / 7);
  const examSoon = EXAM_WEEKS.includes(week) || EXAM_WEEKS.includes(week + 1);
  const socialPull = 0.6 * s.statusDrive + 0.4 * s.traits.E;
  const worry = gradeBar(s) - s.grades;
  return world.rng.chance(
    sigmoid(4 * (s.traits.C - 0.5) - 2.5 * (socialPull - 0.5) - 2.5 * (s.ruleBreaking - 0.3) - 3 * s.phoneHabit + 6 * worry + (examSoon ? 1.5 : 0) + (isGrounded(world, s) ? 1 : 0)),
  );
}

/** Sunday: parents look at grades. Below their bar, strict parents ground you for a week. */
function parentsCheckGrades(world: World) {
  for (const s of world.students) {
    if (!isGrounded(world, s) && s.grades < gradeBar(s) && world.rng.chance((0.04 + 0.12 * s.parentStrictness) * (s.parentBarBoost > 0 ? 2 : 1))) {
      s.groundedUntil = world.day + 7;
      count(world, 'groundings');
    }
  }
}

/**
 * Evenings go to homework, friends, getting better at something, rest — or the phone, which feels
 * good tonight and costs you over time.
 */

function chooseEvening(world: World, s: Student, schoolNight: boolean): EveningChoice {
  const plan = world.cfg.forcedEvening?.get(s.id);
  const forced = plan === undefined ? undefined : plan === 'adaptive' ? adaptiveEvening(world, s, schoolNight) : typeof plan === 'string' ? plan : plan[world.day % plan.length];
  if (forced) {
    if (forced === 'study') return schoolNight ? 'study' : 'practice';
    if ((forced === 'friends' || forced === 'phone') && isGrounded(world, s)) return schoolNight ? 'study' : 'rest';
    return forced;
  }
  if (schoolNight && chooseStudy(world, s)) return 'study';
  const options: [EveningChoice, number][] = [
    // Only an option if you have close friends to call.
    ['friends', isGrounded(world, s) || closeFriendsOf(world, s).length === 0 ? 0 : 0.3 + 0.6 * s.traits.E + 0.3 * s.statusDrive],
    ['practice', 0.3 + 0.6 * s.traits.C + 0.3 * (1 - s.traits.E)],
    ['rest', 0.2 + 1.5 * Math.min(1, s.stress) + (1 - s.energy)],
    // The pull of the phone: habit, wanting to be in the loop, and escaping stress.
    ['phone', isGrounded(world, s) || world.cfg.phones === false ? 0 : 0.1 + 1.5 * s.phoneHabit + 0.3 * s.statusDrive + 0.4 * Math.min(1, s.stress)],
  ];
  return options[world.rng.weighted(options.map((o) => o[1]))][0];
}

/**
 * An evening on the phone. Tonight: a little relief, catching up on the latest stories, light contact
 * with friends. Over time: a habit that costs sleep and adds stress, with no trust built and no skills
 * or grades gained.
 */
function phoneEvening(world: World, s: Student) {
  const { rng, students } = world;
  s.counts.phoneNights++;
  s.stress *= 0.85;
  s.phoneHabit = clamp(s.phoneHabit + 0.04 * (1 - s.phoneHabit), 0, 1);
  const close = [...s.rels].filter(([, r]) => r.aff > 0.3).map((x) => x[0]);
  for (const f of rng.shuffle(close).slice(0, 2)) {
    const friend = students[f];
    const r = meet(world, s, friend);
    r.aff = nudge(r.aff, 0.005);
    const story = [...friend.knownStories].reverse().find((st) => !st.knowers.has(s.id) && st.act.actor !== s.id && st.act.target !== s.id);
    if (story) tellStory(world, story, friend, s);
  }
}

/** A sensible player's evening: study when grades are slipping, rest when worn down, otherwise alternate friends and practice. */
function adaptiveEvening(world: World, s: Student, schoolNight: boolean): EveningChoice {
  if (schoolNight && (s.grades < gradeBar(s) + 0.12 || (examSoon(world) && s.recentEvenings.filter((x) => x === 'study').length < 3))) return 'study';
  if (s.stress > 0.3 || s.energy < 0.5) return 'rest';
  const lastSocial = s.recentEvenings.lastIndexOf('friends');
  const lastPractice = s.recentEvenings.lastIndexOf('practice');
  return lastSocial > lastPractice ? 'practice' : 'friends';
}

/** How much another evening of the same thing still adds: full the first time, less with each repeat in the last six evenings. */
function freshness(s: Student, c: EveningChoice): number {
  return 1 / (1 + REPEAT_PENALTY[c] * s.recentEvenings.filter((x) => x === c).length);
}

/**
 * How fast each kind of evening wears out with repetition. Homework most nights is normal and
 * keeps working; the same friends every night, or the same practice every night, adds less and less.
 */
const REPEAT_PENALTY: Record<EveningChoice, number> = { study: 0.15, friends: 0.7, practice: 0.5, rest: 0.5, phone: 0 };

function remember(s: Student, c: EveningChoice) {
  s.recentEvenings.push(c);
  if (s.recentEvenings.length > 6) s.recentEvenings.shift();
}

/** Practice at home: get better at your activity's skill or your strongest ability, or learn more about an interest. */
function practiceAtHome(s: Student, fresh: number) {
  const def = s.activity ? ACTIVITIES.find((a) => a.id === s.activity) : undefined;
  const ability = def?.ability ?? ABILITIES.reduce((b, a) => (s.abilities[a] > s.abilities[b] ? a : b), ABILITIES[0]);
  s.abilities[ability] = clamp(s.abilities[ability] + 0.012 * fresh * (1 - s.abilities[ability]), 0, 1);
  const interest = INTERESTS.reduce((b, i) => (s.interests[i] > s.interests[b] ? i : b), INTERESTS[0]);
  s.interests[interest] = clamp(s.interests[interest] + 0.01 * fresh * (1 - s.interests[interest]), 0, 1);
}

function evening(world: World) {
  const { rng, students } = world;
  const schoolNight = world.day % 7 < 4 || world.day % 7 === 6;
  const week = Math.floor(world.day / 7);
  const choice = new Map<number, EveningChoice>();
  for (const s of students) {
    if (s.gone) continue;
    const def = s.activity ? ACTIVITIES.find((a) => a.id === s.activity) : undefined;
    // Crunch weeks and instrument practice take the evening: no homework, no friends.
    const activityNight = !!def && s.grades >= ELIGIBILITY_GRADE && schoolNight && (def.crunchWeeks.includes(week) || rng.chance(def.homePracticeNights / 5));
    if (activityNight) {
      s.studiedTonight = false;
      updateGrades(world, s, false, 1);
      if (def!.crunchWeeks.includes(week)) s.stress += 0.03;
      // Playing music at home is calming.
      else if (def!.homePracticeNights > 0) s.stress *= 0.85;
      practiceAtHome(s, freshness(s, 'practice'));
      remember(s, 'practice');
      count(world, 'activityNights');
      continue;
    }
    choice.set(s.id, isAbsent(world, s) ? 'rest' : chooseEvening(world, s, schoolNight));
  }

  // Getting together: each student who wants company calls a couple of close friends who are also free.
  const placed = new Set<number>();
  for (const s of rng.shuffle(students.filter((x) => choice.get(x.id) === 'friends'))) {
    if (placed.has(s.id)) continue;
    if (world.player?.id === s.id && world.player.callFriends.length) {
      // The player calls the friends they chose. Whoever's free and keen comes over.
      const called = world.player.callFriends;
      world.player.callFriends = [];
      const came = called.filter((f) => {
        const them = students[f];
        const c = choice.get(f);
        const keen = (them.rels.get(s.id)?.aff ?? 0) > 0.25;
        return !placed.has(f) && !isAbsent(world, them) && !isGrounded(world, them) && c !== undefined && keen && (c !== 'study' || rng.chance(0.3));
      });
      const busy = called.filter((f) => !came.includes(f));
      if (busy.length) world.onStory?.(`${busy.map((f) => students[f].first).join(' and ')} couldn’t come tonight.`, busy, true);
      if (!came.length) {
        choice.set(s.id, 'practice');
        continue;
      }
      came.forEach((f) => choice.set(f, 'friends'));
      const group = [s.id, ...came];
      group.forEach((g) => placed.add(g));
      const groupFreshness = group.reduce((t, g) => t + freshness(students[g], 'friends'), 0) / group.length;
      runConversation(world, group, [], "a friend's house", 3, { hangout: true, private: true, freshness: groupFreshness });
      world.onStory?.(`You hung out with ${came.map((f) => students[f].first).join(' and ')} tonight.`, came, true);
      continue;
    }
    // Only close friends who are also free tonight.
    const friends = closeFriendsOf(world, s)
      .filter((b) => choice.get(b) === 'friends' && !placed.has(b))
      .sort((x, y) => (peek(world, s.id, y)?.aff ?? 0) - (peek(world, s.id, x)?.aff ?? 0))
      .slice(0, 1 + rng.int(2));
    if (friends.length === 0) {
      choice.set(s.id, 'practice'); // nobody free: do something useful instead
      continue;
    }
    const group = [s.id, ...friends];
    group.forEach((g) => placed.add(g));
    // Everyone's recent evenings count: a group that has been together every night gets less from another.
    const groupFreshness = group.reduce((t, g) => t + freshness(students[g], 'friends'), 0) / group.length;
    runConversation(world, group, [], "a friend's house", 3, { hangout: true, private: true, freshness: groupFreshness });
  }

  for (const s of students) {
    const c = choice.get(s.id);
    if (c === undefined) continue; // activity night, handled above
    s.studiedTonight = c === 'study';
    const fresh = freshness(s, c);
    if (schoolNight) {
      updateGrades(world, s, s.studiedTonight, fresh);
    }
    if (c === 'practice') {
      practiceAtHome(s, fresh);
      s.stress *= 1 - 0.08 * fresh; // absorbing yourself in something you're getting good at is a little calming
    }
    if (c === 'study') s.stress += 0.02 / fresh; // the pressure of schoolwork, which builds when it's every night
    // Falling behind weighs on you: a school night without homework while your grades are near the bar.
    else if (schoolNight && s.grades < gradeBar(s) + 0.1) s.stress += 0.05;
    if (c === 'rest') {
      s.stress *= 1 - 0.3 * fresh;
      s.energy = clamp(s.energy + 0.2 * fresh, 0, 1);
    }
    remember(s, c);
    if (c === 'phone') phoneEvening(world, s);
    else s.phoneHabit *= 0.97;
    count(world, `evening:${c}`);
  }

  for (const s of students) {
    romance(world, s);
    // Fit students recover more energy overnight; a phone habit costs sleep.
    // An evening out is a late night, harder on introverts.
    const lateNight = choice.get(s.id) === 'friends' ? 0.1 + 0.15 * (1 - s.traits.E) : 0;
    s.energy = clamp(s.energy + 0.5 + 0.3 * s.fitness - 0.25 * s.phoneHabit - lateNight, 0, 1);
    // A phone habit feeds a background hum of comparison and worry.
    s.stress += 0.1 * s.phoneHabit;
  }
}

function romance(world: World, s: Student) {
  const { rng } = world;
  if (s.partner !== null) {
    const p = world.students[s.partner];
    const mutual = Math.min(peek(world, s.id, p.id)?.aff ?? 0, peek(world, p.id, s.id)?.aff ?? 0);
    if (rng.chance(0.004 + 0.03 * clamp(0.5 - mutual, 0, 1))) {
      const act: Act = { kind: 'breakup', actor: s.id, target: p.id, place: '', day: world.day };
      applyAct(world, act, [{ id: p.id, wt: 1 }]);
      createStory(world, act, [{ id: p.id, wt: 1 }]);
      s.partner = null;
      p.partner = null;
      s.crush = null;
      p.crush = null;
      count(world, 'breakups');
    }
    return;
  }
  if (s.crush === null && rng.chance(0.04)) {
    let best = -1;
    let bestScore = 0.45;
    for (const [b, r] of s.rels) {
      const o = world.students[b];
      if (o.gender === s.gender || r.fam < 0.3) continue;
      const score = r.aff + 0.4 * r.resp + 0.4 * o.status + 0.3 * o.abilities.style + rng.normal(0, 0.1);
      if (score > bestScore) [best, bestScore] = [b, score];
    }
    if (best >= 0) {
      s.crush = best;
      s.crushStep = 0;
    }
  }
  // Impulsive students sometimes skip the ladder and ask out of nowhere, at lunch.
  if (s.crush !== null && s.crushStep < 2 && rng.chance(0.01 * s.traits.E * (1 - s.traits.C))) {
    askOut(world, s, 'lunch', s.lastMates.lunch ?? []);
  }
}

export function runSimulation(world: World, onWeek?: (week: number) => void) {
  const days = world.cfg.weeks * 7;
  while (world.day < days) {
    runDay(world);
    if (world.day === 7) for (const s of world.students) if (closeFriendCount(s) <= 1) world.startedLonely.add(s.id);
    if (world.day % 7 === 0) onWeek?.(world.day / 7);
  }
}

