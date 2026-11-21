/**
 * Looks, in color. Each look's shirt color in the 3D school is the same color its name is written in
 * everywhere else, so you can tell who's who at a glance: a crowd of blue shirts is the preppy kids.
 */
import { LOOKS, type Look } from '../sim/content';
import { h } from './ui';

/** Shirt colors of the 3D figures. */
export const LOOK_COLORS: Record<Look, number> = {
  sporty: 0xe4572e,
  preppy: 0x4c86c6,
  alt: 0x3b3b48,
  artsy: 0x9b59b6,
  techy: 0x2bb3a3,
  plain: 0xc9b79c,
};

/** The same colors, a little darker where needed so the words are easy to read on the cream panels. */
const TEXT_COLORS: Record<Look, string> = {
  sporty: '#d14a22',
  preppy: '#2f6db3',
  alt: '#3b3b48',
  artsy: '#8e44ad',
  techy: '#138a7d',
  plain: '#8a7552',
};

/** What each look is called in the game. */
export const LOOK_WORDS: Record<Look, string> = {
  sporty: 'sporty',
  preppy: 'preppy',
  alt: 'alt',
  artsy: 'artsy',
  techy: 'techy',
  plain: 'low-key',
};

const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** A look's name, in its color, with a dot the color of its shirts. */
export function lookWord(look: Look, text: string = LOOK_WORDS[look]): HTMLElement {
  return h('span', { class: 'look-word', style: `color:${TEXT_COLORS[look]};--dot:${css(LOOK_COLORS[look])}` }, text);
}

const WORD_PATTERN = new RegExp(`\\b(${LOOKS.map((l) => LOOK_WORDS[l]).join('|')})\\b`, 'gi');
const LOOK_BY_WORD = new Map(LOOKS.map((l) => [LOOK_WORDS[l], l]));

/** A sentence with every look name in it ("a preppy girl and 2 techy boys") colored. */
export function colorLooks(text: string): (string | HTMLElement)[] {
  const out: (string | HTMLElement)[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD_PATTERN)) {
    out.push(text.slice(last, m.index));
    out.push(lookWord(LOOK_BY_WORD.get(m[0].toLowerCase())!, m[0]));
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return out.filter((x) => x !== '');
}

/** A key to the shirt colors: "● sporty ● preppy …". */
export function lookLegend(): HTMLElement {
  return h('div', { class: 'look-legend' }, h('span', { class: 'muted small' }, 'Shirt colors: '), ...LOOKS.map((l) => lookWord(l)));
}
