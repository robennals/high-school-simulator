import { describe, expect, it } from 'vitest';
import { CARDS, collection, costOf, hearing, type Ctx } from '../cards';
import { intimate, play, runConvo } from '../convo';
import { runSemester } from '../day';
import { LEVEL } from '../rules';
import { weekly } from '../school';
import type { Convo } from '../types';
import { applyEffects, bond, createWorld, noEffects } from '../world';

/** A small school with no prior friendships, so every Bond starts at 0. */
function school(students = 12, seed = 3) {
  const w = createWorld({ students, seed });
  w.bond.fill(0);
  w.met.fill(0);
  return w;
}

function convo(members: number[], extra: Partial<Convo> = {}): Convo {
  return { members, onlookers: [], private: false, teacher: false, plays: [], ...extra };
}

const set = (w: ReturnType<typeof school>, a: number, b: number, v: number) => {
  w.bond[a * w.n + b] = v;
  w.bond[b * w.n + a] = v;
  w.met[a * w.n + b] = w.met[b * w.n + a] = 1;
};

describe('the printed rules', () => {
  it('counts first impressions double', () => {
    const w = school();
    // Make the two look different and of different genders, so only the doubling applies.
    w.people[0].look = 'sporty';
    w.people[1].look = 'techy';
    w.people[0].gender = 'boy';
    w.people[1].gender = 'girl';
    w.people[0].abilities.style = 0;
    const fx = noEffects();
    fx.bond.push({ a: 0, b: 1, d: 1 });
    applyEffects(w, fx, 0, [0, 1]);
    expect(bond(w, 0, 1)).toBe(2);
    applyEffects(w, fx, 0, [0, 1]);
    expect(bond(w, 0, 1)).toBe(3);
  });

  it('stops casual cards at 7 (the depth rule); deep cards go past it', () => {
    const w = school();
    set(w, 0, 1, 7);
    applyEffects(w, { bond: [{ a: 0, b: 1, d: 2 }], respect: [], energy: [] }, 0, [0, 1]);
    expect(bond(w, 0, 1)).toBe(7);
    applyEffects(w, { bond: [{ a: 0, b: 1, d: 2, deep: true }], respect: [], energy: [] }, 0, [0, 1]);
    expect(bond(w, 0, 1)).toBe(9);
  });

  it('makes friends take sides: hurting someone costs you Bond with their Friends who are there', () => {
    const w = school();
    set(w, 0, 1, 0);
    set(w, 1, 2, LEVEL.friends);
    set(w, 0, 2, 3);
    applyEffects(w, { bond: [{ a: 0, b: 1, d: -2 }], respect: [], energy: [] }, 0, [0, 1, 2]);
    expect(bond(w, 0, 1)).toBe(-2);
    expect(bond(w, 0, 2)).toBe(2);
  });

  it('only counts deep cards as deep in private, one-on-one, or among Friends', () => {
    const w = school();
    expect(intimate(w, convo([0, 1]))).toBe(true);
    expect(intimate(w, convo([0, 1, 2]))).toBe(false);
    expect(intimate(w, convo([0, 1, 2], { private: true }))).toBe(true);
    for (const [a, b] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ])
      set(w, a, b, LEVEL.friends);
    expect(intimate(w, convo([0, 1, 2]))).toBe(true);
  });

  it('catches people saying opposite things to the same person', () => {
    const w = school();
    const c = convo([0, 1]);
    set(w, 0, 1, 4);
    play(w, c, 0, 'opinion:3:1', -1);
    const before = bond(w, 0, 1);
    play(w, c, 0, 'opinion:3:-1', -1);
    // −2 for being two-faced, plus or minus 1 for the opinion itself.
    expect(bond(w, 0, 1)).toBeLessThanOrEqual(before - 1);
    expect(w.tally.get('twoFacedCaught')).toBe(1);
  });

  it('drops someone a Standing step when three people push back on them in a week', () => {
    const w = school();
    w.standing[5] = 4;
    w.week.pushback.set(5, new Set([1, 2, 3]));
    weekly(w);
    // Standing is recomputed first, then the step down is applied.
    expect(w.tally.get('stoodTogether')).toBe(1);
    expect(w.people[5].meanCostUntil).toBeGreaterThan(w.day);
  });

  it('lets response cards be played only right after the line they answer', () => {
    const w = school();
    const c = convo([0, 1]);
    const ctx = (last: Convo['plays'][number] | null): Ctx => ({ w, c, me: 1, last });
    expect(CARDS.laugh.targets(ctx(null), '')).toEqual([]);
    expect(CARDS.laugh.targets(ctx({ card: 'share', actor: 0, target: 1 }), '')).toEqual([]);
    expect(CARDS.laugh.targets(ctx({ card: 'joke', actor: 0, target: -1, success: true }), '')).toEqual([0]);
  });

  it('makes cards to the table cheaper for outgoing people and dearer for reserved people in a crowd', () => {
    const w = school();
    const c = convo([0, 1, 2, 3]);
    const ctx: Ctx = { w, c, me: 0, last: null };
    w.people[0].personality.E = 1;
    expect(costOf(ctx, 'joke', -1)).toBe(1);
    w.people[0].personality.E = -1;
    expect(costOf(ctx, 'joke', -1)).toBe(3);
  });

  it('builds a collection from who you are, with responses in it', () => {
    const w = school();
    const own = collection(w, 0);
    expect(own.get('ask')).toBeGreaterThanOrEqual(1);
    expect(own.get('laugh')).toBeGreaterThanOrEqual(1);
    expect(own.get('openup')).toBe(1);
  });
});

describe('gossip', () => {
  const story = (about: number, isTrue: boolean) => ({ id: -1, kind: isTrue ? ('putdown' as const) : ('rumor' as const), actor: about, target: -1, day: 0, true: isTrue, mean: true });

  it('is believed by people who aren\'t closer to its subject than to the teller', () => {
    const w = school();
    set(w, 9, 0, 3); // listener 9 likes teller 0 more than subject 5
    set(w, 9, 5, 1);
    const { verdict, fx } = hearing(w, story(5, true), 0, 9);
    expect(verdict).toBe('believed');
    expect(fx.respect).toEqual([{ from: 9, to: 5, d: -1 }]);
  });

  it('makes people side with their friend when they\'re closer to the subject than to the teller', () => {
    const w = school();
    set(w, 9, 0, 1);
    set(w, 9, 5, 6);
    const { verdict, fx } = hearing(w, story(5, true), 0, 9);
    expect(verdict).toBe('loyal');
    expect(fx.respect).toEqual([]);
    expect(fx.bond).toEqual([{ a: 0, b: 9, d: -1 }]);
  });

  it('gets a rumor found out by the subject\'s friends, who turn on whoever told them', () => {
    const w = school();
    set(w, 9, 5, LEVEL.friends);
    set(w, 9, 0, LEVEL.friends + 2); // even if they like the teller more
    const { verdict, fx } = hearing(w, story(5, false), 0, 9);
    expect(verdict).toBe('false');
    expect(fx.bond).toEqual([{ a: 0, b: 9, d: -2 }]);
  });
});

describe('a semester under the card rules', () => {
  it('runs, is reproducible, and makes friendships', () => {
    const run = () => {
      const w = createWorld({ students: 60, seed: 9 });
      runSemester(w, 3);
      return w;
    };
    const a = run();
    const b = run();
    expect([...a.bond]).toEqual([...b.bond]);
    expect(a.people.some((p) => a.people.some((q) => q.id !== p.id && bond(a, p.id, q.id) >= LEVEL.friends))).toBe(true);
    // A conversation between strangers still happens.
    expect(runConvo(a, [0, 1], [], 2).members).toEqual([0, 1]);
  });
});
