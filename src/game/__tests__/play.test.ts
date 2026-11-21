import { describe, expect, it } from 'vitest';
import { openPlayerConversation, othersTakeTurns, playerAnswers, playerPlays } from '../../sim/conversation';
import { afternoon, askToWalkWith, isGrounded, classmates, closeFriendsOf, endDay, finishHallway, finishLunch, isAbsent, isSchoolDay, morningClasses, playerClassNeighbors, seatHallway, morning, playerSitsAlone, playerTriesTable, seatLunch, startDay, weekendDay } from '../../sim/day';
import { createWorld } from '../../sim/generate';
import type { Act, EveningChoice, PlayerSetup } from '../../sim/types';
import { addEnergy, buildDeck, cardCost, cardToAct, energyPips, dealHand, drawCard, lineFor, noteSaid, openerFor, responseHand, resolveResponse, saidBefore, sayableLines, speak, collection } from '../cards';
import { REPLIES } from '../replies';
import { Tracker } from '../recap';

const setup: PlayerSetup = {
  first: 'Test',
  last: 'Player',
  gender: 'girl',
  abilityPoints: { athletics: 3, academics: 2, humor: 3, arts: 1, style: 2, tech: 1 },
  traits: { O: 0.6, C: 0.5, E: 0.6, A: 0.6, N: 0.4 },
  look: 'artsy',
  shirtStyle: 'fan',
  shirt: 9,
  interests: ['video games', 'anime'],
};

describe('a scripted player', () => {
  it('can play three weeks through the same code paths as the game', () => {
    const w = createWorld({ students: 200, weeks: 3, seed: 5, follow: null, player: setup });
    const tracker = new Tracker(w);
    const pid = w.player!.id;
    w.player!.signup = 'band';
    const evenings: EveningChoice[] = ['study', 'practice', 'rest', 'study', 'friends'];
    let cardsPlayed = 0;
    let challenges = 0;
    let prompts = 0;
    let walks = 0;
    let whispers = 0;
    /** A two-turn conversation, played the way the game plays it. */
    const chat = (members: number[], target: number, place: string, opts: { teacher?: boolean }) => {
      const c = openPlayerConversation(w, members, [], place, { hangout: true, ...opts });
      const hand = dealHand(w, buildDeck(w, c));
      for (let round = 0; round < 2; round++) {
        const drawn = hand.find((h) => h.kind !== 'stall');
        const card = drawn && speak(w, drawn, saidBefore(c));
        const act = card && cardToAct(w, c, card, target);
        if (act) playerPlays(w, c, act);
        othersTakeTurns(w, c);
        while (c.pending) playerAnswers(w, c, c.pending.kind === 'challenge' ? { response: 'refuse' } : { defend: false });
      }
    };
    while (w.day < 21) {
      startDay(w);
      // Answer whatever the storyteller asks, picking the first option.
      while (w.prompts.length) {
        const p = w.prompts.shift()!;
        p.choose(p.options[0].id);
        prompts++;
      }
      if (isAbsent(w, w.students[pid])) {
        // Home sick, as the game does it: the day runs without the player.
        if (isSchoolDay(w)) {
          morning(w);
          finishLunch(w, seatLunch(w));
          afternoon(w);
        } else weekendDay(w);
      } else if (isSchoolDay(w)) {
        // Before school: walk up to the biggest group, as a player might.
        const hallway = seatHallway(w);
        const biggest = hallway.tables.reduce((b, t, i) => (t.length > hallway.tables[b].length ? i : b), 0);
        if (!playerTriesTable(w, hallway, biggest, 'hallway')) playerSitsAlone(w, hallway);
        const group = finishHallway(w, hallway, true);
        if (group && group.members.length >= 2) chat(group.members, group.members.find((m) => m !== pid)!, 'hallway', {});
        // Walk to 1st period with the first classmate who says yes, as the game does.
        const buddy = classmates(w, 0).find((id) => askToWalkWith(w, id));
        if (buddy !== undefined) {
          chat([pid, buddy], buddy, 'hallway', {});
          walks++;
        }
        // Whisper to someone next to you in class.
        const neighbor = playerClassNeighbors(w, w.day % 3)[0];
        if (neighbor !== undefined) {
          chat([pid, neighbor], neighbor, 'class', { teacher: true });
          whispers++;
        }
        morningClasses(w);
        const seating = seatLunch(w);
        const tables = seating.tables.map((t, i) => [t.length, i]).filter(([n]) => n > 0 && n < 8);
        if (!tables.length || !playerTriesTable(w, seating, tables[w.day % tables.length][1])) playerSitsAlone(w, seating);
        const table = finishLunch(w, seating, true);
        if (table && table.members.length >= 2) {
          const c = openPlayerConversation(w, table.members, table.onlookers, 'lunch');
          const deck = buildDeck(w, c);
          const hand = dealHand(w, deck);
          expect(hand.length).toBe(6);
          for (let round = 0; round < 4 && c.members.length >= 2; round++) {
            if (round > 0) {
              const drawn = drawCard(w, deck);
              if (drawn) hand.push(drawn);
            }
            // Response cards can't be played before anyone has spoken.
            if (round === 0 && !saidBefore(c).length) expect(hand.filter((h) => h.needs && resolveResponse(w, c, h))).toEqual([]);
            const pickable = hand.map((h) => resolveResponse(w, c, h)).filter((h): h is NonNullable<typeof h> => !!h && h.kind !== 'stall');
            const card = speak(w, pickable[0] ?? hand[0], saidBefore(c));
            const spent = hand.findIndex((h) => h.key === card.key);
            if (spent >= 0) hand.splice(spent, 1);
            const act = cardToAct(w, c, card, card.responseTo ?? c.members.find((m) => m !== pid)!);
            if (act) {
              playerPlays(w, c, act);
              expect(lineFor(w, act).length).toBeGreaterThan(0);
              cardsPlayed++;
            }
            othersTakeTurns(w, c);
            while (c.pending) {
              challenges++;
              playerAnswers(w, c, c.pending.kind === 'challenge' ? { response: responseHand(w)[0].response } : { defend: true });
            }
          }
        }
        w.player!.afterSchool = w.day % 2 ? 'activity' : 'home';
        afternoon(w);
      } else {
        weekendDay(w);
      }
      const evening = evenings[w.day % evenings.length];
      w.cfg.forcedEvening = new Map([[pid, evening]]);
      // Seeing friends: call up to two close friends, as the game asks.
      if (evening === 'friends') w.player!.callFriends = closeFriendsOf(w, w.students[pid]).slice(0, 2);
      const sunday = w.day % 7 === 6;
      endDay(w);
      if (sunday) {
        tracker.changes();
        tracker.startNewWeek();
      }
    }
    expect(cardsPlayed).toBeGreaterThan(10);
    expect(tracker.events.length).toBeGreaterThan(0);
    expect(w.students[pid].rels.size).toBeGreaterThan(10);
    expect(walks).toBeGreaterThan(0);
    expect(whispers).toBeGreaterThan(0);
    void challenges;
    void prompts;
  });
});

describe('openers about the person you talk to', () => {
  it('come from their shirt or from what you heard them say, and warm them more than a plain question', () => {
    const w = createWorld({ students: 200, weeks: 1, seed: 7, follow: null, player: setup });
    const pid = w.player!.id;
    const fan = w.students.find((s) => s.id !== pid && s.shirtStyle === 'fan' && s.shirt !== null)!;
    const opener = openerFor(w, fan.id, undefined)!;
    expect(opener.topic).toBe(fan.shirt);
    expect(opener.aboutShirt).toBe(true);
    const c = openPlayerConversation(w, [pid, fan.id], [], 'lunch');
    const act = cardToAct(w, c, opener, fan.id)!;
    expect(act).toMatchObject({ kind: 'ask', target: fan.id, topic: fan.shirt, aboutShirt: true });

    // Someone in a plain tee gives you nothing to go on until you've heard them say what they love.
    const plain = w.students.find((s) => s.id !== pid && s.shirtStyle === 'plain')!;
    expect(openerFor(w, plain.id, undefined)).toBeNull();
    const heard = openerFor(w, plain.id, { loves: new Set([4]), into: new Set() })!;
    expect(heard.topic).toBe(4);

    // Asking a fan about their shirt warms them more than a plain "how's your week?".
    const before = fan.rels.get(pid)?.aff ?? 0;
    playerPlays(w, c, act);
    const gainShirt = fan.rels.get(pid)!.aff - before;
    const w2 = createWorld({ students: 200, weeks: 1, seed: 7, follow: null, player: setup });
    const c2 = openPlayerConversation(w2, [pid, fan.id], [], 'lunch');
    const before2 = w2.students[fan.id].rels.get(pid)?.aff ?? 0;
    playerPlays(w2, c2, { kind: 'ask', actor: pid, target: fan.id, place: 'lunch', day: w2.day });
    const gainPlain = w2.students[fan.id].rels.get(pid)!.aff - before2;
    expect(gainShirt).toBeGreaterThan(gainPlain);
  });
});

describe('lines answer what was just said', () => {
  const w = createWorld({ students: 50, weeks: 1, seed: 2, follow: null, player: setup });
  const at = (kind: Act['kind'], actor: number, extra: Partial<Act> = {}): Act => ({ kind, actor, target: -1, place: 'lunch', day: 0, ...extra });

  it('answers a question asked of you', () => {
    const asked = at('ask', 1, { target: 2 });
    for (let i = 0; i < 10; i++) expect(lineFor(w, at('share', 2, { target: 1 }), asked)).toMatch(/know anyone|kind of a lot|nervous/);
  });

  it('agrees or pushes back on an opinion about the same thing, even a line or two later', () => {
    const loves = at('opinion', 1, { topic: 4, stance: 0.8 });
    const between = at('joke', 3);
    for (let i = 0; i < 10; i++) {
      expect(lineFor(w, at('opinion', 2, { topic: 4, stance: 0.8 }), between, [between, loves])).toMatch(/Yes!|finally/);
      expect(lineFor(w, at('opinion', 2, { topic: 4, stance: -0.8 }), loves)).toMatch(/overrated|can’t stand/);
    }
  });

  it('follows up on something personal', () => {
    const shared = at('share', 1, { target: 2 });
    for (let i = 0; i < 10; i++) expect(lineFor(w, at('listen', 2, { target: 1 }), shared)).toMatch(/really\? What happened|rough|didn’t know/);
  });
});

describe('the player’s afternoon', () => {
  it('is left for the game to play: groups to pick from at practice, the invited friend when hanging out', () => {
    const w = createWorld({ students: 200, weeks: 1, seed: 11, follow: null, player: setup });
    const pid = w.player!.id;
    const me = w.students[pid];
    me.activity = 'band';
    startDay(w);
    morning(w);
    finishLunch(w, seatLunch(w));
    w.player!.afterSchool = 'activity';
    afternoon(w);
    const practice = w.playerAfternoon!;
    expect(practice.place).toBe('band');
    expect(practice.groups.flat().length).toBeGreaterThan(0);
    expect(practice.groups.flat()).not.toContain(pid);
    endDay(w);

    // Next day: hang out with a friend who said yes.
    // Someone free after school: no activity, not grounded, not the type to skip behind the gym.
    const friend = w.students.find((s) => s.id !== pid && s.activity === null && !isAbsent(w, s) && !isGrounded(w, s) && s.ruleBreaking < 0.3)!;
    startDay(w);
    morning(w);
    finishLunch(w, seatLunch(w));
    w.player!.afterSchool = 'hangout';
    w.player!.hangoutWith = [friend.id];
    afternoon(w);
    expect(w.playerAfternoon).toMatchObject({ place: 'after school', groups: [[friend.id]], private: true });
  });
});

describe('the sentence graph', () => {
  const w = createWorld({ students: 50, weeks: 1, seed: 3, follow: null, player: setup });
  const at = (kind: Act['kind'], actor: number, extra: Partial<Act> = {}): Act => ({ kind, actor, target: -1, place: 'lunch', day: 0, ...extra });

  it('answers the exact line that was said', () => {
    const asked = at('ask', 1, { target: 2 });
    noteSaid(asked, 'How’s your week going?');
    for (let i = 0; i < 10; i++) expect(REPLIES['How’s your week going?'].share).toContain(lineFor(w, at('share', 2, { target: 1 }), asked));
    const disaster = at('share', 1);
    noteSaid(disaster, 'My weekend was kind of a disaster, ngl.');
    expect(lineFor(w, at('listen', 2, { target: 1 }), disaster)).toBe('Oh no. What happened?');
  });

  it('only lists replies to lines someone can actually say', () => {
    const sayable = sayableLines();
    const unreachable = Object.keys(REPLIES).filter((line) => !sayable.has(line));
    expect(unreachable).toEqual([]);
  });

  it('lets you play a response card only right after the line it answers', () => {
    const pid = w.player!.id;
    const other = w.students.find((s) => s.id !== pid)!.id;
    const c = openPlayerConversation(w, [pid, other], [], 'lunch');
    const laugh = collection(w, c).find((e) => e.card.key === 'r-laugh')!.card;
    expect(resolveResponse(w, c, laugh)).toBeNull();
    c.log!.push({ kind: 'act', act: at('share', other) });
    expect(resolveResponse(w, c, laugh)).toBeNull();
    c.log!.push({ kind: 'act', act: at('joke', other, { success: true }) });
    expect(resolveResponse(w, c, laugh)).toMatchObject({ title: 'Laugh along', responseTo: other });
  });

  it('gives you more cards as you change: a hobby you get really into, close friends', () => {
    const me = w.students[w.player!.id];
    const copies = (key: string) => collection(w).find((e) => e.card.key === key)?.copies ?? 0;
    me.interests.anime = 0.5;
    expect(copies('lore-anime')).toBe(1);
    me.interests.anime = 0.9;
    expect(copies('lore-anime')).toBe(2);
    const openUp = copies('open-up');
    const friend = w.students.find((s) => s.id !== me.id)!;
    me.rels.set(friend.id, { ...(me.rels.get(friend.id) ?? { aff: 0, trust: 0, resp: 0, fear: 0, fam: 0, pub: 0, given: 0, hurt: 0, owed: 0, tags: {}, said: null }), aff: 0.6, trust: 0.4 });
    friend.rels.set(me.id, { ...(friend.rels.get(me.id) ?? { aff: 0, trust: 0, resp: 0, fear: 0, fam: 0, pub: 0, given: 0, hurt: 0, owed: 0, tags: {}, said: null }), aff: 0.6, trust: 0.4 });
    expect(copies('open-up')).toBe(openUp + 1);
  });
});

describe('energy', () => {
  const w = createWorld({ students: 50, weeks: 1, seed: 4, follow: null, player: setup });
  const pid = w.player!.id;
  const others = w.students.filter((s) => s.id !== pid).slice(0, 4).map((s) => s.id);

  it('makes cards cost ⚡: free responses, 1 for most, 2 for bold ones', () => {
    const c = openPlayerConversation(w, [pid, others[0]], [], 'lunch');
    const card = (key: string) => collection(w, c).find((e) => e.card.key === key)!.card;
    expect(cardCost(w, c, card('r-laugh'))).toBe(0);
    expect(cardCost(w, c, card('ask'))).toBe(1);
    expect(cardCost(w, c, card('invite'))).toBe(2);
  });

  it('charges outgoing people less, and reserved people more in a crowd, for things said to everyone', () => {
    const me = w.students[pid];
    const crowd = openPlayerConversation(w, [pid, ...others], [], 'lunch');
    const joke = collection(w, crowd).find((e) => e.card.key === 'joke')!.card;
    me.traits.E = 0.8;
    expect(cardCost(w, crowd, joke)).toBe(1);
    me.traits.E = 0.2;
    expect(cardCost(w, crowd, joke)).toBe(3);
    me.traits.E = 0.6;
  });

  it('counts ⚡ out of 20 and never goes below zero', () => {
    const me = w.students[pid];
    me.energy = 1;
    expect(energyPips(me)).toBe(20);
    addEnergy(me, -25);
    expect(energyPips(me)).toBe(0);
  });
});
