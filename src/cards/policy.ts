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
import { CASUAL_CAP, LEVEL } from './rules';
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
  if (b <= -3) return 0.3;
  // At this age, friendships with your own gender matter more to most people.
  const sameGender = ctx.w.people[other].gender === me.gender ? 1.25 : 0.8;
  const v = sameGender * (1 + (b >= LEVEL.friendly ? 0.3 : 0)) + 0.15 * me.personality.statusDrive * (ctx.w.standing[other] - 3);
  // Someone edgy who cares a lot about status cares less about the feelings of people below them —
  // the dominance motive behind most bullying.
  if (me.personality.statusDrive === 2 && me.personality.A === -1 && ctx.w.standing[other] < ctx.w.standing[me.id]) return v * 0.4;
  return v;
}

function energyValue(me: Person): number {
  return 0.25 + (me.energy < 4 ? 0.3 : 0);
}

/** How good a set of effects is for `me`. */
export function utility(ctx: Ctx, me: Person, fx: Effects): number {
  let u = 0;
  for (const e of fx.bond) {
    if (e.a === me.id) u += e.d * bondValue(ctx, me, e.b, e.d, !!e.deep);
    else if (e.b === me.id) u += e.d * bondValue(ctx, me, e.a, e.d, !!e.deep);
  }
  for (const e of fx.respect) {
    if (e.to === me.id) u += e.d * (0.3 + 0.35 * me.personality.statusDrive);
    // Someone I can't stand losing face is fine by me.
    else if (bond(ctx.w, me.id, e.to) <= -2) u -= e.d * 0.3;
  }
  for (const e of fx.energy) if (e.id === me.id) u += e.d * energyValue(me);
  return u;
}

/** A small nudge toward the cards their personality favors. */
function bias(me: Person, key: string, ctx: Ctx, target: number): number {
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
  // Calling out meanness: warm people do it, and more when the person hurt is their friend.
  if (base === 'callout') {
    const s = ctx.w.stories[Number(key.split(':')[1])];
    b += (T.A === 1 ? 0.3 : 0) + (s && bond(ctx.w, me.id, s.target) >= LEVEL.friends ? 0.5 : 0);
  }
  // Asking out: only once they're close enough to have a chance.
  if (base === 'askout' && target >= 0) b += bond(ctx.w, me.id, target) >= 10 ? 0.3 : -2;
  // The dominance motive: edgy or status-hungry people are tempted to put down people at or below
  // them, and anyone is tempted to go after someone they can't stand. Warm people almost never do it.
  // Making up a rumor: only people with a grudge (it's only in their hand for an Enemy).
  // Most people won't lie about someone even when they could; edgy people are the ones who might.
  if (base === 'rumor') b += T.A === -1 ? 0.2 : T.A === 1 ? -1.5 : -0.7;
  if (base === 'putdown' && target >= 0) {
    const below = ctx.w.standing[target] <= ctx.w.standing[me.id];
    const grudge = bond(ctx.w, me.id, target) <= -2;
    b += (T.A === -1 ? 0.6 : 0) + 0.4 * T.statusDrive + (below ? 0.3 : -0.5) + (grudge ? 0.8 : 0) - (T.A === 1 ? 1 : 0);
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
    if (!def || base === 'standup' || base === 'dontlaugh') continue;
    const arg = rest.join(':');
    for (const t of def.targets(ctx, arg)) {
      const cost = costOf(ctx, key, t);
      if (cost > me.energy) continue;
      const score = weigh(ctx, me, def.outcomes(ctx, t, arg)) - cost * energyValue(me) + bias(me, key, ctx, t) + NOISE * gumbel(next);
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
