import { ABILITIES, INTERESTS, OPINION_TOPICS, type Interest } from './content';
import { applyAct } from './perceive';
import { approachability, displayAbility, meet, nudge, nudge01, pairKey, peek, schoolKnowledge } from './rel';
import { clamp, sigmoid } from './rng';
import { count, createStory, describe, isStoryworthy, logLine, pickStoryToTell, tellStory } from './stories';
import type { Act, ActKind, Student, Witness, World } from './types';

/** How far trust can grow from time together at school alone. */
const SCHOOL_TRUST_CAP = 0.25;

export interface ConvoOptions {
  /** A teacher is in the room: put-downs are rarer, shoves don't happen. */
  teacher?: boolean;
  /** Free time with friends: counts toward who-hangs-out-with-whom. */
  hangout?: boolean;
  /** Only participants can see (a private hangout). */
  private?: boolean;
  /**
   * How much this time together still adds (0–1). Lower when the same people have been spending
   * night after night together: more of the same adds less closeness each time. Defaults to 1.
   */
  freshness?: number;
}

/** Something that happened in a conversation, for the game to show. */
export type ConvoEvent = { kind: 'act'; act: Act } | { kind: 'phone'; actor: number };

/** A put-down the human player has to respond to: aimed at them, or at someone else in front of them. */
export type PendingChoice = { kind: 'challenge'; act: Act } | { kind: 'witness'; act: Act };

/** How a target can respond to a put-down (see frame contests in the design). */
export type ChallengeResponse = NonNullable<Act['response']>;

export interface Convo {
  place: string;
  members: number[];
  onlookers: number[];
  interest: Interest | null;
  topic: number | null;
  opts: ConvoOptions;
  /** Set when a human player is in this conversation and playing it themselves. */
  player?: number;
  /** What happened, in order (only kept for the player's conversation). */
  log?: ConvoEvent[];
  /** A put-down waiting on the player's response. */
  pending?: PendingChoice;
}

function emit(c: Convo, act: Act) {
  c.log?.push({ kind: 'act', act });
}

/**
 * A conversation is a little card game: each round, each member may play a card.
 * NPCs pick cards by personality and their read of the moment.
 */
export function runConversation(world: World, members: number[], onlookers: number[], place: string, rounds: number, opts: ConvoOptions = {}) {
  if (members.length < 2) return;
  const c = openConvo(world, members, onlookers, place, opts);
  for (let round = 0; round < rounds; round++) {
    for (const id of world.rng.shuffle([...c.members])) {
      if (!npcTurn(world, c, id)) return;
    }
  }
}

/** Start a conversation: shirts get noticed, and time together builds familiarity. */
function openConvo(world: World, members: number[], onlookers: number[], place: string, opts: ConvoOptions): Convo {
  const c: Convo = { place, members: [...members], onlookers, interest: null, topic: null, opts };
  const { students } = world;

  // Shirts are a public opinion: everyone in the conversation notices, and fans of the same thing have an opener.
  for (const m of c.members) {
    const shirt = students[m].shirt;
    if (shirt === null) continue;
    applyAct(world, { kind: 'opinion', actor: m, target: -1, place, day: world.day, topic: shirt, stance: 0.8 }, c.members.filter((x) => x !== m).map((id) => ({ id, wt: 0.3 })));
    if (c.topic === null && c.members.some((x) => x !== m && students[x].opinions[shirt] > 0.4)) c.topic = shirt;
  }

  // Mere exposure: time together builds familiarity.
  for (const a of c.members)
    for (const b of c.members) {
      if (a === b) continue;
      const r = meet(world, students[a], students[b]);
      r.fam = nudge01(r.fam, 0.025);
      // Liking grows with time together, faster between people with things in common.
      const fresh = opts.freshness ?? 1;
      r.aff = nudge(r.aff, fresh * (0.004 + 0.02 * similarity(students[a], students[b])));
      // Being around someone, you notice what they're good at.
      const sb = students[b];
      const top = ABILITIES.reduce((x, y) => (sb.abilities[y] > sb.abilities[x] ? y : x), ABILITIES[0]);
      displayAbility(world, students[a], sb, top, sb.abilities[top], 0.12);
      // Choosing to spend free time together is a costly signal: it builds trust between people who like each other.
      // Time at school can make you friendly, but real closeness needs time outside it: trust from
      // public time together tops out at SCHOOL_TRUST_CAP; only private time takes it further.
      if (r.aff > 0.15 && (opts.private || r.trust < SCHOOL_TRUST_CAP)) r.trust = nudge(r.trust, fresh * (opts.private ? 0.02 : opts.hangout ? 0.006 : 0.003));
      if (opts.hangout && a < b) world.hangout.set(pairKey(a, b), (world.hangout.get(pairKey(a, b)) ?? 0) + 1);
    }
  return c;
}

/** One simulated student's turn. Returns false if the conversation has ended. */
function npcTurn(world: World, c: Convo, id: number): boolean {
  const { rng, students } = world;
  const s = students[id];
  if (!c.members.includes(id)) return true;
  if (s.energy < 0.1) return true;
  // Checking your phone mid-conversation: you say less, and the others feel a little less close to you.
  if (rng.chance(0.5 * s.phoneHabit)) {
    for (const o of c.members) if (o !== id) {
      const r = meet(world, students[o], s);
      r.aff = nudge(r.aff, -0.008);
    }
    count(world, 'phoneChecks');
    c.log?.push({ kind: 'phone', actor: id });
    return true;
  }
  // Tired people say less: being rested pays off socially.
  if (!rng.chance((0.25 + 0.5 * s.traits.E) * (0.5 + 0.5 * s.energy))) return true;
  const act = chooseCard(world, s, c);
  if (!act) return true;
  // In the player's conversation, a put-down waits for the player: they respond to it, or decide whether to step in.
  if (c.player !== undefined && act.kind === 'putdown') {
    c.pending = act.target === c.player ? { kind: 'challenge', act } : { kind: 'witness', act };
    spendEnergy(s);
    return true;
  }
  resolve(world, c, act);
  spendEnergy(s);
  return c.members.length >= 2;
}

/** Introverts spend energy talking; extroverts barely do. */
function spendEnergy(s: Student) {
  s.energy = clamp(s.energy - 0.02 * (1.2 - s.traits.E) * (1 - 0.4 * s.fitness), 0, 1);
}

/*
 * Playing a conversation with a human player. The game opens one, then alternates: the player plays a
 * card, then everyone else takes a turn. A put-down involving the player pauses things until they answer.
 */

export function openPlayerConversation(world: World, members: number[], onlookers: number[], place: string, opts: ConvoOptions = { hangout: true }): Convo {
  const c = openConvo(world, members, onlookers, place, opts);
  c.player = world.player!.id;
  c.log = [];
  return c;
}

/**
 * The player plays a card (an act they've built). The game charges the card's energy cost (see
 * cardCost in the game's cards), so nothing more is spent here.
 */
export function playerPlays(world: World, c: Convo, act: Act) {
  prepareAct(world, c, act);
  resolve(world, c, act);
}

/** Everyone else in the player's conversation takes a turn, stopping early if a put-down needs the player's answer. */
export function othersTakeTurns(world: World, c: Convo) {
  for (const id of world.rng.shuffle(c.members.filter((m) => m !== c.player))) {
    if (c.pending) return;
    if (!npcTurn(world, c, id)) return;
  }
}

/** The player answers a pending put-down: how they respond if it's aimed at them, or whether they step in if not. */
export function playerAnswers(world: World, c: Convo, answer: { response?: ChallengeResponse; defend?: boolean }) {
  const pending = c.pending;
  if (!pending) return;
  c.pending = undefined;
  resolvePutdown(world, c, pending.act, pending.kind === 'challenge' ? { response: answer.response } : { playerDefends: !!answer.defend });
}

/** The player leaves the conversation. */
export function playerLeaves(c: Convo) {
  c.members = c.members.filter((m) => m !== c.player);
}

/** Roll the dice on cards that can go either way (a joke landing, how a tease is taken). */
export function prepareAct(world: World, c: Convo, act: Act) {
  const s = world.students[act.actor];
  if (act.kind === 'joke' && act.success === undefined) act.success = world.rng.chance(clamp(0.15 + 0.75 * s.abilities.humor, 0.05, 0.95));
  if (act.kind === 'tease' && act.friendly === undefined && act.target >= 0) {
    const t = world.students[act.target];
    const tr = meet(world, t, s);
    act.friendly = world.rng.chance(sigmoid(4 * (tr.aff + 0.3 * tr.trust) - 2.5 * (t.traits.N - 0.5) + 2 * (s.traits.A - 0.5)));
  }
  if (act.kind === 'opinion' && act.topic !== undefined) c.topic = act.topic;
  if (act.kind === 'lore' && act.interest) c.interest = act.interest;
}

/** Help with schoolwork is in most demand in the week before and the week of an exam. */
export function examSoon(world: World): boolean {
  const week = Math.floor(world.day / 7);
  return week === 6 || week === 7 || week === 14 || week === 15;
}

/** 0..1: shared interests and agreeing opinions. */
export function similarity(a: Student, b: Student): number {
  let interests = 0;
  for (const i of INTERESTS) interests += Math.min(a.interests[i], b.interests[i]);
  let agree = 0;
  for (let t = 0; t < a.opinions.length; t++) agree += a.opinions[t] * b.opinions[t];
  return clamp(0.5 * Math.min(1, interests / 1.2) + 0.5 * (0.5 + agree / a.opinions.length), 0, 1);
}

function others(c: Convo, id: number): number[] {
  return c.members.filter((m) => m !== id);
}

/** Pick someone in the conversation, weighted by how much `s` likes them. */
/**
 * How tempting `wearer`'s shirt is to tease, for `s`: a funny graphic tee draws teasing from edgy people;
 * a fan shirt from people who can't stand the thing. A plain tee gives nothing to grab onto, and a
 * hoodie makes you harder to tease at all (see the tease move).
 */
export function shirtTeaseAppeal(s: Student, wearer: Student): number {
  if (wearer.shirtStyle === 'graphic') return 0.25 * Math.max(0, 0.6 - s.traits.A);
  if (wearer.shirtStyle === 'fan' && wearer.shirt !== null) return 0.5 * Math.max(0, -s.opinions[wearer.shirt] - 0.3);
  return 0;
}

function pickWarmTarget(world: World, s: Student, c: Convo): number {
  const os = others(c, s.id);
  return os[world.rng.weighted(os.map((o) => 0.2 + Math.max(0, peek(world, s.id, o)?.aff ?? 0)))];
}

/** How easy `t` would be to put down: few people present who'd stand up for them. */
function vulnerability(world: World, bully: Student, t: Student, c: Convo): number {
  let protection = t.status * 0.8;
  for (const m of c.members.concat(c.onlookers)) {
    if (m === t.id || m === bully.id) continue;
    const r = peek(world, m, t.id);
    if (!r) continue;
    const fearOfBully = peek(world, m, bully.id)?.fear ?? 0;
    protection += Math.max(0, r.trust * 0.6 + r.aff * 0.4) * (1 - fearOfBully) * 0.6;
  }
  // Someone who makes a point of never being alone is hard to pick on.
  if (world.day < t.stickCloseUntil) protection += 0.4;
  // Rivals just above you are tempting; people far above are dangerous.
  const gap = t.status - bully.status;
  const rivalry = gap > 0 && gap < 0.15 ? 0.3 : gap > 0.15 ? -0.5 : 0;
  return clamp(1 - protection + rivalry, 0, 1);
}

function chooseCard(world: World, s: Student, c: Convo): Act | null {
  const { rng, students } = world;
  const T = s.traits;
  const os = others(c, s.id);
  const base = { actor: s.id, place: c.place, day: world.day, target: -1 } as const;

  // Dominance attempt: weighed separately because it depends on who's vulnerable.
  let bullyTarget = -1;
  let bullyWeight = 0;
  // Strategic put-downs tempt people in the middle and upper-middle of the ladder: they have standing to use
  // and something left to gain. At the bottom nobody laughs; at the very top there's nothing to gain.
  // Insecurity — having just slipped — makes it more tempting.
  const slipped = Math.max(0, s.statusLastWeek - s.status);
  const dominance = s.statusDrive * (1 - T.A) * 2.2 * s.status ** 1.5 * (1 - s.status ** 6) * (1 + 3 * slipped);
  if (dominance > 0.18 && world.day >= s.inTroubleUntil) {
    const record = (s.bullyWins + 1) / (s.bullyAttempts + 2);
    for (const o of os) {
      const v = vulnerability(world, s, students[o], c);
      const grudge = Math.max(0, -(peek(world, s.id, o)?.aff ?? 0));
      const fixated = s.fixTarget === o && world.day < s.fixUntil ? 3 : 1;
      const w = 1.6 * dominance * v * record * (1 + 3 * grudge) * fixated * (c.onlookers.length + os.length > 2 ? 1 : 0.3);
      if (w > bullyWeight) {
        bullyWeight = w;
        bullyTarget = o;
      }
    }
    if (c.opts.teacher) bullyWeight *= 0.25;
  }

  // Lashing out: stressed, sensitive, prickly kids sometimes strike back at someone who has been hurting them.
  // This isn't strategy, and it mostly backfires.
  let reactive = false;
  const temper = s.stress * s.traits.N * (1 - T.A);
  if (temper > 0.05) {
    for (const o of os) {
      const hurt = peek(world, s.id, o)?.hurt ?? 0;
      const w = 4 * temper * Math.min(1, hurt);
      if (w > bullyWeight) {
        bullyWeight = w;
        bullyTarget = o;
        reactive = true;
      }
    }
  }

  const story = rng.chance(s.gossipy) ? pickStoryToTell(world, s, students[rng.pick(os)], new Set(c.members)) : null;
  // Shirts hand people something to say: a shirt that draws me gives me an easy opener about it; one I'd
  // make fun of (a funny tee, if I'm edgy; a fan shirt about something I can't stand) gives me a tease.
  const shirtOpener = os.find((o) => approachability(s, students[o]) > 1.2);
  const shirtTease = os.find((o) => shirtTeaseAppeal(s, students[o]) > 0);
  const maxInterest = INTERESTS.reduce((m, i) => Math.max(m, s.interests[i]), 0);

  const options: [ActKind, number][] = [
    ['listen', 0.5 + 0.6 * T.A],
    ['ask', 0.4 + 0.4 * T.O + (shirtOpener !== undefined ? 0.4 : 0)],
    ['agree', 0.3 + 0.5 * s.conformity],
    ['opinion', 0.4 + 0.5 * T.E],
    ['lore', c.interest ? 1.2 * s.interests[c.interest] : 0.4 * maxInterest],
    ['joke', (0.15 + 0.5 * s.abilities.humor) * (0.5 + T.E)],
    ['tease', 0.12 + 0.4 * (1 - T.A) + (shirtTease !== undefined ? shirtTeaseAppeal(s, students[shirtTease]) : 0)],
    ['compliment', 0.12 + 0.3 * T.A],
    ['share', 0.12 + 0.25 * T.O],
    // In class, people good at schoolwork get asked for help; elsewhere, help shows off whatever you're good at.
    ['help', 0.1 + 0.2 * T.A + (c.opts.teacher ? 0.8 * schoolKnowledge(s) * (examSoon(world) ? 2 : 1) : 0.3 * Math.max(s.abilities.tech, s.abilities.arts))],
    ['brag', 0.08 + 0.45 * s.statusDrive * (1 - T.A)],
    ['gossip', story ? 1.2 * story.juice : 0],
    ['putdown', bullyWeight],
  ];
  // When the player's character is on autopilot (hallway, class), they never bully or gossip — those are the player's call.
  if (world.player?.id === s.id) for (const o of options) if (o[0] === 'putdown' || o[0] === 'gossip') o[1] = 0;
  const kind = options[rng.weighted(options.map((o) => o[1]))][0];

  switch (kind) {
    case 'ask':
      if (shirtOpener !== undefined && rng.chance(0.6)) {
        const wearer = students[shirtOpener];
        return { ...base, kind, target: shirtOpener, aboutShirt: true, topic: wearer.shirt ?? undefined };
      }
      return { ...base, kind, target: pickWarmTarget(world, s, c) };
    case 'listen':
    case 'agree':
    case 'compliment':
      return { ...base, kind, target: pickWarmTarget(world, s, c) };
    case 'help': {
      const ability = c.opts.teacher ? 'academics' : ABILITIES.reduce((b, a) => (s.abilities[a] > s.abilities[b] ? a : b), ABILITIES[0]);
      return { ...base, kind, target: pickWarmTarget(world, s, c), ability };
    }
    case 'share': {
      const t = pickWarmTarget(world, s, c);
      // Anxious, open people sometimes overshare early.
      const depth = clamp(0.2 + 0.5 * rng.next() * (0.5 + T.N), 0, 1);
      return { ...base, kind, target: t, stance: depth };
    }
    case 'opinion': {
      const topic = c.topic ?? strongestOpinion(s);
      let stance = s.opinions[topic];
      // Read the room: what do the others seem to think?
      const norm = os.reduce((sum, o) => sum + students[o].opinions[topic], 0) / os.length;
      if (Math.sign(norm) !== Math.sign(stance) && Math.abs(norm) > 0.2 && rng.chance(s.conformity * (0.3 + s.statusDrive))) {
        stance = Math.sign(norm) * 0.6;
        count(world, 'fakeOpinions');
      }
      c.topic = topic;
      return { ...base, kind, topic, stance };
    }
    case 'lore': {
      const interest = c.interest ?? INTERESTS.reduce((best, i) => (s.interests[i] > s.interests[best] ? i : best), INTERESTS[0]);
      c.interest = interest;
      return { ...base, kind, interest };
    }
    case 'joke': {
      const success = rng.chance(clamp(0.15 + 0.75 * s.abilities.humor, 0.05, 0.95));
      return { ...base, kind, success };
    }
    case 'tease': {
      // A shirt that invites it gets teased; mocking a fan's shirt is rarely friendly.
      const aboutShirt = shirtTease !== undefined && rng.chance(0.6);
      let t = aboutShirt ? shirtTease! : pickWarmTarget(world, s, c);
      // Someone in a hoodie is hard to get a rise out of: often you pick someone else, or let it go.
      if (!aboutShirt && students[t].shirtStyle === 'hoodie' && rng.chance(0.5)) {
        const notHooded = os.filter((o) => students[o].shirtStyle !== 'hoodie');
        if (!notHooded.length) return { ...base, kind: 'agree', target: pickWarmTarget(world, s, c) };
        t = rng.pick(notHooded);
      }
      const tr = meet(world, students[t], s);
      const mocking = aboutShirt && students[t].shirtStyle === 'fan' ? 1 : 0;
      const friendly = rng.chance(sigmoid(4 * (tr.aff + 0.3 * tr.trust) - 2.5 * (students[t].traits.N - 0.5) + 2 * (T.A - 0.5) - 2 * mocking));
      return { ...base, kind, target: t, friendly, aboutShirt: aboutShirt || undefined, topic: aboutShirt ? (students[t].shirt ?? undefined) : undefined };
    }
    case 'brag':
      return { ...base, kind, ability: ABILITIES.reduce((b, a) => (s.abilities[a] > s.abilities[b] ? a : b), ABILITIES[0]) };
    case 'gossip':
      if (!story) return null;
      return { ...base, kind, storyId: story.id };
    case 'putdown':
      if (reactive) count(world, 'lashOuts');
      return { ...base, kind, target: bullyTarget, reactive };
  }
  return null;
}

function strongestOpinion(s: Student): number {
  let best = 0;
  for (let i = 1; i < OPINION_TOPICS.length; i++) if (Math.abs(s.opinions[i]) > Math.abs(s.opinions[best])) best = i;
  return best;
}

function witnessesFor(c: Convo, act: Act): Witness[] {
  const loud = act.kind === 'putdown' || act.kind === 'shove' || act.kind === 'askout' || act.kind === 'exclude';
  const ws: Witness[] = c.members.filter((m) => m !== act.actor).map((id) => ({ id, wt: 1 }));
  if (!c.opts.private) for (const id of c.onlookers) ws.push({ id, wt: loud ? 0.7 : 0.15 });
  return ws;
}

function resolve(world: World, c: Convo, act: Act) {
  const { students } = world;
  const s = students[act.actor];

  if (act.kind === 'gossip') {
    const story = world.stories.find((x) => x.id === act.storyId);
    if (!story) return;
    emit(c, act);
    for (const listener of others(c, s.id)) if (!story.knowers.has(listener)) tellStory(world, story, s, students[listener]);
    return;
  }

  // Giving attention and warmth counts as investing in the relationship (used for try-hard checks).
  if (act.target >= 0 && ['listen', 'ask', 'agree', 'compliment', 'help', 'share'].includes(act.kind)) {
    meet(world, s, students[act.target]).given += act.kind === 'agree' ? 0.05 : 0.1;
  }

  if (act.kind === 'putdown') {
    resolvePutdown(world, c, act);
    return;
  }

  const ws = witnessesFor(c, act);
  applyAct(world, act, ws);
  emit(c, act);
  if (act.kind === 'tease' && !act.friendly) maybeReport(world, students[act.target], s, c, 0.5);
  if (world.cfg.follow !== null && (act.actor === world.cfg.follow || act.target === world.cfg.follow)) logLine(world, describe(world, act));
}

/** Composure under pressure: temperament, stress, standing — plus fitness, and poise from performing. */
function composureOf(s: Student): number {
  return clamp(0.6 * (1 - s.traits.N) + 0.4 * (1 - Math.min(1, s.stress)) + 0.3 * s.status + 0.3 * s.fitness + 0.35 * s.poise - 0.4, 0, 1);
}

/**
 * Someone steps in. Whether the bully backs down is uncertain: it depends on the defender's
 * standing and composure versus the bully's, how many people present are on the defender's
 * side, and luck.
 */
function defenseHolds(world: World, c: Convo, bully: Student, defender: Student, target: Student): boolean {
  let allies = 0;
  for (const m of c.members.concat(c.onlookers)) {
    if (m === bully.id || m === defender.id || m === target.id) continue;
    if ((peek(world, m, target.id)?.aff ?? 0) > 0.3 || (peek(world, m, defender.id)?.aff ?? 0) > 0.3) allies++;
  }
  const mine = 0.5 * defender.status + 0.4 * composureOf(defender) + 0.1 * defender.fitness + 0.1 * Math.min(3, allies) + world.rng.normal(0, 0.2);
  const theirs = 0.5 * bully.status + 0.3 * (1 - bully.traits.N) + 0.2 + world.rng.normal(0, 0.2);
  return mine >= theirs;
}

/**
 * A put-down is a frame contest: did the target look small?
 * `choice` carries a human player's decisions: their response if they're the target, or whether they step in.
 */
function resolvePutdown(world: World, c: Convo, act: Act, choice?: { response?: ChallengeResponse; playerDefends?: boolean }) {
  const { rng, students } = world;
  const bully = students[act.actor];
  const target = students[act.target];
  bully.bullyAttempts++;
  bully.counts.putdowns++;
  // Record by the bully's status right now (not where they end up), split by strategic versus lashing out.
  const decile = Math.min(9, Math.floor(bully.status * 10));
  (act.reactive ? world.putdownsByDecile.lashOut : world.putdownsByDecile.strategic)[decile]++;
  target.counts.targeted++;

  // Does a friend step in? Groups that stick together move together.
  let defender: number | undefined;
  if (choice?.playerDefends) defender = c.player;
  else for (const m of rng.shuffle(c.members.concat(c.onlookers))) {
    if (m === bully.id || m === target.id) continue;
    if (choice?.playerDefends === false && m === c.player) continue;
    const d = students[m];
    const r = peek(world, m, target.id);
    if (!r) continue;
    const fear = peek(world, m, bully.id)?.fear ?? 0;
    const sameGroup = d.group >= 0 && d.group === target.group ? 0.1 : 0;
    // Owing someone makes me more likely to back them up.
    const p = clamp((Math.max(0, r.trust + 0.5 * r.aff) + r.owed) * d.loyalty * (1 - fear) * (0.4 + d.status) * (1.2 - d.traits.N) + sameGroup, 0, 0.8) * 0.6;
    if (rng.chance(p)) {
      defender = m;
      r.owed = Math.max(0, r.owed - 0.3); // backing them up pays the favor back
      break;
    }
  }

  // Composure decides which responses the target can manage.
  const composure = composureOf(target);
  const responses: [ChallengeResponse, number][] = [
    ['accept', (1 - composure) * 1.2],
    ['snap', target.traits.N * (1 - target.traits.A) * 0.8],
    ['refuse', composure],
    ['humor', composure * target.abilities.humor * 0.45],
    ['walk', 0.3],
  ];
  const response = choice?.response ?? responses[rng.weighted(responses.map((x) => x[1]))][0];

  let outcome: Act['outcome'];
  if (defender !== undefined) outcome = defenseHolds(world, c, bully, students[defender], target) ? 'defended' : 'backfired';
  else if (response === 'refuse') outcome = 'refused';
  else if (response === 'walk') outcome = 'walked';
  else if (response === 'humor') outcome = rng.chance(target.abilities.humor) ? 'flipped' : 'dominated';
  else outcome = 'dominated';

  // Did the audience laugh along? Depends on how they see the bully versus the target.
  const audience = c.members.concat(c.onlookers).filter((m) => m !== bully.id && m !== target.id);
  let laugh = 0;
  for (const m of audience) {
    const pb = peek(world, m, bully.id);
    const pt = peek(world, m, target.id);
    laugh += sigmoid(3 * ((pb?.pub ?? 0) + (pb?.fear ?? 0) - Math.max(0, pt?.aff ?? 0)) + 2 * (bully.status - 0.5));
  }
  laugh = audience.length ? laugh / audience.length : 0;
  // Most audiences don't enjoy it: unless most of them laugh along, it falls flat.
  if (outcome === 'dominated' && laugh < 0.55) outcome = 'refused';
  if (outcome === 'dominated') {
    bully.bullyWins++;
    target.counts.dominated++;
  }

  const full: Act = { ...act, outcome, defender, response };
  const ws = witnessesFor(c, full);
  applyAct(world, full, ws);
  emit(c, full);
  if (defender !== undefined) {
    const d = students[defender];
    d.counts.defended++;
    // The bully holds a grudge, more so if they were made to back down.
    const br = meet(world, bully, d);
    br.aff = nudge(br.aff, outcome === 'defended' ? -0.3 : -0.15);
    // The target now owes the defender: they're more likely to stand up for them in turn.
    const tr = meet(world, target, d);
    tr.owed = Math.min(1, tr.owed + 0.5);
    if (outcome === 'defended') d.counts.defenseWon++;
    else {
      // The bully turned on the defender: now they're the one hurt and rattled.
      const dr = meet(world, d, bully);
      dr.hurt += 1;
      dr.fear = nudge01(dr.fear, 0.05);
      d.stress += 0.15;
      d.counts.targeted++;
    }
    // Standing up for someone who once stood up for you.
    if (world.stoodUpFor.has(target.id * 100000 + defender)) count(world, 'favorReturned');
    world.stoodUpFor.add(defender * 100000 + target.id);
    count(world, outcome === 'defended' ? 'defenseHeld' : 'defenseBackfired');
  }
  if (isStoryworthy(full, world)) createStory(world, full, ws);

  // A bully who's been stood up to and is losing face may shove the defender. No shoving with a teacher present.
  if (outcome === 'backfired' && defender !== undefined && !c.opts.teacher && rng.chance(0.15 * (1 - bully.traits.A))) {
    const shove: Act = { kind: 'shove', actor: bully.id, target: defender, place: c.place, day: world.day };
    bully.counts.shoves++;
    const sw = witnessesFor(c, shove);
    applyAct(world, shove, sw);
    emit(c, shove);
    createStory(world, shove, sw);
    maybeReport(world, students[defender], bully, c, 1);
    return;
  }
  // Rattled, short-tempered targets sometimes escalate. No shoving with a teacher present.
  if (response === 'snap' && !c.opts.teacher && world.rng.chance(0.08 * (1 - bully.traits.A) * 2)) {
    const shove: Act = { kind: 'shove', actor: bully.id, target: target.id, place: c.place, day: world.day };
    bully.counts.shoves++;
    const sw = witnessesFor(c, shove);
    applyAct(world, shove, sw);
    emit(c, shove);
    createStory(world, shove, sw);
    maybeReport(world, target, bully, c, 1);
    return;
  }
  maybeReport(world, target, bully, c, 0.6);
}

/**
 * Whether the target tells an adult. Serious, repeated stuff gets reported more and the report works;
 * reporting minor things marks you as a snitch.
 */
function maybeReport(world: World, victim: Student, offender: Student, c: Convo, base: number) {
  const r = meet(world, victim, offender);
  const severity = r.hurt;
  const T = victim.traits;
  // Over-reporters: sensitive, low-status-drive kids report small things too.
  const p = base * (severity >= 2 ? 0.25 : 0.03 * (0.5 + T.N)) * (0.6 + 0.4 * T.A) * (1.2 - victim.statusDrive);
  if (!world.rng.chance(p)) return;
  victim.counts.reports++;
  const act: Act = { kind: 'report', actor: victim.id, target: offender.id, place: c.place, day: world.day, severity };
  // Reports are mostly private, but word gets around; the reported student always knows.
  const ws: Witness[] = [{ id: offender.id, wt: 1 }];
  for (const m of c.members.concat(c.onlookers)) if (m !== victim.id && m !== offender.id && world.rng.chance(0.3)) ws.push({ id: m, wt: 0.6 });
  applyAct(world, act, ws);
  emit(c, act);
  createStory(world, act, ws);
  if (severity >= 2) {
    // A teacher steps in: the offender is watched for two weeks and loses some fear-power.
    offender.inTroubleUntil = world.day + 14;
    count(world, 'reportsActedOn');
  } else {
    count(world, 'reportsMinor');
  }
  r.hurt = 0;
}
