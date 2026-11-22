/**
 * Threads: canned, pre-written conversations with one deep path and exits (docs/design/conversation-threads.md).
 *
 * The owner brings something up; a friend follows it. At each of the friend's turns the Respond card
 * offers four lines: one goes deeper, one kindly ends it there, and two break the flow. Nothing is
 * generated while the game runs: the words are data (threads.data.ts).
 */
import type { Interest } from '../sim/content';
import { OPEN_UPS_PER_WEEK, THREAD } from './rules';
import type { Convo, Play, World } from './types';
import { bond } from './world';

/** What can start a thread: the card, and what it's about. */
export type ThreadEntry = { card: 'talk'; interest: Interest } | { card: 'ask'; question: string } | { card: 'openup' };

export type MissKind = 'aboutMe' | 'fix' | 'brushOff' | 'pry' | 'tease' | 'changeSubject';

/** A line that ends the thread, and the owner's reaction to it. */
export interface Exit {
  line: string;
  reaction: string;
}

export interface Miss extends Exit {
  kind: MissKind;
}

/** The exits open to the friend at one of their turns. */
export interface Exits {
  wrap: Exit;
  misses: readonly [Miss, Miss];
}

export interface Thread {
  id: string;
  entry: ThreadEntry;
  /** What's true of the owner, for whoever reviews the words. */
  facts: string;
  /** The deep path. The owner says turns 0, 2, 4 and 6; the friend says 1, 3 and 5. */
  turns: readonly [string, string, string, string, string, string, string];
  choices: Readonly<Record<1 | 3 | 5, Exits>>;
  /** The owner's deflection when the friend goes deeper than the friendship allows. */
  tooSoon: Readonly<Record<3 | 5, string>>;
}

/** Where a conversation is in a thread. */
export interface ThreadState {
  thread: Thread;
  owner: number;
  /** −1 until someone takes up what the owner brought up. */
  friend: number;
  /** The turn to be said next. */
  next: number;
}

/** A play's place in a thread. Turn −1 is the question that starts an ask thread. */
export interface ThreadMove {
  thread: Thread;
  owner: number;
  friend: number;
  turn: number;
  move: 'on' | 'wrap' | 'tooSoon' | 0 | 1;
}

const ownersTurn = (turn: number) => turn % 2 === 0;

function heardKey(thread: Thread, owner: number, friend: number): string {
  return `${owner}:${friend}:${thread.id}`;
}

export function hasHeard(w: World, thread: Thread, owner: number, friend: number): boolean {
  return w.threadsHeard.has(heardKey(thread, owner, friend));
}

/** The thread that is true of this person, for this way in: always the same one. */
function threadOf(w: World, person: number, card: ThreadEntry['card'], interest?: Interest): Thread | undefined {
  const fits = w.threads.filter(({ entry }) => entry.card === card && (entry.card !== 'talk' || entry.interest === interest));
  return fits.length ? fits[person % fits.length] : undefined;
}

/** The thread this card would start, if it would. */
export function threadStart(w: World, c: Convo, p: Play): ThreadMove | undefined {
  if (p.card !== 'talk' && p.card !== 'ask' && p.card !== 'openup') return undefined;
  const owner = p.card === 'ask' ? p.target : p.actor;
  const thread = threadOf(w, owner, p.card, p.interest);
  if (!thread || c.plays.some((b) => b.thread?.thread === thread)) return undefined;
  if (p.card === 'talk') {
    if (c.plays.some((b) => b.card === 'talk' && b.interest === p.interest)) return undefined; // it's already the subject
    if (!c.members.some((m) => m !== owner && !hasHeard(w, thread, owner, m))) return undefined;
    return { thread, owner, friend: -1, turn: 0, move: 'on' };
  }
  const friend = p.card === 'ask' ? p.actor : p.target;
  if (hasHeard(w, thread, owner, friend)) return undefined;
  if (p.card === 'openup') return bond(w, owner, friend) >= THREAD.openUpBond ? { thread, owner, friend, turn: 0, move: 'on' } : undefined;
  // A question only starts one fresh, not as a follow-up to what they just said.
  return c.plays.at(-1)?.actor === owner ? undefined : { thread, owner, friend, turn: -1, move: 'on' };
}

/** Whether the thread is waiting on `me`. */
export function threadWaitsFor(w: World, c: Convo, me: number): boolean {
  const s = c.thread;
  if (!s) return false;
  if (ownersTurn(s.next)) return me === s.owner;
  if (s.friend >= 0) return me === s.friend;
  return me !== s.owner && !hasHeard(w, s.thread, s.owner, me);
}

/** The move a Respond card makes: `arg` is '', 'wrap', 'miss:0' or 'miss:1'. */
export function threadMove(w: World, c: Convo, me: number, arg: string): ThreadMove | undefined {
  const s = c.thread;
  if (!s || !threadWaitsFor(w, c, me)) return undefined;
  const at = { thread: s.thread, owner: s.owner, friend: ownersTurn(s.next) ? s.friend : me, turn: s.next };
  if (arg) {
    if (ownersTurn(s.next)) return undefined; // exits are the friend's
    return { ...at, move: arg === 'wrap' ? 'wrap' : arg === 'miss:0' ? 0 : 1 };
  }
  const needs = s.next === 3 || s.next === 5 ? THREAD.needsBond[s.next] : undefined;
  return { ...at, move: needs !== undefined && bond(w, at.owner, me) < needs ? 'tooSoon' : 'on' };
}

/**
 * Whether this turn is someone really opening up, so it's deep. A thread doesn't get round the weekly
 * limit: turn 4 is the owner's Open up and turn 5 the friend's, if they have one left (an Open up thread
 * was paid for by the card). The ending is deep if both have opened up.
 */
export function opensUp(w: World, m: ThreadMove): boolean {
  if (m.move !== 'on' || m.turn < THREAD.deepFrom) return false;
  if (m.turn === 6) return !!(w.openedUp[m.owner * w.n + m.friend] && w.openedUp[m.friend * w.n + m.owner]);
  if (m.turn === 4 && m.thread.entry.card === 'openup') return true;
  return w.people[m.turn === 4 ? m.owner : m.friend].openUpsThisWeek < OPEN_UPS_PER_WEEK;
}

/** Move the conversation's thread along after a card is played. */
export function advanceThread(w: World, c: Convo, p: Play) {
  const was = c.thread;
  const m = p.thread;
  c.thread = undefined;
  const over = !m || m.move !== 'on' || m.turn === 6;
  if (!over) c.thread = { thread: m.thread, owner: m.owner, friend: m.friend, next: m.turn + 1 };
  // However it ended, they've had that conversation, unless it was too soon: then there's a next time.
  if (was && was.friend >= 0 && was.thread !== c.thread?.thread && m?.move !== 'tooSoon') w.threadsHeard.add(heardKey(was.thread, was.owner, was.friend));
  else if (m && over && m.move !== 'tooSoon') w.threadsHeard.add(heardKey(m.thread, m.owner, m.friend));
}

/** The words of a move, and the owner's reaction when it ends the thread. */
export function threadWords(m: ThreadMove): { line: string; reaction?: string } {
  if (m.turn < 0) {
    if (m.thread.entry.card !== 'ask') throw new Error(`${m.thread.id} has no question`);
    return { line: m.thread.entry.question };
  }
  if (m.turn !== 1 && m.turn !== 3 && m.turn !== 5) return { line: m.thread.turns[m.turn] };
  if (m.move === 'on') return { line: m.thread.turns[m.turn] };
  if (m.move === 'wrap') return m.thread.choices[m.turn].wrap;
  if (m.move === 'tooSoon') {
    if (m.turn === 1) throw new Error('the first follow-up is never too soon');
    return { line: m.thread.turns[m.turn], reaction: m.thread.tooSoon[m.turn] };
  }
  return m.thread.choices[m.turn].misses[m.move];
}
