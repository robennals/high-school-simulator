/**
 * The rules of the school that run between conversations (spec §8): Bonds fading, couples' upkeep,
 * Standing, standing together, trying too hard, opinions drifting, and the weekly clean-up.
 */
import { endCouple } from './convo';
import { CLOSE_FADE_AFTER_DAYS, COUPLE_MIN_BOND, FADE_AFTER_DAYS, FRIEND_FADE_AFTER_DAYS, LEVEL, STANDING_LEVELS, STANDING_TOGETHER, TRYING_TOO_HARD } from './rules';
import type { World } from './types';
import { applyEffects, bond, count, friendsOf, noEffects } from './world';

/** Everything that happens on Sunday night. */
export function weekly(w: World) {
  fade(w);
  coupleUpkeep(w);
  recomputeStanding(w);
  standingTogether(w);
  tryingTooHard(w);
  driftOpinions(w);
  for (const p of w.people) {
    p.gossipThisWeek = 0;
    for (const [d, until] of p.favors) if (until < w.day) p.favors.delete(d);
  }
  w.week = { warm: new Uint8Array(w.n * w.n), pushback: new Map(), coupleTime: new Map() };
  w.standingHistory.push(w.standing.slice());
}

/**
 * Rule 3, fading: a Friendly Bond (4–7) drops by 1 if the two didn't play a card to each other this
 * week. Friends and Close friends (8+) need deep time together — without a deep moment in the last
 * two weeks (Friends) or three weeks (Close friends), they drop by 1. A Loyal person's Close friends don't fade.
 */
function fade(w: World) {
  const n = w.n;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const v = w.bond[a * n + b];
      if (v < LEVEL.friendly) continue;
      let fades: boolean;
      if (v < LEVEL.friends) fades = w.day - w.contact[a * n + b] > FADE_AFTER_DAYS;
      else if (v < LEVEL.close) fades = w.day - w.deepContact[a * n + b] > FRIEND_FADE_AFTER_DAYS;
      else fades = w.day - w.deepContact[a * n + b] > CLOSE_FADE_AFTER_DAYS && w.people[a].personality.O !== -1 && w.people[b].personality.O !== -1;
      if (fades) {
        w.bond[a * n + b] = v - 1;
        w.bond[b * n + a] = v - 1;
      }
    }
}

/** Couples need two deep cards or a hangout a week, or their Bond −2; below 8, they break up. */
function coupleUpkeep(w: World) {
  for (const p of w.people) {
    if (p.partner < p.id) continue; // each couple once
    const time = (w.week.coupleTime.get(p.id) ?? 0) + (w.week.coupleTime.get(p.partner) ?? 0);
    const fx = noEffects();
    if (time < 2) fx.bond.push({ a: p.id, b: p.partner, d: -2 });
    applyEffects(w, fx, -1, []);
    if (bond(w, p.id, p.partner) < COUPLE_MIN_BOND) endCouple(w, p.id, null);
  }
}

/**
 * Standing (§3): everyone's Respect, weighted by the Standing of the people giving it (Respect from
 * someone higher up counts for more), ranked and split into fifths.
 */
export function recomputeStanding(w: World) {
  const n = w.n;
  const score = new Float64Array(n);
  for (let from = 0; from < n; from++) {
    const weight = 1 + 0.25 * (w.standing[from] - 3);
    for (let to = 0; to < n; to++) if (to !== from) score[to] += w.respect[from * n + to] * weight;
  }
  const order = [...score.keys()].sort((a, b) => score[a] - score[b]);
  order.forEach((id, rank) => (w.standing[id] = 1 + Math.floor((rank * STANDING_LEVELS) / n)));
}

/** Rule 14: three or more people pushing back on someone in a week drops them a step. */
function standingTogether(w: World) {
  for (const [target, by] of w.week.pushback) {
    if (by.size < STANDING_TOGETHER) continue;
    w.standing[target] = Math.max(1, w.standing[target] - 1);
    w.people[target].meanCostUntil = w.day + 7;
    count(w, 'stoodTogether');
  }
}

/** Rule 13: three warm cards at someone higher up, with nothing back, costs 1 of their Respect. */
function tryingTooHard(w: World) {
  const n = w.n;
  const fx = noEffects();
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      if (w.week.warm[a * n + b] >= TRYING_TOO_HARD && w.week.warm[b * n + a] === 0 && w.standing[b] > w.standing[a]) {
        fx.respect.push({ from: b, to: a, d: -1 });
        count(w, 'tryingTooHard');
      }
    }
  applyEffects(w, fx, -1, []);
}

/** Rule 9: each opinion moves one step toward what most of a person's Friends say. */
function driftOpinions(w: World) {
  const shifts: [number, number, number][] = [];
  for (const p of w.people) {
    const friends = friendsOf(w, p.id);
    if (friends.length < 2) continue;
    for (let t = 0; t < p.opinions.length; t++) {
      let lean = 0;
      for (const f of friends) lean += Math.sign(w.people[f].opinions[t]);
      if (Math.abs(lean) * 2 > friends.length) {
        const dir = Math.sign(lean);
        if (p.opinions[t] !== 2 * dir) shifts.push([p.id, t, dir]);
      }
    }
  }
  for (const [id, t, dir] of shifts) w.people[id].opinions[t] = Math.max(-2, Math.min(2, w.people[id].opinions[t] + dir));
}
