/**
 * What the player can see: names of people they know, descriptions of people they don't,
 * grades as letters. Nothing here reveals hidden numbers.
 */
import { OPINION_TOPICS } from '../sim/content';
import type { Student, World } from '../sim/types';
import { LOOK_WORDS } from './looks';

export function playerOf(world: World): Student {
  return world.students[world.player!.id];
}

/** Has the player met this person (do they know their name)? */
export function knows(world: World, id: number): boolean {
  return id === world.player!.id || world.students[world.player!.id].rels.has(id);
}

export { LOOK_WORDS } from './looks';

/** "a sporty girl in a Static Lake shirt" */
export function describeStranger(s: Student): string {
  const shirt = s.shirt !== null ? ` in ${/^[AEIOU]/.test(shirtName(s.shirt)) ? 'an' : 'a'} ${shirtName(s.shirt)} shirt` : '';
  const look = LOOK_WORDS[s.look];
  return `${/^[aeiou]/.test(look) ? 'an' : 'a'} ${look} ${s.gender}${shirt}`;
}

export function shirtName(topic: number): string {
  return OPINION_TOPICS[topic].replace(/^the /, '');
}

/** How the player refers to someone. */
export function nameFor(world: World, id: number, capital = false): string {
  if (id === world.player!.id) return capital ? 'You' : 'you';
  const s = world.students[id];
  if (knows(world, id)) return `${s.first} ${s.last[0]}.`;
  const d = describeStranger(s);
  return capital ? d[0].toUpperCase() + d.slice(1) : d;
}

/** Names end with an initial ("Ryan M."), so a sentence ending in one shouldn't get a second period. */
export function tidy(text: string): string {
  return text.replace(/\.\.(?=[\s”"]|$)/g, '.');
}

export function fullName(s: Student): string {
  return `${s.first} ${s.last}`;
}

export function gradeLetter(g: number): string {
  if (g >= 0.7) return 'A';
  if (g >= 0.58) return 'B';
  if (g >= 0.45) return 'C';
  if (g >= 0.33) return 'D';
  return 'F';
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function dayLabel(world: World): string {
  return `Week ${Math.floor(world.day / 7) + 1} · ${DAY_NAMES[world.day % 7]}`;
}

/** Stance words for the player's own opinions. */
export function stanceWords(x: number): string {
  if (x > 0.5) return 'love';
  if (x > 0.15) return 'like';
  if (x > -0.15) return "don't care about";
  if (x > -0.5) return 'are not into';
  return "can't stand";
}
