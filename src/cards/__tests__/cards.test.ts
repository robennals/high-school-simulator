import { describe, expect, it } from 'vitest';
import { CARDS, collection, costOf, hearing, standUpOdds, usesLeft, type Ctx } from '../cards';
import { intimate, nextSpeaker, play, runConvo } from '../convo';
import { choose } from '../policy';
import { runSemester } from '../day';
import { LEVEL, OPEN_UPS_PER_WEEK, THREAD } from '../rules';
import { phrase, transcript } from '../lines';
import { recomputeStanding, weekly } from '../school';
import { THREADS } from '../threads.data';
import type { Exits, Thread } from '../threads';
import type { Convo, Play } from '../types';
import { applyEffects, bond, createWorld, noEffects } from '../world';

/** A small school with no prior friendships, so every Bond starts at 0. */
function school(students = 12, seed = 3) {
  const w = createWorld({ students, seed });
  w.bond.fill(0);
  w.met.fill(0);
  w.threads = []; // the rules on their own; threads have their own tests
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

  it('stops casual cards at 7 (the depth rule); deep cards go past it once both have opened up', () => {
    const w = school();
    w.openedUp.fill(0);
    set(w, 0, 1, 7);
    applyEffects(w, { bond: [{ a: 0, b: 1, d: 2 }], respect: [], energy: [] }, 0, [0, 1]);
    expect(bond(w, 0, 1)).toBe(7);
    const deep = () => applyEffects(w, { bond: [{ a: 0, b: 1, d: 2, deep: true }], respect: [], energy: [] }, 0, [0, 1]);
    deep();
    expect(bond(w, 0, 1)).toBe(7);
    w.openedUp[1] = 1; // one way isn't enough
    deep();
    expect(bond(w, 0, 1)).toBe(7);
    w.openedUp[w.n] = 1;
    deep();
    expect(bond(w, 0, 1)).toBe(9);
  });

  it('limits how often you can open up in a week', () => {
    const w = school();
    w.people[0].openUpsThisWeek = OPEN_UPS_PER_WEEK;
    expect(usesLeft(w, 0, collection(w, 0), 'openup')).toBe(0);
    weekly(w);
    expect(usesLeft(w, 0, collection(w, 0), 'openup')).toBe(1);
  });

  it('fades Friends who were apart all week, or went four weeks without a deep moment', () => {
    const w = school();
    w.day = 40;
    for (const [a, b] of [[0, 1], [2, 3], [4, 5]]) set(w, a, b, 9);
    const at = (a: number, b: number, contact: number, deep: number) => {
      w.contact[a * w.n + b] = contact;
      w.deepContact[a * w.n + b] = deep;
    };
    at(0, 1, 40, 35);
    at(2, 3, 30, 35);
    at(4, 5, 40, 5);
    weekly(w);
    expect([bond(w, 0, 1), bond(w, 2, 3), bond(w, 4, 5)]).toEqual([9, 8, 8]);
  });

  it('turns being turned down into an embarrassing story for those who were there', () => {
    const w = school();
    play(w, convo([0, 1, 2]), 0, 'askout', 1);
    const s = w.stories.find((x) => x.kind === 'turneddown')!;
    expect([s.actor, s.target, s.embarrassing]).toEqual([0, 1, true]);
    expect(w.people[2].stories.has(s.id)).toBe(true);
  });

  it('sets the record straight on Sunday once a rumor is found out', () => {
    const w = school();
    set(w, 0, 2, 3);
    w.stories.push({ id: 0, kind: 'rumor', actor: 1, target: -1, day: 0, true: false, mean: true, madeUpBy: 0, foundOut: true });
    w.people[2].stories.add(0);
    weekly(w);
    expect(bond(w, 0, 2)).toBe(2);
    expect(w.respect[2 * w.n + 0]).toBe(1); // the liar
    expect(w.respect[2 * w.n + 1]).toBe(3); // who it was about
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

  it('makes popularity friends plus people who respect you', () => {
    const w = school(10);
    w.respect.fill(2);
    set(w, 0, 1, LEVEL.friends); // 10 each
    for (let from = 3; from < 10; from++) w.respect[from * w.n + 2] = 3; // 7
    recomputeStanding(w);
    expect(w.standing[0]).toBe(5);
    expect(w.standing[1]).toBe(5);
    expect(w.standing[2]).toBe(4);
  });

  it('lets response cards be played only right after the line they answer', () => {
    const w = school();
    const c = convo([0, 1]);
    const ctx = (last: Convo['plays'][number] | null): Ctx => ({ w, c, me: 1, last });
    const respond = (last: Convo['plays'][number] | null) => CARDS.respond.targets(ctx(last), '');
    expect(respond(null)).toEqual([]);
    expect(respond({ card: 'ask', actor: 0, target: 2 })).toEqual([]); // not asked of you
    expect(respond({ card: 'ask', actor: 0, target: 1 })).toEqual([0]);
    expect(respond({ card: 'joke', actor: 0, target: -1, success: false })).toEqual([]);
    expect(respond({ card: 'joke', actor: 0, target: -1, success: true })).toEqual([0]);
    expect(respond({ card: 'respond', actor: 0, target: 1 })).toEqual([]);
    expect(respond({ card: 'respond', actor: 0, target: 1, personal: true })).toEqual([0]);
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
    expect(own.get('respond')).toBeGreaterThanOrEqual(1);
    expect(Object.keys(CARDS)).toHaveLength(17);
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
    expect(fx.bond).toEqual([{ a: 0, b: 9, d: 1 }, { a: 5, b: 9, d: -1, hearsay: true }]);
  });

  it('makes people side with their friend when they\'re closer to the subject than to the teller', () => {
    const w = school();
    set(w, 9, 0, 1);
    set(w, 9, 5, LEVEL.friends);
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

describe('bullying', () => {
  it('hurts the victim, and pleases only the bully\'s Friends who aren\'t theirs', () => {
    const w = school();
    for (const [a, b] of [[0, 2], [0, 3], [1, 3]]) set(w, a, b, LEVEL.friends);
    set(w, 0, 1, 3);
    set(w, 0, 4, 3);
    play(w, convo([0, 1, 2, 3, 4]), 0, 'putdown', 1);
    expect(bond(w, 0, 1)).toBe(-1);
    expect(bond(w, 0, 2)).toBe(LEVEL.friends + 1);
    expect(bond(w, 0, 3)).toBe(LEVEL.friends - 1); // taking sides
    expect(bond(w, 0, 4)).toBe(3);
    expect(bond(w, 1, 3)).toBe(LEVEL.friends);
    expect([2, 3, 4].map((l) => w.respect[l * w.n])).toEqual([4, 2, 4]); // an immediate win, but no boost from the victim's friends
  });

  it('has a friend of both believe the gossip and never back the bully, without always backing a stand-up', () => {
    const w = school();
    for (const [a, b] of [[0, 3], [1, 3]]) set(w, a, b, LEVEL.close);
    const s = { id: -1, kind: 'putdown' as const, actor: 0, target: 1, day: 0, true: true, mean: true };
    expect(hearing(w, s, 2, 3).verdict).toBe('believed');
    expect(hearing(w, s, 2, 3).fx.respect).toEqual([{ from: 3, to: 0, d: -1 }]);
    const c = convo([0, 1, 2, 3]);
    play(w, c, 0, 'putdown', 1);
    const last = c.plays[0];
    expect(standUpOdds({ w, c, me: 2, last }, 0)).toBe(4 / 6); // only the victim backs a near-stranger
    expect(standUpOdds({ w, c, me: 1, last }, 0)).toBe(4 / 6); // the friend backs the victim themselves
  });

  it('lets anyone who saw it stand up to the bully, with odds set by who the room likes', () => {
    const w = school();
    const c = convo([0, 1, 2, 3]);
    play(w, c, 0, 'putdown', 1);
    const ctx: Ctx = { w, c, me: 2, last: c.plays[0] };
    expect(CARDS.standup.targets(ctx, '')).toEqual([0]);
    set(w, 1, 2, 2);
    set(w, 3, 2, 2);
    expect(standUpOdds(ctx, 0)).toBe(5 / 6);
    set(w, 3, 0, 5);
    expect(standUpOdds(ctx, 0)).toBe(3 / 6); // the victim for, 3 against
    const [works, fails] = CARDS.standup.outcomes(ctx, 0, '');
    expect(works.fx.respect).toContainEqual({ from: 3, to: 0, d: -2 });
    expect(works.fx.bond).toContainEqual({ a: 0, b: 3, d: -2 });
    expect(fails.fx.respect).toContainEqual({ from: 3, to: 2, d: -1 });
  });

  it('lets standing up to a put-down go before the bully can talk on', () => {
    const w = school();
    set(w, 0, 3, 11); // the bully would otherwise win the floor
    const c = convo([0, 1, 2, 3]);
    const intent = (key: string, urgency: 1 | 2) => ({ key, urgency, target: 0, cost: 0, score: 1 });
    const intents = new Map([[0, intent('talk:anime', 2)], [2, intent('standup', 1)]]);
    expect(nextSpeaker(w, c, [0, 2], intents)).toBe(0);
    play(w, c, 0, 'putdown', 1);
    expect(nextSpeaker(w, c, [0, 2], intents)).toBe(2);
  });

  it('lets whoever was spoken to answer, and nobody go twice in a row while someone else wants to', () => {
    const w = school();
    set(w, 0, 3, 11); // 0 and 3 are who the table likes
    set(w, 1, 2, 1);
    const c = convo([0, 1, 2, 3]);
    const intent = (key: string, urgency: 1 | 2) => ({ key, urgency, target: 0, cost: 0, score: 1 });
    const intents = new Map([[0, intent('ask', 2)], [1, intent('respond', 1)], [2, intent('talk:anime', 1)], [3, intent('joke', 2)]]);
    c.plays.push({ card: 'ask', actor: 0, target: 1 });
    expect(nextSpeaker(w, c, [0, 1, 2, 3], intents)).toBe(1);
    expect(nextSpeaker(w, c, [0, 2], intents)).toBe(2);
    expect(nextSpeaker(w, c, [0], intents)).toBe(0);
  });

  it('lets the victim tell the story, and hearsay is not a first impression', () => {
    const w = school();
    play(w, convo([0, 1]), 0, 'putdown', 1);
    const c = convo([1, 5]);
    expect(CARDS.story.targets({ w, c, me: 1, last: null }, '0')).toEqual([]); // word takes a week to get around
    w.day = 7;
    expect(CARDS.story.targets({ w, c, me: 1, last: null }, '0')).toEqual([-1]);
    play(w, c, 1, 'story:0', -1);
    expect(bond(w, 0, 5)).toBe(-1); // not doubled
    expect(w.met[5]).toBe(0);
  });
});

describe('what people say', () => {
  it('has words for every card', () => {
    const w = school();
    w.stories.push({ id: 0, kind: 'putdown', actor: 4, target: 5, day: 0, true: true, mean: true });
    const extra: Record<string, Partial<Play>> = {
      talk: { target: -1, interest: 'anime' },
      opinion: { target: -1, topic: 4, stance: 1 },
      help: { ability: 'tech' },
      brag: { target: -1, ability: 'arts' },
      joke: { target: -1 },
      story: { target: -1, storyId: 0 },
    };
    for (const card of Object.keys(CARDS)) {
      const before: Play[] = card === 'respond' ? [{ card: 'compliment', actor: 1, target: 0 }] : [];
      const said = phrase(w, convo([0, 1, 2]), before, [], { card, actor: 0, target: 1, ...extra[card] });
      expect(said.text, card).toMatch(/^[^{}]+$/);
    }
  });

  it('answers the question that was asked', () => {
    const w = school();
    w.people[1].shirt = { style: 'plain', topic: null };
    const c = convo([0, 1]);
    play(w, c, 0, 'ask', 1);
    play(w, c, 1, 'respond', 0);
    const [question, answer] = transcript(w, c);
    expect(question.text).toMatch(/\?$/);
    expect(answer.template).not.toMatch(/^(Yeah, pretty much|Ha, yeah. Kind of|I think so, yeah)/);
  });

  it('ends a heart-to-heart after three beats', () => {
    const w = school();
    set(w, 0, 1, 5);
    const c = convo([0, 1]);
    play(w, c, 0, 'openup', 1);
    play(w, c, 1, 'respond', 0);
    expect(CARDS.respond.targets({ w, c, me: 0, last: c.plays[1] }, '')).toEqual([1]);
    play(w, c, 0, 'respond', 1);
    expect(CARDS.respond.targets({ w, c, me: 1, last: c.plays[2] }, '')).toEqual([]);
  });

  it('has real conversations with no holes or repeats, without rolling the dice', () => {
    const w = createWorld({ students: 60, seed: 4 });
    runSemester(w, 3);
    for (let i = 0; i < 80; i++) {
      for (const p of w.people) p.energy = 10;
      const c = runConvo(w, w.rng.shuffle(w.people.map((p) => p.id)).slice(0, 4), [], 10);
      const peek = () => JSON.stringify(w.rng);
      const dice = peek();
      const lines = transcript(w, c);
      expect(peek()).toBe(dice);
      for (const [j, line] of lines.entries()) {
        expect(line.text).not.toMatch(/[{}]|undefined|\bthe the\b/i);
        if (j) expect(line.text).not.toBe(lines[j - 1].text);
      }
    }
  });
});

describe('conversations follow on', () => {
  /** Two people who like each other, with nothing on their shirts to change the subject. */
  function pair(seed: number) {
    const w = school(12, seed);
    set(w, 0, 1, 5);
    for (const p of w.people) p.shirt = { style: 'plain', topic: null };
    return { w, c: convo([0, 1]) };
  }

  it('keeps to soccer: talk, a reply that closes, then a tease about it', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const { w, c } = pair(seed);
      w.day = seed; // a different line each time
      play(w, c, 0, 'talk:soccer', -1);
      play(w, c, 1, 'respond', 0);
      play(w, c, 0, 'tease', 1);
      const [opener, reply, tease] = transcript(w, c);
      expect(opener.text).not.toContain('?'); // nothing the reply could fail to answer
      expect(reply.text).not.toContain('?'); // nobody gets a turn to answer it
      expect(tease.text).toMatch(/soccer/i);
    }
  });

  it('answers a question first, whatever card is played next', () => {
    for (const card of ['talk:anime', 'joke', 'tease']) {
      const { w, c } = pair(3);
      play(w, c, 0, 'ask', 1);
      play(w, c, 1, card, card === 'tease' ? 0 : -1);
      const line = transcript(w, c)[1];
      // A joke can be the answer; anything else answers first, then says its piece.
      if (card === 'joke') expect(line.text).toMatch(/classified|confirm nor deny|my lawyer/);
      else expect(line.lead, card).toBeTruthy();
    }
  });

  it('owns up to a change of subject', () => {
    const { w, c } = pair(4);
    play(w, c, 0, 'talk:soccer', -1);
    play(w, c, 1, 'respond', 0);
    play(w, c, 0, 'opinion:4:1', -1);
    expect(transcript(w, c)[2].lead).toBeTruthy();
  });

  it('never leaves someone who was asked sitting silent', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { w, c } = pair(seed);
      play(w, c, 0, 'ask', 1);
      w.people[1].energy = 0;
      w.people[1].personality.E = -1;
      set(w, 0, 1, -4); // they'd rather not
      expect(choose({ w, c, me: 1, last: c.plays[0] }, collection(w, 1)).urgency).toBeGreaterThan(0);
    }
  });

  it('gives whoever was asked or offered help the next word, in real conversations', () => {
    const w = createWorld({ students: 60, seed: 8 });
    runSemester(w, 3);
    for (let i = 0; i < 100; i++) {
      for (const p of w.people) {
        p.energy = 10;
        p.used.clear();
      }
      const c = runConvo(w, w.rng.shuffle(w.people.map((p) => p.id)).slice(0, 4), [], 10);
      const lines = transcript(w, c);
      for (const [j, play] of c.plays.entries()) {
        const next = c.plays[j + 1];
        if (play.card === 'respond' && lines[j].text.includes('?')) {
          // Only a thread asks, and then its owner answers it, then or with their reaction.
          expect(play.thread, lines[j].text).toBeDefined();
          if (!lines[j].answer) expect(next?.actor, lines[j].text).toBe(play.thread?.owner);
        }
        if (next && (play.card === 'ask' || play.card === 'help')) expect(next.actor, lines[j].text).toBe(play.target);
      }
    }
  });
});

describe('threads', () => {
  const exits = (n: number): Exits => ({
    wrap: { line: `wrap ${n}`, reaction: `thanks ${n}` },
    misses: [
      { kind: 'aboutMe', line: `me ${n}`, reaction: `oh ${n}` },
      { kind: 'fix', line: `advice ${n}`, reaction: `okay ${n}` },
    ],
  });
  const thread: Thread = {
    id: 'test',
    entry: { card: 'talk', interest: 'soccer' },
    facts: 'for tests',
    turns: ['turn 0', 'turn 1?', 'turn 2', 'turn 3?', 'turn 4', 'turn 5', 'turn 6'],
    choices: { 1: exits(1), 3: exits(3), 5: exits(5) },
    tooSoon: { 3: 'not yet 3', 5: 'not yet 5' },
  };
  /** 0 brings up soccer to 1, who has this much Bond with them. */
  function started(start: number, others: number[] = []) {
    const w = school();
    w.threads = [thread];
    set(w, 0, 1, start);
    const c = convo([0, 1, ...others]);
    play(w, c, 0, 'talk:soccer', -1);
    set(w, 0, 1, start); // whatever the opener did
    return { w, c };
  }
  const goOn = (w: ReturnType<typeof school>, c: Convo, turns: number) => {
    for (let t = 1; t <= turns; t++) play(w, c, t % 2 ? 1 : 0, 'respond', t % 2 ? 0 : 1);
  };

  it('pays more the deeper it goes, and a whole thread can make you Friends', () => {
    const { w, c } = started(3);
    goOn(w, c, 6);
    expect(c.plays.map((p) => p.thread?.move)).toEqual(Array(7).fill('on'));
    expect(transcript(w, c).map((s) => s.text.toLowerCase())).toEqual(thread.turns);
    expect(bond(w, 0, 1)).toBe(3 + THREAD.turnBond.reduce<number>((a, b) => a + b, 0));
    expect(bond(w, 0, 1)).toBeGreaterThanOrEqual(LEVEL.friends);
    expect(c.thread).toBeUndefined();
  });

  it('can\'t get round opening up once a week', () => {
    const { w, c } = started(5);
    for (const p of w.people) p.openUpsThisWeek = OPEN_UPS_PER_WEEK;
    goOn(w, c, 4);
    set(w, 0, 1, THREAD.needsBond[5]); // close enough to go on
    play(w, c, 1, 'respond', 0);
    play(w, c, 0, 'respond', 1);
    expect(c.plays.at(-1)?.thread).toMatchObject({ turn: 6, move: 'on' }); // the conversation still happens
    expect(bond(w, 0, 1)).toBe(7);
    expect(w.openedUp[1] + w.openedUp[w.n]).toBe(0);
  });

  it('is too soon without the Bond for it, and you can try again another day', () => {
    const { w, c } = started(0);
    goOn(w, c, 2);
    set(w, 0, 1, THREAD.needsBond[3] - 1);
    play(w, c, 1, 'respond', 0);
    expect(c.plays.at(-1)?.thread?.move).toBe('tooSoon');
    expect(transcript(w, c).at(-1)?.answer?.text).toBe('not yet 3');
    expect(bond(w, 0, 1)).toBe(THREAD.needsBond[3] - 1 + THREAD.tooSoonBond);
    expect(w.threadsHeard.size).toBe(0);
  });

  it('can be wrapped up kindly, or broken with a miss, and gets a reaction either way', () => {
    for (const [arg, d, reaction] of [
      ['wrap', THREAD.wrapBond, 'thanks 1'],
      ['miss:0', THREAD.missBond[1], 'oh 1'],
    ] as const) {
      const { w, c } = started(5);
      play(w, c, 1, `respond:${arg}`, 0);
      expect(bond(w, 0, 1)).toBe(5 + d);
      expect(transcript(w, c)[1].answer).toEqual({ speaker: 0, text: reaction });
      expect(c.thread).toBeUndefined();
      expect(w.threadsHeard.size).toBe(1); // once each
    }
  });

  it('offers the four lines only to whoever it is waiting on', () => {
    const { w, c } = started(5, [2]);
    const lines = (me: number) => ['', 'wrap', 'miss:0', 'miss:1'].map((arg) => CARDS.respond.targets({ w, c, me, last: c.plays.at(-1)! }, arg).length);
    expect(lines(1)).toEqual([1, 1, 1, 1]);
    expect(lines(2)).toEqual([1, 1, 1, 1]); // anyone can take it up
    play(w, c, 1, 'respond', 0);
    expect(lines(2)).toEqual([0, 0, 0, 0]); // then it's theirs
    expect(lines(0)).toEqual([1, 0, 0, 0]); // and the owner answers
  });

  it('answers first when the owner leaves it for another card', () => {
    const { w, c } = started(5);
    play(w, c, 1, 'respond', 0);
    play(w, c, 0, 'joke', -1);
    expect(transcript(w, c)[2].lead?.toLowerCase()).toContain('turn 2');
    expect(c.thread).toBeUndefined();
  });

  it('starts from a question, with the person asked as the owner', () => {
    const w = school();
    w.threads = [{ ...thread, entry: { card: 'ask', question: 'How’s it going?' } }];
    const c = convo([0, 1]);
    play(w, c, 1, 'ask', 0);
    play(w, c, 0, 'respond', 1);
    expect(transcript(w, c).map((s) => s.text.toLowerCase())).toEqual(['how’s it going?', 'turn 0']);
    expect(w.knows[1 * w.n + 0]).toBe(1);
  });
});

describe('the canned threads', () => {
  it('follow the writing rules that can be checked', () => {
    expect(new Set(THREADS.map((t) => t.id)).size).toBe(THREADS.length);
    for (const t of THREADS) {
      const all = [1, 3, 5] as const;
      const misses = all.flatMap((n) => t.choices[n].misses);
      const closing = [
        ...[0, 2, 4, 6].map((n) => t.turns[n]),
        ...all.flatMap((n) => [t.choices[n].wrap.line, t.choices[n].wrap.reaction]),
        ...misses.map((m) => m.reaction),
        t.tooSoon[3],
        t.tooSoon[5],
      ];
      for (const line of closing) expect(line, `${t.id}: nobody gets to answer this`).not.toContain('?');
      for (const line of [...t.turns, ...closing, ...misses.map((m) => m.line)]) {
        expect(line, t.id).toMatch(/^[^{}]+$/);
        expect(line.split(/\s+/).length, `${t.id}: ${line}`).toBeLessThanOrEqual(22);
        expect(line, t.id).not.toMatch(/\b(maths|mum|timetable|gutted|revision)\b/i);
      }
      if (t.entry.card === 'ask') expect(t.entry.question, t.id).toMatch(/\?$/);
    }
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
