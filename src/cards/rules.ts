/**
 * Every printed number in the card rules, in one place (see docs/design/card-rules-spec.md). Tuning
 * the simulation means changing these — the same numbers the rulebook prints — never hidden weights.
 */

/** Bond between two people runs from −5 to 15. */
export const BOND_MIN = -5;
export const BOND_MAX = 15;

/** Named Bond levels (the lowest Bond of each). */
export const LEVEL = {
  enemies: -5,
  cool: -2,
  strangers: 0,
  acquaintances: 1,
  friendly: 4,
  friends: 8,
  close: 12,
} as const;

/** The depth rule: casual cards can't raise a Bond past this (the top of Friendly). */
export const CASUAL_CAP = 7;

/** Respect, from one person to another. */
export const RESPECT_MIN = 0;
export const RESPECT_MAX = 5;
/** Where Respect starts between strangers. */
export const RESPECT_START = 2;

/** Energy. */
export const ENERGY_MAX = 12;
export const ENERGY_WAKE = 10;
export const ENERGY_WAKE_RESTED = 12;
export const ENERGY_WAKE_PHONE = 8;

/** Standing: everyone is ranked each Sunday and split into fifths, 1–5. */
export const STANDING_LEVELS = 5;

/** Conversation lengths, in moments. */
export const MOMENTS = { lunch: 10, hallway: 4, walk: 4, class: 3, practice: 6, hangout: 6, call: 3, weekend: 6 } as const;

/** Stories go stale after this many days. */
export const STORY_DAYS = 14;
/** Favors are forgotten after this many days. */
export const FAVOR_DAYS = 14;

/**
 * Fading: a Friendly or Friends Bond drops by 1 a week without a conversation together; Friends also need a deep
 * moment within four weeks, and Close friends within three.
 */
export const FADE_AFTER_DAYS = 7;
export const FRIEND_FADE_AFTER_DAYS = 28;
export const CLOSE_FADE_AFTER_DAYS = 21;

/**
 * Opening up is for a few people: each person can play Open up this many times a week. Both ways: you
 * can't become Friends (past 7) until you've both opened up to each other.
 */
export const OPEN_UPS_PER_WEEK = 1;

/** Popularity: this much for each Friend, and 1 for each person whose Respect for you is at least RESPECTS. */
export const POPULARITY_PER_FRIEND = 10;
export const RESPECTS = 3;

/** Trying too hard: this many warm cards at someone of higher Standing, with none back, costs Respect. */
export const TRYING_TOO_HARD = 3;

/** Asking out needs this much Bond. */
export const ASK_OUT_BOND = 7;
/** A couple whose Bond falls below this breaks up. */
export const COUPLE_MIN_BOND = 8;

/** Every number in bullying, to tweak in one place. */
export const BULLYING = {
  /** Put someone down: what it does to the Bond with the victim. */
  victimBond: -4,
  /** ...everyone watching who isn't the victim's Friend respects the bully this much more, at once. */
  watchersRespect: 2,
  /** Word takes time to get around: a put-down can't be told as a story until this many days later. */
  gossipAfterDays: 7,
  /** ...and with the bully's Friends who are there and aren't the victim's Friends. */
  friendsBond: 1,
  /** Stand up to them: chances in 6 before counting the room, and the limits. */
  standUpStart: 3,
  standUpMin: 1,
  standUpMax: 5,
  /** It works: the bully loses this with everyone there... */
  shamedBond: -2,
  shamedRespect: -2,
  /** ...and whoever stood up gains this Respect from each. */
  standUpRespect: 1,
  /** It fails: whoever stood up loses this Respect from each. */
  standUpFailRespect: -1,
  /** Either way, the victim's Bond with whoever stood up for them, and the bully's. */
  gratefulBond: 3,
  standUpBond: -2,
  /** Gossip: each listener who doesn't back the bully likes and respects them this much less. */
  gossipBond: -1,
  gossipRespect: -1,
} as const;

/** Threads: deep conversations, one turn at a time. Every number, to tweak in one place. */
export const THREAD = {
  /** What each turn on the deep path adds to the Bond between the two. It pays more the deeper it goes. */
  turnBond: [0, 1, 1, 1, 1, 2, 2],
  /** From this turn on, a turn is deep (in an intimate setting, it can make you Friends). */
  deepFrom: 4,
  /** The friend needs this much Bond to go on at turns 3 and 5. Otherwise it's too soon. */
  needsBond: { 3: 3, 5: 7 },
  /** An Open up thread starts only with someone at least Friendly. */
  openUpBond: 4,
  /** A kind place to stop. */
  wrapBond: 1,
  /** Breaking the flow costs more the more they'd just told you. */
  missBond: { 1: -1, 3: -1, 5: -2 },
  /** Going deeper than the friendship allows. */
  tooSoonBond: -1,
} as const;
