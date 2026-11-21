/**
 * The tutorial: a short welcome, then a coach that walks you through your first day. Each step
 * explains how the thing in front of you works, why it matters, and how to think about the choice,
 * and links to the chapter of the rules (How to Play, in rules.ts) it comes from. The tutorial
 * teaches the rules as you meet them; How to Play is the full rulebook.
 * After the first day the coach only speaks up the first time something new happens (your first
 * put-down, your first weekly recap, and so on).
 *
 * The coach floats at the top of the screen and never blocks the game: you can read it, act, and
 * dismiss it whenever you like. Tips queue up if several arrive at once.
 */
import { chapter, type ChapterId } from './rules';
import { showHowToPlay } from './title';
import { fill, h } from './ui';

export interface CoachTip {
  title: string;
  /** How the thing on screen works. */
  how: string;
  /** Why it matters — where the strategy is. */
  why: string;
  /** How to think about the choice. Questions and rules of thumb, never "the right answer". */
  think: string[];
  /** Something on screen to point at while the tip is up. */
  glow?: string;
  /** The chapter of the rules (How to Play) this tip teaches. */
  rules: ChapterId;
}

/** Tips in the order you meet them on your first day, then the ones for things that come later. */
export const TIPS: Record<string, CoachTip> = {
  profile: {
    title: 'Who you are',
    rules: 'goal',
    how: 'Spend 12 points on six abilities and set your personality. Abilities decide what you’re good at; personality decides what costs you energy, how people read you — and which cards are in your deck.',
    why: 'Your deck of conversation cards is built from who you are: your best skill gives you Brag and Offer help cards, being funny gives you more jokes, being warm more compliments, being reserved more Really listen. There’s no best build — just different ways to make friends.',
    think: [
      'One or two strong abilities give you something to offer: help with homework, a spot on a team, jokes that land.',
      'Reserved isn’t worse than outgoing. Talking costs outgoing people less energy; reserved people tire in crowds but are great listeners.',
      'Your hobbies (“What you’re into”) give you cards for talking about them.',
    ],
  },
  signup: {
    title: 'Pick an activity',
    rules: 'after-school',
    how: 'An activity is where you go most afternoons. Sports and drama have tryouts; band and robotics take anyone.',
    why: 'Friendships grow from seeing the same people again and again, and an activity hands you that. It also builds the skill it uses — and a better skill means more Brag and Offer help cards. But it takes your afternoons.',
    think: [
      'Is it something your abilities are good for? You’ll get more respect where you shine.',
      'Are the people there people you’d like as friends?',
      'No activity is a real choice too: your afternoons stay free for hanging out or resting.',
    ],
  },
  dressing: {
    title: 'Getting dressed',
    rules: 'clothes',
    how: 'Pick a look and a shirt. Your look is your crowd, and it’s the color of your shirt — the same colors the look names are written in. Your kind of shirt sets how many people come up to you (the dots on each shirt).',
    why: 'Before you say a word, everyone has read your clothes. Dressing like a crowd makes them warmer to you and more likely to let you join. And shirts are openers: a funny tee or a fan tee makes it easy for certain people to come and talk to you about it — but also gives people something to tease. When someone else wears one, you get a free opener card about it.',
    think: [
      'Which crowd do you want to get in with? Dress like them.',
      'A funny tee draws fun, outgoing people (and edgy teasing). A fan tee draws fans (and mockery from people who can’t stand it).',
      'Want to be left alone — fewer people, fewer teases? A hoodie. Want no risk at all? A plain tee.',
    ],
    glow: '.panel',
  },
  hallway: {
    title: 'Before school: walk up to someone',
    rules: 'meeting',
    how: 'You’re inside the front doors. Some people stand alone, some in pairs, some in groups. Click anyone on the map, or pick from the list — the list says what they look like, in their shirt colors.',
    why: 'Nobody comes to get you. Who you talk to decides who you get to know: strangers might not make room, someone alone is usually glad of company, and a group with someone who likes you is easy. In a group, everything you say is heard by everyone; one-on-one goes deeper.',
    think: [
      'Someone standing alone is the easiest start.',
      'Does a group dress like you? That reads as “one of us.”',
      'If it doesn’t work, try someone else.',
    ],
  },
  conversation: {
    title: 'Talking: how a turn works',
    rules: 'cards',
    how: 'The people are the cards at the top — click someone to talk to them. On your turn you play one card from your hand; then everyone else takes theirs. Cards marked → go to the person you picked; the rest are said to everyone. Each card shows the line you’d say.',
    why: 'Every card helps in some situations and backfires in others, just like in real life — click ? on any card to see when. Green cards build liking, blue ones say what you think (some people warm to it, others cool), red ones are risky, yellow ones are moves like invites.',
    think: [
      'With strangers, start safe: ask about them.',
      'Teasing bonds friends but stings strangers.',
      'Opinions win over people who agree — and cost you with people who don’t. In a group, that happens all at once.',
    ],
    glow: '.panel',
  },
  hand: {
    title: 'Your hand and your deck',
    rules: 'hand',
    how: 'You were dealt six cards from your deck. A card you play is used up; the ones you don’t play stay in your hand, and you draw one more each turn. Each card costs energy (the ⚡ in its corner; your total is next to “Your hand”). Some are response cards — Laugh along, Really listen, Agree… — greyed out until someone says the thing they answer.',
    why: 'So it’s a real card game: you choose what to spend now and what to save. An invite works better after you’ve warmed someone up; a Laugh along is only useful after a joke.',
    think: [
      'Is there a card you’d rather hold for later in this conversation?',
      'Response cards only light up when someone says the right thing, so they’re worth keeping until it happens.',
      'Nothing that fits? Stay quiet and let the others talk — it happens.',
    ],
  },
  energy: {
    title: 'Low on energy',
    rules: 'hand',
    how: 'Some of your cards cost more ⚡ than you have left, so they’re greyed out. Free and cheap cards still work.',
    why: 'Tired people can still listen and laugh along, but not open up or ask someone out. Time with close friends (+2), a joke that lands (+1) and rest give ⚡ back.',
    think: ['Head out early to save energy, or spend what’s left on free responses.'],
  },
  responses: {
    title: 'A response card lit up',
    rules: 'hand',
    how: 'Someone just said something one of your response cards answers, so it lit up — aimed at them. Play it now, or keep it: it goes grey again once the moment passes.',
    why: 'Answering what someone actually said (laughing at their joke, following up on what they shared) is usually warmer than changing the subject.',
    think: ['Is this the moment? A response used now is gone for the rest of the conversation.'],
  },
  opener: {
    title: 'A free opener',
    rules: 'hand',
    how: 'The person you picked is wearing a shirt that invites a comment — or told you what they love. That gives you a free card about it (“Right now”), this turn only.',
    why: 'Asking about something someone cares about warms them more than “how’s your week?”. This is what shirts are for — yours does the same for people who come up to you.',
    think: ['Bring it up while you can: it’s only there this turn.'],
  },
  meters: {
    title: '♥ and ★: where you stand',
    rules: 'regard',
    how: 'Someone just showed how they feel about you, so their card now shows ♥ (how much they like you) and ★ (how much they respect you), from −100 to 100, with what your last move changed.',
    why: 'Liking and respect come from different cards: warm cards build ♥; showing what you’re good at builds ★. Until people react or speak to you, you only see “?” — and you never see what they’ll do next.',
    think: ['Who here could become a friend? Who do you want to impress? They may need different cards.'],
  },
  hud: {
    title: 'Energy, stress and grades',
    rules: 'day',
    how: 'Top left: your energy (⚡, up to 20), stress, and your grades.',
    why: 'Every card costs ⚡ to play, so energy is how much you can do today. Close friends, jokes that land and rest give it back. Stress makes your mind go blank — useless “Um…” cards — and leaves you fewer calm comebacks.',
    think: [
      'Don’t plan a day that needs more ⚡ than you have: a big lunch, practice and a night out is a lot.',
      'Grades only go up on nights you do homework. Fall below what your parents expect and you’re grounded; fall further and you’re benched from your activity.',
    ],
    glow: '.hud',
  },
  walk: {
    title: 'Walking to class',
    rules: 'meeting',
    how: 'Pick someone from your next class to walk with — or walk alone.',
    why: 'One-on-one time is where acquaintances turn into friends: it’s just the two of you, so nothing you say splits a group.',
    think: ['Ask someone you’ve already talked with — they’re much more likely to say yes.'],
  },
  seats: {
    title: 'Pick your seat',
    rules: 'meeting',
    how: 'It’s your first time in this class: click an open desk (they glow green). You keep this seat for weeks. You’ll do this in each class the first time you walk in.',
    why: 'The people next to you are the people you’ll chat with every day in this class — the repeated contact that turns strangers into friends.',
    think: [
      'Met someone earlier today? They have a name tag. Sitting near them turns a first chat into a friendship.',
      'Chatting in class costs a little focus. If your grades are a worry, a seat by the wall with fewer neighbors helps.',
    ],
  },
  class: {
    title: 'In class',
    rules: 'day',
    how: 'You can whisper to someone next to you, or pay attention.',
    why: 'Whispering builds a friendship one-on-one. It also costs a little focus, and the teacher might tell you to be quiet.',
    think: ['How are your grades? If they’re fine, a whisper is cheap. If they’re slipping, focus.'],
  },
  lunch: {
    title: 'Lunch: where you sit',
    rules: 'meeting',
    how: 'Every table is a group, described by what they look like. Hover one to see who’s there, then walk over. Strangers might not make room.',
    why: 'Lunch is the longest conversation of the day, in front of the most people. Coming back to the same table day after day is how a table becomes your friends.',
    think: [
      'A table with someone who already likes you is safe and builds that friendship.',
      'A table of strangers is a gamble — big upside if they take you in.',
    ],
  },
  feed: {
    title: 'The activity log',
    rules: 'gossip',
    how: 'Top right is a log of your day: who you talked to, what you heard, what happened around school.',
    why: 'Gossip travels: this is how you learn who’s who and what people are saying — sometimes about you. Stories you hear also become gossip cards in your deck.',
    think: ['You don’t need to act on the log. Things you can act on will pop up and ask you.'],
    glow: '.feed-wrap',
  },
  afterSchool: {
    title: 'After school',
    rules: 'after-school',
    how: 'Your activity, hanging out with friends, behind the gym, or home.',
    why: 'Close friendships come from time together outside class. But it uses energy, and the evening still has homework in it.',
    think: [
      'If someone said yes to an invite, this is when you hang out.',
      'Behind the gym bonds you fast, but it isn’t respected, costs a class, and teachers sometimes catch you.',
    ],
  },
  practice: {
    title: 'At practice',
    rules: 'after-school',
    how: 'Between drills, people talk in little groups. Pick a group from the list, or click someone on the map — or just focus on practice.',
    why: 'Practice is the same people every week — the easiest place to turn familiar faces into friends.',
    think: ['Coming back to the same people beats spreading yourself thin.'],
  },
  evening: {
    title: 'Your evening',
    rules: 'after-school',
    how: 'Homework, see friends, practice a skill, rest, or your phone.',
    why: 'Each one gives you something and costs you something. Homework is the only way grades go up. Practice grows your skills and hobbies — and so your deck. Rest brings energy back. The phone feels good tonight and costs you later.',
    think: [
      'Doing the same thing every night gives less and less. A mix beats any single habit.',
      'What does tomorrow need: energy, grades, or time with a friend?',
    ],
  },
  moreCards: {
    title: 'How you get more cards',
    rules: 'more-cards',
    how: 'Your deck is worked out from who you are right now. Open the Notebook and look at “Your cards” to see every card and why you have it.',
    why: 'So everything you do grows your deck: practice a skill → more Brag and Offer help; get into a hobby → cards for talking about it; hear gossip → gossip cards; make close friends → more Open up cards.',
    think: ['What do you want to be able to do in conversations next week? Spend your evenings on that.'],
    glow: '.hud',
  },
  callFriends: {
    title: 'Calling friends',
    rules: 'after-school',
    how: 'Choose which close friends to call tonight.',
    why: 'Close friendships fade if you never spend time together. Calling keeps them warm.',
    think: ['Who haven’t you seen in a while?'],
  },
  endOfDay: {
    title: 'That was your first day',
    rules: 'goal',
    how: 'Every school day goes like that. Weekends are free time.',
    why: 'There’s no single score: you’re balancing friends, respect, grades and how calm you feel, and no plan works best for everyone.',
    think: [
      'The full rules are in How to Play (Menu, top left). Each coach tip has a link to its chapter.',
      'From now on, the coach only speaks up when something new happens.',
    ],
    glow: '.hud',
  },
  challenge: {
    title: 'Someone’s putting you down',
    rules: 'putdowns',
    how: 'Someone is trying to make you look small in front of everyone. Pick how you respond.',
    why: 'What they said matters less than how you take it. Everyone watching decides who won from your reaction.',
    think: ['Calm options — not taking the bait, a joke, walking away — usually win. Explaining yourself or snapping back makes them look powerful.'],
  },
  witness: {
    title: 'Someone else is being picked on',
    rules: 'putdowns',
    how: 'You can stick up for them or stay out of it.',
    why: 'Standing up for someone is a risk — the bully might turn on you. But the person you helped won’t forget, and neither will the people watching.',
    think: ['How strong is your standing right now? Do you have friends here who’d back you?'],
  },
  event: {
    title: 'Something happened',
    rules: 'gossip',
    how: 'Every so often, something happens that you have to deal with: a group project, a rumor, a friend in trouble.',
    why: 'There’s rarely a perfect answer, and you can’t fully predict how people will take it.',
    think: ['Think about who’s watching and who’ll hear about it.'],
  },
  weekend: {
    title: 'The weekend',
    rules: 'after-school',
    how: 'No school. Make plans with friends or stay home.',
    why: 'Weekend plans are the deepest time you can spend with people.',
    think: ['If you’re invited somewhere, going matters to the person who invited you.'],
  },
  recap: {
    title: 'Your weekly recap',
    rules: 'gossip',
    how: 'Once a week: who warmed to you and who cooled, and why.',
    why: 'You see ♥ and ★ change as you play, but not what happens behind your back. The recap shows that too.',
    think: ['Look for patterns: which choices made people warm to you, and which quietly cost you?'],
  },
};

/** The welcome pages shown before you make your profile. */
const WELCOME: { title: string; text: string[] }[] = [
  {
    title: 'Welcome to High School Simulator',
    text: [
      'You’re starting freshman year at a big new school. There are 200 students, and you don’t know any of them.',
      'You make every social decision: what to wear, who to walk up to, where to sit, what to say, what to do after school and in the evening. The classwork happens on its own.',
    ],
  },
  {
    title: 'There’s no single way to win',
    text: [
      'You’re balancing four things: friends, respect, grades, and how calm you feel. Every choice helps some and costs others.',
      'No plan is best for everyone. What works depends on who you are, who you happen to meet, and what happens to you.',
    ],
  },
  {
    title: 'Conversations are a card game',
    text: [
      'Your deck is who you are — your opinions, hobbies, skills and friends — so you get more cards by growing them. You play from a hand: a card you play is used up, the rest you keep.',
      'Everyone you talk to shows ♥ how much they like you and ★ how much they respect you, and you watch them change as you play.',
    ],
  },
  {
    title: 'The tutorial and How to Play',
    text: [
      'This tutorial teaches you the rules as you play your first day: a coach at the top of the screen explains each thing the first time you meet it.',
      'How to Play is the rulebook — every rule in one place. Open it any time from the title screen or the Menu; every coach tip has a link to the chapter it comes from.',
    ],
  },
];

/** Show the welcome pages; resolves when the player is done. */
export function showWelcome(): Promise<void> {
  return new Promise((resolve) => {
    const layer = h('div', { class: 'modal guide-layer fade-in coach-welcome' });
    document.body.append(layer);
    const go = (page: number) => {
      const p = WELCOME[page];
      const last = page === WELCOME.length - 1;
      fill(
        layer,
        h(
          'div',
          { class: 'guide' },
          h('div', { class: 'guide-head' }, h('div', { class: 'guide-kicker' }, `Tutorial · ${page + 1} of ${WELCOME.length}`)),
          h('div', { class: 'guide-body' }, h('h2', null, p.title), ...p.text.map((t) => h('p', null, t))),
          h(
            'div',
            { class: 'guide-nav' },
            h('button', { class: 'menu-btn', disabled: page === 0, onclick: () => go(page - 1) }, '← Back'),
            h('button', { class: 'menu-btn primary', onclick: () => (last ? (layer.remove(), resolve()) : go(page + 1)) }, last ? 'Make my profile →' : 'Next →'),
          ),
        ),
      );
    };
    go(0);
  });
}

/** The coach: one floating card at the top of the screen. */
export class Coach {
  private shown = new Set<string>();
  private queue: string[] = [];
  private current: string | null = null;
  private card = h('div', { class: 'coach hidden' });
  private reopen = h('button', { class: 'coach-reopen hidden', title: 'Show the last tip again' }, '💡 Tip');

  constructor(public on: boolean) {
    this.reopen.onclick = () => this.current && this.render(this.current);
    document.body.append(this.card, this.reopen);
  }

  /** Show a tip the first time its moment comes (if the coach is on). */
  tip(key: keyof typeof TIPS) {
    if (!this.on || this.shown.has(key)) return;
    this.shown.add(key);
    if (this.current && !this.card.classList.contains('hidden')) this.queue.push(key);
    else this.render(key);
  }

  private render(key: string) {
    const t = TIPS[key];
    this.current = key;
    this.clearGlow();
    const more = this.queue.length;
    fill(
      this.card,
      h('div', { class: 'coach-kicker' }, 'Coach'),
      h('div', { class: 'coach-title' }, t.title),
      h('p', { class: 'coach-how' }, t.how),
      h('p', { class: 'coach-why' }, h('b', null, 'Why it matters: '), t.why),
      h('div', { class: 'coach-think-head' }, 'How to think about it'),
      h('ul', { class: 'coach-think' }, ...t.think.map((x) => h('li', null, x))),
      h('button', { class: 'coach-rules', onclick: () => showHowToPlay(document.body, () => {}, t.rules) }, `Read the rules: ${chapter(t.rules).title} →`),
      h(
        'div',
        { class: 'coach-actions' },
        h('button', { class: 'small-btn', onclick: () => this.turnOff() }, 'Turn off the coach'),
        h('button', { class: 'coach-ok', onclick: () => this.next() }, more ? `Next tip (${more} more) →` : 'Got it'),
      ),
    );
    this.card.classList.remove('hidden');
    this.reopen.classList.add('hidden');
    // Point at the thing the tip is about, once it's on screen.
    if (t.glow) setTimeout(() => this.current === key && document.querySelector(t.glow!)?.classList.add('coach-glow'), 50);
  }

  private next() {
    const key = this.queue.shift();
    if (key) this.render(key);
    else {
      this.card.classList.add('hidden');
      this.clearGlow();
      if (this.current) this.reopen.classList.remove('hidden');
    }
  }

  /** Remove the coach from the page (when backing out to the title screen). */
  dispose() {
    this.card.remove();
    this.reopen.remove();
    this.clearGlow();
  }

  private turnOff() {
    this.on = false;
    this.queue = [];
    this.current = null;
    this.card.classList.add('hidden');
    this.reopen.classList.add('hidden');
    this.clearGlow();
  }

  private clearGlow() {
    document.querySelectorAll('.coach-glow').forEach((e) => e.classList.remove('coach-glow'));
  }
}
