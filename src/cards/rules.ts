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
 * Fading: a Friendly Bond drops by 1 a week without any contact; Friends need a deep moment within two
 * weeks, and Close friends within three.
 */
export const FADE_AFTER_DAYS = 7;
export const FRIEND_FADE_AFTER_DAYS = 14;
export const CLOSE_FADE_AFTER_DAYS = 21;

/** Standing together: this many different people pushing back on someone in a week drops them a step. */
export const STANDING_TOGETHER = 3;

/** Trying too hard: this many warm cards at someone of higher Standing, with none back, costs Respect. */
export const TRYING_TOO_HARD = 3;

/** Asking out needs this much Bond. */
export const ASK_OUT_BOND = 10;
/** A couple whose Bond falls below this breaks up. */
export const COUPLE_MIN_BOND = 8;
