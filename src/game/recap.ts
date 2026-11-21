/**
 * Tracks what happens to the player — for the running feed, and for the weekly recap that reveals
 * what people really think and why. Principles are unlocked by things that actually happened.
 */
import { OPINION_TOPICS } from '../sim/content';
import type { Act, Story, Student, Witness, World } from '../sim/types';
import { storyText } from './cards';
import { nameFor, tidy } from './view';

export interface PlayerEvent {
  day: number;
  text: string;
  /** People who saw, heard, or were part of it. */
  people: number[];
  /** Shown in the feed as it happens. */
  feed: boolean;
  /** Something the player did or that was done to them (as opposed to something they just saw). */
  aboutPlayer: boolean;
}

interface Feeling {
  aff: number;
  trust: number;
  resp: number;
  fear: number;
}

export interface Change {
  id: number;
  before: Feeling;
  after: Feeling;
  reasons: string[];
}

export interface Principle {
  id: string;
  title: string;
  text: string;
}

export const PRINCIPLES: Record<string, Principle> = {
  openers: {
    id: 'openers',
    title: 'Openers',
    text: 'Walking up to a group goes best when someone there already likes you. Strangers are a gamble — a shared class, a shirt they recognize, or a mutual friend does the first part for you.',
  },
  frame: {
    id: 'frame',
    title: 'Don’t take the bait',
    text: 'A put-down is a bid to make you look small in front of others. You win by not playing along: stay calm, ask a question back, or walk away. Getting flustered or snapping gives them what they wanted.',
  },
  standUp: {
    id: 'standUp',
    title: 'Standing up for someone',
    text: 'Stepping in is a risk — sometimes the bully turns on you. But the person you stood up for remembers, and so do the people watching.',
  },
  bystander: {
    id: 'bystander',
    title: 'Watching it happen',
    text: 'Bullying often stops quickly when someone steps in. Staying out of it is safer — but the person being picked on notices who stayed quiet.',
  },
  gossip: {
    id: 'gossip',
    title: 'Where stories come from',
    text: 'Gossip buys attention right now. But people remember who told them — and wonder what you say about them when they’re not around.',
  },
  putdown: {
    id: 'putdown',
    title: 'Laughs at someone’s expense',
    text: 'A put-down can get a laugh. Most people quietly like you a little less afterwards, and the person you targeted doesn’t forget.',
  },
  leaveOut: {
    id: 'leaveOut',
    title: 'Leave an out',
    text: 'Asking someone in front of others puts them on the spot, and a no stings for both of you. “No worries if you’re busy” makes yes easier and no free.',
  },
  outsideSchool: {
    id: 'outsideSchool',
    title: 'Time outside school',
    text: 'School makes people friendly. Time together outside it — hanging out after school, evenings, weekends — is what makes them close.',
  },
  help: {
    id: 'help',
    title: 'Being useful',
    text: 'Helping people with what you’re good at is a quiet way to earn respect — and they’ll owe you one.',
  },
  shirt: {
    id: 'shirt',
    title: 'What you wear speaks first',
    text: 'A shirt about something you love tells the right people you’re one of them — and gives them an easy reason to come talk to you.',
  },
  phone: {
    id: 'phone',
    title: 'The phone',
    text: 'An evening on the phone feels like a break. Over time it costs sleep, adds stress, and leaves less time with friends.',
  },
  fake: {
    id: 'fake',
    title: 'Saying what people want to hear',
    text: 'Going along with a group is tempting. But people compare notes, and someone who says opposite things to different people starts to look fake.',
  },
};

export class Tracker {
  events: PlayerEvent[] = [];
  /** Feed lines not yet shown. */
  unread: PlayerEvent[] = [];
  /** People the player had small talk with while on autopilot (hallway, class, after school). */
  chattedWith = new Set<number>();
  unlocked = new Set<string>();
  newlyUnlocked: string[] = [];
  private snapshot = new Map<number, Feeling>();
  private phoneNights = 0;

  constructor(private world: World) {
    world.onAct = (act, ws, hearsay) => {
      // Stories being retold are handled by onTold; only react to things as they actually happen.
      if (!hearsay) this.onAct(act, ws);
    };
    world.onStory = (text, people, aboutPlayer) => this.log(text, people, true, aboutPlayer);
    world.onTraced = (victim, teller, story) => {
      if (teller.id !== this.pid) return;
      this.unlock('gossip');
      this.log(`${nameFor(world, victim.id, true)} found out you were spreading “${storyText(world, story.act)}” — and isn’t happy about it.`, [victim.id], true, true);
    };
    world.onTold = (story, teller, listener) => this.onTold(story, teller, listener);
    this.takeSnapshot();
  }

  private get pid(): number {
    return this.world.player!.id;
  }

  /** How often the player talked with each person this week. */
  private together = new Map<number, number>();

  private log(text: string, people: number[], feed = true, aboutPlayer = true) {
    const e: PlayerEvent = { day: this.world.day, text: tidy(text), people, feed, aboutPlayer };
    this.events.push(e);
    if (feed) this.unread.push(e);
  }

  unlock(id: string) {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    this.newlyUnlocked.push(id);
  }

  private onAct(act: Act, ws: Witness[]) {
    const pid = this.pid;
    const w = this.world;
    const involved = act.actor === pid || act.target === pid || act.defender === pid;
    const saw = ws.some((x) => x.id === pid && x.wt >= 0.5);
    if (!involved && !saw) return;
    const people = [act.actor, ...(act.target >= 0 ? [act.target] : []), ...ws.filter((x) => x.wt >= 0.5).map((x) => x.id)].filter((x) => x !== pid);
    const other = act.actor === pid ? act.target : act.target === pid ? act.actor : -1;
    if (other >= 0) this.together.set(other, (this.together.get(other) ?? 0) + 1);
    const log = (text: string, feed = true) => this.log(text, people, feed, involved);
    const who = nameFor(w, act.actor, true);
    const whom = act.target >= 0 ? nameFor(w, act.target) : '';
    switch (act.kind) {
      case 'putdown':
        if (act.target === pid) this.unlock('frame');
        if (act.defender === pid) this.unlock('standUp');
        if (act.actor === pid) this.unlock('putdown');
        if (saw && act.actor !== pid && act.target !== pid && act.defender !== pid) this.unlock('bystander');
        log(storyText(w, act).replace(/^You humiliated/, 'You put down'));
        return;
      case 'shove':
      case 'exclude':
      case 'report':
      case 'askout':
      case 'breakup':
      case 'sneakoff':
        if (act.kind === 'exclude' && act.target === pid) this.unlock('openers');
        log(storyText(w, act));
        return;
      case 'star':
        if (saw || act.actor === pid) log(act.actor === pid ? `You were the star at ${act.place}!` : `${who} was the star at ${act.place}.`);
        return;
      case 'invite':
        if (act.actor === pid) {
          if (!act.success && !act.leaveOut && ws.length > 1) this.unlock('leaveOut');
          log(`You invited ${whom} to hang out — ${act.success ? 'they said yes' : 'they said no'}.`);
        }
        return;
      case 'help':
        if (act.actor === pid) {
          this.unlock('help');
          log(`You helped ${whom}.`, false);
        } else if (act.target === pid) log(`${who} helped you out.`);
        return;
      case 'gossip':
        if (act.actor === pid) {
          this.unlock('gossip');
          log('You passed on some gossip.', false);
        }
        return;
      case 'ditch':
        if (act.actor === pid) log(`${whom} noticed you stopped sitting with them.`);
        return;
      case 'opinion':
        // Saying something different from what you said before, in front of someone who heard both.
        if (act.actor === pid && act.topic !== undefined) {
          for (const x of ws) {
            const r = w.students[x.id].rels.get(pid);
            if (r?.tags.fake && r.tags.fake > 0.15) {
              this.unlock('fake');
              this.log(`${nameFor(w, x.id, true)} noticed you said the opposite about ${OPINION_TOPICS[act.topic]} before.`, [x.id], false);
              break;
            }
          }
        }
        return;
      default:
        if (involved && (act.place === 'class' || act.place === 'hallway' || act.place === 'after school')) {
          if (other >= 0) this.chattedWith.add(other);
        }
    }
  }

  private onTold(story: Story, teller: Student, listener: Student) {
    const pid = this.pid;
    const w = this.world;
    const aboutMe = story.act.actor === pid || story.act.target === pid || story.act.defender === pid;
    if (listener.id === pid) {
      this.log(`${nameFor(w, teller.id, true)} told you: ${storyText(w, story.act)}`, [teller.id], true, aboutMe);
    } else if (aboutMe) {
      this.log(`${nameFor(w, teller.id, true)} told ${nameFor(w, listener.id)} about you: “${storyText(w, story.act)}”`, [teller.id, listener.id], false, true);
    }
  }

  notePhoneNight() {
    this.phoneNights++;
    if (this.phoneNights >= 3) this.unlock('phone');
  }

  noteHangout() {
    this.unlock('outsideSchool');
  }

  takeSnapshot() {
    this.snapshot.clear();
    const pid = this.pid;
    for (const s of this.world.students) {
      const r = s.rels.get(pid);
      if (r) this.snapshot.set(s.id, { aff: r.aff, trust: r.trust, resp: r.resp, fear: r.fear });
    }
  }

  /** The biggest changes in how people feel about you since the last snapshot, with what caused them. */
  changes(limit = 6): Change[] {
    const pid = this.pid;
    const weekStart = this.world.day - 7;
    const out: Change[] = [];
    for (const s of this.world.students) {
      const r = s.rels.get(pid);
      if (!r) continue;
      const before = this.snapshot.get(s.id) ?? { aff: 0, trust: 0, resp: 0, fear: 0 };
      const after = { aff: r.aff, trust: r.trust, resp: r.resp, fear: r.fear };
      const size = Math.abs(after.aff - before.aff) + Math.abs(after.trust - before.trust) + 0.7 * Math.abs(after.resp - before.resp) + Math.abs(after.fear - before.fear);
      if (size < 0.05) continue;
      // Only things you did, or that were done to you or said about you — not everything you happened to see.
      const reasons = this.events
        .filter((e) => e.day >= weekStart && e.aboutPlayer && e.people.includes(s.id))
        .slice(-3)
        .map((e) => e.text);
      const times = this.together.get(s.id) ?? 0;
      if (times >= 2) reasons.push(`You talked ${times} times this week.`);
      out.push({ id: s.id, before, after, reasons });
    }
    return out
      .sort((a, b) => magnitude(b) - magnitude(a))
      .slice(0, limit);
  }

  startNewWeek() {
    this.takeSnapshot();
    this.together.clear();
    this.newlyUnlocked = [];
    this.phoneNights = 0;
  }
}

function magnitude(c: Change): number {
  return Math.abs(c.after.aff - c.before.aff) + Math.abs(c.after.trust - c.before.trust) + 0.7 * Math.abs(c.after.resp - c.before.resp) + Math.abs(c.after.fear - c.before.fear);
}

/** A feeling as words, for the recap: the truth, finally revealed. */
export function feelingWords(f: Feeling): string[] {
  const words: string[] = [];
  if (f.aff > 0.45) words.push('really likes you');
  else if (f.aff > 0.2) words.push('likes you');
  else if (f.aff < -0.25) words.push('dislikes you');
  else if (f.aff < -0.08) words.push('is cool toward you');
  else words.push('is neutral about you');
  if (f.trust > 0.35) words.push('trusts you');
  else if (f.trust < -0.15) words.push("doesn't trust you");
  if (f.resp > 0.3) words.push('respects you');
  else if (f.resp < -0.15) words.push("doesn't respect you");
  if (f.fear > 0.25) words.push('is wary of you');
  return words;
}

/** Up, down, or steady, for a recap arrow. */
export function direction(c: Change): 'up' | 'down' {
  const d = c.after.aff - c.before.aff + (c.after.trust - c.before.trust) + 0.7 * (c.after.resp - c.before.resp) - (c.after.fear - c.before.fear);
  return d >= 0 ? 'up' : 'down';
}
