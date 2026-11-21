/**
 * The player's conversation cards: what's in your hand, what each card does (in words, never
 * numbers), and the lines people say. The card is the mechanic; the line is flavor.
 */
import { ABILITIES, INTERESTS, OPINION_TOPICS, type Ability, type Interest } from '../sim/content';
import type { Convo } from '../sim/conversation';
import { closeFriendsOf } from '../sim/day';
import { RUMORS } from '../sim/storyteller';
import { sigmoid } from '../sim/rng';
import type { Act, ActKind, Story, Student, World } from '../sim/types';
import { nameFor, playerOf, shirtName } from './view';
import { REPLIES } from './replies';
import { pick } from './ui';

/** Card families, for color and an at-a-glance sense of risk. */
export type CardFamily = 'warm' | 'belong' | 'edge' | 'move' | 'stall';

export interface Card {
  key: string;
  kind: ActKind | 'stall' | 'leave';
  family: CardFamily;
  title: string;
  blurb: string;
  /** Whether you aim it at one person. */
  targeted: boolean;
  topic?: number;
  stance?: number;
  interest?: Interest;
  storyId?: number;
  leaveOut?: boolean;
  depth?: number;
  ability?: Ability;
  /** For openers: the line is about the shirt they're wearing. */
  aboutShirt?: boolean;
  /** For openers: the one person this card is about. */
  about?: number;
  /** What you'd actually say, chosen at the start of your turn (so it doesn't change while you decide). */
  line: string;
  /** For responses: who said the line it answers. */
  responseTo?: number;
  /** A response card: playable only right after the kind of line it answers (see resolveResponse). */
  needs?: Need;
  /** The line before placeholders were filled: what the next speaker's reply is chosen for. */
  template?: string;
}

/** What the player has seen someone show they like: what they said they love, what they talked about. */
export interface KnownAbout {
  loves: Set<number>;
  into: Set<Interest>;
}

const ABILITY_NOUN: Record<Ability, string> = {
  athletics: 'sports',
  academics: 'schoolwork',
  humor: 'being funny',
  arts: 'music and art',
  style: 'style',
  tech: 'tech',
};

function strongest(s: Student): Ability {
  return ABILITIES.reduce((b, a) => (s.abilities[a] > s.abilities[b] ? a : b), ABILITIES[0]);
}

/** A card in your deck or hand, before it's given the words you'd say with it this turn. */
export type DeckCard = Omit<Card, 'line'>;

/** One kind of card in your collection: how many copies you have, and why (shown in the Notebook). */
export interface CollectionEntry {
  card: DeckCard;
  copies: number;
  why: string;
}

/**
 * Your card collection: who you are right now, as cards. You get more cards by changing who you are,
 * the same way the rest of the game works — practice a skill and you get more brag and help cards; get
 * into a hobby and you can talk about it; hear gossip and you can pass it on; feel strongly about
 * something and you can say so; make close friends and you have people to open up to. Your
 * personality sets your mix of responses. Response cards (laugh along, really listen, agree…) sit in
 * your hand like any card, but can only be played right after the kind of line they answer.
 *
 * `c` (a conversation) only matters for gossip: you won't tell a story about someone who's right there.
 */
export function collection(world: World, c?: Convo): CollectionEntry[] {
  const me = playerOf(world);
  const T = me.traits;
  const out: CollectionEntry[] = [];
  const add = (card: DeckCard, copies: number, why: string) => copies > 0 && out.push({ card, copies, why });
  const close = closeFriendsOf(world, me).length;
  const ab = strongest(me);
  const skill = me.abilities[ab];
  const resp = (key: string, kind: DeckCard['kind'], family: CardFamily, title: string, blurb: string, needs: Need, extra: Partial<DeckCard> = {}): DeckCard => ({ key, kind, family, title, blurb, needs, targeted: true, ...extra });

  // Things you can bring up.
  add({ key: 'ask', kind: 'ask', family: 'warm', title: 'Ask about them', blurb: 'Get them talking about themselves.', targeted: true }, 1 + (T.E > 0.6 ? 1 : 0) + (T.O > 0.6 ? 1 : 0), 'Everyone can ask. Outgoing and curious people ask more.');
  add({ key: 'share', kind: 'share', family: 'warm', title: 'Share something small', blurb: 'A little self-disclosure.', targeted: true, depth: 0.25 }, 2, 'Everyone has small things to share.');
  add({ key: 'open-up', kind: 'share', family: 'warm', title: 'Open up', blurb: 'Something real about you.', targeted: true, depth: 0.6 }, 1 + Math.min(2, close), close ? `One more for each close friend (you have ${close}): people you can really talk to.` : 'One — make close friends to get more.');
  add({ key: 'compliment', kind: 'compliment', family: 'warm', title: 'Compliment', blurb: 'Say something nice about them.', targeted: true }, 1 + (T.A > 0.6 ? 1 : 0), T.A > 0.6 ? 'Two: you’re warm.' : 'Warm people get more.');
  add({ key: 'help', kind: 'help', family: 'warm', title: `Offer help (${ABILITY_NOUN[ab]})`, blurb: 'Help with something you’re good at.', targeted: true, ability: ab }, 1 + (skill > 0.5 ? 1 : 0), `From your best skill, ${ABILITY_NOUN[ab]}. Practice it to get more.`);
  for (const t of OPINION_TOPICS.map((_, i) => i).filter((i) => Math.abs(me.opinions[i]) > 0.3).sort((a, b) => Math.abs(me.opinions[b]) - Math.abs(me.opinions[a])).slice(0, 3)) {
    const love = me.opinions[t] >= 0;
    add(
      { key: `opinion-${t}`, kind: 'opinion', family: 'belong', title: `${love ? 'Love' : 'Diss'}: ${shirtName(t)}`, blurb: `Say what you really think about ${OPINION_TOPICS[t]}.`, targeted: false, topic: t, stance: love ? 0.8 : -0.8 },
      1,
      `You feel strongly about ${OPINION_TOPICS[t]}. Opinions change as you spend time with people.`,
    );
  }
  for (const i of INTERESTS.filter((x) => me.interests[x] > 0.4))
    add(
      { key: `lore-${i}`, kind: 'lore', family: 'belong', title: `Talk ${i}`, blurb: `Show you know ${i}.`, targeted: false, interest: i },
      me.interests[i] > 0.75 ? 2 : 1,
      me.interests[i] > 0.75 ? `You’re really into ${i}.` : `You’re into ${i}. Practice evenings deepen it — really into it, and you get two.`,
    );
  add({ key: 'joke', kind: 'joke', family: 'edge', title: 'Crack a joke', blurb: me.abilities.humor > 0.5 ? "You're funny. Usually lands." : 'Risky — you are not known for being funny.', targeted: false }, 1 + (me.abilities.humor > 0.5 ? 1 : 0) + (me.abilities.humor > 0.8 ? 1 : 0), 'Funnier people get more.');
  add({ key: 'tease', kind: 'tease', family: 'edge', title: 'Tease', blurb: 'Poke fun at them.', targeted: true }, 1 + (T.A < 0.4 ? 1 : 0), T.A < 0.4 ? 'Two: you’re edgy.' : 'Edgy people get more.');
  add({ key: 'brag', kind: 'brag', family: 'edge', title: `Brag (${ABILITY_NOUN[ab]})`, blurb: 'Show off what you’re good at.', targeted: false, ability: ab }, 1 + (skill > 0.7 ? 1 : 0), `From your best skill, ${ABILITY_NOUN[ab]}. Get really good to get another.`);
  const stories = storiesToTell(world, c);
  for (const story of stories) add({ key: `gossip-${story.id}`, kind: 'gossip', family: 'edge', title: 'Tell some gossip', blurb: storyText(world, story.act), targeted: false, storyId: story.id }, 1, 'A story you heard. It goes once it’s old news.');
  add({ key: 'putdown', kind: 'putdown', family: 'edge', title: 'Put someone down', blurb: 'Make them look small.', targeted: true }, 1, 'Everyone can be mean.');
  add({ key: 'invite', kind: 'invite', family: 'move', title: 'Invite to hang out', blurb: 'Ask them to hang out after school.', targeted: true, leaveOut: false }, 1, 'Everyone can ask.');
  add({ key: 'invite-out', kind: 'invite', family: 'move', title: 'Invite, leaving an out', blurb: '“No worries if you’re busy.”', targeted: true, leaveOut: true }, 1, 'Everyone can ask.');

  // Responses: only playable right after the line they answer. Your personality sets the mix.
  add(resp('r-listen', 'listen', 'warm', 'Really listen', 'Follow up on what they just said.', 'told'), 1 + (T.E < 0.4 ? 1 : 0) + (T.A > 0.6 ? 1 : 0), 'Reserved and warm people get more: they’re good listeners.');
  add(resp('r-laugh', 'agree', 'warm', 'Laugh along', 'Show you liked the joke.', 'joke'), 1 + (T.A > 0.5 ? 1 : 0), 'Warm people get more.');
  add(resp('r-answer', 'share', 'warm', 'Answer honestly', 'Tell them something true about you.', 'question', { depth: 0.25 }), 1 + (T.O > 0.6 ? 1 : 0), 'Open people get more.');
  add(resp('r-same', 'share', 'warm', 'Same here', 'Share something like what they shared.', 'shared', { depth: 0.25 }), 1 + (T.N > 0.6 ? 1 : 0), 'Sensitive people get more: they relate.');
  add(resp('r-impressed', 'compliment', 'warm', 'Be impressed', 'Give them the credit they want.', 'showoff'), 1, 'Everyone has one.');
  add(resp('r-thanks', 'agree', 'warm', 'Thank them', 'Take it graciously.', 'kindness'), 1, 'Everyone has one.');
  add(resp('r-agree', 'opinion', 'belong', 'Agree', 'Say you feel the same — because you do.', 'agreeable'), 1, 'Everyone has one.');
  add(resp('r-push', 'opinion', 'belong', 'Push back', 'Say what you really think: the opposite.', 'disagreeable'), 1 + (T.A < 0.4 ? 1 : 0), 'Edgy people get more.');
  add(resp('fake', 'opinion', 'belong', 'Go along', 'Say you feel the same, even though you don’t.', 'opinion'), 1 + (me.conformity > 0.6 ? 1 : 0), 'People who care what others think get more.');
  add(resp('r-tease-back', 'tease', 'edge', 'Tease back', 'Give as good as you get — or take a show-off down a peg.', 'teased'), 1 + (T.A < 0.4 ? 1 : 0), 'Edgy people get more.');
  return out;
}

/** Your deck for one conversation: your collection, one card per copy, shuffled. */
export function buildDeck(world: World, c: Convo): DeckCard[] {
  const cards: DeckCard[] = [];
  for (const { card, copies } of collection(world, c)) for (let i = 0; i < copies; i++) cards.push({ ...card, key: `${card.key}#${cards.length}` });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * Draw one card. When you're stressed, sometimes you draw an "Um…" instead: your mind goes blank. It
 * clogs your hand until you play it (which wastes a turn). (Being tired is different: see cardCost.)
 */
export function drawCard(world: World, deck: DeckCard[]): DeckCard | null {
  const me = playerOf(world);
  if (me.stress > 0.5 && Math.random() < 0.35)
    return { key: `stall#${Math.random()}`, kind: 'stall', family: 'stall', title: 'Um…', blurb: "You're too stressed to think straight.", targeted: false };
  return deck.shift() ?? null;
}

/** Energy, in ⚡. A full day's worth is 20 (the simulation keeps energy as a number from 0 to 1). */
export const ENERGY_MAX = 20;

/** Your energy right now, in ⚡. */
export function energyPips(s: Student): number {
  return Math.round(s.energy * ENERGY_MAX);
}

/** Change your energy by some ⚡ (negative to spend). */
export function addEnergy(s: Student, pips: number) {
  s.energy = Math.max(0, Math.min(1, s.energy + pips / ENERGY_MAX));
}

/**
 * What each card costs to play, in ⚡. Easy responses are free; most cards cost 1; bold ones cost 2.
 * Tired, you can only afford the cheap ones — you can still listen and laugh along, but not open up
 * or ask someone out.
 */
const BASE_COST: Record<string, number> = {
  ask: 1,
  share: 1,
  'open-up': 2,
  compliment: 1,
  help: 1,
  opinion: 1,
  lore: 1,
  joke: 2,
  tease: 2,
  brag: 2,
  gossip: 1,
  putdown: 2,
  invite: 2,
  'invite-out': 1,
  'r-listen': 0,
  'r-laugh': 0,
  'r-answer': 1,
  'r-same': 1,
  'r-impressed': 0,
  'r-thanks': 0,
  'r-agree': 0,
  'r-push': 1,
  fake: 0,
  'r-tease-back': 1,
  stall: 0,
};

/**
 * A card's cost for you, right now. Personality changes it: talking to a whole group costs outgoing
 * people 1 less, and costs reserved people 1 more once the group is four or more. Openers are free.
 */
export function cardCost(world: World, c: Convo, card: DeckCard): number {
  if (card.about !== undefined) return 0;
  const key = card.key.split('#')[0];
  const base = BASE_COST[key] ?? BASE_COST[key.split('-')[0]] ?? 1;
  if (base === 0 || card.targeted) return base;
  const E = playerOf(world).traits.E;
  if (E >= 0.65) return Math.max(0, base - 1);
  if (E <= 0.35 && c.members.length >= 4) return base + 1;
  return base;
}

/**
 * Deal an opening hand of six: a plain random draw. Sometimes nothing in it fits the moment and you
 * have nothing to say — that happens; you can stay quiet.
 */
export function dealHand(world: World, deck: DeckCard[]): DeckCard[] {
  const hand: DeckCard[] = [];
  for (let i = 0; i < 6; i++) {
    const card = drawCard(world, deck);
    if (card) hand.push(card);
  }
  return hand;
}

/**
 * What a response card needs to be playable: the kind of line it answers. Response cards sit in your
 * hand like any other card, but you can only play one right after someone says that kind of thing.
 */
export type Need = 'joke' | 'told' | 'question' | 'shared' | 'agreeable' | 'disagreeable' | 'opinion' | 'showoff' | 'teased' | 'kindness';

/** What to show on a response card you can't play yet. */
export const NEED_WORDS: Record<Need, string> = {
  joke: 'someone to joke around',
  told: 'someone to tell you something',
  question: 'a question for you',
  shared: 'someone to share something',
  agreeable: 'an opinion you share',
  disagreeable: 'an opinion you don’t share',
  opinion: 'an opinion you don’t share',
  showoff: 'someone to show off',
  teased: 'someone to tease you',
  kindness: 'a compliment or a favor',
};

/**
 * Can this response card be played right now? Returns the card made concrete for the line it answers
 * (aimed at whoever said it; an opinion card takes on that topic), or null if it doesn't apply.
 */
export function resolveResponse(world: World, c: Convo, card: DeckCard): DeckCard | null {
  if (!card.needs) return card;
  const me = playerOf(world);
  const last = saidBefore(c)[0];
  if (!last || last.actor === me.id || !c.members.includes(last.actor)) return null;
  const toMe = last.target === me.id;
  const at = { ...card, responseTo: last.actor };
  const mine = last.topic !== undefined ? me.opinions[last.topic] : 0;
  const theirs = last.stance ?? 0;
  switch (card.needs) {
    case 'joke':
      return last.kind === 'joke' || (last.kind === 'tease' && toMe && last.friendly) ? at : null;
    case 'told':
      return ['share', 'lore', 'gossip', 'opinion', 'brag'].includes(last.kind) ? at : null;
    case 'question':
      return (last.kind === 'ask' || last.kind === 'listen') && toMe ? at : null;
    case 'shared':
      return last.kind === 'share' ? at : null;
    case 'agreeable':
      return last.kind === 'opinion' && Math.abs(mine) > 0.2 && Math.sign(mine) === Math.sign(theirs) ? { ...at, topic: last.topic, stance: theirs >= 0 ? 0.8 : -0.8, title: `Agree: ${theirs >= 0 ? 'love' : 'diss'} ${shirtName(last.topic!)}` } : null;
    case 'disagreeable':
      return last.kind === 'opinion' && Math.abs(mine) > 0.2 && Math.sign(mine) !== Math.sign(theirs) ? { ...at, topic: last.topic, stance: mine >= 0 ? 0.8 : -0.8, title: `Push back on ${shirtName(last.topic!)}` } : null;
    case 'opinion':
      return last.kind === 'opinion' && !(Math.abs(mine) > 0.2 && Math.sign(mine) === Math.sign(theirs)) ? { ...at, topic: last.topic, stance: theirs >= 0 ? 0.8 : -0.8, title: `Go along on ${shirtName(last.topic!)}` } : null;
    case 'showoff':
      return last.kind === 'brag' || last.kind === 'help' || (last.kind === 'joke' && last.success) ? at : null;
    case 'teased':
      return (last.kind === 'tease' && toMe) || last.kind === 'brag' ? at : null;
    case 'kindness':
      return (last.kind === 'compliment' || last.kind === 'help') && toMe ? at : null;
  }
}

/** Stories you could pass on (freshest first): not about anyone in this conversation, and not ones everyone here already knows. */
function storiesToTell(world: World, c?: Convo): Story[] {
  const me = playerOf(world);
  const present = new Set(c?.members ?? []);
  return [...me.knownStories]
    .filter((s) => s.act.actor !== me.id && !present.has(s.act.actor) && !(s.act.target >= 0 && present.has(s.act.target)))
    .filter((s) => !c || !c.members.every((m) => m === me.id || s.knowers.has(m)))
    .sort((a, b) => b.juice - a.juice)
    .slice(0, 3);
}

/** Lines for response cards whose meaning is narrower than their kind of card. */
const CARD_LINES: Record<string, string[]> = {
  'r-thanks': ['Oh — thanks, that really helps.', 'Aw, thank you!', 'Thanks. Seriously.'],
  'r-laugh': ['Hahaha. Okay, that’s good.', 'Ha! Stop.', 'Okay, that got me.'],
  'r-impressed': ['Wait, that’s actually really impressive.', 'Okay, that’s amazing.'],
  'r-tease-back': ['Says you.', 'Wow, okay, big talk.', 'Oh, like you’re one to talk.'],
  'r-same': ['Same, honestly. I get that.', 'Oh, me too. Exactly the same.'],
};

/** Give a card the line you'd say with it right now (it depends on what was just said). */
export function speak(world: World, card: DeckCard, recent: Act[]): Card {
  if (card.kind === 'stall') return { ...card, line: 'Um…' };
  // Response cards say what that response means ("Thank them" thanks them), unless the sentence graph
  // has a reply written for the exact line being answered.
  const own = CARD_LINES[card.key.split('#')[0]];
  const previous = recent[0] ? SAID.get(recent[0]) : undefined;
  if (own && card.kind !== 'leave' && !(previous && REPLIES[previous]?.[card.kind])) {
    const template = pick(own);
    return { ...card, line: fillIn(template, { t: card.topic !== undefined ? shirtName(card.topic) : '' }), template };
  }
  if (card.kind === 'leave') return { ...card, line: pick(['Okay, I’ve gotta go.', 'See you guys later.', 'I should head out.']) };
  const act: Act = { kind: card.kind, actor: world.player!.id, target: -1, place: '', day: world.day, topic: card.topic, stance: card.stance, interest: card.interest, storyId: card.storyId, leaveOut: card.leaveOut, ability: card.ability };
  const line = lineFor(world, act, recent[0] ?? null, recent);
  return { ...card, line, template: SAID.get(act) };
}

/**
 * A card about the person you're talking to, if you have something to go on: their shirt (that's
 * what it's for), or something you've heard them say they love. Null if they give you nothing.
 */
export function openerFor(world: World, target: number, known: KnownAbout | undefined): Card | null {
  const me = playerOf(world);
  const them = world.students[target];
  const base = { kind: 'ask' as const, family: 'warm' as const, targeted: true, about: target };
  if (them.shirtStyle === 'fan' && them.shirt !== null) {
    const t = them.shirt;
    const same = me.opinions[t] > 0.3;
    return {
      ...base,
      key: `shirt-${target}`,
      title: same ? `You love ${shirtName(t)} too` : `Ask about their ${shirtName(t)} shirt`,
      blurb: 'Their shirt is an invitation: an easy, welcome opener. Asking about something they love warms them to you.',
      topic: t,
      aboutShirt: true,
      line: same ? `Wait — you like ${shirtName(t)}? Same!` : `Okay, I have to ask about the ${shirtName(t)} shirt.`,
    };
  }
  const loved = [...(known?.loves ?? [])][0];
  if (loved !== undefined)
    return {
      ...base,
      key: `topic-${target}-${loved}`,
      title: `Bring up ${shirtName(loved)}`,
      blurb: `You heard them say they love ${OPINION_TOPICS[loved]}. People warm to you when you ask about what they care about.`,
      topic: loved,
      line: `So, ${OPINION_TOPICS[loved]} — what’s the latest?`,
    };
  const interest = [...(known?.into ?? [])][0];
  if (interest !== undefined)
    return {
      ...base,
      key: `interest-${target}-${interest}`,
      title: `Ask about ${interest}`,
      blurb: `You heard them talk about ${interest}. Asking about it shows you were listening.`,
      interest,
      line: `Hey, how’s the ${interest} stuff going?`,
    };
  if (them.shirtStyle === 'graphic')
    return {
      ...base,
      key: `graphic-${target}`,
      title: 'Laugh at their shirt',
      blurb: 'A funny shirt is made to be talked about. An easy opener.',
      aboutShirt: true,
      line: pick(['Ha — where did you even find that shirt?', 'Okay, your shirt is amazing.']),
    };
  return null;
}

/**
 * When a card works and when it backfires — like any good card game, every card has a time and a
 * place. These describe what the simulation actually does with the card, in words.
 */
export interface Advice {
  good: string;
  bad: string;
}

const ADVICE: Record<string, Advice> = {
  ask: {
    good: 'With outgoing people, or about something they love — their shirt, something they told you.',
    bad: 'Earns liking, never respect. Keep asking someone more popular who never asks back, and you look like you’re trying too hard.',
  },
  listen: {
    good: 'Right after someone shares something or tells a story.',
    bad: 'Slow: it builds liking, not respect. Reserved people warm to it more slowly.',
  },
  agree: {
    good: 'Safe when you don’t know what to say.',
    bad: 'Barely moves anything. Lots of it toward someone who doesn’t return it reads as trying too hard.',
  },
  compliment: {
    good: 'With friends, or people around your level.',
    bad: 'Aimed at someone far more popular than you, it reads as sucking up — you lose respect.',
  },
  share: {
    good: 'When you know them a bit already: it builds trust, not just liking.',
    bad: 'With a total stranger it’s awkward, and they like you a little less.',
  },
  'open-up': {
    good: 'With a close friend: the biggest trust boost there is.',
    bad: 'Too much, too soon: anyone who isn’t close to you yet pulls back.',
  },
  help: {
    good: 'With something you’re really good at: trust, respect, and a favor they owe you.',
    bad: 'Help with something you’re only so-so at earns little respect. With schoolwork, it depends on how you’re doing in class.',
  },
  opinion: {
    good: 'When the group feels the same way: everyone who agrees warms to you.',
    bad: 'Everyone who disagrees cools on you at once. Know your crowd before you say it.',
  },
  fake: {
    good: 'Wins over people who disagree with you — right now.',
    bad: 'If any of them hear you say the opposite later, you’re caught being fake and lose their trust.',
  },
  lore: {
    good: 'With fans: they respect how much you know.',
    bad: 'Anyone who isn’t into it gets a little bored.',
  },
  joke: {
    good: 'When you’re funny: everyone likes you a little more, and people who value funny respect you.',
    bad: 'When it falls flat, everyone listening respects you a little less. The less funny you are, the more often it flops.',
  },
  tease: {
    good: 'With a friend who likes you: it’s affectionate and builds trust.',
    bad: 'With someone who barely knows you, or a sensitive person, it stings — and people who like them think you’re mean.',
  },
  brag: {
    good: 'In front of people who admire that skill.',
    bad: 'Everyone else thinks less of you, and if you aren’t popular yet it reads as trying too hard.',
  },
  gossip: {
    good: 'Everyone listening likes you a little more, right now.',
    bad: 'People remember who spreads stories: they’re less likely to believe what you tell them later.',
  },
  putdown: {
    good: 'Might get a laugh, and make some people wary of you.',
    bad: 'Most people quietly like you less, the target never forgets, someone may stand up to you, and it can get reported.',
  },
  invite: {
    good: 'With someone who already likes you: time outside school is what makes close friends.',
    bad: 'Asked in front of everyone, someone unsure says no — and a public no stings.',
  },
  'invite-out': {
    good: 'Easier to say yes to, and a no costs nothing.',
    bad: 'Shows less interest: a yes warms them a little less than a confident invite.',
  },
  leave: {
    good: 'When you’re low on energy, or it’s going badly.',
    bad: 'You miss whatever happens next.',
  },
  stall: {
    good: 'Never — it’s a wasted turn.',
    bad: 'You draw these when you’re tired or stressed. Rest to get rid of them.',
  },
  opener: {
    good: 'Their shirt, or something they told you, is an open door: the warmest question you can ask.',
    bad: 'Bring up something they don’t actually care about and it falls flat.',
  },
};

/** When this card works, and when it backfires. */
export function adviceFor(card: Card): Advice {
  if (card.about !== undefined) return ADVICE.opener;
  const k = card.key.split('#')[0];
  if (k.startsWith('fake-')) return ADVICE.fake;
  for (const prefix of ['opinion', 'lore', 'gossip', 'stall']) if (k.startsWith(prefix)) return ADVICE[prefix];
  // Responses work like the card they're a version of (answering is sharing, laughing along is agreeing…).
  if (k.startsWith('r-')) return ADVICE[card.kind === 'share' && (card.depth ?? 0) > 0.5 ? 'open-up' : card.kind] ?? { good: card.blurb, bad: '' };
  return ADVICE[k] ?? { good: card.blurb, bad: '' };
}

/** Turn a played card into an act. Invites are decided here: will they say yes? */
export function cardToAct(world: World, c: Convo, card: Card, target: number): Act | null {
  const me = playerOf(world);
  if (card.kind === 'stall' || card.kind === 'leave') return null;
  const base: Act = { kind: card.kind, actor: me.id, target: card.targeted ? target : -1, place: c.place, day: world.day };
  switch (card.kind) {
    case 'opinion':
      return { ...base, topic: card.topic, stance: card.stance };
    case 'ask':
      return { ...base, topic: card.topic, interest: card.interest, aboutShirt: card.aboutShirt };
    case 'lore':
      return { ...base, interest: card.interest };
    case 'share':
      return { ...base, stance: card.depth };
    case 'help':
    case 'brag':
      return { ...base, ability: card.ability };
    case 'gossip':
      return { ...base, storyId: card.storyId };
    case 'invite': {
      const them = world.students[target];
      const r = them.rels.get(me.id);
      const feel = (r?.aff ?? 0) + 0.3 * (r?.trust ?? 0) + 0.15 * (r?.owed ?? 0);
      // Pushed in front of others, unsure people say no; an easy out takes the pressure off.
      const pressure = c.members.length > 2 && !card.leaveOut && feel < 0.3 ? 0.6 : 1;
      const success = Math.random() < sigmoid(7 * (feel - (card.leaveOut ? 0.12 : 0.18))) * pressure;
      return { ...base, success, leaveOut: card.leaveOut };
    }
    default:
      return base;
  }
}

// ---------------------------------------------------------------- lines

/**
 * What a line is answering: the last thing said in the conversation, seen from the new speaker's side.
 * Every card's line is picked to fit it — you answer a question, react to an opinion, follow up on
 * something personal — so the conversation hangs together instead of jumping between non sequiturs.
 */
type Context = 'open' | 'asked' | 'question' | 'opinion' | 'lore' | 'joke' | 'share' | 'gossip' | 'edge' | 'brag' | 'praise' | 'help' | 'chat';

function contextOf(prev: Act | null | undefined, speaker: number): Context {
  if (!prev) return 'open';
  if (prev.actor === speaker) return 'chat';
  switch (prev.kind) {
    case 'ask':
      return prev.target === speaker ? 'asked' : 'question';
    case 'opinion':
    case 'lore':
    case 'joke':
    case 'share':
    case 'gossip':
    case 'brag':
    case 'help':
      return prev.kind;
    case 'tease':
    case 'putdown':
    case 'exclude':
      return 'edge';
    case 'compliment':
      return 'praise';
    default:
      return 'chat';
  }
}

/**
 * The response graph: for each kind of card, lines that fit after each kind of line ('any' when
 * nothing more specific fits). {p} is the topic and {q} the interest of the line being answered.
 */
const LINES: Partial<Record<ActKind, Partial<Record<Context | 'any', string[]>>>> = {
  greet: { any: ['Hey — mind if I sit here?', 'Is this seat taken?', 'Hey, what’s up?'] },
  ask: {
    open: ['So what are you into?', 'How’s your week going?', 'What do you think of this place so far?', 'Wait, what classes do you have?'],
    asked: ['Pretty good, I think. What about you?', 'Honestly, not sure yet. What about you?'],
    opinion: ['What else are you into, besides {p}?', 'How did you get into {p}?', 'Does everyone here feel that way about {p}?'],
    lore: ['How did you get into {q}?', 'Wait, how long have you been into {q}?'],
    share: ['Are you doing okay with all that?', 'Has it gotten any better?'],
    joke: ['Okay, you’re funny. What else are you into?', 'Ha. Are you always like this?'],
    any: ['Are you doing anything after school?', 'What did you end up doing this weekend?', 'So what are you into?'],
  },
  listen: {
    open: ['So how’s it going?', 'What’s new with you?'],
    asked: ['Good question. What about you, though?'],
    opinion: ['Wait, why {p}, though?', 'Huh. What makes you say that about {p}?'],
    lore: ['Okay, explain the {q} thing to me.', 'Wait, what happened with that?'],
    joke: ['Ha — wait, did that actually happen?', 'Okay, but seriously, though?'],
    share: ['Wait, really? What happened?', 'That sounds rough. Are you okay?', 'Huh. I didn’t know that.'],
    gossip: ['No way. Who told you that?', 'Wait — seriously?'],
    brag: ['Wait, how did you do that?', 'Okay, how?'],
    edge: ['Whoa, okay.', 'Okay, okay. Then what?'],
    help: ['Oh, that actually makes sense. Thanks.'],
    any: ['Wait, then what happened?', 'Huh — tell me more.', 'No way. Seriously?'],
  },
  agree: {
    opinion: ['Right? {p}, every time.', 'Okay, same.', 'Honestly, same.'],
    lore: ['Yes! The {q} stuff is so good.', 'Okay, finally someone else who gets it.'],
    joke: ['Ha! Okay, that’s good.', 'Hahaha. Stop.'],
    share: ['Same, honestly.', 'Yeah. Me too, kind of.'],
    gossip: ['I knew it.', 'Honestly, not surprised.'],
    brag: ['Yeah, you’re actually really good at that.'],
    edge: ['Ha. Okay.', 'Oof.'],
    asked: ['Ha, yeah, pretty much.'],
    any: ['Ha, yeah, totally.', 'Right?', 'Same.'],
  },
  compliment: {
    joke: ['Okay, you’re actually funny.', 'You’re hilarious, you know that?'],
    brag: ['That’s actually really impressive.'],
    lore: ['You really know your stuff.'],
    help: ['You’re really good at explaining things.'],
    share: ['That was really brave of you, honestly.'],
    any: ['Okay, I like your jacket.', 'You were really good in class today.', 'Your stuff is always so cool.'],
  },
  share: {
    brag: ['Ha, I wish. I can barely keep up.', 'Must be nice. I’m still figuring everything out.'],
    asked: ['Honestly? I don’t really know anyone yet.', 'It’s been kind of a lot, but okay.', 'Kind of nervous, if I’m honest.'],
    share: ['Same. I was really nervous the first day too.', 'Honestly, I get that. My week’s been weird too.'],
    question: ['For me? Honestly, it’s been kind of a lot.'],
    any: ['Honestly I was kind of nervous starting here.', 'I don’t really know anyone yet.', 'My weekend was kind of a disaster, ngl.', 'Can I tell you something? I almost didn’t come today.'],
  },
  help: {
    share: ['Want me to help with that?', 'If you want, I can help.'],
    asked: ['I could help you with it, if you want.'],
    any: ['Want me to walk you through it?', 'I can help with that if you want.', 'Here, it’s easier if you do it like this.'],
  },
  joke: {
    joke: ['Okay, okay, I’ve got one. Group projects are just one person doing everything with an audience.', 'Ha. Okay, top this: the cafeteria pizza filed a complaint about itself.'],
    any: [
      'I’m not saying the cafeteria pizza is bad, but it filed a complaint about itself.',
      'Mr. Dunn’s tests are like horror movies: you know something’s coming and it’s still awful.',
      'I tried to be early today. The universe said no.',
      'Group projects are just one person doing everything with an audience.',
    ],
  },
  tease: {
    brag: ['Wow. Humble, too.', 'Okay, okay, we get it.'],
    opinion: ['Of course you’d say that about {p}.', 'Wow, {p}? Really?'],
    joke: ['Was that supposed to be funny?', 'Did you write that one yourself?'],
    lore: ['Okay, nerd.', 'Do you ever talk about anything other than {q}?'],
    any: ['Oh, look who finally showed up.', 'Nice of you to join us, genius.', 'Are you ever not eating?'],
  },
  brag: {
    brag: ['That’s nothing — I’m way better at {a}.', 'Okay, but have you seen me do {a}?'],
    asked: ['Honestly? I’m really good at {a}.', '{a}, mostly. I’m kind of good at it.'],
    any: ['Honestly, {a} is kind of my thing.', 'I’m actually really good at {a}, by the way.', 'People keep asking me for help with {a}.'],
  },
  putdown: {
    share: ['Wow. Nobody asked.', 'Okay, too much information.'],
    opinion: ['Only you would think that about {p}.'],
    joke: ['That wasn’t funny.'],
    lore: ['Nobody cares about {q}.'],
    any: ['Why are you even sitting here?', 'Nice outfit. Did your mom pick it?', 'Nobody asked you.', 'Wow. That’s embarrassing for you.', 'Do you ever stop talking?'],
  },
  invite: {
    share: ['Want to hang out after school? Might take your mind off it.'],
    any: ['Want to hang out after school?', 'Some of us are going to hang out later — want to come?'],
  },
};

/** What people say about someone's shirt ({x} is what a fan shirt is about). */
const SHIRT_LINES = {
  askFan: ['Wait — you like {x}?', 'Okay, I have to ask about the {x} shirt.'],
  askFunny: ['Ha — where did you even find that shirt?', 'Okay, your shirt is amazing.'],
  teaseFan: ['You actually wear a {x} shirt? In public?', '{x}? Seriously?'],
  teaseFunny: ['Nice shirt. Did you lose a bet?', 'Did you get dressed in the dark?'],
};

const OPINION = {
  love: ['Honestly? {t} is the best.', 'I love {t}, not even sorry.', '{t} is so good.'],
  hate: ['{t}? Ugh. Overrated.', 'I can’t stand {t}.', 'Is it just me or is {t} kind of the worst?'],
  /** Answering an opinion about the same thing. */
  sameLove: ['Yes! {t} is so good.', 'Okay, finally. {t} is amazing.'],
  sameHate: ['Right? {t} is the worst.', 'Thank you. {t} is so overrated.'],
  againstLove: ['Wait, really? I actually love {t}.', 'Hmm, no — {t} is great.'],
  againstHate: ['I don’t know… {t} is kind of overrated.', 'Really? I can’t stand {t}.'],
  /** Asked something. */
  askedLove: ['Honestly? I’m really into {t} right now.', 'Mostly {t}, honestly.'],
  askedHate: ['Not {t}, I’ll tell you that.', 'Honestly? Anything but {t}.'],
  /** After an opinion about something else. */
  otherLove: ['Okay, but have you seen {t}? So good.', 'Speaking of which — {t}. Love it.'],
  otherHate: ['At least it’s not as bad as {t}.', 'Speaking of which — {t}? Ugh.'],
};
const LORE = {
  change: ['Okay, random, but did you see the new {i} stuff?', 'Totally different thing — is anyone here into {i}?'],
  same: ['Okay, but the new {i} thing, though — did you see it?', 'Wait, you’re into {i} too?'],
  asked: ['Mostly {i}. Are you into it?', 'Honestly? {i}. Way too much.'],
  any: ['Did you see the new {i} stuff? It’s wild.', 'Okay, {i} people, this is important.', 'If you know anything about {i}, you know this is huge.'],
};

function fillIn(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w)\}/g, (_, k: string) => vars[k] ?? '');
}

/** Every line someone can say from the line pools or as a reply in the sentence graph (for checking the graph). */
export function sayableLines(): Set<string> {
  const out = new Set<string>();
  for (const pools of Object.values(LINES)) for (const pool of Object.values(pools ?? {})) for (const l of pool ?? []) out.add(l);
  for (const replies of Object.values(REPLIES)) for (const pool of Object.values(replies)) for (const l of pool ?? []) out.add(l);
  for (const pool of Object.values(CARD_LINES)) for (const l of pool) out.add(l);
  for (const pool of Object.values(SHIRT_LINES)) for (const l of pool) out.add(l);
  return out;
}

/** The last few acts said out loud in a conversation before log entry `end`, newest first. */
export function saidBefore(c: Convo, end = c.log?.length ?? 0, count = 4): Act[] {
  const out: Act[] = [];
  for (let i = Math.min(end, c.log?.length ?? 0) - 1; i >= 0 && out.length < count; i--) {
    const e = c.log![i];
    if (e.kind === 'act') out.push(e.act);
  }
  return out;
}

/**
 * What the speaker says, given what was said just before (if anything). `recent` is the last few
 * things said, newest first, so an opinion can answer one said a moment earlier.
 */
export function lineFor(world: World, act: Act, prev?: Act | null, recent: Act[] = prev ? [prev] : []): string {
  const [template, vars] = rawLine(world, act, prev ?? null, recent);
  SAID.set(act, template);
  const line = fillIn(template, vars);
  // Topics like "the new phone rule" can start a sentence; capitalize it.
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** Which line (before placeholders are filled) each act was said with, so the next line can answer that exact sentence. */
const SAID = new WeakMap<Act, string>();

/** Remember that `act` was said with the line on the card the player played. */
export function noteSaid(act: Act, template: string | undefined) {
  if (template) SAID.set(act, template);
}

/** The line someone said with an act (before placeholders were filled), if the game has seen it. */
export function saidWith(act: Act): string | undefined {
  return SAID.get(act);
}

function rawLine(world: World, act: Act, prev: Act | null, recent: Act[]): [string, Record<string, string>] {
  const ctx = contextOf(prev, act.actor);
  const vars: Record<string, string> = {
    p: prev?.topic !== undefined ? OPINION_TOPICS[prev.topic] : 'that',
    q: prev?.interest ?? 'that',
    a: act.ability ? ABILITY_NOUN[act.ability] : 'this',
    b: prev?.ability ? ABILITY_NOUN[prev.ability] : 'that',
  };
  // Lines about someone's shirt: an opener, or a tease.
  if (act.aboutShirt && act.target >= 0 && (act.kind === 'ask' || act.kind === 'tease')) {
    const wearer = world.students[act.target];
    const fan = wearer.shirtStyle === 'fan' && wearer.shirt !== null;
    const pool = act.kind === 'ask' ? (fan ? SHIRT_LINES.askFan : SHIRT_LINES.askFunny) : fan ? SHIRT_LINES.teaseFan : SHIRT_LINES.teaseFunny;
    return [pick(pool), { ...vars, x: fan ? shirtName(wearer.shirt!) : '' }];
  }
  // The sentence graph first: a reply written for the exact line being answered.
  const replies = prev && prev.actor !== act.actor ? REPLIES[SAID.get(prev) ?? '']?.[act.kind] : undefined;
  if (replies && !['opinion', 'lore', 'gossip'].includes(act.kind) && !(act.kind === 'invite' && act.leaveOut)) return [pick(replies), vars];
  switch (act.kind) {
    case 'opinion': {
      const t = OPINION_TOPICS[act.topic!];
      const love = (act.stance ?? 0) >= 0;
      let pool = love ? OPINION.love : OPINION.hate;
      // Someone already said what they think about this a moment ago: agree or push back.
      const earlier = recent.find((a) => a.kind === 'opinion' && a.topic === act.topic && a.actor !== act.actor);
      if (earlier) {
        const same = (earlier.stance ?? 0) >= 0 === love;
        pool = same ? (love ? OPINION.sameLove : OPINION.sameHate) : love ? OPINION.againstLove : OPINION.againstHate;
      } else if (ctx === 'opinion') pool = love ? OPINION.otherLove : OPINION.otherHate;
      else if (ctx === 'asked') pool = love ? OPINION.askedLove : OPINION.askedHate;
      return [pick(pool), { t }];
    }
    case 'lore': {
      const pool = ctx === 'lore' && prev!.interest === act.interest ? LORE.same : ctx === 'asked' ? LORE.asked : ctx === 'open' || ctx === 'chat' ? LORE.any : LORE.change;
      return [pick(pool), { i: act.interest ?? '' }];
    }
    case 'invite':
      if (act.leaveOut) return ['A few of us might hang out after school — no worries if you’re busy.', vars];
      break;
    case 'gossip': {
      const story = world.stories.find((s) => s.id === act.storyId);
      const lead = ctx === 'gossip' ? 'Oh — and did you hear?' : ctx === 'asked' ? 'Okay, you didn’t hear this from me, but…' : 'Did you hear?';
      return [story ? `${lead} ${storyText(world, story.act)}` : 'Did you hear what happened?', {}];
    }
  }
  const lines = LINES[act.kind];
  if (!lines) return ['…', vars];
  return [pick(lines[ctx] ?? lines.any ?? ['…']), vars];
}

/** A short story summary, from the player's point of view. */
export function storyText(world: World, a: Act): string {
  const who = nameFor(world, a.actor, true);
  const whom = a.target >= 0 ? nameFor(world, a.target) : '';
  switch (a.kind) {
    case 'putdown':
      if (a.outcome === 'defended' || a.outcome === 'backfired') return `${who} went after ${whom} and ${a.defender !== undefined ? nameFor(world, a.defender) : 'someone'} stood up for them.`;
      if (a.outcome === 'flipped') return `${who} tried to embarrass ${whom} and it totally backfired.`;
      return `${who} humiliated ${whom} in front of everyone.`;
    case 'shove':
      return `${who} shoved ${whom}.`;
    case 'exclude':
      return `${who} told ${whom} they couldn't sit with them.`;
    case 'report':
      return `${who} told a teacher about ${whom}.`;
    case 'askout':
      return `${who} asked ${whom} out — and they said ${a.success ? 'yes' : 'no'}.`;
    case 'breakup':
      return `${who} and ${whom} broke up.`;
    case 'star':
      return `${who} was amazing at ${a.place}.`;
    case 'sneakoff':
      return `${who} and friends got caught skipping behind the gym.`;
    case 'rumor':
      return `${who === 'You' ? 'You' : who} ${RUMORS[a.rumor ?? 0]}.`;
    case 'fallout':
      return `${who} and ${whom} had a big falling out.`;
    case 'cheat':
      return `${who} and ${whom} got caught copying homework.`;
    default:
      return `${who} did something people are talking about.`;
  }
}

/** A short note on how it went, shown after the line. */
export function outcomeNote(world: World, act: Act): string | null {
  switch (act.kind) {
    case 'joke':
      return act.success ? pick(['Big laugh.', 'People crack up.', 'It lands.']) : pick(['Crickets.', 'Polite smiles.', 'It falls flat.']);
    case 'tease':
      return act.friendly ? 'They laugh it off.' : 'That stung.';
    case 'invite':
      return act.success ? pick(['“Sure, sounds fun.”', '“Yeah, okay!”']) : act.leaveOut ? '“Can’t today, sorry!” — no big deal.' : '“Uh… I’m busy.” Awkward.';
    case 'putdown':
      switch (act.outcome) {
        case 'dominated':
          return 'A few people laugh. It worked.';
        case 'refused':
          return 'Nobody really laughs.';
        case 'walked':
          return 'They just walk away.';
        case 'flipped':
          return 'The table laughs — at the bully.';
        case 'defended':
          return `${nameFor(world, act.defender!, true)} steps in, and the bully backs off.`;
        case 'backfired':
          return `${nameFor(world, act.defender!, true)} steps in — and the bully turns on them.`;
      }
      return null;
    default:
      return null;
  }
}

/** How a target sounds, given how they responded to a put-down. */
export const RESPONSE_LINES: Record<NonNullable<Act['response']>, string[]> = {
  accept: ['I — I was just…', 'Sorry, I didn’t mean…', 'Okay, okay, I’ll go.'],
  snap: ['Shut up!', 'What is your problem?!', 'At least I’m not you.'],
  refuse: ['Why do you care so much?', 'Okay.', 'Cool story.', 'Did you practice that one?'],
  humor: ['Wow, you’ve been saving that one all week?', 'That’s the best you’ve got? I’m almost disappointed.', 'Thanks, I’ll put that on my list of things I don’t care about.'],
  walk: ['(picks up their tray and leaves)', '(shrugs and walks off)'],
};

/** The response cards you can play when someone puts you down. Being rattled limits your options. */
export interface ResponseCard {
  response: NonNullable<Act['response']>;
  title: string;
  blurb: string;
}

export function responseHand(world: World): ResponseCard[] {
  const me = playerOf(world);
  const composure = Math.max(0, Math.min(1, 0.6 * (1 - me.traits.N) + 0.4 * (1 - Math.min(1, me.stress)) + 0.3 * me.status + 0.3 * me.fitness + 0.35 * me.poise - 0.4));
  const all: ResponseCard[] = [
    { response: 'refuse', title: 'Don’t take the bait', blurb: 'Stay calm, or answer with a question. You don’t accept their frame.' },
    { response: 'humor', title: 'Turn it into a joke', blurb: me.abilities.humor > 0.5 ? 'You’re funny — flip it on them.' : 'Risky if you’re not that funny.' },
    { response: 'walk', title: 'Walk away calmly', blurb: 'Deny them a stage. Small loss, no win for them.' },
    { response: 'accept', title: 'Explain yourself', blurb: 'Justify, apologize, back down. They look powerful.' },
    { response: 'snap', title: 'Snap back', blurb: 'Fight fire with fire. You look rattled, and it can escalate.' },
  ];
  // Calm players see the good options; rattled players mostly see the bad ones.
  const good = all.slice(0, 3);
  const bad = all.slice(3);
  const goodCount = composure > 0.6 ? 3 : composure > 0.35 ? 2 : 1;
  return [...good.slice(0, goodCount), ...bad];
}
