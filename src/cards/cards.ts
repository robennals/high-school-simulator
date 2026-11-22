/**
 * The cards: what each one costs, who it can be aimed at, and exactly what it does (see
 * docs/design/card-rules-spec.md §6). A card's outcomes are pure — they list changes without making
 * them — so the other students' policy can weigh a card before playing it. `convo.ts` plays them.
 *
 * Card keys: a name, sometimes with an argument after a colon — `opinion:3:1` (love topic 3),
 * `talk:anime`, `brag:humor`, `help:academics`, `story:12`.
 */
import { ABILITIES, type Ability, type Interest } from '../sim/content';
import { ASK_OUT_BOND, BULLYING, LEVEL, OPEN_UPS_PER_WEEK, STORY_DAYS } from './rules';
import type { Convo, Person, Play, Story, World } from './types';
import { SHOWS, bond, closeFriendsOf, drawnTo, isFriend, noEffects, type Effects } from './world';

export type CardKind = 'starter' | 'response' | 'deep' | 'move' | 'attack' | 'pushback';

/** Everything a card needs to know to decide what it can do. */
export interface Ctx {
  w: World;
  c: Convo;
  me: number;
  /** The card played just before (by anyone), if any. */
  last: Play | null;
}

export interface Outcome {
  p: number;
  fx: Effects;
  success?: boolean;
}

export interface CardDef {
  name: string;
  kind: CardKind;
  /** The printed cost in ⚡, before trait and situation changes (see costOf). */
  cost: number;
  /** Said to one person, or to the whole table. */
  aim: 'one' | 'table';
  /** Mean cards cost 1 more for a week after people stand together against you (§8 rule 14). */
  mean?: boolean;
  /** Warm cards count toward trying too hard (§8 rule 13). */
  warm?: boolean;
  /** Who it can be aimed at right now ([-1] for the table); empty if it can't be played. */
  targets(ctx: Ctx, arg: string): number[];
  /** The possible results and their chances. Pure. */
  outcomes(ctx: Ctx, target: number, arg: string): Outcome[];
}

// ---------------------------------------------------------------- helpers

const others = (ctx: Ctx) => ctx.c.members.filter((m) => m !== ctx.me);
const audience = (ctx: Ctx, pub = false) => (pub ? others(ctx).concat(ctx.c.onlookers) : others(ctx));
const P = (ctx: Ctx, id = ctx.me): Person => ctx.w.people[id];
const sure = (fx: Effects): Outcome[] => [{ p: 1, fx }];

/** Who said the last line, if it was someone else (the person a response answers). */
function answering(ctx: Ctx, kinds: string[], toMe = false): number[] {
  const l = ctx.last;
  if (!l || l.actor === ctx.me || !ctx.c.members.includes(l.actor)) return [];
  if (!kinds.includes(l.card.split(':')[0])) return [];
  if (toMe && l.target !== ctx.me) return [];
  return [l.actor];
}

/** The effects of saying what you think about a topic to the table: agreers warm, disagreers cool. */
function opinionFx(ctx: Ctx, topic: number, stance: number, except = -1): Effects {
  const fx = noEffects();
  for (const l of others(ctx)) {
    if (l === except) continue;
    const op = ctx.w.people[l].opinions[topic];
    if (op * stance > 0) fx.bond.push({ a: ctx.me, b: l, d: 1 });
    else if (op * stance < 0) fx.bond.push({ a: ctx.me, b: l, d: -1 });
  }
  return fx;
}

function admirers(ctx: Ctx, q: string): number[] {
  return others(ctx).filter((l) => ctx.w.people[l].personality.admires.includes(q as never));
}

/** Friends of a bully back them, unless the victim is their friend too: then they favor the victim. */
export function backsBully(w: World, who: number, bully: number, victim: number): boolean {
  return isFriend(w, who, bully) && !(victim >= 0 && isFriend(w, who, victim));
}

/**
 * How a listener takes a story they hadn't heard (spec §8 rule 7). The teller gets Bond +1 for the news, and:
 * - **A true story of meanness:** they like and respect whoever was mean 1 less, unless they back them
 *   (that person's Friend, and not the victim's).
 * - **A rumor, or something embarrassing:** they respect the person it's about 1 less.
 * Two ways it goes wrong for the teller:
 * - **They know it's false** (a rumor about them, or someone they're Friendly with): Bond −2.
 * - **Loyalty:** they're closer to the person it's about than to the teller (for meanness: and back
 *   them): Bond −1, and the story does nothing.
 * After three stories in a week, your stories stop hurting whoever they're about.
 */
export function hearing(w: World, s: Story, teller: number, listener: number): { verdict: 'false' | 'loyal' | 'believed'; fx: Effects } {
  const fx = noEffects();
  const about = s.actor;
  // A rumor is recognized as false by the person it's about and anyone Friendly or closer with them.
  if (!s.true && (listener === about || bond(w, listener, about) >= LEVEL.friendly)) {
    fx.bond.push({ a: teller, b: listener, d: -2 });
    return { verdict: 'false', fx };
  }
  const meanness = s.true && s.mean;
  const bad = s.mean || !!s.embarrassing;
  const backs = backsBully(w, listener, about, s.target);
  const closer = bond(w, listener, about) > bond(w, listener, teller);
  if (bad && listener !== about && closer && (backs || !meanness)) {
    fx.bond.push({ a: teller, b: listener, d: -1 });
    return { verdict: 'loyal', fx };
  }
  fx.bond.push({ a: teller, b: listener, d: 1 });
  if (bad && listener !== about && w.people[teller].gossipThisWeek < 3) {
    if (!meanness) fx.respect.push({ from: listener, to: about, d: -1 });
    else if (!backs) {
      fx.bond.push({ a: about, b: listener, d: BULLYING.gossipBond, hearsay: true });
      fx.respect.push({ from: listener, to: about, d: BULLYING.gossipRespect });
    }
  }
  // Learning a rumor was a lie undoes the damage: the person it was about regains your Respect.
  if (s.kind === 'lied' && s.target >= 0 && listener !== s.target) fx.respect.push({ from: listener, to: s.target, d: 1 });
  return { verdict: 'believed', fx };
}

/** Everything that happens when `ctx.me` tells a story to everyone who hasn't heard it. Pure. */
function tellingFx(ctx: Ctx, s: Story): Effects {
  const all = noEffects();
  for (const l of audience(ctx, true)) {
    if (s.id >= 0 && ctx.w.people[l].stories.has(s.id)) continue;
    const { fx } = hearing(ctx.w, s, ctx.me, l);
    all.bond.push(...fx.bond);
    all.respect.push(...fx.respect);
  }
  return all;
}

export function freshStory(w: World, id: number) {
  const s = w.stories[id];
  return s && w.day - s.day <= STORY_DAYS ? s : null;
}

// ---------------------------------------------------------------- the cards

export const CARDS: Record<string, CardDef> = {
  // Starters ---------------------------------------------------------------------------------------
  ask: {
    name: 'Ask about them',
    kind: 'starter',
    cost: 1,
    aim: 'one',
    warm: true,
    targets: (ctx) => others(ctx),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      // About something they love (you know it): +2. Curious people's questions land better.
      const knows = ctx.w.knows[ctx.me * ctx.w.n + t] === 1;
      fx.bond.push({ a: ctx.me, b: t, d: 1 + (knows ? 1 : 0) + (knows && P(ctx).personality.O === 1 ? 1 : 0) });
      return sure(fx);
    },
  },
  share: {
    name: 'Share something small',
    kind: 'starter',
    cost: 1,
    aim: 'one',
    targets: (ctx) => others(ctx),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      if (bond(ctx.w, ctx.me, t) >= LEVEL.acquaintances) fx.bond.push({ a: ctx.me, b: t, d: 1 });
      return sure(fx);
    },
  },
  opinion: {
    name: 'Say what you think',
    kind: 'starter',
    cost: 1,
    aim: 'table',
    targets: () => [-1],
    outcomes: (ctx, _t, arg) => {
      const [topic, stance] = arg.split(':').map(Number);
      return sure(opinionFx(ctx, topic, stance));
    },
  },
  talk: {
    name: 'Talk about a hobby',
    kind: 'starter',
    cost: 1,
    aim: 'table',
    targets: () => [-1],
    outcomes: (ctx, _t, arg) => {
      const fx = noEffects();
      for (const l of others(ctx))
        if (ctx.w.people[l].interests.has(arg as Interest)) {
          fx.bond.push({ a: ctx.me, b: l, d: 1 });
          fx.respect.push({ from: l, to: ctx.me, d: 1 });
        }
      return sure(fx);
    },
  },
  compliment: {
    name: 'Compliment',
    kind: 'starter',
    cost: 1,
    aim: 'one',
    warm: true,
    targets: (ctx) => others(ctx),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      // Sucking up: complimenting someone far above you (unless you're warm, so it reads as genuine).
      if (ctx.w.standing[t] >= ctx.w.standing[ctx.me] + 2 && P(ctx).personality.A !== 1)
        for (const l of others(ctx)) fx.respect.push({ from: l, to: ctx.me, d: -1 });
      return sure(fx);
    },
  },
  help: {
    name: 'Offer help',
    kind: 'starter',
    cost: 1,
    aim: 'one',
    // Only someone who could use it: at least two levels weaker at it than you.
    targets: (ctx, arg) => others(ctx).filter((t) => P(ctx, t).abilities[arg as Ability] <= P(ctx).abilities[arg as Ability] - 2),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      fx.respect.push({ from: t, to: ctx.me, d: 1 });
      return sure(fx);
    },
  },
  joke: {
    name: 'Crack a joke',
    kind: 'starter',
    cost: 2,
    aim: 'table',
    targets: () => [-1],
    outcomes: (ctx) => {
      const me = P(ctx);
      const os = others(ctx);
      const liked = os.length && os.reduce((t, l) => t + bond(ctx.w, ctx.me, l), 0) / os.length >= LEVEL.friendly;
      const p = Math.min(1, (me.abilities.humor + (liked ? 1 : 0)) / 6);
      const land = noEffects();
      for (const l of os) land.bond.push({ a: ctx.me, b: l, d: 1 });
      for (const l of admirers(ctx, 'funny')) land.respect.push({ from: l, to: ctx.me, d: 1 });
      land.energy.push({ id: ctx.me, d: 1 });
      const flop = noEffects();
      for (const l of os) flop.respect.push({ from: l, to: ctx.me, d: -1 });
      if (me.personality.N !== -1) flop.energy.push({ id: ctx.me, d: -1 });
      return [
        { p, fx: land, success: true },
        { p: 1 - p, fx: flop, success: false },
      ];
    },
  },
  brag: {
    name: 'Brag',
    kind: 'starter',
    cost: 2,
    aim: 'table',
    targets: () => [-1],
    outcomes: (ctx, _t, arg) => {
      const fx = noEffects();
      const fans = new Set(admirers(ctx, SHOWS[arg as Ability]));
      for (const l of others(ctx)) {
        if (fans.has(l)) fx.respect.push({ from: l, to: ctx.me, d: 1 });
        else fx.bond.push({ a: ctx.me, b: l, d: -1 });
      }
      return sure(fx);
    },
  },
  story: {
    name: 'Tell a story',
    kind: 'starter',
    cost: 1,
    aim: 'table',
    targets: (ctx, arg) => {
      const s = freshStory(ctx.w, Number(arg));
      // You don't tell a story about someone who's right there.
      if (!s || ctx.c.members.includes(s.actor)) return [];
      // Word takes time to get around: that's the week in which bullying seems to work.
      if (s.kind === 'putdown' && ctx.w.day - s.day < BULLYING.gossipAfterDays) return [];
      // ...except that you can tell what was done to you.
      if (ctx.c.members.includes(s.target) && !(s.mean && s.target === ctx.me)) return [];
      // ...or one everyone here already knows.
      return others(ctx).some((l) => !ctx.w.people[l].stories.has(s.id)) ? [-1] : [];
    },
    outcomes: (ctx, _t, arg) => sure(tellingFx(ctx, ctx.w.stories[Number(arg)])),
  },
  rumor: {
    name: 'Spread a rumor',
    kind: 'attack',
    cost: 2,
    aim: 'table',
    mean: true,
    // A made-up story about someone you can't stand, who isn't here to hear it.
    targets: (ctx, arg) => (ctx.c.members.includes(Number(arg)) ? [] : [-1]),
    // Printed: it usually gets found out — and then everyone who heard it from you turns on you.
    outcomes: (ctx, _t, arg) => {
      const now = tellingFx(ctx, { id: -1, kind: 'rumor', actor: Number(arg), target: -1, day: ctx.w.day, true: false, mean: true, madeUpBy: ctx.me });
      const later = noEffects();
      for (const l of others(ctx)) {
        later.bond.push({ a: ctx.me, b: l, d: -1 });
        later.respect.push({ from: l, to: ctx.me, d: -1 });
      }
      const caught: Effects = { bond: [...now.bond, ...later.bond], respect: [...now.respect, ...later.respect], energy: [] };
      return [
        { p: 0.15, fx: now },
        { p: 0.85, fx: caught },
      ];
    },
  },

  // Responses --------------------------------------------------------------------------------------
  listen: {
    name: 'Really listen',
    kind: 'response',
    cost: 0,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['share', 'openup', 'same', 'talk', 'opinion', 'story', 'brag', 'answer', 'more']),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      const personal = ['openup', 'same', 'more'].includes(ctx.last!.card);
      fx.bond.push({ a: ctx.me, b: t, d: 1 + (P(ctx).personality.E === -1 ? 1 : 0), deep: personal });
      return sure(fx);
    },
  },
  laugh: {
    name: 'Laugh along',
    kind: 'response',
    cost: 0,
    aim: 'one',
    warm: true,
    targets: (ctx) => (ctx.last?.success ? answering(ctx, ['joke']) : answering(ctx, ['tease'], true).filter(() => ctx.last?.success)),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      return sure(fx);
    },
  },
  answer: {
    name: 'Answer honestly',
    kind: 'response',
    cost: 1,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['ask', 'askshirt'], true),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      return sure(fx);
    },
  },
  same: {
    name: 'Same here',
    kind: 'response',
    cost: 1,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['share', 'openup', 'same', 'more']),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      const close = bond(ctx.w, ctx.me, t) >= LEVEL.friendly;
      fx.bond.push({ a: ctx.me, b: t, d: 1 + (P(ctx).personality.E === -1 ? 1 : 0), deep: close });
      return sure(fx);
    },
  },
  more: {
    name: 'Tell them more',
    kind: 'response',
    cost: 1,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['listen'], true),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      const close = bond(ctx.w, ctx.me, t) >= LEVEL.friendly;
      fx.bond.push({ a: ctx.me, b: t, d: close ? 2 : 0, deep: close });
      return sure(fx);
    },
  },
  agree: {
    name: 'Agree',
    kind: 'response',
    cost: 0,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['opinion', 'agree', 'push']).filter(() => P(ctx).opinions[ctx.last!.topic!] * ctx.last!.stance! > 0),
    outcomes: (ctx, t) => {
      const fx = opinionFx(ctx, ctx.last!.topic!, ctx.last!.stance!, t);
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      return sure(fx);
    },
  },
  push: {
    name: 'Push back',
    kind: 'response',
    cost: 2,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['opinion', 'agree', 'push']).filter(() => P(ctx).opinions[ctx.last!.topic!] * ctx.last!.stance! < 0),
    outcomes: (ctx, t) => {
      const topic = ctx.last!.topic!;
      const mine = Math.sign(P(ctx).opinions[topic]);
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: -1 });
      let side = 0;
      for (const l of others(ctx)) {
        if (l === t) continue;
        const op = ctx.w.people[l].opinions[topic] * mine;
        if (op > 0) {
          fx.bond.push({ a: ctx.me, b: l, d: 1 });
          fx.respect.push({ from: l, to: ctx.me, d: 1 });
          side++;
        } else if (op < 0) side--;
      }
      if (side > 0) fx.energy.push({ id: ctx.me, d: 1 });
      return sure(fx);
    },
  },
  fake: {
    name: 'Go along',
    kind: 'response',
    cost: 0,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['opinion', 'agree', 'push']).filter(() => P(ctx).opinions[ctx.last!.topic!] * ctx.last!.stance! <= 0),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      return sure(fx);
    },
  },
  impressed: {
    name: 'Be impressed',
    kind: 'response',
    cost: 0,
    aim: 'one',
    warm: true,
    targets: (ctx) => answering(ctx, ['brag', 'help']).concat(ctx.last?.card === 'joke' && ctx.last.success ? answering(ctx, ['joke']) : []).slice(0, 1),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      return sure(fx);
    },
  },
  teaseback: {
    name: 'Tease back',
    kind: 'response',
    cost: 1,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['tease', 'teaseshirt'], true).concat(answering(ctx, ['brag'])).slice(0, 1),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      if (bond(ctx.w, ctx.me, t) >= LEVEL.friendly) fx.bond.push({ a: ctx.me, b: t, d: 1 });
      else {
        fx.bond.push({ a: ctx.me, b: t, d: -1 });
        for (const l of others(ctx)) if (l !== t) fx.respect.push({ from: l, to: ctx.me, d: 1 });
      }
      return sure(fx);
    },
  },
  thank: {
    name: 'Thank them',
    kind: 'response',
    cost: 0,
    aim: 'one',
    targets: (ctx) => answering(ctx, ['compliment', 'help'], true),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 1 });
      return sure(fx);
    },
  },

  // Deep -------------------------------------------------------------------------------------------
  openup: {
    name: 'Open up',
    kind: 'deep',
    cost: 3,
    aim: 'one',
    targets: (ctx) => others(ctx),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      if (bond(ctx.w, ctx.me, t) >= LEVEL.friendly) fx.bond.push({ a: ctx.me, b: t, d: 3, deep: true });
      else {
        fx.bond.push({ a: ctx.me, b: t, d: -1 });
        if (P(ctx).personality.N !== -1) fx.energy.push({ id: ctx.me, d: -1 });
      }
      // In front of people who aren't your Friends, it's awkward.
      if (!ctx.c.private) for (const l of others(ctx)) if (l !== t && bond(ctx.w, ctx.me, l) < LEVEL.friends) fx.bond.push({ a: ctx.me, b: l, d: -1 });
      return sure(fx);
    },
  },

  // Moves ------------------------------------------------------------------------------------------
  invite: {
    name: 'Invite to hang out',
    kind: 'move',
    cost: 2,
    aim: 'one',
    targets: (ctx) => others(ctx),
    outcomes: (ctx, t) => inviteOutcomes(ctx, t, LEVEL.friends, false),
  },
  inviteout: {
    name: 'Invite, leaving an out',
    kind: 'move',
    cost: 1,
    aim: 'one',
    targets: (ctx) => others(ctx),
    outcomes: (ctx, t) => inviteOutcomes(ctx, t, LEVEL.friendly, true),
  },
  askout: {
    name: 'Ask out',
    kind: 'move',
    cost: 3,
    aim: 'one',
    targets: (ctx) => {
      const me = P(ctx);
      if (me.partner >= 0) return [];
      return others(ctx).filter((t) => P(ctx, t).partner < 0 && drawnTo(ctx.w, ctx.me, t));
    },
    outcomes: (ctx, t) => {
      const yes = bond(ctx.w, ctx.me, t) >= ASK_OUT_BOND && P(ctx, t).romantic;
      const fx = noEffects();
      if (yes) {
        fx.bond.push({ a: ctx.me, b: t, d: 2, deep: true });
        if (ctx.w.standing[t] > ctx.w.standing[ctx.me]) for (const l of audience(ctx)) if (l !== t) fx.respect.push({ from: l, to: ctx.me, d: 1 });
      } else {
        fx.bond.push({ a: ctx.me, b: t, d: -1 });
        fx.energy.push({ id: ctx.me, d: -2 });
        if (others(ctx).length > 1) for (const l of others(ctx)) if (l !== t) fx.respect.push({ from: l, to: ctx.me, d: -1 });
      }
      return [{ p: 1, fx, success: yes }];
    },
  },
  breakup: {
    name: 'Break up',
    kind: 'move',
    cost: 2,
    aim: 'one',
    targets: (ctx) => (P(ctx).partner >= 0 && ctx.c.members.includes(P(ctx).partner) ? [P(ctx).partner] : []),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: -4 });
      fx.energy.push({ id: ctx.me, d: -2 }, { id: t, d: -2 });
      // Their friends take their side, wherever they are.
      for (const f of closeFriendsOf(ctx.w, t)) if (f !== ctx.me) fx.bond.push({ a: ctx.me, b: f, d: -1 });
      return sure(fx);
    },
  },

  // Attacks ----------------------------------------------------------------------------------------
  tease: {
    name: 'Tease',
    kind: 'attack',
    cost: 1,
    aim: 'one',
    targets: (ctx) => others(ctx),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      if (bond(ctx.w, ctx.me, t) >= LEVEL.friendly) {
        fx.bond.push({ a: ctx.me, b: t, d: 1 });
        return [{ p: 1, fx, success: true }];
      }
      fx.bond.push({ a: ctx.me, b: t, d: -2 });
      fx.energy.push({ id: t, d: -1 });
      return [{ p: 1, fx, success: false }];
    },
  },
  putdown: {
    name: 'Put someone down',
    kind: 'attack',
    cost: 2,
    aim: 'one',
    mean: true,
    targets: (ctx) => others(ctx),
    // It always lands, and works at once. What it costs you comes later: standing up to you, and gossip.
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: BULLYING.victimBond });
      const N = P(ctx, t).personality.N;
      fx.energy.push({ id: t, d: N === 1 ? -3 : N === -1 ? 0 : -2 });
      for (const l of audience(ctx, true)) {
        if (l === t) continue;
        // The victim's Friends may or may not stand up for them, but they give the bully no boost.
        if (isFriend(ctx.w, l, t)) continue;
        // Everyone else is impressed, for now.
        fx.respect.push({ from: l, to: ctx.me, d: BULLYING.watchersRespect });
        if (backsBully(ctx.w, l, ctx.me, t)) fx.bond.push({ a: ctx.me, b: l, d: BULLYING.friendsBond, amongFriends: true });
      }
      return sure(fx);
    },
  },

  // Pushing back against meanness ------------------------------------------------------------------
  standup: {
    name: 'Stand up to them',
    kind: 'pushback',
    cost: 2,
    aim: 'one',
    // Whoever was just mean, or anyone here you know a fresh, true, mean story about.
    targets: (ctx) => {
      const mean = new Set(answering(ctx, ['putdown']));
      for (const id of P(ctx).stories) {
        const s = freshStory(ctx.w, id);
        if (s?.true && s.mean && s.actor !== ctx.me && ctx.c.members.includes(s.actor)) mean.add(s.actor);
      }
      return [...mean];
    },
    outcomes: (ctx, t) => {
      const works = noEffects();
      const fails = noEffects();
      works.bond.push({ a: ctx.me, b: t, d: BULLYING.standUpBond });
      fails.bond.push({ a: ctx.me, b: t, d: BULLYING.standUpBond });
      works.energy.push({ id: t, d: -2 });
      for (const l of audience(ctx, true)) {
        if (l === t) continue;
        works.bond.push({ a: t, b: l, d: BULLYING.shamedBond });
        works.respect.push({ from: l, to: t, d: BULLYING.shamedRespect }, { from: l, to: ctx.me, d: BULLYING.standUpRespect });
        fails.respect.push({ from: l, to: ctx.me, d: BULLYING.standUpFailRespect });
      }
      // Whoever they were just mean to is grateful either way.
      const victim = ctx.last?.card === 'putdown' && ctx.last.actor === t ? ctx.last.target : -1;
      if (victim >= 0 && victim !== ctx.me) for (const fx of [works, fails]) fx.bond.push({ a: ctx.me, b: victim, d: BULLYING.gratefulBond, deep: true });
      const p = standUpOdds(ctx, t);
      return [
        { p, fx: works, success: true },
        { p: 1 - p, fx: fails, success: false },
      ];
    },
  },

  // Shirt cards (other people's shirts hand you these) --------------------------------------------
  askshirt: {
    name: 'Ask about their shirt',
    kind: 'starter',
    cost: 0,
    aim: 'one',
    warm: true,
    targets: (ctx) => others(ctx).filter((t) => drawnBy(ctx.w, ctx.me, t)),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: 2 });
      return sure(fx);
    },
  },
  teaseshirt: {
    name: 'Tease their shirt',
    kind: 'attack',
    cost: 1,
    aim: 'one',
    targets: (ctx) => others(ctx).filter((t) => tempted(ctx.w, ctx.me, t)),
    outcomes: (ctx, t) => {
      const fx = noEffects();
      fx.bond.push({ a: ctx.me, b: t, d: -2 });
      fx.energy.push({ id: t, d: -1 });
      return [{ p: 1, fx, success: false }];
    },
  },
};

function inviteOutcomes(ctx: Ctx, t: number, needed: number, easyOut: boolean): Outcome[] {
  const yes = bond(ctx.w, ctx.me, t) >= needed;
  const fx = noEffects();
  if (yes) {
    if (!easyOut) fx.energy.push({ id: ctx.me, d: 1 });
    if (P(ctx).personality.C === -1) fx.energy.push({ id: ctx.me, d: 1 });
  } else if (!easyOut && others(ctx).length > 1) {
    fx.energy.push({ id: ctx.me, d: -1 });
    for (const l of others(ctx)) if (l !== t) fx.respect.push({ from: l, to: ctx.me, d: -1 });
  }
  return [{ p: 1, fx, success: yes }];
}

/** Whether `viewer` is drawn by `wearer`'s shirt: a funny tee if they value funny people, a fan tee if they love the thing. */
export function drawnBy(w: World, viewer: number, wearer: number): boolean {
  const v = w.people[viewer];
  const s = w.people[wearer].shirt;
  if (s.style === 'graphic') return v.personality.admires.includes('funny');
  if (s.style === 'fan' && s.topic !== null) return v.opinions[s.topic] >= 1;
  return false;
}

/** Whether `viewer` is tempted to tease `wearer`'s shirt: a funny tee if they're edgy, a fan tee if they hate the thing. */
export function tempted(w: World, viewer: number, wearer: number): boolean {
  const v = w.people[viewer];
  const s = w.people[wearer].shirt;
  if (s.style === 'graphic') return v.personality.A === -1;
  if (s.style === 'fan' && s.topic !== null) return v.opinions[s.topic] <= -1;
  return false;
}

/** Who a stand-up is for: whoever they just put down, or the victim in the latest mean story you know about them. */
function victimOf(ctx: Ctx, bully: number): number {
  if (ctx.last?.card === 'putdown' && ctx.last.actor === bully) return ctx.last.target;
  let latest: Story | null = null;
  for (const id of P(ctx).stories) {
    const s = freshStory(ctx.w, id);
    if (s?.true && s.mean && s.actor === bully && (!latest || s.id > latest.id)) latest = s;
  }
  return latest?.target ?? -1;
}

/**
 * The room decides: 3 in 6, +1 for each person here on your side, −1 for each on theirs. The victim is on
 * your side, and the bully's Friends are on theirs. The victim's Friends are never on the bully's side,
 * but only on yours if you're the victim or they like you more: being their friend doesn't mean
 * they'll speak up. Anyone else sides with whoever they like more. Between 1 in 6 and 5 in 6.
 */
export function standUpOdds(ctx: Ctx, t: number): number {
  let n: number = BULLYING.standUpStart;
  const victim = victimOf(ctx, t);
  for (const l of audience(ctx, true)) {
    if (l === t) continue;
    const likesMeMore = Math.sign(bond(ctx.w, l, ctx.me) - bond(ctx.w, l, t));
    if (l === victim) n++;
    else if (victim >= 0 && isFriend(ctx.w, l, victim)) n += ctx.me === victim ? 1 : Math.max(0, likesMeMore);
    else if (backsBully(ctx.w, l, t, victim)) n--;
    else n += likesMeMore;
  }
  return Math.min(BULLYING.standUpMax, Math.max(BULLYING.standUpMin, n)) / 6;
}

/**
 * A card's cost for this person, here, now (§7.2 trait cards; §8 rule 14). Outgoing: cards to the
 * table −1. Reserved: cards to a table of 4+ +1. Edgy: Tease, Push back and Brag −1. A teacher in the
 * room: attacks +2. A hoodie: teasing or putting down its wearer +1. Reported by a teacher: mean cards
 * +1 for a week.
 */
export function costOf(ctx: Ctx, key: string, target: number): number {
  const base = key.split(':')[0];
  const def = CARDS[base];
  const me = P(ctx);
  let cost = def.cost;
  if (def.aim === 'table' && cost > 0) {
    if (me.personality.E === 1) cost -= 1;
    if (me.personality.E === -1 && ctx.c.members.length >= 4) cost += 1;
  }
  if (me.personality.A === -1 && ['tease', 'push', 'brag', 'teaseshirt'].includes(base)) cost -= 1;
  if (def.kind === 'attack' && ctx.c.teacher) cost += 2;
  if ((base === 'tease' || base === 'putdown' || base === 'teaseshirt') && target >= 0 && ctx.w.people[target].shirt.style === 'hoodie') cost += 1;
  if ((def.mean || base === 'tease') && ctx.w.day < me.meanCostUntil) cost += 1;
  return Math.max(0, cost);
}

/**
 * Your collection: every card you own and how many copies (§7). Each copy can be used once a day.
 * Worked out fresh each day from who you are, so practicing, making friends and hearing stories all
 * change it.
 */
export function collection(w: World, id: number): Map<string, number> {
  const p = w.people[id];
  const T = p.personality;
  const out = new Map<string, number>();
  const add = (key: string, n: number) => n > 0 && out.set(key, (out.get(key) ?? 0) + n);
  add('ask', 1 + (T.E === 1 ? 1 : 0) + (T.O === 1 ? 1 : 0));
  add('share', 2);
  add('openup', 1);
  add('compliment', 1 + (T.A === 1 ? 1 : 0));
  const best = ABILITIES.reduce((b, a) => (p.abilities[a] > p.abilities[b] ? a : b), ABILITIES[0]);
  if (p.abilities[best] >= 3) {
    add(`help:${best}`, 1 + (p.abilities[best] >= 4 ? 1 : 0));
    add(`brag:${best}`, 1 + (p.abilities[best] >= 5 ? 1 : 0));
  }
  const strong = [...p.opinions.keys()].filter((t) => Math.abs(p.opinions[t]) === 2).slice(0, 3);
  for (const t of strong) add(`opinion:${t}:${Math.sign(p.opinions[t])}`, 1);
  for (const [i, level] of p.interests) add(`talk:${i}`, level);
  add('joke', 1 + Math.floor(p.abilities.humor / 2));
  add('tease', 1 + (T.A === -1 ? 1 : 0));
  add('putdown', 1);
  add('invite', 1);
  add('inviteout', 1);
  add('askout', 1);
  if (p.partner >= 0) add('breakup', 1);
  // A rumor you could make up about someone you can't stand (an Enemy, Bond −3 or lower), once a week.
  for (let o = 0; o < w.n && w.day - p.lastRumor >= 7; o++)
    if (o !== id && bond(w, id, o) <= -3) {
      add(`rumor:${o}`, 1);
      break;
    }
  for (const sid of p.stories) {
    const s = freshStory(w, sid);
    if (s) add(`story:${sid}`, 1);
  }
  // Responses: personality sets the mix.
  add('listen', 1 + (T.E === -1 ? 1 : 0) + (T.A === 1 ? 1 : 0));
  add('laugh', 1 + (T.A === 1 ? 1 : 0));
  add('answer', 1 + (T.O === 1 ? 1 : 0));
  add('same', 1 + (T.N === 1 ? 1 : 0));
  add('more', 1);
  add('agree', 1);
  add('push', 1 + (T.A === -1 ? 1 : 0));
  add('fake', 1 + (T.statusDrive === 2 ? 1 : 0));
  add('impressed', 1);
  add('teaseback', 1 + (T.A === -1 ? 1 : 0));
  add('thank', 1);
  add('standup', 1 + (T.A === 1 ? 1 : 0));
  // Other people's shirts hand you these (free, unlimited: they're about what's in front of you).
  add('askshirt', 1);
  add('teaseshirt', 1);
  // Practice earns extra copies.
  for (const [k, n] of p.earned) add(k, n);
  return out;
}

/** How many stories (true or made up) each person can tell a day: gossip happens, but not all day. */
export const TELLS_PER_DAY = 1;

/**
 * How many uses of a card someone has left today. Telling a story and spreading a rumor share one daily
 * budget, whichever story it is.
 */
export function usesLeft(w: World, id: number, owned: Map<string, number>, key: string): number {
  const used = w.people[id].used;
  if (key.startsWith('story:') || key.startsWith('rumor:')) {
    const told = [...used].reduce((t, [k, v]) => (k.startsWith('story:') || k.startsWith('rumor:') ? t + v : t), 0);
    if (told >= TELLS_PER_DAY) return 0;
  }
  if (key === 'openup' && w.people[id].openUpsThisWeek >= OPEN_UPS_PER_WEEK) return 0;
  return (owned.get(key) ?? 0) - (used.get(key) ?? 0);
}

export function cardName(key: string): string {
  return CARDS[key.split(':')[0]]?.name ?? key;
}
