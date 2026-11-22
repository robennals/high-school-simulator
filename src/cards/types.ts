/** The card-rules simulation's data: people, the world, stories and conversations. */
import type { Ability, Interest, Look, ShirtStyle } from '../sim/content';
import type { Rng } from '../sim/rng';

/** A personality trait: one side (+1), the other side (−1), or the middle (0). */
export type Side = -1 | 0 | 1;

/** What people value seeing in others (and so respect them for). */
export type Quality = 'funny' | 'athletic' | 'smart' | 'creative' | 'stylish' | 'techy';

export interface Personality {
  /** +1 outgoing, −1 reserved. */
  E: Side;
  /** +1 warm, −1 edgy. */
  A: Side;
  /** +1 organized, −1 spontaneous. */
  C: Side;
  /** +1 sensitive, −1 thick-skinned. */
  N: Side;
  /** +1 curious, −1 traditional. */
  O: Side;
  /** How much they care about standing: 0 low, 1 some, 2 a lot. Hidden, like the rest. */
  statusDrive: 0 | 1 | 2;
  /** The two qualities they most respect in others. */
  admires: [Quality, Quality];
}

export interface Shirt {
  style: ShirtStyle;
  /** For a fan shirt: the opinion topic it's about. */
  topic: number | null;
}

export interface Person {
  id: number;
  name: string;
  gender: 'boy' | 'girl';
  /** Which middle school they came from (prior friendships start here). */
  feeder: number;
  look: Look;
  shirt: Shirt;
  personality: Personality;
  /** 0–5 per ability, from a 12-point buy. */
  abilities: Record<Ability, number>;
  /** Hobbies they're into: 1 = into it, 2 = really into it. */
  interests: Map<Interest, 1 | 2>;
  /** −2 (can't stand it) … 2 (love it), per opinion topic. */
  opinions: Int8Array;
  energy: number;
  /** Energy they'll wake up with tomorrow (set by their evening). */
  nextWake: number;
  /** Grades, 0 (F) … 10 (A). */
  grades: number;
  /** Below this their parents ground them. */
  parentBar: number;
  activity: string | null;
  /** Who they're going out with, or −1. */
  partner: number;
  /** Ids of stories they hold. */
  stories: Set<number>;
  /** Stories they've told this week (too many and people stop believing them). */
  gossipThisWeek: number;
  /** How many times they've opened up this week (rule: OPEN_UPS_PER_WEEK). */
  openUpsThisWeek: number;
  /** Favors owed to them: debtor id → day it's forgotten. */
  favors: Map<number, number>;
  /** How many times each card has been used today (by card key). */
  used: Map<string, number>;
  /** Extra copies earned by practice: card key → extra. */
  earned: Map<string, number>;
  practiceProgress: number;
  /** Last evening's day card (repeating one gives less). */
  lastEvening: string | null;
  phoneNights: number;
  /** The last day they made up a rumor (at most one a week). */
  lastRumor: number;
  /** Until this day, their mean cards cost 1 more (reported by a teacher). */
  meanCostUntil: number;
  /** Whether they'd ever ask someone out. */
  romantic: boolean;
}

/**
 * A piece of gossip: who did what. True unless someone made it up (a rumor). `actor` is the person the
 * story is about — the one who looks bad if it's a story of something mean.
 */
export interface Story {
  id: number;
  kind: 'putdown' | 'leaveout' | 'couple' | 'breakup' | 'rumor' | 'lied' | 'turneddown';
  actor: number;
  target: number;
  day: number;
  true: boolean;
  /** Whether hearing it (and believing it) lowers Respect for the actor. */
  mean: boolean;
  /** Embarrassing for the person it's about (being turned down): believers respect them a little less. */
  embarrassing?: boolean;
  /** For a rumor: who made it up. */
  madeUpBy?: number;
  /** For a rumor: someone has found out it's a lie (the record gets set straight on Sunday). */
  foundOut?: boolean;
  /** For a rumor: the record has been set straight. */
  corrected?: boolean;
}

export interface World {
  rng: Rng;
  n: number;
  people: Person[];
  day: number;
  /** Bond between a and b, stored at a*n+b and b*n+a (always equal). */
  bond: Int8Array;
  /** Respect from a to b at a*n+b. */
  respect: Int8Array;
  /** Whether a has had a first impression of b (a*n+b). */
  met: Uint8Array;
  /** Last day a and b played a card to each other (a*n+b, symmetric), −1 if never. */
  contact: Int16Array;
  /** Last day a and b shared a deep moment (a*n+b, symmetric), −1 if never. */
  deepContact: Int16Array;
  /** Standing 1–5 per person. */
  standing: Int8Array;
  stories: Story[];
  /** Per-week counters for the school rules. */
  week: WeekTrackers;
  /** Things that happened, counted, for the realism report. */
  tally: Map<string, number>;
  /** Put-downs, for the realism report: who, at what standing, and whether someone stepped in and stopped it. */
  putdowns: { day: number; bully: number; target: number; bullyStanding: number; intervened: boolean; stopped: boolean }[];
  /** Couples, for the realism report: who, when they got together, and when they broke up (−1 if still together). */
  romances: { a: number; b: number; start: number; end: number }[];
  /** Which class section each person is in, per period. */
  sections: Int16Array[];
  /** Friend pairs (Bond 8+) at the end of week 4, for measuring how many friendships last. */
  friendsWeek4?: Uint8Array;
  /** Weekly standing snapshots (for stability). */
  standingHistory: Int8Array[];
  /** Whether a knows something b loves (a*n+b): b talked about it, wore it, or told a. */
  knows: Uint8Array;
  /** openedUp[a * n + b]: a has opened up to b in an intimate moment (the both-ways rule needs it). */
  openedUp: Uint8Array;
  /** What each listener heard each speaker say about each topic: ((listener*n+speaker)*topics+topic) → stance. */
  claims: Map<number, number>;
  /** Invitations accepted today: pairs who'll hang out after school. */
  hangouts: [number, number][];
}

export interface WeekTrackers {
  /** Warm cards from a to b this week, at a*n+b. */
  warm: Uint8Array;
  /** Deep cards or hangouts between couples this week: person → count. */
  coupleTime: Map<number, number>;
}

/** One card played in a conversation. */
export interface Play {
  card: string;
  actor: number;
  /** −1 for a card to the table. */
  target: number;
  /** For opinion cards: the topic and stance. */
  topic?: number;
  stance?: number;
  interest?: Interest;
  ability?: Ability;
  storyId?: number;
  /** For jokes and other rolls: whether it worked. */
  success?: boolean;
}

export interface Convo {
  members: number[];
  onlookers: number[];
  /** No one else can hear (a hangout, a call). Deep cards work best here. */
  private: boolean;
  /** A teacher is in the room: attacks cost 2 more. */
  teacher: boolean;
  plays: Play[];
}
