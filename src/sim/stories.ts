import { OPINION_TOPICS } from './content';
import { applyAct } from './perceive';
import { meet, nudge, tag, tagOf } from './rel';
import { clamp, sigmoid } from './rng';
import type { Act, Knower, Story, Student, Witness, World } from './types';

const BASE_JUICE: Partial<Record<Act['kind'], number>> = {
  putdown: 0.45,
  exclude: 0.35,
  shove: 0.9,
  report: 0.5,
  ditch: 0.3,
  askout: 0.55,
  breakup: 0.65,
  star: 0.35,
  sneakoff: 0.4,
  rumor: 0.7,
  fallout: 0.55,
  cheat: 0.55,
};

/** Whether an act is notable enough to become a story people retell. */
export function isStoryworthy(act: Act, world?: World): boolean {
  const statusOf = (id: number) => (world && id >= 0 ? world.students[id].status : 1);
  if (act.kind === 'putdown') {
    if (act.outcome === 'defended' || act.outcome === 'backfired' || act.outcome === 'flipped') return true;
    if (act.outcome === 'dominated') return Math.max(statusOf(act.actor), statusOf(act.target)) > 0.6;
    return false;
  }
  if (act.kind === 'exclude') return statusOf(act.actor) > 0.75;
  if (act.kind === 'askout') return true;
  if (act.kind === 'sneakoff') return !!act.caught;
  return BASE_JUICE[act.kind] !== undefined;
}

export function createStory(world: World, act: Act, witnesses: Witness[]): Story {
  const a = world.students[act.actor];
  const t = act.target >= 0 ? world.students[act.target] : null;
  let juice = BASE_JUICE[act.kind] ?? 0.2;
  // Stories about high-status people are juicier.
  juice += 0.3 * Math.max(a.status, t?.status ?? 0);
  if (act.outcome === 'flipped' || act.outcome === 'defended' || act.outcome === 'backfired') juice += 0.15;
  if (act.kind === 'askout' && !act.success) juice += 0.1;
  const story: Story = { id: world.nextStoryId++, act, juice: clamp(juice, 0, 1), knowers: new Map() };
  const saw: Knower = { from: -1, belief: 1, day: world.day };
  learn(world, story, act.actor, saw);
  if (t) learn(world, story, t.id, saw);
  for (const w of witnesses) if (w.wt >= 0.3) learn(world, story, w.id, saw);
  world.stories.push(story);
  logLine(world, describe(world, act));
  return story;
}

/** Stories stop being retold after three weeks. */
export const STORY_SHELF_LIFE = 21;

function learn(world: World, story: Story, id: number, knower: Knower) {
  if (!story.knowers.has(id)) world.students[id].knownStories.push(story);
  story.knowers.set(id, knower);
}

/** Drop stories too old to retell from each student's list. */
export function forgetOldStories(world: World) {
  for (const s of world.students) s.knownStories = s.knownStories.filter((st) => world.day - st.act.day <= STORY_SHELF_LIFE);
}

/** Best story `teller` could tell `listener` that the listener doesn't know yet. */
export function pickStoryToTell(world: World, teller: Student, listener: Student, present: Set<number>): Story | null {
  let best: Story | null = null;
  let bestScore = 0;
  for (const s of teller.knownStories) {
    if (world.day - s.act.day > STORY_SHELF_LIFE || s.knowers.has(listener.id)) continue;
    // Don't gossip about someone who's standing right there, or to their close friend.
    if (present.has(s.act.actor) || (s.act.target >= 0 && present.has(s.act.target))) continue;
    const subjectFriend = (listener.rels.get(s.act.target)?.aff ?? 0) > 0.5 || (listener.rels.get(s.act.actor)?.aff ?? 0) > 0.5;
    const score = s.juice * (subjectFriend ? 0.3 : 1) * (1 - (world.day - s.act.day) / 25);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

/** `teller` tells `listener` a story. Belief depends on trust in the teller and whether it fits. */
export function tellStory(world: World, story: Story, teller: Student, listener: Student) {
  world.onTold?.(story, teller, listener);
  const r = meet(world, listener, teller);
  const subject = world.students[story.act.actor];
  const rs = listener.rels.get(subject.id);
  // Stories about someone I already think badly of are easier to believe.
  const plausibility = rs ? -0.5 * (rs.aff - tagOf(rs, 'mean')) : 0;
  const motive = (teller.rels.get(subject.id)?.aff ?? 0) < -0.3 ? 0.6 : 0;
  const belief = clamp(sigmoid(2.5 * (r.trust + 0.4 * r.aff) + plausibility + 0.3 - motive - 2 * tagOf(r, 'gossip')), 0.05, 0.95);
  learn(world, story, listener.id, { from: teller.id, belief, day: world.day });
  if (world.rng.chance(0.15)) story.juice = clamp(story.juice * 1.1, 0, 1); // retellings exaggerate
  applyAct(world, story.act, [{ id: listener.id, wt: 0.4 * belief }], true);
  // Gossiping bonds a little, but marks you as a gossip.
  r.aff = nudge(r.aff, 0.01);
  tag(r, 'gossip', 0.04);
  count(world, 'gossipTold');

  // Provenance: if the listener is close to someone the story makes look bad, they may tell them who's spreading it.
  const victim = story.act.kind === 'putdown' || story.act.kind === 'askout' ? story.act.target : story.act.actor;
  if (victim >= 0 && victim !== teller.id) {
    const closeToVictim = (listener.rels.get(victim)?.aff ?? 0) > 0.5;
    if (closeToVictim && world.rng.chance(0.4)) {
      const v = world.students[victim];
      const vr = meet(world, v, teller);
      vr.aff = nudge(vr.aff, -0.06);
      vr.trust = nudge(vr.trust, -0.1);
      tag(vr, 'gossip', 0.15);
      count(world, 'gossipTracedBack');
      world.onTraced?.(v, teller, story);
    }
  }
}

/** Count an event for the end-of-run tallies. */
export function count(world: World, key: string) {
  world.tally[key] = (world.tally[key] ?? 0) + 1;
}

export function logLine(world: World, text: string) {
  world.log.push(`${dayName(world.day)}: ${text}`);
}

export function dayName(day: number): string {
  const week = Math.floor(day / 7) + 1;
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day % 7];
  return `Wk${String(week).padStart(2, ' ')} ${dow}`;
}

export function nameOf(world: World, id: number): string {
  const s = world.students[id];
  return `${s.first} ${s.last[0]}.`;
}

export function describe(world: World, act: Act): string {
  const a = nameOf(world, act.actor);
  const t = act.target >= 0 ? nameOf(world, act.target) : '';
  const where = act.place;
  switch (act.kind) {
    case 'putdown': {
      const end: Record<string, string> = {
        dominated: `${t} got flustered`,
        refused: `${t} didn't take the bait`,
        walked: `${t} just walked away`,
        flipped: `${t} turned it into a joke on ${a}`,
        defended: `${act.defender !== undefined ? nameOf(world, act.defender) : 'someone'} stuck up for ${t}, and ${a} backed off`,
        backfired: `${act.defender !== undefined ? nameOf(world, act.defender) : 'someone'} stuck up for ${t}, and ${a} turned on them`,
      };
      return `${where}: ${a} put down ${t} in front of others — ${end[act.outcome ?? 'dominated']}.`;
    }
    case 'exclude':
      return `${where}: ${a} told ${t} the seat was saved.`;
    case 'shove':
      return `${where}: ${a} shoved ${t}.`;
    case 'report':
      return `${a} told a teacher about ${t}${(act.severity ?? 0) < 2 ? ' (over something minor)' : ''}.`;
    case 'ditch':
      return `${where}: ${a} stopped sitting with ${t} for a more popular table.`;
    case 'askout':
      return `${where}: ${a} asked ${t} out — ${act.success ? 'yes!' : 'no'}${act.skippedLadder ? ' (out of nowhere)' : ''}.`;
    case 'breakup':
      return `${a} broke up with ${t}.`;
    case 'star':
      return `${where}: ${a} was the star (${act.ability}).`;
    case 'rumor':
      return `A rumor is going around about ${a}.`;
    case 'fallout':
      return `${a} and ${t} had a falling out.`;
    case 'cheat':
      return `${a} and ${t} got caught copying homework.`;
    case 'invite':
      return `${where}: ${a} invited ${t} to hang out — ${act.success ? 'yes' : 'no'}.`;
    case 'sneakoff':
      return `${a} and friends got caught skipping, behind the gym.`;
    case 'opinion':
      return `${where}: ${a} said ${act.stance! > 0 ? 'they love' : "they can't stand"} ${OPINION_TOPICS[act.topic!]}.`;
    default:
      return `${where}: ${a} ${act.kind}${t ? ` → ${t}` : ''}.`;
  }
}
