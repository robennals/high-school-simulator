/**
 * A day at school under the card rules: before school, six classes, lunch, after school, the
 * evening — and the weekend. Every social effect happens through conversations (convo.ts); this file
 * only decides who ends up talking to whom, and the day cards for evenings.
 */
import { ACTIVITIES, ABILITIES } from '../sim/content';
import { drawnBy, freshStory } from './cards';
import { newStory, runConvo } from './convo';
import { ENERGY_WAKE, ENERGY_WAKE_PHONE, ENERGY_WAKE_RESTED, LEVEL, MOMENTS } from './rules';
import { weekly } from './school';
import type { World } from './types';
import { PERIODS, applyEffects, bond, count, friendsOf, noEffects, together } from './world';

export function runDay(w: World) {
  const dow = w.day % 7;
  for (const p of w.people) {
    p.energy = p.nextWake;
    p.nextWake = ENERGY_WAKE;
    p.used.clear();
  }
  w.hangouts = [];
  if (w.day === 0) joinActivities(w);
  if (dow < 5) {
    hallway(w);
    classes(w, 0, 3);
    lunch(w);
    classes(w, 3, PERIODS);
    afterSchool(w, dow);
  } else if (dow === 5) saturday(w);
  evening(w, dow);
  if (dow === 6) weekly(w);
  w.day++;
}

export function runSemester(w: World, weeks: number) {
  while (w.day < weeks * 7) runDay(w);
}

// ---------------------------------------------------------------- who ends up with whom

/**
 * People arrive in random order. If there's room where one of their Friends is, they go there;
 * otherwise to the table (or spot) they like best: the most Bond with the people already there, people
 * who dress like them, and anyone whose shirt draws them. Rule: people who
 * are Cool with you won't make room; a table of strangers may leave you out.
 */
function seat(w: World, spots: number, cap: number, aloneOk: boolean): number[][] {
  const tables: number[][] = Array.from({ length: spots }, () => []);
  for (const id of w.rng.shuffle([...Array(w.n).keys()])) {
    const me = w.people[id];
    const scores = tables.map((t) => {
      if (t.length >= cap) return -Infinity;
      if (!t.length) return aloneOk ? (me.personality.E === -1 ? 0.5 : me.personality.E === 1 ? -1 : -0.4) : -1.2;
      let s = 0;
      for (const o of t) {
        s += bond(w, id, o) / 4;
        if (w.people[o].look === me.look) s += 0.3;
        // Boys and girls mostly hang out with their own.
        if (w.people[o].gender === me.gender) s += 1.2;
        if (drawnBy(w, id, o)) s += 0.4;
        if (w.people[o].shirt.style === 'hoodie') s -= 0.2;
      }
      return s / Math.sqrt(t.length) - 0.05 * t.length;
    });
    // Only one empty spot counts as "on your own" (otherwise empty spots outvote every group).
    const firstEmpty = tables.findIndex((t) => !t.length);
    tables.forEach((t, i) => !t.length && i !== firstEmpty && (scores[i] = -Infinity));
    // You go where your Friends are, if there's room.
    const withFriend = tables.map((t) => t.length < cap && t.some((o) => bond(w, id, o) >= LEVEL.friends));
    if (withFriend.some(Boolean)) tables.forEach((_, i) => !withFriend[i] && (scores[i] = -Infinity));
    let placed = false;
    for (let tries = 0; tries < 2 && !placed; tries++) {
      const max = Math.max(...scores);
      if (!Number.isFinite(max)) break;
      const i = w.rng.weighted(scores.map((s) => (Number.isFinite(s) ? Math.exp((s - max) / 0.5) : 0)));
      if (tables[i].length === 0 || makesRoom(w, tables[i], id)) {
        tables[i].push(id);
        placed = true;
      } else scores[i] = -Infinity;
    }
    if (!placed) tables.reduce((a, b) => (b.length < a.length ? b : a)).push(id);
  }
  return tables.filter((t) => t.length);
}

/** Whether a table makes room for `joiner`: not if anyone there is Cool with them; strangers may leave them out (1 in 10, with an edgy, status-hungry member above them). */
function makesRoom(w: World, table: number[], joiner: number): boolean {
  if (table.some((o) => bond(w, o, joiner) <= -2)) return false;
  if (table.some((o) => bond(w, o, joiner) >= LEVEL.acquaintances)) return true;
  // A table of strangers: an edgy, status-hungry member may play Leave them out on someone below them.
  const gatekeeper = table.find((o) => {
    const p = w.people[o].personality;
    return p.A === -1 && p.statusDrive === 2 && w.standing[joiner] < w.standing[o];
  });
  if (gatekeeper === undefined || !w.rng.chance(0.1)) return true;
  const fx = noEffects();
  fx.bond.push({ a: gatekeeper, b: joiner, d: -2 });
  fx.energy.push({ id: joiner, d: -1 });
  for (const o of table) if (o !== gatekeeper && bond(w, o, joiner) >= LEVEL.friendly) fx.bond.push({ a: gatekeeper, b: o, d: -1 });
  applyEffects(w, fx, gatekeeper, table);
  const s = newStory(w, 'leaveout', gatekeeper, joiner, true, true);
  for (const o of table.concat(joiner)) w.people[o].stories.add(s.id);
  count(w, 'leftOut');
  return false;
}

/** Split a table into conversations of at most five. */
function conversations(table: number[]): number[][] {
  if (table.length <= 5) return [table];
  const half = Math.ceil(table.length / 2);
  return [table.slice(0, half), table.slice(half)];
}

function hallway(w: World) {
  for (const group of seat(w, 60, 6, true)) if (group.length >= 2) runConvo(w, group, [], MOMENTS.hallway);
}

function lunch(w: World) {
  for (const table of seat(w, Math.ceil(w.n / 7), 8, false)) {
    if (table.length === 1) count(w, 'aloneAtLunch');
    together(w, table); // the whole table counts as time together, not just your half of it
    for (const group of conversations(table)) if (group.length >= 2) runConvo(w, group, table.filter((x) => !group.includes(x)), MOMENTS.lunch);
  }
}

/** Seats in each class section, in a fixed order (decided once): your neighbors are next to you. */
const seating = new WeakMap<World, number[][][]>();
function classSeats(w: World): number[][][] {
  let s = seating.get(w);
  if (!s) {
    s = w.sections.map((sec) => {
      const bySection: number[][] = [];
      for (let id = 0; id < w.n; id++) (bySection[sec[id]] ??= []).push(id);
      return bySection.map((ids) => w.rng.shuffle(ids));
    });
    seating.set(w, s);
  }
  return s;
}

/** In class, now and then someone whispers to the person next to them: a short conversation, teacher present. */
function classes(w: World, from: number, to: number) {
  const seats = classSeats(w);
  for (let period = from; period < to; period++)
    for (const row of seats[period]) {
      if (!row) continue;
      for (let i = 0; i < row.length; i++) {
        const me = w.people[row[i]];
        const neighbors = [row[i - 1], row[i + 1]].filter((x): x is number => x !== undefined);
        if (!neighbors.length) continue;
        const drawn = neighbors.find((nb) => drawnBy(w, me.id, nb));
        if (!w.rng.chance(0.12 + 0.08 * me.personality.E + (drawn !== undefined ? 0.1 : 0))) continue;
        // Who you whisper to: someone you like, mostly someone of your own gender.
        const appeal = neighbors.map((nb) => Math.max(0.2, 1 + bond(w, me.id, nb) / 4) * (w.people[nb].gender === me.gender ? 1 : 0.35));
        const other = drawn ?? neighbors[w.rng.weighted(appeal)];
        runConvo(w, [me.id, other], neighbors.filter((x) => x !== other), MOMENTS.class, { teacher: true });
      }
    }
}

// ---------------------------------------------------------------- after school, evenings, weekends

function joinActivities(w: World) {
  for (const p of w.people) {
    const options = ACTIVITIES.filter((a) => (!a.gender || a.gender === p.gender) && p.abilities[a.ability] >= 3 && (a.interest === null || p.interests.has(a.interest) || p.abilities[a.ability] >= 4));
    if (options.length && w.rng.chance(0.7)) p.activity = w.rng.pick(options).id;
  }
}

function afterSchool(w: World, dow: number) {
  const busy = new Set<number>();
  // Hanging out with someone who said yes to an invite.
  for (const [a, b] of w.hangouts) {
    if (busy.has(a) || busy.has(b) || grounded(w, a) || grounded(w, b)) continue;
    busy.add(a);
    busy.add(b);
    runConvo(w, [a, b], [], MOMENTS.hangout, { private: true });
    count(w, 'hangouts');
    for (const id of [a, b]) if (w.people[id].partner === (id === a ? b : a)) w.week.coupleTime.set(id, (w.week.coupleTime.get(id) ?? 0) + 2);
  }
  // Practice, Monday to Thursday: the same people, in little groups.
  if (dow < 4)
    for (const def of ACTIVITIES) {
      const team = w.rng.shuffle(w.people.filter((p) => p.activity === def.id && !busy.has(p.id)).map((p) => p.id));
      for (let i = 0; i < team.length; i += 4) runConvo(w, team.slice(i, i + 4), team.filter((x, j) => j < i || j >= i + 4).slice(0, 6), MOMENTS.practice);
    }
}

function grounded(w: World, id: number): boolean {
  const p = w.people[id];
  return p.grades < p.parentBar - 1;
}

/** Evening day cards (spec §7.5), picked by habit: what someone tends to do, with some randomness. */
function evening(w: World, dow: number) {
  const schoolNight = dow <= 3 || dow === 6;
  for (const p of w.people) {
    const friends = friendsOf(w, p.id);
    const T = p.personality;
    const options: [string, number][] = [
      ['homework', schoolNight ? (p.grades < p.parentBar + 2 ? 3 : 1) * (T.C === 1 ? 1.5 : 1) : 0],
      ['friends', friends.length && !grounded(w, p.id) ? 1 + T.E * 0.5 : 0],
      ['practice', 1 + (T.C === 1 ? 0.5 : 0)],
      ['rest', p.energy < 5 ? 3 : 0.7],
      ['phone', grounded(w, p.id) ? 0 : 0.8 + (T.C === -1 ? 0.7 : 0) + (T.statusDrive === 2 ? 0.3 : 0)],
    ];
    for (const o of options) if (o[0] === p.lastEvening) o[1] *= 0.6;
    const choice = options[w.rng.weighted(options.map((o) => o[1]))][0];
    count(w, `evening:${choice}`);
    if (choice === 'homework') {
      const repeat = p.lastEvening === 'homework';
      const step = (repeat && w.rng.chance(0.5) ? 0 : 1) + (p.abilities.academics >= 4 || T.C === 1 ? 1 : 0);
      p.grades = Math.min(10, p.grades + step);
    } else if (schoolNight && w.rng.chance(1 / 3)) p.grades = Math.max(0, p.grades - 1);
    if (choice === 'practice') practice(w, p.id);
    if (choice === 'rest') p.nextWake = ENERGY_WAKE_RESTED;
    if (choice === 'phone') {
      p.phoneNights++;
      p.nextWake = ENERGY_WAKE_PHONE;
      // In the loop: a story a friend holds.
      const held = friends.flatMap((f) => [...w.people[f].stories]).filter((s) => !p.stories.has(s) && freshStory(w, s));
      if (held.length) p.stories.add(w.rng.pick(held));
    }
    if (choice === 'friends') {
      const call = w.rng.shuffle(friends).slice(0, 2);
      runConvo(w, [p.id, ...call], [], MOMENTS.call, { private: true });
    }
    p.lastEvening = choice;
  }
}

/** Two practices earn a card: another Brag/Help for your best skill, or getting really into a hobby. */
function practice(w: World, id: number) {
  const p = w.people[id];
  if (++p.practiceProgress < 2) return;
  p.practiceProgress = 0;
  const hobby = [...p.interests].find(([, level]) => level === 1);
  if (hobby && w.rng.chance(0.5)) p.interests.set(hobby[0], 2);
  else {
    const best = ABILITIES.reduce((b, a) => (p.abilities[a] > p.abilities[b] ? a : b), ABILITIES[0]);
    if (p.abilities[best] >= 3) p.earned.set(`brag:${best}`, Math.min(2, (p.earned.get(`brag:${best}`) ?? 0) + 1));
    else if (p.abilities[best] < 5) p.abilities[best]++;
  }
}

/** Saturday: friends get together in small groups. */
function saturday(w: World) {
  const busy = new Set<number>();
  for (const id of w.rng.shuffle([...Array(w.n).keys()])) {
    if (busy.has(id) || grounded(w, id)) continue;
    const free = friendsOf(w, id).filter((f) => !busy.has(f) && !grounded(w, f));
    if (!free.length || !w.rng.chance(0.6)) continue;
    const group = [id, ...w.rng.shuffle(free).slice(0, 2)];
    group.forEach((g) => busy.add(g));
    runConvo(w, group, [], MOMENTS.weekend, { private: true });
    for (const g of group) {
      const partner = w.people[g].partner;
      if (partner >= 0 && group.includes(partner)) w.week.coupleTime.set(g, (w.week.coupleTime.get(g) ?? 0) + 2);
    }
  }
}
