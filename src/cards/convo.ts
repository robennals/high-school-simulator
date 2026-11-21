/**
 * Conversations (spec §5): a series of moments. In each moment everyone chooses to stay quiet, say
 * something, or jump in; whoever wants to speak most does, and plays one card. Put-downs are settled
 * in the room, with bystanders choosing sides.
 */
import { CARDS, collection, costOf, freshStory, hearing, usesLeft, type Ctx } from './cards';
import { choose, type Intent } from './policy';
import { FAVOR_DAYS, LEVEL } from './rules';
import type { Convo, Play, Story, World } from './types';
import { applyEffects, bond, count, noEffects, type Effects } from './world';

export interface ConvoOptions {
  private?: boolean;
  teacher?: boolean;
}

/** Run a whole conversation between `members`, with `onlookers` watching. */
export function runConvo(w: World, members: number[], onlookers: number[], moments: number, opts: ConvoOptions = {}): Convo {
  const c: Convo = { members: [...members], onlookers, private: !!opts.private, teacher: !!opts.teacher, plays: [] };
  if (c.members.length < 2) return c;
  const owned = new Map(c.members.map((id) => [id, collection(w, id)]));
  for (let m = 0; m < moments && c.members.length >= 2; m++) {
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
    // Who speaks: jumping in beats saying something; then most Bond with the table; then Standing.
    const table = (id: number) => c.members.reduce((t, o) => (o === id ? t : t + bond(w, id, o)), 0);
    const speaker = wanting.reduce((a, b) => {
      const ia = intents.get(a)!;
      const ib = intents.get(b)!;
      if (ia.urgency !== ib.urgency) return ia.urgency > ib.urgency ? a : b;
      if (table(a) !== table(b)) return table(a) > table(b) ? a : b;
      if (w.standing[a] !== w.standing[b]) return w.standing[a] > w.standing[b] ? a : b;
      return w.rng.chance(0.5) ? a : b;
    });
    const intent = intents.get(speaker)!;
    const fx = noEffects();
    // Talking over someone who also wanted to speak costs Bond with them.
    if (intent.urgency === 2) for (const o of wanting) if (o !== speaker) fx.bond.push({ a: speaker, b: o, d: -1 });
    if (intent.urgency === 2) fx.energy.push({ id: speaker, d: -1 });
    // Staying quiet lets you catch your breath.
    for (const id of c.members) if (intents.get(id)!.urgency === 0) fx.energy.push({ id, d: 1 });
    applyEffects(w, fx, speaker, c.members);
    play(w, c, speaker, intent.key, intent.target);
  }
  return c;
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
  person.used.set(key, (person.used.get(key) ?? 0) + 1);
  count(w, `card:${base}`);
  const p: Play = { card: base, actor: me, target };
  if (base === 'opinion') [p.topic, p.stance] = arg.split(':').map(Number);
  if (['agree', 'push', 'fake'].includes(base) && last) {
    p.topic = last.topic;
    p.stance = base === 'push' ? Math.sign(person.opinions[last.topic!]) : last.stance;
  }
  if (base === 'talk') p.interest = arg as never;
  if (base === 'story' || base === 'callout') p.storyId = Number(arg);
  if (base === 'rumor') {
    // The rumor is about someone who isn't here: tellStory does all its effects.
    c.plays.push({ ...p, target: Number(arg) });
    afterPlay(w, c, { ...p, target: Number(arg) });
    return;
  }
  if (base === 'putdown') {
    resolvePutdown(w, c, me, target);
    c.plays.push(p);
    return;
  }
  if (base === 'story') {
    c.plays.push(p);
    afterPlay(w, c, p);
    return;
  }
  const outcomes = def.outcomes(ctx, target, arg);
  let r = w.rng.next();
  const outcome = outcomes.find((o) => (r -= o.p) <= 0) ?? outcomes[outcomes.length - 1];
  p.success = outcome.success;
  // Closeness needs privacy: deep cards only count as deep in an intimate setting.
  if (!intimate(w, c)) for (const e of outcome.fx.bond) e.deep = false;
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
  const def = CARDS[p.card];
  const listeners = c.members.filter((m) => m !== me);
  if (def.warm && p.target >= 0) w.week.warm[me * n + p.target] = Math.min(255, w.week.warm[me * n + p.target] + 1);
  // Learning what people love: they talked about it, said they love it, or answered your question.
  if (p.card === 'talk' || (p.stance ?? 0) > 0) for (const l of listeners) w.knows[l * n + me] = 1;
  if (p.card === 'answer' && p.target >= 0) w.knows[p.target * n + me] = 1;
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
  if ((p.card === 'invite' || p.card === 'inviteout') && p.success) w.hangouts.push([me, p.target]);
  if (p.card === 'askout' && p.success) {
    w.people[me].partner = p.target;
    w.people[p.target].partner = me;
    spread(w, c, newStory(w, 'couple', me, p.target, true, false));
    count(w, 'couples');
  }
  if (p.card === 'askout' && !p.success) count(w, 'askoutRefused');
  if (p.card === 'breakup') endCouple(w, me, c);
  if (p.card === 'callout') {
    pushedBack(w, p.target, me);
    count(w, 'callouts');
  }
  if (def.kind === 'deep' && p.target >= 0 && w.people[me].partner === p.target) w.week.coupleTime.set(me, (w.week.coupleTime.get(me) ?? 0) + 1);
}

export function endCouple(w: World, breaker: number, c: Convo | null) {
  const partner = w.people[breaker].partner;
  if (partner < 0) return;
  w.people[breaker].partner = -1;
  w.people[partner].partner = -1;
  const s = newStory(w, 'breakup', breaker, partner, true, false);
  if (c) spread(w, c, s);
  else for (const id of [breaker, partner]) w.people[id].stories.add(s.id);
  count(w, 'breakups');
}

function pushedBack(w: World, target: number, by: number) {
  const set = w.week.pushback.get(target) ?? new Set<number>();
  set.add(by);
  w.week.pushback.set(target, set);
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
    const lied = newStory(w, 'lied', teller, s.actor, true, true);
    for (const l of lies) w.people[l].stories.add(lied.id);
    count(w, 'liesFoundOut');
  }
  w.people[teller].gossipThisWeek++;
  count(w, 'storiesTold');
}

/**
 * A put-down, settled in the room (§6, §8 rule 6). The target picks a reply from the ones their energy
 * allows; bystanders choose a side (laugh along with the bully, don't laugh, or stand up for the
 * target); then the reply, and the sides, decide who wins.
 */
function resolvePutdown(w: World, c: Convo, bully: number, target: number) {
  const t = w.people[target];
  // The target's reply: drained, you have fewer calm options.
  const goodCount = t.energy >= 6 ? 3 : t.energy >= 3 ? 2 : t.energy >= 1 ? 1 : 0;
  const goods = ['bait', 'joke', 'walk'].slice(0, goodCount);
  const reply = goods.includes('joke') && t.abilities.humor >= 4 ? 'joke' : goods.includes('bait') ? 'bait' : goods.includes('joke') && t.abilities.humor >= 3 ? 'joke' : goods.includes('walk') ? 'walk' : t.personality.A === -1 ? 'snap' : 'explain';
  // Bystanders choose a side, with the cards they hold.
  const bystanders = c.members.filter((m) => m !== bully && m !== target);
  const laughers: number[] = [];
  const dontLaugh: number[] = [];
  const standUps: number[] = [];
  for (const b of bystanders) {
    const p = w.people[b];
    const own = collection(w, b);
    const forTarget = bond(w, b, target);
    if (forTarget >= LEVEL.friends && p.energy >= 3 && usesLeft(w, b, own, 'standup') > 0 && w.rng.chance(p.personality.A === 1 ? 0.7 : 0.5)) {
      standUps.push(b);
      p.energy -= 3;
      p.used.set('standup', (p.used.get('standup') ?? 0) + 1);
    } else if ((forTarget >= LEVEL.friendly || p.personality.A === 1) && usesLeft(w, b, own, 'dontlaugh') > 0 && w.rng.chance(0.6)) {
      dontLaugh.push(b);
      p.used.set('dontlaugh', (p.used.get('dontlaugh') ?? 0) + 1);
    } else if ((bond(w, b, bully) >= LEVEL.friendly || (p.personality.statusDrive === 2 && w.standing[bully] > w.standing[b])) && w.rng.chance(0.5)) {
      laughers.push(b);
    }
  }
  const friendsHere = (who: number, exclude: number) => bystanders.filter((b) => b !== exclude && bond(w, b, who) >= LEVEL.friends).length;
  const bullySide = w.standing[bully] + laughers.length + friendsHere(bully, target);
  const targetSide = w.standing[target] + dontLaugh.length + 2 * standUps.length + friendsHere(target, bully);
  // The reply decides it; more people standing with the target can still turn the room.
  let winner: 'bully' | 'target' | 'draw';
  if (reply === 'bait') winner = w.standing[bully] >= w.standing[target] + 2 ? (targetSide > bullySide ? 'target' : 'bully') : 'target';
  else if (reply === 'joke') winner = w.rng.chance(t.abilities.humor / 6) ? 'target' : targetSide > bullySide ? 'target' : 'bully';
  else if (reply === 'walk') winner = targetSide > bullySide ? 'target' : 'draw';
  else winner = targetSide > bullySide ? 'target' : 'bully';

  const fx: Effects = noEffects();
  fx.bond.push({ a: bully, b: target, d: -3 });
  fx.energy.push({ id: target, d: t.personality.N === 1 ? -3 : t.personality.N === -1 ? 0 : -2 });
  const watchers = bystanders.concat(c.onlookers);
  if (winner === 'bully') for (const l of watchers) fx.respect.push({ from: l, to: bully, d: 1 });
  if (winner === 'target') for (const l of watchers) fx.respect.push({ from: l, to: bully, d: -1 });
  if (reply === 'joke' && winner === 'target') for (const l of bystanders) fx.bond.push({ a: target, b: l, d: 1 });
  if (reply === 'snap') for (const l of bystanders) fx.bond.push({ a: target, b: l, d: -1 });
  applyEffects(w, fx, bully, c.members);
  const side = noEffects();
  for (const s of standUps) {
    side.bond.push({ a: s, b: target, d: 3, deep: true }, { a: s, b: bully, d: -2 });
    for (const l of watchers) if (l !== s) side.respect.push({ from: l, to: s, d: winner === 'target' ? 1 : -1 });
    side.energy.push({ id: target, d: 2 });
    pushedBack(w, bully, s);
  }
  for (const d of dontLaugh) {
    side.bond.push({ a: d, b: target, d: 1 });
    pushedBack(w, bully, d);
  }
  for (const l of laughers) side.bond.push({ a: l, b: bully, d: 1 });
  applyEffects(w, side, -1, c.members);
  // A teacher in the room: 1 in 3, it's reported — and the bully's mean cards cost more for a week.
  if (c.teacher && w.rng.chance(1 / 3)) {
    w.people[bully].meanCostUntil = w.day + 7;
    count(w, 'reported');
  }
  spread(w, c, newStory(w, 'putdown', bully, target, true, true));
  w.putdowns.push({ day: w.day, bully, target, bullyStanding: w.standing[bully], won: winner === 'bully' });
  count(w, `putdown:${winner}`);
  count(w, 'standUps', standUps.length);
  count(w, 'dontLaugh', dontLaugh.length);
}
