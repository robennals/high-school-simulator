import type { Ability, ActivityId, Interest, Look, Quality, ShirtStyle } from './content';
import type { Rng } from './rng';

export type Gender = 'boy' | 'girl';

/** How a student spends an evening. */
export type EveningChoice = 'study' | 'friends' | 'practice' | 'rest' | 'phone';

/**
 * For strategy experiments: one evening choice every night, a rotation through several, or
 * 'adaptive' — a sensible player's mix that responds to how things are going.
 */
export type EveningPlan = EveningChoice | readonly EveningChoice[] | 'adaptive';

export interface Traits {
  /** Openness: curiosity, less bound by group opinion norms. */
  O: number;
  /** Conscientiousness: reliability. */
  C: number;
  /** Extraversion: energy from people. */
  E: number;
  /** Agreeableness: warmth versus edge. */
  A: number;
  /** Neuroticism: sensitivity, reads ambiguity as hostile. */
  N: number;
}

export const TAGS = ['mean', 'fake', 'gossip', 'tryhard', 'snitch', 'funny', 'loyal', 'kind', 'troublemaker'] as const;
export type Tag = (typeof TAGS)[number];

/** What one student privately thinks of another, plus what they show publicly. */
export interface Rel {
  /** Do I like being around them? -1..1 */
  aff: number;
  /** Would they back me up / keep my secrets? -1..1 */
  trust: number;
  /** Do they have abilities or access I value? -1..1 */
  resp: number;
  /** Can they hurt me? 0..1 */
  fear: number;
  /** How well do I know them? 0..1 */
  fam: number;
  /** How I act toward them in front of others. Recomputed nightly. */
  pub: number;
  /** How much I've recently invested in them (approaches, compliments, invites). Decays. */
  given: number;
  /** Recent hurtful acts they did to me. Decays. Drives reporting to adults. */
  hurt: number;
  /** How much I owe them for help they've given me. Decays, and is paid down when I back them up. */
  owed: number;
  /** Reputation labels I've formed about them. */
  tags: Partial<Record<Tag, number>>;
  /** Stances I've heard them state, by opinion topic index. Used to catch two-facing. */
  said: Map<number, number> | null;
}

export interface Student {
  id: number;
  first: string;
  last: string;
  gender: Gender;
  skin: number;
  hair: number;
  feeder: number;

  traits: Traits;
  statusDrive: number;
  loyalty: number;
  conformity: number;
  /** Share of my reference set that must turn on (or embrace) someone before I follow. */
  threshold: number;
  gossipy: number;
  /** How strongly I prefer friends of my own gender. */
  sameGenderPref: number;

  /** What I wear: an overall look, a kind of shirt, and for a fan shirt what it's about (an opinion topic index). */
  look: Look;
  shirtStyle: ShirtStyle;
  /** The look I'd wear if nobody were watching. */
  ownLook: Look;
  shirt: number | null;

  admires: Record<Quality, number>;
  abilities: Record<Ability, number>;
  interests: Record<Interest, number>;
  opinions: number[];

  activity: ActivityId | null;
  /** Class section for each of six periods. */
  sections: number[];
  /** Seat within the section for each period. */
  seats: number[];

  energy: number;
  stress: number;

  /** Physical conditioning, 0–1. Built by sports practice; gives more energy, faster recovery from stress, steadier composure. */
  fitness: number;
  /** Ease in front of an audience, 0–1. Built by performing (drama); steadies you when challenged in public. */
  poise: number;

  /** Pull toward breaking rules (skipping class, sneaking off), 0–1. Drifts toward close friends' level. */
  ruleBreaking: number;

  /** Current grades, 0–1: a running average of study effort and academic ability. */
  grades: number;
  /** How strict my parents are about grades: sets the bar, and how likely they are to ground me. */
  parentStrictness: number;
  /** Day until which I'm grounded: no hanging out after school, in the evening, or at weekends. */
  groundedUntil: number;
  /** How hooked I am on my phone, 0–1. Grows each phone evening, fades slowly without. */
  phoneHabit: number;
  /** Day until which I'm out of school (sick). Gone students have moved away for good. */
  absentUntil: number;
  gone: boolean;
  /** Extra grade bar from parents who've gotten stricter, and until when. */
  parentBarBoost: number;
  strictUntil: number;
  /** Until this day I'm the new kid: warmth toward me counts for more (I'm grateful for it). */
  newUntil: number;
  /** Until this day a friend is helping me catch up: my study nights go further. */
  tutoredUntil: number;
  /** A bully's fixation: who they have it in for, and until when. */
  fixTarget: number | null;
  fixUntil: number;
  /** Until this day I'm making a point of never being alone (harder to pick on). */
  stickCloseUntil: number;
  /** What I did on my last few evenings: doing the same thing night after night pays off less each time. */
  recentEvenings: EveningChoice[];
  /** Whether I spent this evening on homework. */
  studiedTonight: boolean;

  /** Yesterday's table index per free-time place, and who sat there. */
  lastTable: Record<string, number>;
  lastMates: Record<string, number[]>;
  /** The handful of people I watch to judge who's in and out. */
  refSet: number[];
  group: number;

  bullyAttempts: number;
  bullyWins: number;
  /** Day until which a teacher is watching this student (after a report). */
  inTroubleUntil: number;

  crush: number | null;
  /** How far up the invite ladder I've got with my crush (0–3). */
  crushStep: number;
  partner: number | null;

  /** Status percentile at the end of last week, to notice slipping. */
  statusLastWeek: number;
  /** Global status as a 0–1 percentile, recomputed nightly. */
  status: number;
  /** Raw PageRank deference score (mean 1). */
  statusRaw: number;
  /** What my standing rests on: shares of the deference I get that come from being liked,
   *  from being admired (prestige), and from fear or just following the crowd (dominance). Sum to 1. */
  foundation: { liked: number; admired: number; feared: number };

  rels: Map<number, Rel>;
  /** Recent stories I know, in the order I learned them. */
  knownStories: Story[];

  /** Running counters for metrics. */
  counts: { aloneLunches: number; targeted: number; dominated: number; putdowns: number; shoves: number; reports: number; defended: number; defenseWon: number; phoneNights: number; approachedForShirt: number; stressTotal: number; behindGym: number; caught: number };
}

export type ActKind =
  | 'greet'
  | 'ask'
  | 'listen'
  | 'agree'
  | 'opinion'
  | 'lore'
  | 'joke'
  | 'tease'
  | 'compliment'
  | 'share'
  | 'help'
  | 'brag'
  | 'gossip'
  | 'putdown'
  | 'exclude'
  | 'shove'
  | 'report'
  | 'ditch'
  | 'askout'
  | 'breakup'
  | 'star'
  | 'sneakoff'
  | 'invite'
  | 'rumor'
  | 'fallout'
  | 'cheat';

/** 'defended': someone stepped in and the bully backed down. 'backfired': someone stepped in and the bully turned on them. */
export type PutdownOutcome = 'dominated' | 'refused' | 'flipped' | 'defended' | 'backfired' | 'walked';

export interface Act {
  kind: ActKind;
  actor: number;
  target: number;
  place: string;
  day: number;
  topic?: number;
  interest?: Interest;
  stance?: number;
  success?: boolean;
  /** For teases: how the target took it. */
  friendly?: boolean;
  outcome?: PutdownOutcome;
  defender?: number;
  severity?: number;
  /** For 'star': which ability was on display. */
  ability?: Ability;
  /** For 'gossip': which story is being told. */
  storyId?: number;
  /** For 'putdown': how the target responded. */
  response?: 'accept' | 'snap' | 'refuse' | 'humor' | 'walk';
  /** For 'putdown': lashing out at someone who hurt you, rather than a status play. */
  reactive?: boolean;
  /** For 'invite': whether the invite gave them an easy way out ("no worries if you're busy"). */
  leaveOut?: boolean;
  /** For 'rumor': which made-up story it is. */
  rumor?: number;
  /** For 'sneakoff': whether a teacher caught them. */
  caught?: boolean;
  /** For 'askout': whether they skipped the invite ladder. */
  skippedLadder?: boolean;
  /** For 'ask': the opener was about the shirt they're wearing. */
  aboutShirt?: boolean;
}

export interface Knower {
  from: number;
  belief: number;
  day: number;
}

export interface Story {
  id: number;
  act: Act;
  juice: number;
  /** Who knows the story, who they heard it from (-1 = saw it), and how much they believe it. */
  knowers: Map<number, Knower>;
}

export interface Witness {
  id: number;
  wt: number;
}

/** A running storyteller event, e.g. a group project. */
export interface ActiveEvent {
  kind: 'project';
  members: number[];
  until: number;
  /** How hard each member is working: 'lead' | 'split' | 'coast'. */
  effort: Map<number, 'lead' | 'split' | 'coast'>;
}

/** A decision for the human player. */
export interface PlayerPrompt {
  title: string;
  text: string;
  options: { id: string; label: string; text: string }[];
  choose: (id: string) => void;
}

/** What a human player picks when creating their character. */
export interface PlayerSetup {
  first: string;
  last: string;
  gender: Gender;
  /** Points per ability, 0–5 each, summing to the shared budget. */
  abilityPoints: Record<Ability, number>;
  traits: Traits;
  look: Look;
  shirtStyle: ShirtStyle;
  shirt: number | null;
  /** Two or three interests you're into. */
  interests: Interest[];
}

/** Choices the human player has made for the current day or week. */
export interface PlayerState {
  id: number;
  /** The activity you tried out or signed up for. */
  signup: ActivityId | null;
  afterSchool: 'activity' | 'hangout' | 'gym' | 'home';
  /** People who said yes to hanging out with you after school today. */
  hangoutWith: number[];
  /** Close friends the player chose to call tonight. */
  callFriends: number[];
  /** Someone whose Saturday invitation the player accepted. */
  weekendHost: number | null;
  weekend: 'out' | 'home';
}

export interface SimConfig {
  students: number;
  weeks: number;
  seed: number;
  /** If set, log every act involving this student. */
  follow: number | null;
  /**
   * Seed for what happens during the semester, separate from `seed`, which builds the school.
   * Same school + different event seed = same students, different luck. Defaults to `seed`.
   */
  eventSeed?: number;
  /** Random events (group projects, illness, new students, rumors, ...). Defaults to on. */
  storyteller?: boolean;
  /** A human player's character; they become student 0, arriving from a small school. */
  player?: PlayerSetup;
  /** Whether phones exist (turn off to test what the phone costs). Defaults to true. */
  phones?: boolean;
  /** Strategy experiments: put these students in this activity (null = none), skipping tryouts. */
  forcedActivity?: Map<number, ActivityId | null>;
  /** Strategy experiments: these students always wear this kind of shirt. */
  forcedShirt?: Map<number, ShirtStyle>;
  /** Strategy experiments: these students always spend evenings this way (when they can). */
  forcedEvening?: Map<number, EveningPlan>;
}

export interface PlayerAfternoon {
  /** Where: an activity's name, 'behind the gym', or 'after school' (hanging out). */
  place: string;
  /** Groups the player can join (one group when hanging out with friends). */
  groups: number[][];
  rounds: number;
  /** A private hangout: only the people there see what's said. */
  private: boolean;
}

export interface World {
  cfg: SimConfig;
  rng: Rng;
  day: number;
  students: Student[];
  stories: Story[];
  /** Notable events in plain English. */
  log: string[];
  /** Who spent free time with whom this week (pair key -> weight). */
  hangout: Map<number, number>;
  lastHangout: Map<number, number>;
  /** Per-day counters for metrics. */
  tally: Record<string, number>;
  nextStoryId: number;
  /** Students with at most one close friend at the end of week 1 (for tracking who gets pulled into which crowd). */
  startedLonely: Set<number>;
  /** The human player, if there is one. */
  player?: PlayerState;
  /**
   * The player's conversation this afternoon, left for the game to play (the simulation doesn't play
   * it for them): the groups they could join at practice or behind the gym, or the friends they're
   * hanging out with. Null when they went home or nobody was around.
   */
  playerAfternoon?: PlayerAfternoon | null;
  /** Called for every act anyone sees or hears about (the game uses it to build the player's feed and recap). */
  onAct?: (act: Act, witnesses: Witness[], hearsay: boolean) => void;
  /** Events the storyteller has set going, still running. */
  events: ActiveEvent[];
  /** Decisions the human player needs to make (the game shows these at the start of the day). */
  prompts: PlayerPrompt[];
  /** The storyteller announcing something to the player. */
  onStory?: (text: string, people: number[], aboutPlayer: boolean) => void;
  /** Someone found out who was spreading a story about them. */
  onTraced?: (victim: Student, teller: Student, story: Story) => void;
  /** Called whenever a story is passed on. */
  onTold?: (story: Story, teller: Student, listener: Student) => void;
  /** Put-downs counted by the bully's status decile at the moment they did it. */
  putdownsByDecile: { strategic: number[]; lashOut: number[] };
  /** Share of students wearing each look, updated weekly. A look that everyone wears says nothing. */
  lookShare: Partial<Record<Look, number>>;
  /** Who has stood up for whom (defender * 100000 + target), to notice when the favor is returned. */
  stoodUpFor: Set<number>;
}
