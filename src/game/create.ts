/** Character creation: point-buy abilities, personality, interests, and what you wear. */
import { ABILITIES, ABILITY_BUDGET, ABILITY_MAX_POINTS, HERITAGES, INTERESTS, type Ability, type Interest } from '../sim/content';
import type { Gender, PlayerSetup, Traits } from '../sim/types';
import type { Coach } from './tutorial';
import { fill, h, pick } from './ui';

const ABILITY_INFO: Record<Ability, [string, string]> = {
  athletics: ['Athletics', 'Make the soccer team, shine at games, more energy.'],
  academics: ['Academics', 'Better grades for less work; classmates come to you for help.'],
  humor: ['Humor', 'Jokes land. Turn put-downs back on the bully.'],
  arts: ['Arts', 'Band and drama. Respect from creative people.'],
  style: ['Style', 'Better first impressions.'],
  tech: ['Tech', 'Robotics. Being the one who can fix things.'],
};

const TRAIT_INFO: [keyof Traits, string, string, string][] = [
  ['E', 'Outgoing', 'Reserved', 'Outgoing: talking costs you little energy, but you listen less. Reserved: crowds tire you, but you’re a great listener.'],
  ['A', 'Warm', 'Edgy', 'Warm: people like you easily. Edgy: some people find you cooler — others, meaner.'],
  ['C', 'Organized', 'Spontaneous', 'Organized: homework comes easy. Spontaneous: more fun, more chaos.'],
  ['N', 'Sensitive', 'Thick-skinned', 'Sensitive: you notice everything, but put-downs rattle you. Thick-skinned: you stay calm.'],
  ['O', 'Curious', 'Traditional', 'Curious: new people and ideas. Traditional: steady and loyal.'],
];

/**
 * The profile screen. Resolves with the new profile, or null if the player backs out to the title screen.
 *
 * The screen is built once; each click updates only the parts it changes (no rebuild, so nothing
 * flickers and the pips can animate).
 */
export function createCharacter(root: HTMLElement, coach: Coach): Promise<PlayerSetup | null> {
  coach.tip('profile');
  return new Promise((resolve) => {
    const gender: { v: Gender } = { v: Math.random() < 0.5 ? 'girl' : 'boy' };
    const points: Record<Ability, number> = { athletics: 2, academics: 2, humor: 2, arts: 2, style: 2, tech: 2 };
    const traits: Traits = { O: 0.5, C: 0.5, E: 0.5, A: 0.5, N: 0.5 };
    const interests = new Set<Interest>();
    const name = { first: '', last: '', typed: false };

    const firstField = nameField('First name', (v) => ((name.first = v), (name.typed = true)));
    const lastField = nameField('Last name', (v) => ((name.last = v), (name.typed = true)));
    /** A random name that fits the chosen gender. */
    const rollName = () => {
      const heritage = pick(HERITAGES);
      name.first = pick(gender.v === 'boy' ? heritage.boys : heritage.girls);
      name.last = pick(heritage.last);
      name.typed = false;
      firstField.input.value = name.first;
      lastField.input.value = name.last;
    };

    const genderButtons = (['girl', 'boy'] as const).map((g) =>
      h(
        'button',
        {
          class: 'chip',
          onclick: () => {
            gender.v = g;
            // Keep a name the player typed; otherwise pick one that fits.
            if (!name.typed) rollName();
            update();
          },
        },
        g === 'girl' ? 'Girl' : 'Boy',
      ),
    );

    const pointsLeft = h('span', { class: 'muted' });
    const abilityRows = ABILITIES.map((a) => {
      const minus = h('button', { class: 'step', onclick: () => (points[a]--, update()) }, '−');
      const plus = h('button', { class: 'step', onclick: () => (points[a]++, update()) }, '+');
      const pips = Array.from({ length: ABILITY_MAX_POINTS }, () => h('span', { class: 'pip' }));
      const row = h(
        'div',
        { class: 'ability' },
        h('div', { class: 'ability-name' }, ABILITY_INFO[a][0], h('div', { class: 'muted small' }, ABILITY_INFO[a][1])),
        minus,
        h('div', { class: 'pips' }, ...pips),
        plus,
      );
      return { a, row, minus, plus, pips };
    });

    const interestChips = INTERESTS.map((i) => {
      const chip = h(
        'button',
        {
          class: 'chip',
          onclick: () => {
            if (interests.has(i)) interests.delete(i);
            else if (interests.size < 3) interests.add(i);
            update();
          },
        },
        i,
      );
      return { i, chip };
    });

    const start = h('button', {
      class: 'big',
      onclick: () =>
        resolve({
          first: name.first.trim() || 'Sam',
          last: name.last.trim() || 'Lee',
          gender: gender.v,
          abilityPoints: { ...points },
          traits: { ...traits },
          // Clothes are chosen each morning; this is just a starting outfit.
          look: 'plain',
          shirtStyle: 'plain',
          shirt: null,
          interests: [...interests],
        }),
    });

    /** Bring every control in line with the current choices, without rebuilding anything. */
    const update = () => {
      const left = ABILITY_BUDGET - ABILITIES.reduce((t, a) => t + points[a], 0);
      genderButtons.forEach((b, i) => b.classList.toggle('on', gender.v === (i === 0 ? 'girl' : 'boy')));
      pointsLeft.textContent = `— ${left} point${left === 1 ? '' : 's'} left. Nobody is good at everything.`;
      for (const { a, minus, plus, pips } of abilityRows) {
        minus.disabled = points[a] <= 0;
        plus.disabled = points[a] >= ABILITY_MAX_POINTS || left <= 0;
        pips.forEach((p, i) => p.classList.toggle('on', i < points[a]));
      }
      for (const { i, chip } of interestChips) chip.classList.toggle('on', interests.has(i));
      start.disabled = left !== 0;
      start.textContent = left === 0 ? 'Create profile and start school' : `Spend ${left} more point${left === 1 ? '' : 's'}`;
    };

    rollName();
    fill(
      root,
      h(
        'div',
        { class: 'create fade-in' },
        h('div', { class: 'game-name' }, 'High School Simulator'),
        h('h1', null, 'Create your profile'),
        h('p', { class: 'tagline' }, 'Who you are when you start freshman year at a big new school. You came from a tiny one, and you know nobody. Everything else — what you do, who you talk to, what you wear — you’ll choose day by day.'),
        h(
          'section',
          null,
          h('h2', null, 'Who are you?'),
          h('div', { class: 'row name-row' }, ...genderButtons),
          h(
            'div',
            { class: 'row name-row' },
            firstField.label,
            lastField.label,
            h('button', { class: 'chip dice', title: 'Pick a random name', onclick: rollName }, '🎲 Random name'),
          ),
        ),
        h('section', null, h('h2', null, `What you're good at `, pointsLeft), ...abilityRows.map((r) => r.row)),
        h(
          'section',
          null,
          h('h2', null, 'Personality ', h('span', { class: 'muted' }, '— every side has an upside')),
          ...TRAIT_INFO.map(([k, hi, lo, info]) =>
            h(
              'div',
              { class: 'trait', title: info },
              h('span', { class: 'trait-end' }, lo),
              h('input', {
                type: 'range',
                min: '0',
                max: '1',
                step: '0.05',
                value: String(traits[k]),
                oninput: (e) => (traits[k] = Number((e.target as HTMLInputElement).value)),
              }),
              h('span', { class: 'trait-end' }, hi),
              h('div', { class: 'muted small' }, info),
            ),
          ),
        ),
        h(
          'section',
          null,
          h('h2', null, "What you're into ", h('span', { class: 'muted' }, '— pick up to 3')),
          h('div', { class: 'row wrap' }, ...interestChips.map((c) => c.chip)),
        ),
        h('div', { class: 'row create-actions' }, h('button', { class: 'menu-btn', onclick: () => resolve(null) }, 'Back'), start),
      ),
    );
    update();
  });
}

/** A labeled name box. Clicking it selects the whole name, so typing replaces it. */
function nameField(label: string, set: (v: string) => void): { label: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { class: 'name', placeholder: label, oninput: (e) => set((e.target as HTMLInputElement).value) });
  input.addEventListener('focus', () => input.select());
  return { label: h('label', { class: 'name-field' }, h('span', { class: 'muted small' }, label), input), input };
}
