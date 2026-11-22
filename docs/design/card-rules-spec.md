# Spec: the card rules

**Status: spec for review. Built in the headless simulator only; the playable
game doesn't use these rules yet.** Replaces the earlier
[proposal](card-game-proposal.md).

**Summary.** High School Simulator becomes one card game that you and all 199
other students play by the same printed rules. Every social effect happens
because someone played a card, and every card prints exactly what it does.
You and the others each have a few kinds of points (energy, standing,
favors) that cards spend or create. Friendship is a single mutual **Bond**
between two people. Because cards are played to a whole table, one card can
raise your Bond with some people and lower it with others. Everything you choose
outside conversations — your profile, your clothes, your activity, your
evenings — works by changing your cards: which cards you hold, what they cost,
or a **modifier card** you have in play. What's hidden is what card games
hide: the other players' personalities, cards and choices, and the dice —
plus a fog of war over relationships you haven't seen lately.

The social model stays rich, but every piece of it is a rule you can read:
the research-based effects (first impressions, needing depth for closeness,
audiences, taking sides, gossip, conformity, status) each become one printed
rule (§8).

## Contents

1. [The pieces](#1-the-pieces)
2. [Bond: friendship is mutual](#2-bond-friendship-is-mutual)
3. [Respect and Standing](#3-respect-and-standing)
4. [Points you spend and earn](#4-points-you-spend-and-earn)
5. [A conversation, turn by turn](#5-a-conversation-turn-by-turn)
6. [The cards](#6-the-cards)
7. [Who you are, as cards](#7-who-you-are-as-cards)
8. [The rules of the school](#8-the-rules-of-the-school)
9. [How the other students play](#9-how-the-other-students-play)
10. [Why it takes strategy](#10-why-it-takes-strategy)
11. [What changes from today](#11-what-changes-from-today)
12. [Decisions made](#12-decisions-made)
13. [Open questions](#13-open-questions)

## 1. The pieces

| Piece | What it is |
| --- | --- |
| **Bond** (between two people) | One mutual number for how close two people are, from −5 to +15, with named levels (§2). |
| **Respect** (from one person to another) | How much someone looks up to you, 0–5. One-way: you can respect someone who doesn't respect you. You always see each person's Respect for you (§3). |
| **Standing** | Your popularity, ⭐ 1–5, worked out each Sunday from your Friends and who respects you (§3). |
| **Energy ⚡** | Your social battery and confidence for the day, 0–12. Cards cost it; going well gives some back, going badly takes extra (§4). |
| **Favors 🪙** | Tokens a specific person owes you, earned by helping them (§4). |
| **Cards** | Your collection (who you are — every card you own, each copy usable once a day) and modifier cards in play (traits, today's clothes) (§6, §7). |
| **Story cards** | Pieces of gossip people hold and pass on (§8). |
| **Grades** | A track from F to A, moved only by homework day cards and a few events (§7.5). |

## 2. Bond: friendship is mutual

Every pair of people has one **Bond**, the same in both directions.

**What you can see (fog of war).**
- **Your own Bonds** are always visible: you know how close you are to people.
- **Other people's Bonds with each other** are a *last seen* reading. When
  you see two people play a card to each other, you learn their Bond as it is
  then, and the Notebook and map show it with when you saw it ("Friends — seen
  this week", "Friendly — seen 3 weeks ago"). Old readings fade on screen and
  can be wrong: they may have grown closer or fallen out since. The same
  goes for how much other people respect each other.

| Bond | Level | What it unlocks |
| --- | --- | --- |
| −5 … −3 | **Enemies** | They may play attack cards on you; their friends start cool to you (§8, rule 5). |
| −2 … −1 | **Cool** | They won't make room for you. |
| 0 | **Strangers** | — |
| 1 … 3 | **Acquaintances** | They'll make room for you at a table. |
| 4 … 7 | **Friendly** | They'll walk to class with you; Tease is affectionate. |
| 8 … 11 | **Friends** | They'll say yes to an invite; you can call them in the evening. |
| 12 … 15 | **Close friends** | The closest you get: needs regular deep moments. |

**The depth rule.** Casual cards can't raise a Bond past 7 (Friendly). To
become Friends you need **deep** cards, and you must **both have opened up to
each other** (going out counts as both). This is how real closeness works: you
can be friendly with a lot of people, but closeness takes disclosure both ways.

**Why mutual is fine.** Real feelings aren't always symmetric. The one-sided
part of relationships lives in Respect instead: you can admire someone who
barely notices you. Liking and closeness are shared; looking up to someone
isn't.

## 3. Respect and Standing

- **Respect** is one-way, 0–5: how much a person looks up to you. You
  always see each person's Respect for you, and you see it move as you play,
  because it changes with what you do in front of them. Cards that show
  skill, staying calm under pressure, and being stood up for raise it;
  flopping, sucking up and backing down lower it. What you *don't* see is how
  much other people respect each other — that's under the same fog of war as
  their Bonds (§2).
- **Standing** ⭐ 1–5 is public, and is your popularity: **10 for each
  Friend, plus 1 for each person who respects you (Respect 3+)**. Each Sunday
  everyone is ranked by that and split into fifths.
- **What Standing does:** people of higher Standing get the floor
  more easily, their invites are accepted more easily, and compliments *up* the ladder can
  read as sucking up (see Compliment).

## 4. Points you spend and earn

### Energy ⚡ (0–12)

One meter for your social battery **and** your confidence. In real life
these are different (being drained versus not daring), but they move
together: a rejection drains you, a joke that lands picks you up, a good
friend recharges you. One meter keeps that, without two things to track.

You wake with 10. Cards cost 0–3 ⚡ — bold cards cost more, because putting
yourself out there takes more out of you. You can't play a card you can't
afford.

| Gain ⚡ | Lose ⚡ |
| --- | --- |
| A joke lands: +1 back | A joke flops, or you open up too soon: −1 extra |
| — | Being put down: −2 (Sensitive −3, Thick-skinned 0) |
| A conversation that included a Friend or Close friend: +1 at the end | Being left out of a table: −1 |
| Going out with someone: +1 each morning (§6, Going out) | Sports practice: −2 |
| Stay quiet: +1 (you catch your breath) | An awkward silence: −1 |
| Rest evening: wake with 12 | Phone evening: wake with 8 |

**Low energy** means you can only afford cheap cards: you can still listen
and laugh along, but you can't put yourself out there. A bad day can snowball
— a flop, then a put-down, and you're too drained to answer well — and a good
day builds on itself. That's the confidence spiral, as one rule.

### Favors 🪙

When you **Offer help** and it's accepted, that person owes you a Favor,
which fades after two weeks. How favors are spent isn't built yet (§13).

## 5. A conversation, turn by turn

A conversation is a series of **moments**. In each moment one person speaks —
whoever wants to most — and everyone else listens. Like a real conversation,
you choose whether to say something, and how hard to push to be heard.

- **The table:** the people talking (2–6). Everyone else nearby is an
  **onlooker**: they don't play cards, but they see what's played (§8).
- **Each moment, everyone chooses at the same time:**
  - **Stay quiet** (free, +1 ⚡ — you catch your breath), or
  - **Say something** — pick a card to play, or
  - **Jump in** — pick a card and push to go first (+1 ⚡).
- **Who speaks,** in order:
  1. Standing up to a put-down.
  2. Whoever was just spoken to, then anyone responding to what was said.
  3. Not the person who just spoke: nobody goes twice in a row while someone
     else wants to speak.
  4. Jumping in beats saying something. Between equals, the person with the
     most Bond with the table, then higher Standing, then a coin flip.

  Only the speaker's card is played; everyone else keeps theirs.
- **Talking over someone:** if you Jump in over an Acquaintance (Bond 1–3)
  who also wanted to speak, your Bond with them −1. It's annoying, not a
  reason for dislike: it never takes a Bond below 0.
- **If everyone stays quiet,** it's an awkward silence: each person −1 ⚡,
  and the conversation may end.
- **Your cards: you can use any card you own, and each copy is used up until
  tomorrow.** There's no hand and no drawing. Owning more copies means you can
  say it more times in a day, so gaining a card never hurts. Cards you can't
  play right now are greyed out (a response with nothing to respond to, or
  not enough ⚡).
- **Aim:** a card is played *to one person* (→) or *to the table*. Effects are
  printed for each: the target, the table, onlookers.
- **Respond warmly** can only be played right after something it can answer
  (a joke that landed, a question to you). Because only one person speaks per
  moment, there's competition to respond: if three people want to respond
  to a joke, one gets the Bond.
- **Head out** any time.
- **Length:** lunch is 10 moments; before school, walking and whispering 4;
  after school 6–8.

## 6. The cards

**17 cards, many phrases.** A card says what you're doing; the words are
picked from the moment.

**Card anatomy.** Name · cost (⚡) · aim (→ one person, or table) · printed
effect · the line you say.

**Which line you say** depends on what was just said, by whom, about what,
how close you two are, shirts, and whether it landed. A line that needs a
particular answer carries its replies ("What classes do you have?" gets
classes back). Lines don't repeat in a conversation until their pool runs
out, and choosing words never rolls dice.

**Reading the effects.** "Bond +1 with target" means your mutual Bond with
them. "Each listener" means everyone at the table except you. Onlookers count
as listeners for cards marked *public*.

### Talking

| Card | Cost | Aim | Effect |
| --- | --- | --- | --- |
| **Get to know them** | 1⚡ (0 if their shirt draws you) | → | Bond +1. If it's about something they love (their shirt, a hobby they mentioned): Bond +2. Ask, share, or bring up their shirt. |
| **Say what you think: (topic)** | 1⚡ | table | Each listener who agrees: Bond +1. Each who disagrees: Bond −1. |
| **Talk about a hobby** | 1⚡ | table | Each listener into that hobby: Bond +1, Respect +1. Others: no effect. |
| **Compliment** | 1⚡ | → | Bond +1. If their Standing is 2+ above yours: each listener's Respect for you −1 (sucking up). |
| **Offer help** | 1⚡ | → | Only someone two or more levels weaker at it: Bond +1, their Respect +1, they owe you a Favor 🪙. |
| **Crack a joke** | 2⚡ | table | Lands on N in 6, N = your Humor (+1 if the table likes you). Lands: each listener Bond +1, and listeners who value funny Respect +1; +1⚡ back. Flops: each listener's Respect −1; −1⚡. |
| **Brag (skill)** | 2⚡ | table | Listeners who value that skill: Respect +1. Everyone else: Bond −1. |
| **Respond warmly** | 0 | → | Right after a hobby, opinion, brag, help, story, opening up, a joke that landed, or a question, compliment or friendly tease to you: Bond +1 with them. Answering someone opening up is **deep**, and they can answer back, deeply. Going along with an opinion counts as saying it: say the opposite later and whoever heard both, Bond −2. |

### Getting closer

| Card | Cost | Aim | Effect |
| --- | --- | --- | --- |
| **Open up** | 3⚡ | → | Once a week. If Bond ≥ 4: Bond +3 (past 7 only once you've both opened up). If not: Bond −1 (too much, too soon), −1⚡. Outside private moments, listeners who aren't your Friends Bond −1 (awkward). |
| **Invite to hang out** | 1⚡ | → | Always leaves them an out. Yes if Bond ≥ 4: after school together, privately. A no costs nothing more. |
| **Ask out** | 3⚡ | → | A "yes" only if your Bond is 7+ and they aren't going out with anyone. You can't play it while you're going out with someone. Yes: you're going out (see Going out). No: Bond −1 (awkward), −2⚡, everyone watching Respect −1 for you, and it's an embarrassing story. |
| **Break up** | 2⚡ | → (your partner) | You stop going out. Bond −4 with them; their Close friends Bond −1 with you; both of you −2⚡. |

### Gossip

| Card | Cost | Aim | Effect |
| --- | --- | --- | --- |
| **Tell a story** | 1⚡ | table | Each listener who hadn't heard it gets their own copy and takes it as §8 rule 7 says. You keep yours. One a day, shared with rumors. *Public.* |
| **Spread a rumor** | 2⚡ | table | A made-up story about an Enemy who isn't there (§8 rule 7b). Usually backfires: 85% caught. |

### Going out

- **Getting together** (a "yes" to Ask out): you're a couple. Each morning
  +1⚡ (someone in your corner); you walk to class and sit together; if
  you're put down, your partner plays a free Stand up to them; and if their
  Standing is higher than yours, everyone who sees you together Respect +1
  for you (once a week).
- **Upkeep.** A relationship takes effort: each week you need to play at
  least two cards to each other or hang out once, or your Bond −1.
  Going out with someone you don't fit with drains you.
- **When it ends.** If your Bond with your partner drops below 8, they play
  Break up on you (the same card, same effects). You can play it yourself —
  because it isn't working, or because you want to ask out someone else.
- **One at a time.** While you're going out with someone, you can't play
  Ask out at all. To ask someone else, break up first.
- **Everyone plays by this:** the other students get together and break up by
  the same cards and rules.

### Teasing and bullying

| Card | Cost | Aim | Effect |
| --- | --- | --- | --- |
| **Tease** | 1⚡ | → | If Bond ≥ 4: Bond +1 (affectionate). If not: Bond −2, target −1⚡, and their Friends at the table Bond −1 with you. |
| **Put someone down** | 2⚡ | → | Always lands, and works at once. See below. |
| **Stand up to them** | 2⚡ | → | Anyone who saw it, was its victim, or knows the story, face to face. See below. |

**Bullying seems to work, and then it doesn't.**

1. **At once.** The victim: Bond −4, −2⚡. Everyone watching respects the
   bully 2 more, **except the victim's Friends, who give no boost.** The
   bully's Friends also Bond +1, unless they're the victim's Friends too.
2. **For a week,** it looks like it worked: word takes 7 days to get around.
   Anyone can still stand up to the bully.
3. **Then word gets around.** Anyone who saw it, and the victim, can tell the
   story. The teller gains Bond +1 with each new listener. Listeners like and
   respect the bully 1 less, unless they back the bully (the bully's Friend,
   and not the victim's).

**Standing up to them.**
- **The odds:** 3 in 6, +1 for each person there on your side, −1 for each on
  theirs (1 to 5 in 6).
  - The victim is on your side.
  - The bully's Friends are on theirs.
  - The victim's Friends are never on the bully's side. They're on yours if
    you're the victim or they like you more. Being the victim's Friend
    doesn't mean they'll speak up.
  - Anyone else sides with whoever they like more.
- **It works:** everyone there: Bond −2 and Respect −2 for the bully, and
  Respect +1 for you. The bully −2⚡.
- **It fails:** everyone there: Respect −1 for you.
- **Either way:** Bond −2 between you and the bully, and, right after a
  put-down, the victim's Bond +3 with you.

The numbers are all in one table, `BULLYING` in `src/cards/rules.ts`.

## 7. Who you are, as cards

### 7.1 Abilities → card copies and dice

Point buy as today (12 points, max 5 per ability). Each ability's level does
two printed things:

| Ability | Cards you hold | Dice it sets |
| --- | --- | --- |
| Humor | 1 + level ÷ 2 Crack a joke | Jokes land on level in 6 |
| Athletics | Brag (sports) / Offer help (sports) if 3+ | Tryouts and games |
| Academics | Offer help (schoolwork) if 3+ | Homework: +1 extra grade step at 4+ |
| Arts | Brag (music, art) if 3+ | Band, drama, showcases |
| Style | — | **First impressions:** your first card with anyone is +1 Bond at 3+ |
| Tech | Brag (tech) / Offer help (tech) if 3+ | Robotics |

### 7.2 Personality → trait cards

Five two-sided choices (or the middle, which gives no trait card). Each side
is a **trait card** always in play.

| Trait | Card | Effect |
| --- | --- | --- |
| Outgoing | *Life of the party* | Cards to the table cost 1⚡ less (min 0). |
| Reserved | *Good listener* | Respond warmly gives +1 extra Bond. Cards to a table of 4+ cost 1⚡ more. |
| Warm | *Easy to like* | Your Compliment never counts as sucking up; Tease never costs Bond with Friendly people. |
| Edgy | *Sharp* | Tease and Brag cost 1⚡ less. People with Standing below yours are wary (Bond starts −1). |
| Organized | *On top of it* | Homework gives +1 extra grade step; one used-up card comes back each lunch. |
| Spontaneous | *Up for anything* | +1⚡ when you accept or make an invite. |
| Curious | *Interested* | +1 Get to know them card; asking about what they love gives +1 extra Bond. |
| Traditional | *Loyal* | Your Close friend Bonds never fade (§8 rule 3). |
| Sensitive | *Reads the room* | No fog of war at your table: you see the Bonds and Respect between everyone you're sitting with. Being put down costs you 1⚡ more. |
| Thick-skinned | *Unshakable* | Put-downs and failed bold cards cost you no ⚡. |

### 7.3 Interests → hobby cards

Each interest you pick (up to 3) gives one **Talk (hobby)** card; really into
it (from practice evenings) gives a second.

### 7.4 Clothes → today's modifier cards

You dress every morning; your look and your shirt are two modifier cards for
the day.

**Look** (sporty, preppy, alt, artsy, techy, low-key — your shirt color):
*One of us* — with anyone wearing your look, your first card is +1 Bond. A look
worn by more than 30% of the school gives no bonus (it says nothing).

**Shirt** — who comes up to you, and who can tease you. These work by giving
*other players* cards to play on you:

| Shirt | Gives other players | Effect on you |
| --- | --- | --- |
| **Plain tee** | nothing | nobody can tease your shirt |
| **Funny graphic tee** | People who value funny play **Get to know them** on you free, at Bond +2. Edgy people are tempted to Tease it. | more people approach you; edgy people may tease it |
| **Fan tee** (a topic) | Fans of it play **Get to know them** on you free, at Bond +2. People who hate it are tempted to Tease it. | fans approach you; haters may mock it |
| **Hoodie** | fewer people get any card to open with you | Tease and Put down cost 1⚡ more to play on you |

And it works both ways: **Get to know them** is free, at Bond +2, on anyone
whose shirt draws you.

### 7.5 Activity and evenings → day cards

**Activity.** Where you spend afternoons: the same people every day (more
rounds with them), and each two weeks of practice adds one card for that
skill (Brag or Offer help). Showcases (games, the play, the concert): if you
play a showcase card and the roll succeeds, Respect +1 from everyone watching.

**Evenings are day cards** (you play one a night):

| Day card | Effect |
| --- | --- |
| **Homework** | Grades +1 step (more with Academics or *On top of it*). Two nights in a row: the second gives half. |
| **Practice** | Progress toward a new skill or hobby card (2 practices = 1 card). |
| **Call friends** | A 2-round private conversation with Friends or Close friends you choose (deep cards allowed). |
| **Rest** | Wake with 12⚡ instead of 10. |
| **Phone** | Get a Story card (you're in the loop). Wake with 8⚡. Three phone nights in a week: wake with 1 less every day the next week. |

Grades below your parents' bar: grounded (no Call friends, no hanging out) for
a week. Further below: benched from your activity.

## 8. The rules of the school

Rules everyone plays by, printed in How to Play.

1. **First impressions count double.** The first card someone sees from you
   (as target or listener) has its Bond effect doubled.
2. **Audiences.** Cards to the table affect every listener as printed. Cards
   marked *public* also reach onlookers.
3. **Bonds fade.** Each Sunday a Bond of 4+ drops by 1 if the two of you
   weren't in a conversation or at a lunch table together that week. Friends
   also drop by 1 without a deep moment in four weeks. Close friends slip by 1
   without one in three weeks, as far as 11.
4. **Friends of friends.** When you meet someone whose Close friend you are
   Friends with, your Bond starts at +1.
5. **Taking sides.** When a card hurts someone (Bond loss), their Friends and
   Close friends at the table lose 1 Bond with whoever played it. Enemies of
   the hurt person gain 1.
6. **The room decides** whether standing up to someone works (§6,
   Bullying). Nothing else about a put-down is rolled.
7. **Gossip travels.** You only get a Story card by being there when
   something happens (everyone present, and onlookers, get one), or by being
   told. Anyone holding one can tell it, and every listener gets their own
   copy — so a story spreads as far as people keep telling it. Stories go
   stale after two weeks. Each listener who hadn't heard it takes it one of
   three ways:
   - **They know it's a lie:** it's a made-up story about them or about
     someone they're Friendly with (Bond 4+). They turn against the teller
     (Bond −2) and get a true story: *the teller spread a lie*.
   - **They side with their friend:** they're closer to the person it's
     about than to the teller (for a true story of meanness, they must also
     be that person's Friend). The teller loses 1 Bond with them, and the
     story does nothing.
   - **They believe it:** Bond +1 with the teller (juicy news). A true story
     of meanness: they like and respect whoever was mean 1 less, unless
     they back them (that person's Friend, and not the victim's). A
     put-down can't be told until a week after it happened. A rumor, or something embarrassing (being
     turned down): Respect −1 for the person it's about. After three stories
     in a week your stories stop hurting whoever they're about.

   True stories start with something that happened: a put-down, a leave-out,
   someone turned down, a couple, a break-up, a lie found out. Hearsay isn't
   a first impression, so it is never doubled.

7b. **Rumors (false gossip).** *Spread a rumor* (2⚡, a mean card) is
   something you decide to do: make up a story about an Enemy (Bond −3 or
   lower) who isn't there, at most once a week. It usually backfires (the
   card shows 85% caught):
   - the person it's about, and anyone Friendly with them, know it's false;
   - finding it out creates a true, mean story that the teller lied, which
     can spread and be used to stand up to them;
   - on the Sunday after it's found out, the record is set straight with
     everyone who heard it: the subject gets 1 Respect back, and whoever
     made it up loses 1 Bond and 1 Respect with each of them.

8. **Secrets.** Not built (§13).
9. **Opinions drift.** Each Sunday, each person's opinion on each topic moves
   one step toward what most of their Friends and Close friends say.
10. **Adults.** A put-down seen by a teacher: 1 in 3 it's reported, and
    the bully's mean cards cost 1⚡ more for a week. Reporting a minor thing yourself: listeners' Respect for you −1
    (snitching). Reporting something serious: no cost.
11. **Groups.** People whose Bonds with each other are all Friendly or above
    form a group; groups are shown on the map and in the Notebook.
12. **Standing** is recomputed every Sunday (§3).
13. **Trying too hard.** If in one week you play three or more warm cards
    (Get to know them, Compliment, Respond warmly) at someone of higher Standing
    who plays none back at you, their Respect for you −1. Investing in people
    works when it's returned.
14. **Seats.** If there's room where one of your Friends is, you sit there.
    A table of strangers leaves a newcomer out 1 time in 10, when someone
    edgy and status-hungry there outranks them.

## 9. How the other students play

The other 199 students are players with their own cards, built from their
own profiles by §7, their own points, and their own Bonds. They follow the
same rules. A simple policy picks their cards instead of a person, and it's
**not fully predictable**:

- **A hidden personality.** Each student gets a random personality at the
  start (the same five traits you chose, plus how much they care about
  status) that you don't see. It sets their trait cards and what they tend to
  play. You learn it by watching: the Notebook keeps a read on each person
  from what you've seen them do ("has teased 3 times — seems edgy", "always
  asks about anime"), which can be wrong.
- **What they want.** Each moment, they score the cards they could play by:
  - **Bond with people they like** (everyone);
  - **Respect and Standing** (more if they care about status);
  - **Avoiding risk** (more if Sensitive);
  - **Their traits** (Outgoing people favor table cards and Jumping in, Edgy
    people favor teasing and bragging, Warm people favor listening,
    Reserved people stay quiet more).
- **Some randomness.** They don't always pick the best-scoring card: picks
  are weighted toward the best, so the same person can surprise you.
- **Who they sit with:** the table with the most Bond with them (the same
  "would they make room" rules apply to them).
- **Attacks** follow the same rules as for you. Most students see through a
  put-down's quick win. The status-hungry (unless they're Warm) feel more of
  the pull, so bullying comes mostly from higher up the ladder.

You always see *which card* someone played and its printed effect on you. You
can't see their personality, their cards, or what they'll do next.

## 10. Why it takes strategy

- **Every table is a split audience.** One opinion wins some and loses others;
  you choose when to say what you think, and in front of whom.
- **Getting heard is a choice.** Jumping in gets your card played but costs
  energy and can talk over someone; staying quiet rests you but lets others
  take the moment.
- **Energy is a budget, and a mood.** Bold cards cost more, and how they go
  feeds back: spend big on an invite that's refused and you may be too
  drained to answer a put-down well. Who you sit with recharges or drains you.
- **Depth is gated.** Friendly is easy; Close needs deep cards, which need
  Bond 4+ and private time. You have to plan who you invest in.
- **Your cards are what you've done.** Practice, hobbies, the stories you hear,
  the favors you're owed — all become cards. A week of evenings is a card
  choice.
- **Clothes are a bet.** A fan tee brings fans *and* mockers; a hoodie keeps
  you safe and alone.
- **Reputations follow you.** First impressions, taking sides, gossip and
  fading Bonds mean every table remembers.
- **No dominant build.** The strategy experiments keep checking that no single
  build, shirt or habit wins for everyone.

## 11. What changes from today

| Today | Under this spec |
| --- | --- |
| Liking, respect and trust as decimals each person holds about each other (one-way) | One mutual **Bond** (−5…15) per pair, plus one-way **Respect** (0–5) |
| Hidden effect sizes in the simulation code | Every effect printed on a card or a school rule |
| Energy 0–20, stress as a hidden number | One Energy meter, 0–12, that bold cards spend and success refills |
| A hand of six drawn from a deck; fixed turns | All your cards available, each copy used up until tomorrow; each moment, whoever wants to speak most does |
| Personality sliders change hidden weights | Trait cards in play |
| Shirts change hidden approach odds | Shirts give other players cards to play on you |
| Other students choose moves by hidden weights | Same cards and rules; their policy comes from a hidden random personality plus some randomness |
| Status by a hidden ranking | Standing by a stated rule, from Friends and Respect |
| Gossip changes beliefs through hidden formulas | Story cards with printed effects |

**Kept:** the school, the day, the map, conversations as card turns, the
reply graph for lines, the tutorial and rulebook structure, the strategy and
realism experiments (re-run against the new rules).

**Realism to re-check after building:** close friends per student (target
3–5), friendships forming mostly within the same gender and old school,
bullying coming mostly from the middle of the ladder and mostly not paying,
mixes of evening habits beating single habits, no dominant shirt or build.
With Bond mutual, "how many friendships are mutual" stops being a measure —
it's always 100%.

**Build order.** The card rules are untested: we don't yet know whether
they produce realistic outcomes. So the simulator comes first, and the game
screens only change once it passes.

1. **A headless simulator of the card rules** (a new engine next to the
   current one): Bond, Respect, Energy, the cards, speaking up, the other
   students' policy, and the school rules — all 200 students, no screens.
2. **Check it against reality and against the current simulation:** close
   friends per student; friendships mostly within the same gender and old
   school; group sizes; who bullies (the middle of the ladder) and whether it
   pays (mostly not, and less when people stand together); how stable status
   is; and the strategy experiments (no dominant build, shirt or habit).
   Tune the printed numbers until it passes. If it can't, change the rules
   before touching the game.
3. **Switch the game over:** the player's cards, the conversation screen
   with speaking up, and the people cards with Bond and Respect.
4. **Choices as cards:** profile traits, clothes, activity and evenings.
5. **Rulebook, tutorial and coach** rewritten for the new rules.

## 12. Decisions made

1. **Bond range −5…15**, levels at 1 / 4 / 8 / 12. Try it and tune.
2. **Other people's Bonds: fog of war.** You learn a Bond when you see the
   two of them interact, shown with when you saw it; old readings can be
   wrong.
3. **Respect:** see 9 (an earlier answer, hidden until shown, was replaced).
4. **Speaking up, not turns.** Each moment everyone chooses Stay quiet, Say
   something or Jump in; whoever wants to speak most does.
5. **Gossip:** any story can be shared, and sharing it gives every listener
   a copy.
6. **No hand:** you can use any card you own, each copy once a day. Gaining a
   card never makes your other cards harder to reach.
7. **Ask out** is in. It only works if they like you enough (Bond 7+); a
   public no costs you Respect with everyone watching.
8. **Other students' personalities are hidden and random,** and their picks
   have randomness.
9. **Respect for you is always visible;** other people's Respect for each
   other is under the fog of war, like their Bonds.
10. **One Energy meter** (0–12) instead of Energy plus Nerve: bold cards cost
    more, success refunds some, failure costs extra — the confidence spiral
    in one rule.
11. **Breaking up is a card,** played by you or on you (when Bond drops
    below 8). Going out gives +1⚡ a morning and backup in put-downs, but
    needs weekly upkeep; breaking up costs Bond with them and their friends.
12. **No two-timing:** you can't Ask out while going out with someone.
13. **Bullying is two cards and gossip:** immediate Respect from everyone
    watching but the victim's Friends, and a cost when word gets around a
    week later. A friend of both never backs the bully, but won't always
    stand up.
14. **Simulator first:** the card rules get a headless simulator and pass
    the realism and strategy checks before the game screens change.

15. **Popularity is friends plus respect:** 10 a Friend, 1 for each person
    who respects you.
16. **Friendship takes both:** one Open up a week, and no Friends until both
    have opened up.

17. **17 cards, many phrases.** Variety is in what's said, not in card names.
18. **Conversations take turns:** answer when spoken to, and nobody twice in
    a row while someone else wants to speak.

## 13. Open questions

1. **How many cards a day?** With no hand, the number of copies you own is
   your daily vocabulary. Start around 25–30 cards for a new student and
   tune with the realism and strategy experiments.
2. **Designed but not built, and not in the 17:** Introduce, Call in a favor,
   Keep a secret (and telling one), and Leave them out as a card (it happens
   only as a seating rule). Build any of them, or drop them?
