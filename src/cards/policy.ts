/**
 * How the other students choose what to say (spec §9). Each looks at the cards they could play,
 * weighs each by its printed effects on what they care about, adds a nudge from their personality, and
 * picks — mostly the best, with some randomness, so people can surprise you. Then they decide whether
 * to stay quiet, say it, or jump in.
 *
 * What a student cares about comes from their hidden personality:
 * - Bond with people (everyone), a bit more with people they already like;
 * - their own Respect and Standing (more if they care about status);
 * - energy (more when they're running low);
 * - avoiding risk (more if Sensitive).
 */
import { CARDS, costOf, usesLeft, type Ctx, type Outcome } from './cards';
import { ASK_OUT_BOND, BOND_MAX, CASUAL_CAP, CLOSE_FADE_AFTER_DAYS, FRIEND_FADE_AFTER_DAYS, LEVEL } from './rules';
import type { Person } from './types';
import { bond, type Effects } from './world';

/** Stay quiet (0), say something (1), or jump in (2), with the card they'd play. */
export interface Intent {
  urgency: 0 | 1 | 2;
  key: string;
  target: number;
  cost: number;
  score: number;
}

/**
 * Bullying pays at once and costs later. The status-hungry (unless they're Warm) feel most of the pull;
 * everyone else sees through it. `seesThrough` is the share of the quick Respect they discount, and
 * `restraint` is how reluctant they are anyway. These are habits of the other students, not rules.
 */
const TEMPTATION = { tempted: { seesThrough: 0.9, restraint: 0.6 }, others: { seesThrough: 1, restraint: 0.8 } } as const;

/** How randomly people pick: higher means less predictable. */
const NOISE = 0.4;

function gumbel(next: () => number): number {
  return -Math.log(-Math.log(Math.max(1e-9, next())));
}

/** What a change in Bond with `other` is worth to `me`. */
function bondValue(ctx: Ctx, me: Person, other: number, d: number, deep: boolean): number {
  const b = bond(ctx.w, me.id, other);
  // The depth rule is printed, so people know casual cards won't take a Bond past Friendly.
  if (d > 0 && !deep && b >= CASUAL_CAP) return 0;
  // So is the both-ways rule: deep moments can't take you past Friendly until you've both opened up.
  const n = ctx.w.n;
  if (d > 0 && b >= CASUAL_CAP && !(ctx.w.openedUp[me.id * n + other] && ctx.w.openedUp[other * n + me.id])) return 0;
  if (b <= -3) return 0.3;
  // At this age, friendships with your own gender matter more to most people.
  const sameGender = ctx.w.people[other].gender === me.gender ? 1.25 : 0.8;
  const v = sameGender * (1 + (b >= LEVEL.friendly ? 0.3 : 0)) + 0.15 * me.personality.statusDrive * (ctx.w.standing[other] - 3);
  // Someone edgy who cares a lot about status cares less about the feelings of people below them —
  // the dominance motive behind most bullying.
  if (me.personality.statusDrive === 2 && me.personality.A === -1 && ctx.w.standing[other] < ctx.w.standing[me.id]) return v * 0.4;
  // The fading rule is printed too: people look after a friendship that's due to fade within a week.
  if (deep && d > 0 && b >= LEVEL.friends) {
    const since = ctx.w.day - ctx.w.deepContact[me.id * ctx.w.n + other];
    const window = b >= LEVEL.close ? CLOSE_FADE_AFTER_DAYS : FRIEND_FADE_AFTER_DAYS;
    if (since >= window - 7) return v * 1.6;
  }
  return v;
}

function energyValue(me: Person): number {
  return 0.25 + (me.energy < 4 ? 0.3 : 0);
}

/** What one point of someone's Respect is worth to `me`. */
function respectValue(me: Person): number {
  return 0.3 + 0.35 * me.personality.statusDrive;
}

/** How good a set of effects is for `me`. */
export function utility(ctx: Ctx, me: Person, fx: Effects): number {
  let u = 0;
  for (const e of fx.bond) {
    const other = e.a === me.id ? e.b : e.b === me.id ? e.a : -1;
    if (other < 0) continue;
    // Nothing is gained past the top of the scale.
    const d = e.d > 0 ? Math.min(e.d, BOND_MAX - bond(ctx.w, me.id, other)) : e.d;
    u += d * bondValue(ctx, me, other, e.d, !!e.deep);
  }
  for (const e of fx.respect) {
    if (e.to === me.id) u += e.d * respectValue(me);
    // Someone I can't stand losing face is fine by me.
    else if (bond(ctx.w, me.id, e.to) <= -2) u -= e.d * 0.3;
  }
  for (const e of fx.energy) if (e.id === me.id) u += e.d * energyValue(me);
  return u;
}

/** A small nudge toward the cards their personality favors. */
function bias(me: Person, key: string, ctx: Ctx, target: number, outcomes: Outcome[]): number {
  const base = key.split(':')[0];
  const def = CARDS[base];
  const T = me.personality;
  let b = 0;
  if (def.kind === 'response') b += 0.2; // answering what was said comes naturally
  if (T.E === 1 && (def.aim === 'table' || base === 'joke')) b += 0.2;
  if (T.A === 1 && ['listen', 'laugh', 'compliment', 'ask', 'same', 'thank', 'impressed'].includes(base)) b += 0.25;
  if (T.A === 1 && def.kind === 'attack') b -= 0.5;
  if (T.A === -1 && ['tease', 'push', 'brag', 'teaseshirt'].includes(base)) b += 0.25;
  if (T.O === 1 && base === 'ask') b += 0.2;
  // Opening up first is how a friendship starts (the both-ways rule).
  if (base === 'openup' && target >= 0 && bond(ctx.w, me.id, target) >= LEVEL.friendly && !ctx.w.openedUp[me.id * ctx.w.n + target]) b += 0.6;
  // Standing up: mostly in the moment, by Warm people, the victim, and above all the victim's Friends.
  if (base === 'standup' && target >= 0) {
    const victim = ctx.last?.card === 'putdown' && ctx.last.actor === target ? ctx.last.target : -1;
    b += T.A === 1 ? 0.6 : 0;
    if (victim >= 0) b += 1 + (victim === me.id ? 0.4 : bond(ctx.w, me.id, victim) >= LEVEL.friends ? 2.6 : 0);
  }
  // Asking out: only once they're close enough to have a chance.
  if (base === 'askout' && target >= 0) b += bond(ctx.w, me.id, target) >= ASK_OUT_BOND ? 0.3 : -2;
  // The dominance motive: edgy or status-hungry people are tempted to put down people at or below
  // them, and anyone is tempted to go after someone they can't stand. Warm people almost never do it.
  // Making up a rumor: only people with a grudge (it's only in their hand for an Enemy).
  // Most people won't lie about someone even when they could; edgy people are the ones who might.
  if (base === 'rumor') b += T.A === -1 ? -0.3 : T.A === 1 ? -2 : -1.2;
  if (base === 'putdown' && target >= 0) {
    const below = ctx.w.standing[target] <= ctx.w.standing[me.id];
    const grudge = bond(ctx.w, me.id, target) <= -2;
    b += (T.A === -1 ? 0.6 : 0) + 0.4 * T.statusDrive + (below ? 0.3 : -0.5) + (grudge ? 0.8 : 0) - (T.A === 1 ? 1 : 0);
    const pull = T.statusDrive === 2 && T.A !== 1 ? TEMPTATION.tempted : TEMPTATION.others;
    const quickRespect = outcomes[0].fx.respect.reduce((sum, e) => (e.to === me.id && e.d > 0 ? sum + e.d : sum), 0);
    b -= quickRespect * respectValue(me) * pull.seesThrough + pull.restraint;
  }
  return b;
}

function riskAversion(me: Person): number {
  return me.personality.N === 1 ? 0.6 : me.personality.N === -1 ? 0.1 : 0.3;
}

/** Weigh a card's possible outcomes: the average, less a penalty for how much it could swing. */
function weigh(ctx: Ctx, me: Person, outcomes: Outcome[]): number {
  const us = outcomes.map((o) => utility(ctx, me, o.fx));
  const mean = outcomes.reduce((t, o, i) => t + o.p * us[i], 0);
  const sd = Math.sqrt(outcomes.reduce((t, o, i) => t + o.p * (us[i] - mean) ** 2, 0));
  return mean - riskAversion(me) * sd;
}

/** What `me` wants to do this moment. */
export function choose(ctx: Ctx, owned: Map<string, number>): Intent {
  const me = ctx.w.people[ctx.me];
  const next = () => ctx.w.rng.next();
  let best: Intent = { urgency: 0, key: '', target: -1, cost: 0, score: -Infinity };
  for (const key of owned.keys()) {
    if (usesLeft(ctx.w, ctx.me, owned, key) <= 0) continue;
    const [base, ...rest] = key.split(':');
    const def = CARDS[base];
    if (!def) continue;
    const arg = rest.join(':');
    for (const t of def.targets(ctx, arg)) {
      const cost = costOf(ctx, key, t);
      if (cost > me.energy) continue;
      const outcomes = def.outcomes(ctx, t, arg);
      const score = weigh(ctx, me, outcomes) - cost * energyValue(me) + bias(me, key, ctx, t, outcomes) + NOISE * gumbel(next);
      if (score > best.score) best = { urgency: 1, key, target: t, cost, score };
    }
  }
  // Stay quiet, say it, or jump in — outgoing people speak up more readily.
  const quietBar = me.personality.E === 1 ? -0.2 : me.personality.E === -1 ? 0.45 : 0.15;
  const jumpBar = me.personality.E === 1 ? 0.9 : me.personality.E === -1 ? 2 : 1.4;
  if (best.score < quietBar) return { ...best, urgency: 0 };
  if (best.score > jumpBar && me.energy >= best.cost + 1) return { ...best, urgency: 2 };
  return best;
}
