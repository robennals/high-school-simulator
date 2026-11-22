/**
 * The rules of the school that run between conversations (spec §8): Bonds fading, couples' upkeep,
 * Standing, trying too hard, opinions drifting, and the weekly clean-up.
 */
import { endCouple } from './convo';
import { CLOSE_FADE_AFTER_DAYS, COUPLE_MIN_BOND, FADE_AFTER_DAYS, FRIEND_FADE_AFTER_DAYS, LEVEL, POPULARITY_PER_FRIEND, RESPECTS, STANDING_LEVELS, TRYING_TOO_HARD } from './rules';
import type { World } from './types';
import { applyEffects, bond, count, friendsOf, isFriend, noEffects } from './world';

/** Everything that happens on Sunday night. */
export function weekly(w: World) {
  fade(w);
  setRecordStraight(w);
  coupleUpkeep(w);
  recomputeStanding(w);
  tryingTooHard(w);
  driftOpinions(w);
  for (const p of w.people) {
    p.gossipThisWeek = 0;
    p.openUpsThisWeek = 0;
    for (const [d, until] of p.favors) if (until < w.day) p.favors.delete(d);
  }
  w.week = { warm: new Uint8Array(w.n * w.n), coupleTime: new Map() };
  w.standingHistory.push(w.standing.slice());
  if (w.standingHistory.length === 4) w.friendsWeek4 = Uint8Array.from(w.bond, (v) => (v >= LEVEL.friends ? 1 : 0));
}

/**
 * Rule 3, fading: any Bond of 4+ drops by 1 if the two weren't in a conversation (or at a lunch table)
 * together this week. Friends (8–11) also drop by 1 without a deep moment in four weeks. Close friends
 * (12+) slip by 1 without one in three weeks, as far as 11. A Loyal person's Close friends don't slip.
 */
function fade(w: World) {
  const n = w.n;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const v = w.bond[a * n + b];
      if (v < LEVEL.friendly) continue;
      const apart = w.day - w.contact[a * n + b] > FADE_AFTER_DAYS;
      const loyal = w.people[a].personality.O === -1 || w.people[b].personality.O === -1;
      const shallow = v >= LEVEL.close && w.day - w.deepContact[a * n + b] > CLOSE_FADE_AFTER_DAYS && !loyal;
      const friendShallow = v >= LEVEL.friends && v < LEVEL.close && w.day - w.deepContact[a * n + b] > FRIEND_FADE_AFTER_DAYS;
      const next = apart || friendShallow ? v - 1 : shallow ? Math.max(LEVEL.close - 1, v - 1) : v;
      w.bond[a * n + b] = next;
      w.bond[b * n + a] = next;
    }
}

/**
 * Rumors usually backfire: once anyone has found a rumor out, by Sunday everyone who heard it learns it
 * was a lie. The person it was about gets their Respect back, and whoever made it up loses Bond and
 * Respect with each of them.
 */
function setRecordStraight(w: World) {
  const fx = noEffects();
  for (const s of w.stories) {
    if (s.kind !== 'rumor' || !s.foundOut || s.corrected || s.madeUpBy === undefined) continue;
    s.corrected = true;
    const liar = s.madeUpBy;
    for (const p of w.people) {
      if (!p.stories.has(s.id) || p.id === liar || p.id === s.actor) continue;
      fx.respect.push({ from: p.id, to: s.actor, d: 1 }, { from: p.id, to: liar, d: -1 });
      fx.bond.push({ a: liar, b: p.id, d: -1 });
    }
    count(w, 'recordsSetStraight');
  }
  applyEffects(w, fx, -1, []);
}

/** Couples need to play two cards to each other (or hang out) a week, or their Bond −1; below 8, they break up. */
function coupleUpkeep(w: World) {
  for (const p of w.people) {
    if (p.partner < p.id) continue; // each couple once
    const time = (w.week.coupleTime.get(p.id) ?? 0) + (w.week.coupleTime.get(p.partner) ?? 0);
    const fx = noEffects();
    if (time < 2) fx.bond.push({ a: p.id, b: p.partner, d: -1 });
    applyEffects(w, fx, -1, []);
    if (bond(w, p.id, p.partner) < COUPLE_MIN_BOND) endCouple(w, p.id, null);
  }
}

/** Popularity (Standing): 10 for each Friend, 1 for each person who respects you (3+), ranked into fifths. */
export function recomputeStanding(w: World) {
  const n = w.n;
  const score = new Float64Array(n);
  for (let from = 0; from < n; from++)
    for (let to = 0; to < n; to++) {
      if (to === from) continue;
      if (isFriend(w, from, to)) score[to] += POPULARITY_PER_FRIEND;
      if (w.respect[from * n + to] >= RESPECTS) score[to] += 1;
    }
  const order = [...score.keys()].sort((a, b) => score[a] - score[b]);
  order.forEach((id, rank) => (w.standing[id] = 1 + Math.floor((rank * STANDING_LEVELS) / n)));
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
