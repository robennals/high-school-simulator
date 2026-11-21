/**
 * The rulebook: the whole game's rules, in short chapters. "How to Play" shows it (from the title
 * screen or the in-game menu); the tutorial teaches the same rules while you play your first day, and
 * each coach tip links to the chapter it comes from.
 *
 * Every rule here describes what the simulation actually does. If a rule changes, change it here too.
 */

export interface Chapter {
  id: ChapterId;
  title: string;
  /** One or two sentences: what this chapter is about and why it matters. */
  intro: string;
  /** The rules, one per bullet. A pair is [bold lead, the rest]. */
  rules: (string | [string, string])[];
  /** An optional table: header row first. */
  table?: string[][];
}

export type ChapterId = 'goal' | 'day' | 'clothes' | 'meeting' | 'cards' | 'hand' | 'more-cards' | 'regard' | 'after-school' | 'putdowns' | 'gossip' | 'strategy';

export const RULES: Chapter[] = [
  {
    id: 'goal',
    title: 'The goal',
    intro: 'You’re starting at a big new school — 200 students — and you know nobody. You make every social decision; the classwork happens on its own.',
    rules: [
      ['There’s no single score.', 'You’re balancing four things: friends (especially close friends), respect, grades, and how calm you feel.'],
      ['Everything costs something.', 'Each choice helps some of those and costs others. You can’t do it all.'],
      ['No plan wins for everyone.', 'What works depends on who you are (your profile), who you happen to meet, and what happens to you. Doing one thing over and over usually loses to a mix.'],
      ['The semester is 16 weeks.', 'Every Sunday you get a recap; at the end, a report.'],
    ],
  },
  {
    id: 'day',
    title: 'A school day',
    intro: 'Every school day runs in the same order. Weekends are free time.',
    rules: [
      ['Get dressed', '— your look and your shirt (see Clothes).'],
      ['Before school', '— walk up to someone in the hallway and talk.'],
      ['Walk to 1st period', '— with a classmate, or alone.'],
      ['Classes', '— the first time you walk into each class you pick your seat. Once a morning and once an afternoon you can whisper to whoever’s next to you.'],
      ['Lunch', '— pick a table; the longest conversation of the day.'],
      ['After school', '— your activity, hanging out, behind the gym, or home.'],
      ['Evening', '— homework, friends, practice, rest, or your phone.'],
      ['Energy (⚡).', 'You have up to 20 ⚡, refilled by sleep (more if you’re fit, less if you were on your phone late). Playing cards costs ⚡ (see Your hand). Time with close friends, a joke that lands and resting in the evening give ⚡ back; being put down and hard sports practice take it away.'],
      ['Stress', 'builds from schoolwork pressure, put-downs and trouble, and fades overnight. Stressed, your mind sometimes goes blank: you draw useless “Um…” cards, and you have fewer calm comebacks.'],
      ['Grades', 'only go up on nights you do homework. Fall below what your parents expect and you’re grounded; fall further and you’re benched from your activity.'],
    ],
  },
  {
    id: 'clothes',
    title: 'Clothes: who comes up to you',
    intro: 'Before you say a word, everyone has read your clothes. You choose them every morning.',
    rules: [
      ['Your look is your crowd.', 'Sporty, preppy, alt, artsy, techy or low-key — it’s the color of your shirt, so everyone can see it across the room. The look names are written in the same colors everywhere in the game.'],
      ['Dressing like a crowd', 'makes them warmer to you and more likely to let you join them. A look everyone wears says almost nothing; a rarer one says more.'],
      ['Your kind of shirt sets who comes up to you — and who teases you.', 'A funny or fan tee is an opener: it makes it easy for certain people to start talking to you, about your shirt. It also gives other people something to tease. A hoodie means fewer people come over, and fewer tease you.'],
      ['Different shirts draw different people.', 'A funny graphic tee draws people who like funny, outgoing people; a fan tee draws fans of the thing, and people who can’t stand it keep away or mock it.'],
      ['Other people’s shirts work for you too:', 'someone in a fan or funny tee gives you a free opener card about it (see Your hand).'],
      ['It has to match.', 'A fan shirt has to go with your look — no band tee with a sporty outfit.'],
    ],
    table: [
      ['Shirt', 'Who comes up to you', 'Who teases you', 'Also'],
      ['Hoodie', 'Fewer people', 'Fewer people', 'Fewer interruptions, better focus; slower to make friends'],
      ['Plain tee', 'The usual', 'Nobody teases your shirt', 'No conversation starter'],
      ['Funny graphic tee', 'More people who like funny, outgoing people', 'Edgy people', 'More interruptions, more tiring if you’re reserved'],
      ['Fan tee', 'Lots of fans of the thing', 'People who can’t stand it', 'People who can’t stand it keep away'],
    ],
  },
  {
    id: 'meeting',
    title: 'Meeting people: who you talk to matters',
    intro: 'Nobody comes to get you. Where you stand and who you sit with decide who you get to know.',
    rules: [
      ['Walk up to people.', 'Click anyone on the map. Strangers might not make room; someone standing alone is usually glad of the company; a group with someone who likes you is easy to join.'],
      ['Group or one-on-one.', 'In a group, everything you say is heard by everyone — an opinion wins some people and loses others at once. One-on-one (walking to class, whispering, hanging out) goes deeper.'],
      ['Seeing the same people again and again', 'is how strangers become friends: your class seats, your usual lunch table, your activity.'],
      ['Close friends need time outside school:', 'hanging out after school, weekends, calling in the evening.'],
      ['People nearby are watching.', 'Onlookers see and hear what you do, and stories spread to people who weren’t there.'],
      ['People you’ve met have name tags', 'on the map: green if they like you, red if they don’t, blue otherwise.'],
    ],
  },
  {
    id: 'cards',
    title: 'The card game: a turn',
    intro: 'Every conversation is a short card game. On your turn you play one card; then everyone else takes theirs.',
    rules: [
      ['The people', 'are the cards at the top: their look, their clothes, how well you know them, and ♥ and ★ (see ♥ and ★). Click someone to talk to them.'],
      ['Aim.', 'Cards marked → go to the person you picked; the rest are said to everyone.'],
      ['Each card shows the line you’d say.', 'The words follow on from what was just said. Click ? on a card to see when it works and when it backfires — every card has both.'],
      ['Card colors:', 'green builds liking; blue says what you think or love (splits the room); red is risky; yellow is a move, like an invite.'],
      ['Head out', 'to leave early and save energy.'],
      ['Conversations are short:', 'four turns at lunch and when hanging out, two or three elsewhere.'],
    ],
  },
  {
    id: 'hand',
    title: 'Your hand and your deck',
    intro: 'Your deck is who you are. You play from a hand, and what you don’t play you keep.',
    rules: [
      ['The deal.', 'Each conversation you shuffle your deck and draw six, at random. Sometimes nothing fits the moment and you have nothing to say — you can Stay quiet and let the others talk.'],
      ['Spend or keep.', 'A card you play is used up. The rest stay in your hand, and you draw one more each turn (you hold at most six). Save a strong card for the right moment — an invite lands better once you’ve warmed someone up.'],
      ['Response cards', '(Laugh along, Really listen, Agree, Push back, Answer honestly…) are in your hand like any card, but you can only play one right after the kind of line it answers. Until then it’s greyed out with what it needs.'],
      ['Openers.', 'If the person you picked is wearing a fan shirt or a funny tee, or told you what they love, you get a free card about it, this turn only.'],
      ['Every card costs energy (⚡) to play.', 'Easy responses are free, most cards cost 1, bold ones cost 2. You can’t play a card you can’t afford — tired, you can still listen and laugh along, but not open up or ask someone out. Outgoing people pay 1 less for things said to the whole group; reserved people pay 1 more for those in groups of four or more.'],
      ['Getting ⚡ back:', 'time with close friends (+2 at the end of a conversation with them), a joke that lands (+1), resting in the evening, sleep.'],
      ['Blanks.', 'Stressed, your mind sometimes goes blank: you draw “Um…”. It clogs your hand until you play it, which wastes a turn.'],
    ],
    table: [
      ['Cost', 'Cards'],
      ['Free', 'Really listen, Laugh along, Agree, Go along, Be impressed, Thank them, openers'],
      ['⚡', 'Ask, Share something small, Answer honestly, Same here, Compliment, Offer help, an opinion, Talk (hobby), Push back, Tease back, gossip, Invite with an out'],
      ['⚡⚡', 'Open up, Crack a joke, Tease, Brag, Invite to hang out, Put someone down'],
      ['Response', 'Playable right after'],
      ['Really listen', 'someone tells you something'],
      ['Laugh along', 'a joke, or a friendly tease of you'],
      ['Answer honestly', 'a question for you'],
      ['Same here', 'someone shares something'],
      ['Agree / Push back / Go along', 'an opinion (you share it / you don’t / pretend you do)'],
      ['Be impressed', 'someone shows off'],
      ['Tease back', 'someone teases you or brags'],
      ['Thank them', 'a compliment or a favor'],
    ],
  },
  {
    id: 'more-cards',
    title: 'Getting more cards',
    intro: 'Your deck is worked out from who you are right now — so you get more cards by changing who you are. The Notebook’s “Your cards” page shows every card and why you have it.',
    rules: [],
    table: [
      ['Do this…', '…and you get'],
      ['Practice a skill (evenings, your activity)', 'more Brag and Offer help cards for it'],
      ['Get into a hobby (practice evenings deepen it)', 'Talk cards for it — two once you’re really into it'],
      ['Hear gossip', 'a card for each fresh story, gone once it’s old news'],
      ['Feel strongly about something', 'an opinion card (opinions drift toward your friends’)'],
      ['Make close friends', 'more Open up cards — people you can open up to'],
      ['Be who you are', 'your personality sets your mix: reserved and warm people get extra Really listen, edgy people extra Tease and Push back, people who care what others think extra Go along'],
    ],
  },
  {
    id: 'regard',
    title: '♥ and ★: where you stand',
    intro: 'Everyone you talk to has two numbers, from −100 to 100: ♥ how much they like you and ★ how much they respect you. You see them change as you play.',
    rules: [
      ['Some people keep their cards close.', 'You see “?” until they react where you can see it, say something to you, or you get to know them well. Reserved people show less.'],
      ['Liking and respect come from different cards.', 'Warm cards (asking, listening, complimenting) build ♥. Showing what you’re good at (help, a hobby you know, a joke that lands) builds ★. Risky cards can win ★ and lose ♥.'],
      ['Everyone watching counts.', 'Onlookers judge what you say too — and people who hear about it later change their minds without telling you.'],
      ['What you can’t see:', 'what someone will do next (say yes, laugh, make room — there’s luck in it), what people hear about you secondhand, and who knows which story.'],
    ],
  },
  {
    id: 'after-school',
    title: 'After school, evenings and weekends',
    intro: 'Time outside class is where close friendships come from — and where grades and energy are won or lost.',
    rules: [
      ['Your activity:', 'the same people every week. Between drills you pick a group and talk.'],
      ['Hanging out:', 'with whoever said yes to an invite — a longer, private conversation.'],
      ['Behind the gym:', 'the crowd that skips last period. Easy to get in with, and it bonds you fast — but it isn’t respected, it costs a class, and teachers sometimes catch you.'],
      ['Evenings:', 'homework is the only way grades go up; friends need close friends to call; practice builds skills and hobbies (and so cards); rest restores energy; the phone feels good tonight and costs you later.'],
      ['Mix beats repeating.', 'Doing the same thing every night gives less and less.'],
      ['Weekends:', 'make plans with friends, or rest. Going when someone invites you matters to them.'],
    ],
  },
  {
    id: 'putdowns',
    title: 'Put-downs and standing up',
    intro: 'Sometimes someone tries to make you look small in front of everyone. How you take it matters more than what they said.',
    rules: [
      ['Calm wins.', 'Not taking the bait, turning it into a joke, or walking away usually wins the room.'],
      ['Explaining yourself or snapping back', 'makes them look powerful.'],
      ['Stress and tiredness', 'leave you fewer calm options.'],
      ['Standing up for someone else', 'is a risk — the bully might turn on you — but the person you helped, and everyone watching, remember it.'],
      ['Bullying mostly doesn’t pay.', 'It might get a laugh, but most people quietly like the bully less.'],
    ],
  },
  {
    id: 'gossip',
    title: 'Gossip, events and your week',
    intro: 'What you do travels further than the people who saw it.',
    rules: [
      ['Stories spread', 'from person to person, and people remember who told them. Tell gossip and people believe your stories less later.'],
      ['Things happen:', 'group projects, rumors, friends falling out, a new student. You choose what to do; you can’t fully predict how people will take it.'],
      ['Every Sunday, a recap:', 'who warmed to you and who cooled, and why — including what happened behind your back.'],
      ['The activity log', '(top right) is a record of your day. Things you can act on pop up and ask you.'],
    ],
  },
  {
    id: 'strategy',
    title: 'Rules of thumb',
    intro: 'The best move depends on who you’re with and how well they know you. These work in real life as much as in the game.',
    rules: [],
    table: [
      ['With…', 'Try'],
      ['Strangers', 'Start warm: ask, listen. Save teasing and opening up for later.'],
      ['Friends', 'Tease, open up, invite them out. That’s what makes friends close.'],
      ['People who share your taste', 'Say what you love; talk about your hobby.'],
      ['Someone more popular', 'Be interested, not eager: no gushing, no bragging.'],
      ['When you’re tired or stressed', 'Say less, or head out early.'],
      ['When you’re put down', 'Stay calm. Don’t explain yourself; don’t snap back.'],
    ],
  },
];

export function chapter(id: ChapterId): Chapter {
  return RULES.find((c) => c.id === id)!;
}
