# Tutorial and How to Play

**Summary.** There's one set of rules, in two forms. **How to Play** is the
rulebook: every rule in twelve short chapters, open any time from the title
screen or the in-game Menu. **The tutorial** teaches the same rules while you
play your first day: a coach explains each thing the first time you meet it,
and every tip links to the chapter it comes from. The rules live in
`src/game/rules.ts`; the coach's tips in `src/game/tutorial.ts`.

## How to Play: the rulebook

Chapters down the side, rules on the right, with tables where they help.

| # | Chapter | What it covers |
| --- | --- | --- |
| 1 | The goal | No single score: friends, respect, grades, calm; no plan wins for everyone |
| 2 | A school day | The order of a day; energy and stress; grades, grounding and benching |
| 3 | Clothes: who comes up to you | Look = crowd = shirt color; kinds of shirt and who they bring over; fan shirts both ways |
| 4 | Meeting people: who you talk to matters | Walking up; alone vs. groups; group vs. one-on-one; repetition; time outside school; onlookers; name tags |
| 5 | The card game: a turn | People cards, aiming, lines, ? tips, card colors, Head out, turn counts |
| 6 | Your hand and your deck | The deal, spend or keep, response cards and when each plays, openers, blanks |
| 7 | Getting more cards | What you do in the game → which cards you get |
| 8 | ♥ and ★: where you stand | The two numbers, "?" until shown, which cards build which, what stays hidden |
| 9 | After school, evenings and weekends | Activity, hanging out, behind the gym, evening choices, weekends |
| 10 | Put-downs and standing up | Calm wins; standing up for someone |
| 11 | Gossip, events and your week | Stories spread; events; the weekly recap; the activity log |
| 12 | Rules of thumb | Strategy by situation |

Every rule describes what the simulation actually does; when a rule changes
in the code, it changes in `rules.ts` too.

## The tutorial

"Tutorial" on the title screen starts a normal game with the coach on.

- **Welcome pages** (before your profile): what the game is; no single way
  to win; conversations are a card game with ♥ and ★; and what the tutorial
  and How to Play are for.
- **The coach** floats at the top of the screen and never blocks the game.
  Each tip says how the thing in front of you works, why it matters, and how
  to think about it, and ends with "Read the rules: (chapter) →". You can
  close a tip, bring it back with 💡, or turn the coach off.
- **First day, in order:** your profile (your deck is built from it) → an
  activity → getting dressed (clothes and who comes up to you) → before
  school (walking up to people) → your first conversation (how a turn works,
  then your hand and deck) → energy, stress and grades → walking to class →
  picking your seat in each class → whispering in class → lunch → the
  activity log → after school → practice → your evening → how you get more
  cards → end of the day.
- **The first time it happens:** a response card lights up; a free opener
  appears; someone shows their ♥ and ★; a put-down; someone else picked on;
  a random event; calling friends; the weekend; your first weekly recap.
