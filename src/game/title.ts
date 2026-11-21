/** The title screen, the how-to-play guide, and the about screen. */
import { colorLooks } from './looks';
import { RULES, type ChapterId } from './rules';
import { fill, h } from './ui';

export const VERSION = 'Early prototype · v0.1';

export type TitleChoice = 'new' | 'tutorial';

export function titleScreen(root: HTMLElement): Promise<TitleChoice> {
  return new Promise((resolve) => {
    const show = () =>
      fill(
        root,
        h(
          'div',
          { class: 'title-screen fade-in' },
          h(
            'div',
            { class: 'logo' },
            logo(),
            h('div', { class: 'logo-tag' }, '200 students. One new kid. Find your people — and earn your place.'),
          ),
          h(
            'div',
            { class: 'menu' },
            h('button', { class: 'menu-btn primary', onclick: () => resolve('new') }, 'New Game'),
            h('button', { class: 'menu-btn', onclick: () => resolve('tutorial') }, 'Tutorial', h('span', { class: 'menu-sub' }, 'New here? Start with this.')),
            h('button', { class: 'menu-btn', onclick: () => showHowToPlay(root, show) }, 'How to Play'),
            h('button', { class: 'menu-btn', onclick: () => overlay(root, about(), show) }, 'About'),
          ),
          h('div', { class: 'version' }, VERSION),
        ),
      );
    show();
  });
}

/** Show a full-screen card over the current screen, with a Back button. */
export function overlay(root: HTMLElement, content: HTMLElement, onClose: () => void) {
  const layer = h(
    'div',
    { class: 'modal fade-in' },
    h('div', { class: 'modal-card' }, content, h('button', { class: 'big', onclick: () => (layer.remove(), onClose()) }, 'Back')),
  );
  root.append(layer);
}

/** Illustrations for some rulebook chapters, built from the game's own pieces. */
const ART: Partial<Record<ChapterId, () => HTMLElement>> = {
  day: () =>
      h(
        'div',
        { class: 'art-timeline' },
        ...[
          ['👕', 'Get dressed'],
          ['🏫', 'Before school'],
          ['🍕', 'Lunch'],
          ['⚽', 'After school'],
          ['🌙', 'Evening'],
        ].map(([icon, label], i) => h('div', { class: 'art-stop', style: `animation-delay:${i * 0.08}s` }, h('div', { class: 'art-icon' }, icon), h('div', { class: 'art-label' }, label))),
      ),
  cards: () =>
      h(
        'div',
        { class: 'art-cards' },
        ...[
          ['warm', 'Warmth', 'Really listen', 'Builds liking slowly and surely.'],
          ['belong', 'Belonging', 'Talk video games', 'Big with fans. Boring to everyone else.'],
          ['edge', 'Edge', 'Crack a joke', 'Lands big — or falls flat.'],
          ['move', 'Move', 'Invite to hang out', 'Time outside school makes friends close.'],
        ].map(([family, kind, title, blurb], i) =>
          h(
            'div',
            { class: `card mini ${family}`, style: `transform: rotate(${(i - 1.5) * 5}deg) translateY(${Math.abs(i - 1.5) * 6}px); animation-delay:${i * 0.07}s` },
            h('div', { class: 'card-title' }, title),
            h('div', { class: 'card-kind' }, kind),
            h('div', { class: 'card-blurb' }, blurb),
          ),
        ),
      ),
  hand: () =>
      h(
        'div',
        { class: 'art-cards wide' },
        ...[
          ['edge', 'Tease', 'With a friend who likes you: affectionate, builds trust.', 'With someone who barely knows you, it stings.'],
          ['warm', 'Open up', 'With a close friend: the biggest trust boost there is.', 'Too much, too soon: they pull back.'],
          ['belong', 'Love: Static Lake', 'Everyone who agrees warms to you.', 'Everyone who disagrees cools on you at once.'],
        ].map(([family, title, good, bad], i) =>
          h(
            'div',
            { class: `card mini wide ${family}`, style: `transform: rotate(${(i - 1) * 4}deg) translateY(${Math.abs(i - 1) * 6}px); animation-delay:${i * 0.07}s` },
            h('div', { class: 'card-title' }, title),
            h('div', { class: 'card-blurb' }, h('div', { class: 'card-good' }, h('b', null, 'Good: '), good), h('div', { class: 'card-bad' }, h('b', null, 'Bad: '), bad)),
          ),
        ),
      ),
  regard: () =>
      h(
        'div',
        { class: 'art-panel' },
        h('div', { class: 'line mine' }, h('span', { class: 'speaker' }, 'You'), h('span', { class: 'said' }, '“Wait, you like Static Lake too?”')),
        h('div', { class: 'tells' }, 'Maya grins at you · Dev glances away'),
        h('div', { class: 'art-reads' }, h('span', { class: 'chip static' }, 'Maya ', h('span', { class: 'muted small' }, '♥ 18 ', h('b', { class: 'up' }, '+4'), ' · ★ 6')), h('span', { class: 'chip static' }, 'Dev ', h('span', { class: 'muted small' }, '♥ ? · ★ ?'))),
      ),
  gossip: () =>
      h(
        'div',
        { class: 'art-panel' },
        h('div', { class: 'event-tag' }, 'Something happened'),
        h('div', { class: 'art-event-title' }, 'A rumor'),
        h('div', { class: 'muted small' }, 'People are saying you copy everyone’s homework. It isn’t true.'),
        h('div', { class: 'art-options' }, h('span', { class: 'chip' }, 'Ignore it'), h('span', { class: 'chip' }, 'Ask friends to vouch'), h('span', { class: 'chip' }, 'Confront them')),
      ),
};

/**
 * How to Play: the rulebook. Chapters down the side, the rules on the right; opens at a chapter if
 * given (coach tips link straight to the rule they're teaching).
 */
export function showHowToPlay(root: HTMLElement, onClose: () => void, start: ChapterId = 'goal') {
  let page = Math.max(0, RULES.findIndex((c) => c.id === start));
  const layer = h('div', { class: 'modal guide-layer fade-in' });
  const close = () => {
    window.removeEventListener('keydown', onKey);
    layer.remove();
    onClose();
  };
  const go = (n: number) => {
    page = Math.max(0, Math.min(RULES.length - 1, n));
    render();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(page + 1);
    if (e.key === 'ArrowLeft') go(page - 1);
    if (e.key === 'Escape') close();
  };
  const render = () => {
    const c = RULES[page];
    const last = page === RULES.length - 1;
    const art = ART[c.id];
    fill(
      layer,
      h(
        'div',
        { class: 'guide rulebook' },
        h('div', { class: 'guide-head' }, h('div', { class: 'guide-kicker' }, `How to play · the rules · ${page + 1} of ${RULES.length}`), h('button', { class: 'guide-x', title: 'Close', onclick: close }, '✕')),
        h(
          'div',
          { class: 'rulebook-main' },
          h('nav', { class: 'rulebook-toc' }, ...RULES.map((x, i) => h('button', { class: i === page ? 'toc-item on' : 'toc-item', onclick: () => go(i) }, `${i + 1}. ${x.title}`))),
          h(
            'div',
            { class: 'rulebook-page fade-in' },
            art ? h('div', { class: 'guide-art small' }, art()) : null,
            h('h2', null, c.title),
            h('p', { class: 'rule-intro' }, ...colorLooks(c.intro)),
            c.rules.length ? h('ul', { class: 'rule-list' }, ...c.rules.map((r) => h('li', null, ...(typeof r === 'string' ? colorLooks(r) : [h('b', null, r[0]), ' ', ...colorLooks(r[1])])))) : null,
            c.table
              ? h(
                  'table',
                  { class: 'rule-table' },
                  h('tr', null, ...c.table[0].map((x) => h('th', null, x))),
                  ...c.table.slice(1).map((row) => h('tr', null, ...row.map((x) => h('td', null, ...colorLooks(x))))),
                )
              : null,
          ),
        ),
        h(
          'div',
          { class: 'guide-nav' },
          h('button', { class: 'menu-btn', disabled: page === 0, onclick: () => go(page - 1) }, '← Back'),
          h('button', { class: 'menu-btn primary', onclick: () => (last ? close() : go(page + 1)) }, last ? 'Got it!' : 'Next →'),
        ),
      ),
    );
  };
  window.addEventListener('keydown', onKey);
  root.append(layer);
  render();
}

function about(): HTMLElement {
  return h(
    'div',
    null,
    h('h2', null, 'About'),
    h('p', null, 'High School Simulator is a strategy game about the social side of high school. Every student is simulated: they have personalities, opinions and goals, they gossip, form groups, rise and fall — with or without you.'),
    h('p', null, 'There are no scripted storylines. What happens comes from how people behave, so no two semesters are the same, and there’s no single right way to play.'),
    h('p', { class: 'muted small' }, VERSION),
  );
}

/**
 * The game's logo: a varsity-style crest — a gold shield with a little schoolhouse, a ribbon
 * reading HIGH SCHOOL — over SIMULATOR in big outlined letters. Pure SVG, so it's crisp at any size.
 */
export function logo(className = 'logo-svg'): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = className;
  wrap.innerHTML = `
<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="High School Simulator">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f4b62a"/>
    </linearGradient>
  </defs>
  <!-- stars -->
  <g fill="#ffd23f" stroke="#1d2433" stroke-width="5" stroke-linejoin="round">
    <path d="M150 112 l10 20 22 3 -16 15 4 22 -20 -11 -20 11 4 -22 -16 -15 22 -3z"/>
    <path d="M490 112 l10 20 22 3 -16 15 4 22 -20 -11 -20 11 4 -22 -16 -15 22 -3z"/>
  </g>
  <!-- shield -->
  <path d="M320 18 L430 52 L430 150 C430 210 380 248 320 270 C260 248 210 210 210 150 L210 52 Z"
        fill="url(#gold)" stroke="#1d2433" stroke-width="10" stroke-linejoin="round"/>
  <!-- schoolhouse -->
  <g stroke="#1d2433" stroke-width="6" stroke-linejoin="round">
    <rect x="300" y="52" width="40" height="34" fill="#fffaf0"/>
    <path d="M292 56 L320 34 L348 56 Z" fill="#d9483b"/>
    <circle cx="320" cy="70" r="9" fill="#ffffff"/>
    <rect x="258" y="112" width="124" height="74" fill="#fffaf0"/>
    <path d="M246 116 L320 80 L394 116 Z" fill="#d9483b"/>
    <rect x="304" y="144" width="32" height="42" fill="#3d7bd9"/>
    <rect x="270" y="128" width="18" height="18" fill="#bfe3f2"/>
    <rect x="352" y="128" width="18" height="18" fill="#bfe3f2"/>
  </g>
  <line x1="320" y1="70" x2="320" y2="64" stroke="#1d2433" stroke-width="3"/>
  <line x1="320" y1="70" x2="325" y2="72" stroke="#1d2433" stroke-width="3"/>
  <!-- ribbon -->
  <g stroke="#1d2433" stroke-width="8" stroke-linejoin="round">
    <path d="M150 200 L196 200 L184 222 L196 244 L150 244 Z" fill="#a8342a"/>
    <path d="M490 200 L444 200 L456 222 L444 244 L490 244 Z" fill="#a8342a"/>
    <path d="M182 190 L458 190 L458 236 L182 236 Z" fill="#d9483b"/>
  </g>
  <text x="320" y="225" text-anchor="middle" font-family="Trebuchet MS, Segoe UI, sans-serif" font-weight="900"
        font-size="38" letter-spacing="6" fill="#ffffff">HIGH SCHOOL</text>
  <!-- wordmark -->
  <text x="320" y="352" text-anchor="middle" font-family="Trebuchet MS, Segoe UI, sans-serif" font-weight="900"
        font-size="92" letter-spacing="4" fill="#ffd23f" stroke="#1d2433" stroke-width="12"
        paint-order="stroke" stroke-linejoin="round">SIMULATOR</text>
</svg>`;
  return wrap;
}

/** A short loading screen while the school is generated. */
export function loadingScreen(root: HTMLElement, text: string) {
  fill(root, h('div', { class: 'loading fade-in' }, h('div', { class: 'spinner' }), h('div', { class: 'loading-text' }, text)));
}
