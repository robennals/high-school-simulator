/**
 * Conversations (spec §5): a series of moments. In each moment everyone chooses to stay quiet, say
 * something, or jump in; whoever wants to speak most does, and plays one card.
 */
import type { Ability } from '../sim/content';
import { CALLS_FOR_ANSWER, CARDS, collection, costOf, freshStory, hearing, usesLeft, type Ctx } from './cards';
import { choose, type Intent } from './policy';
import { advanceThread, opensUp, threadMove, threadStart, threadWaitsFor } from './threads';
import { FAVOR_DAYS, LEVEL } from './rules';
import type { Convo, Play, Story, World } from './types';
import { applyEffects, bond, count, noEffects, together, type Effects } from './world';

export interface ConvoOptions {
  private?: boolean;
  teacher?: boolean;
}

/** Run a whole conversation between `members`, with `onlookers` watching. */
export function runConvo(w: World, members: number[], onlookers: number[], moments: number, opts: ConvoOptions = {}): Convo {
  const c: Convo = { members: [...members], onlookers, private: !!opts.private, teacher: !!opts.teacher, plays: [] };
  if (c.members.length < 2) return c;
  together(w, c.members);
  const owned = new Map(c.members.map((id) => [id, collection(w, id)]));
  // The bell doesn't cut off an answer, or walk away from what someone just told you.
  const midThread = () => !!c.thread && (c.thread.next % 2 === 0 || c.thread.next >= 3);
  for (let m = 0; (m < moments || midThread()) && c.members.length >= 2; m++) {
    const last = c.plays[c.plays.length - 1] ?? null;
    const intents = new Map<number, Intent>();
    for (const id of c.members) intents.set(id, choose({ w, c, me: id, last }, owned.get(id)!));
    const wanting = c.members.filter((id) => intents.get(id)!.urgency > 0);
    if (!wanting.length) {
      // An awkward silence: everyone −1⚡, and it may end there.
      applyEffects(w, { bond: [], respect: [], energy: c.members.map((id) => ({ id, d: -1 })) }, -1, c.members);
      count(w, 'silences');
      if (w.rng.chance(0.5)) break;
      continue;
    }
    const speaker = nextSpeaker(w, c, wanting, intents);
    const intent = intents.get(speaker)!;
    const fx = noEffects();
    // Talking over someone who also wanted to speak annoys them: −1 Bond with Acquaintances (1–3).
    // Annoying isn't dislike — it can't take a Bond below 0 — and people who like you let it slide.
    if (intent.urgency === 2)
      for (const o of wanting) {
        const b = bond(w, speaker, o);
        if (o !== speaker && b >= LEVEL.acquaintances && b < LEVEL.friendly) fx.bond.push({ a: speaker, b: o, d: -1 });
      }
    if (intent.urgency === 2) fx.energy.push({ id: speaker, d: -1 });
    // Staying quiet lets you catch your breath.
    for (const id of c.members) if (intents.get(id)!.urgency === 0) fx.energy.push({ id, d: 1 });
    applyEffects(w, fx, speaker, c.members);
    play(w, c, speaker, intent.key, intent.target);
  }
  return c;
}

/**
 * Who speaks, in order:
 * 1. standing up to a put-down;
 * 2. whoever a thread is waiting on or was just spoken to, then anyone responding to what was just said;
 * 3. not the person who just spoke: nobody goes twice in a row while someone else wants to;
 * 4. jumping in beats saying something; then most Bond with the table; then Standing.
 */
export function nextSpeaker(w: World, c: Convo, wanting: number[], intents: ReadonlyMap<number, Intent>): number {
  const last = c.plays.at(-1);
  const key = (id: number) => intents.get(id)?.key;
  const turn = (id: number) => {
    if (!last) return 0;
    if (last.card === 'putdown' && key(id) === 'standup') return 3;
    if (key(id)?.startsWith('respond') && threadWaitsFor(w, c, id)) return 2;
    if (id === last.actor) return -1;
    if (id === last.target && CALLS_FOR_ANSWER.has(last.card)) return 2;
    return key(id) === 'respond' ? 1 : 0;
  };
  const table = (id: number) => c.members.reduce((t, o) => (o === id ? t : t + bond(w, id, o)), 0);
  const urgency = (id: number) => intents.get(id)?.urgency ?? 0;
  return wanting.reduce((a, b) => {
    if (turn(a) !== turn(b)) return turn(a) > turn(b) ? a : b;
    if (urgency(a) !== urgency(b)) return urgency(a) > urgency(b) ? a : b;
    if (table(a) !== table(b)) return table(a) > table(b) ? a : b;
    if (w.standing[a] !== w.standing[b]) return w.standing[a] > w.standing[b] ? a : b;
    return w.rng.chance(0.5) ? a : b;
  });
}

/** Play one card: pay for it, use up a copy, and apply what it does. */
export function play(w: World, c: Convo, me: number, key: string, target: number) {
  const [base, ...rest] = key.split(':');
  const arg = rest.join(':');
  const def = CARDS[base];
  const last = c.plays[c.plays.length - 1] ?? null;
  const ctx: Ctx = { w, c, me, last };
  const person = w.people[me];
  person.energy -= costOf(ctx, key, target);
  const inThread = base === 'respond' ? threadMove(w, c, me, arg) : undefined;
  if (!inThread) person.used.set(key, (person.used.get(key) ?? 0) + 1);
  if (base === 'openup') person.openUpsThisWeek++;
  count(w, `card:${base}`);
  const p: Play = { card: base, actor: me, target };
  if (base === 'opinion') [p.topic, p.stance] = arg.split(':').map(Number);
  if (inThread) {
    p.thread = inThread;
    if (inThread.turn === 0) p.answers = 'ask'; // answering the question that started it
  } else if (base === 'respond' && last) {
    p.answers = last.card;
    p.personal = last.card === 'openup';
    // Going along with an opinion is saying it: if it isn't what you think, you can be caught out.
    if (last.card === 'opinion') [p.topic, p.stance] = [last.topic, last.stance];
  }
  if (base === 'talk') p.interest = arg as never;
  if (base === 'brag' || base === 'help') p.ability = arg as Ability;
  if (base === 'story') p.storyId = Number(arg);
  if (base === 'rumor') {
    // The rumor is about someone who isn't here: tellStory does all its effects.
    c.plays.push({ ...p, target: Number(arg) });
    afterPlay(w, c, { ...p, target: Number(arg) });
    return;
  }
  if (base === 'story') {
    c.plays.push(p);
    afterPlay(w, c, p);
    return;
  }
  p.thread ??= threadStart(w, c, p);
  const outcomes = def.outcomes(ctx, target, arg);
  let r = w.rng.next();
  const outcome = outcomes.find((o) => (r -= o.p) <= 0) ?? outcomes[outcomes.length - 1];
  p.success = outcome.success;
  // Closeness needs privacy: deep cards only count as deep in an intimate setting.
  if (!intimate(w, c)) for (const e of outcome.fx.bond) e.deep = false;
  else if (base === 'openup' && target >= 0 && bond(w, me, target) >= LEVEL.friendly) w.openedUp[me * w.n + target] = 1;
  // A thread's last two disclosures are each person opening up to the other, out of their week's allowance.
  if (inThread && (inThread.turn === 4 || inThread.turn === 5) && intimate(w, c) && opensUp(w, inThread)) {
    w.openedUp[me * w.n + (inThread.turn === 4 ? inThread.friend : inThread.owner)] = 1;
    if (inThread.turn === 5 || inThread.thread.entry.card !== 'openup') person.openUpsThisWeek++;
  }
  // Going out with someone counts as both of you opening up.
  if (base === 'askout' && outcome.success) w.openedUp[me * w.n + target] = w.openedUp[target * w.n + me] = 1;
  applyEffects(w, outcome.fx, me, c.members);
  c.plays.push(p);
  afterPlay(w, c, p);
}

/**
 * Whether a conversation is intimate enough for deep cards to count as deep: private (a hangout, a
 * call), just two people (even whispering with others nearby), or a table where everyone is already
 * Friends with everyone.
 */
export function intimate(w: World, c: Convo): boolean {
  if (c.private || c.members.length === 2) return true;
  return c.members.every((a) => c.members.every((b) => a === b || bond(w, a, b) >= LEVEL.friends));
}

/** Things that follow from a card beyond its Bond, Respect and Energy effects. */
function afterPlay(w: World, c: Convo, p: Play) {
  const n = w.n;
  const me = p.actor;
  advanceThread(w, c, p);
  const def = CARDS[p.card];
  const listeners = c.members.filter((m) => m !== me);
  // A response that breaks the flow isn't a warm one.
  if (def.warm && p.target >= 0 && (!p.thread || p.thread.move === 'on' || p.thread.move === 'wrap')) w.week.warm[me * n + p.target] = Math.min(255, w.week.warm[me * n + p.target] + 1);
  // Learning what people love: they talked about it, said they love it, or answered your question.
  if (p.card === 'talk' || (p.card === 'opinion' && (p.stance ?? 0) > 0)) for (const l of listeners) w.knows[l * n + me] = 1;
  if (p.answers === 'ask' && p.target >= 0) w.knows[p.target * n + me] = 1;
  // Saying the opposite of what you told someone before: they catch you being two-faced.
  if (p.topic !== undefined && p.stance !== undefined) {
    const topics = w.people[0].opinions.length;
    const fx = noEffects();
    for (const l of listeners) {
      const key = (l * n + me) * topics + p.topic;
      const before = w.claims.get(key);
      if (before !== undefined && before * p.stance < 0) {
        fx.bond.push({ a: me, b: l, d: -2 });
        count(w, 'twoFacedCaught');
      }
      w.claims.set(key, p.stance);
    }
    applyEffects(w, fx, -1, c.members);
  }
  if (p.card === 'help' && p.target >= 0) w.people[me].favors.set(p.target, w.day + FAVOR_DAYS);
  if (p.card === 'story' && p.storyId !== undefined) tellStory(w, c, me, p.storyId);
  if (p.card === 'rumor') {
    const s = newStory(w, 'rumor', p.target, -1, false, true);
    s.madeUpBy = me;
    w.people[me].lastRumor = w.day;
    w.people[me].stories.add(s.id);
    tellStory(w, c, me, s.id);
    count(w, 'rumors');
  }
  if (p.card === 'invite' && p.success) w.hangouts.push([me, p.target]);
  if (p.card === 'askout' && p.success) {
    w.people[me].partner = p.target;
    w.people[p.target].partner = me;
    w.romances.push({ a: me, b: p.target, start: w.day, end: -1 });
    spread(w, c, newStory(w, 'couple', me, p.target, true, false));
    count(w, 'couples');
  }
  if (p.card === 'askout' && !p.success) {
    // Being turned down is a story — embarrassing for the one who asked.
    const s = newStory(w, 'turneddown', me, p.target, true, false);
    s.embarrassing = true;
    spread(w, c, s);
    count(w, 'askoutRefused');
  }
  if (p.card === 'breakup') endCouple(w, me, c);
  if (p.card === 'putdown') {
    spread(w, c, newStory(w, 'putdown', me, p.target, true, true));
    w.putdowns.push({ day: w.day, bully: me, target: p.target, bullyStanding: w.standing[me], intervened: false, stopped: false });
    // A teacher in the room: 1 in 3, it's reported, and the bully's mean cards cost more for a week.
    if (c.teacher && w.rng.chance(1 / 3)) {
      w.people[me].meanCostUntil = w.day + 7;
      count(w, 'reported');
    }
  }
  if (p.card === 'standup') {
    count(w, 'standUps');
    if (p.success) count(w, 'standUpsWorked');
    // For the report: someone other than the victim stepping in on a put-down they saw today.
    const saw = [...w.putdowns].reverse().find((d) => d.day === w.day && d.bully === p.target && c.members.includes(d.target));
    if (saw && saw.target !== me) {
      saw.intervened = true;
      saw.stopped ||= !!p.success;
    }
  }
  if (p.target >= 0 && w.people[me].partner === p.target) w.week.coupleTime.set(me, (w.week.coupleTime.get(me) ?? 0) + 1);
}

export function endCouple(w: World, breaker: number, c: Convo | null) {
  const partner = w.people[breaker].partner;
  if (partner < 0) return;
  w.people[breaker].partner = -1;
  w.people[partner].partner = -1;
  const r = w.romances.find((x) => x.end < 0 && ((x.a === breaker && x.b === partner) || (x.a === partner && x.b === breaker)));
  if (r) r.end = w.day;
  const s = newStory(w, 'breakup', breaker, partner, true, false);
  if (c) spread(w, c, s);
  else for (const id of [breaker, partner]) w.people[id].stories.add(s.id);
  count(w, 'breakups');
}

export function newStory(w: World, kind: Story['kind'], actor: number, target: number, isTrue: boolean, mean: boolean): Story {
  const s: Story = { id: w.stories.length, kind, actor, target, day: w.day, true: isTrue, mean };
  w.stories.push(s);
  return s;
}

/** Everyone present (and watching) gets a copy of a story about something that just happened. */
function spread(w: World, c: Convo, s: Story) {
  for (const id of c.members.concat(c.onlookers)) w.people[id].stories.add(s.id);
}

/**
 * Telling a story (§8 rule 7): every listener who hadn't heard it gets their own copy and takes it as
 * `hearing` says — believing it, siding with their friend, or knowing it's a lie. Someone who knows a
 * story is a lie also learns a true story: that the teller spread a lie about their friend.
 */
function tellStory(w: World, c: Convo, teller: number, storyId: number) {
  const s = freshStory(w, storyId);
  if (!s) return;
  const lies: number[] = [];
  for (const l of c.members.concat(c.onlookers)) {
    if (l === teller || w.people[l].stories.has(s.id)) continue;
    w.people[l].stories.add(s.id);
    const { verdict, fx } = hearing(w, s, teller, l);
    applyEffects(w, fx, -1, []);
    count(w, `heard:${verdict}`);
    if (verdict === 'false') lies.push(l);
  }
  if (lies.length) {
    s.foundOut = true;
    const lied = newStory(w, 'lied', teller, s.actor, true, true);
    for (const l of lies) w.people[l].stories.add(lied.id);
    count(w, 'liesFoundOut');
  }
  w.people[teller].gossipThisWeek++;
  count(w, 'storiesTold');
}
