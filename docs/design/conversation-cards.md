# Conversation cards

**Summary.** Conversations are short, turn-based card games. Your deck comes
from who you are and what you have invested your time in. You play cards to
steer the conversation, read the other players' tells, and live with some luck.
Each card has many pre-written example lines so it is always clear what you
"said," but the card is what counts.

## The table

A conversation has:

- **Participants** (you plus one to five others) and **onlookers** within
  earshot.
- **Topic** — what is being talked about, or "nothing yet."
- **Vibe** — the warmth of the exchange, from −3 to +3, visible.
- **Engagement** — how into it each participant is. Hidden; shown through
  tells.
- **Rounds** — about four to eight. Each round, each participant may play a
  card. Students choose cards by personality and by their read of the moment.
  The conversation ends when engagement runs out, someone leaves, or the bell
  rings.

## Your deck

Built from:

- **Basics** everyone has: Opener ("hey what's up"), Ask, Listen, Agree, Exit.
- **Abilities:** humor improves Joke cards; athletics and style improve others.
- **Knowledge:** one card per topic you know well enough to talk about.
- **Opinions:** your stance on topics. You can play your real stance or a fake
  one; faking is caught by the
  [consistency check](signals-and-gossip.md#how-a-witness-reads-an-event).
- **Relationships:** Inside Joke (with one person, from shared history), Gossip
  (stories you have heard), Call in a Favor (someone owes you).
- **State:** low energy or composure adds weak cards ("um…", "Overexplain",
  "Snap back") to your draw.

You draw about five at the start and refill part of your hand each round. Your
time investments literally build your deck, so the time budget and the card game
are one system.

## The rules of the card game

- **Your deck is who you are, right now.** Every conversation you shuffle
  your collection and draw six, at random — sometimes nothing fits and you
  have nothing to say, so you can **Stay quiet** (free) and let the others
  talk. A card you play is spent; the rest stay in your hand; you
  draw one each turn (you hold at most six). So you can hold a card for the right
  moment — an invite after you've warmed someone up.
- **You get more cards by changing who you are** — the same things that
  matter everywhere else in the game:

  | Card | How many | How you get more |
  | --- | --- | --- |
  | Ask about them | 1–3 | outgoing (+1), curious (+1) |
  | Share something small | 2 | — |
  | Open up | 1 + close friends (max 3) | make close friends |
  | Compliment | 1–2 | warm (+1) |
  | Offer help (your best skill) | 1–2 | get that skill above halfway |
  | Brag (your best skill) | 1–2 | get really good at it |
  | Love / Diss: a topic | 1 each, up to 3 | feel strongly about something (opinions drift with your friends) |
  | Talk (a hobby) | 1–2 each | get into a hobby (practice evenings deepen it); really into it → 2 |
  | Crack a joke | 1–3 | be funnier |
  | Tease | 1–2 | edgy (+1) |
  | Tell some gossip | 1 per fresh story, up to 3 | hear stories; they go once they're old news |
  | Put someone down, Invite, Invite with an out | 1 each | — |

- **Response cards** sit in your hand like any card, but you can only play
  one right after the kind of line it answers; until then it's greyed out
  with what it needs. It's spent when you play it. Your personality sets the
  mix:

  | Response | Playable right after | Extra copies for |
  | --- | --- | --- |
  | Really listen | someone tells you something (shares, an opinion, a hobby, gossip, a brag) | reserved, warm |
  | Laugh along | a joke, or a friendly tease of you | warm |
  | Answer honestly | a question for you | open |
  | Same here | someone shares something | sensitive |
  | Agree | an opinion you share | — |
  | Push back | an opinion you don't share | edgy |
  | Go along | an opinion you don't share (pretend you do) | people who care what others think |
  | Be impressed | someone shows off | — |
  | Tease back | someone teases you, or bragging | edgy |
  | Thank them | a compliment or a favor for you | — |

- **The Notebook's "Your cards" page** lists your collection: each card, how
  many copies, and why you have them.
- **Openers** about the person you picked (their shirt, something they told
  you) are free, this turn only.
- **Energy (⚡) is what cards cost.** You have up to 20 ⚡ (the simulation's
  energy, 0–1, times 20), refilled overnight. Free: Really listen, Laugh
  along, Agree, Go along, Be impressed, Thank them, openers. 1 ⚡: Ask, Share
  something small, Answer honestly, Same here, Compliment, Offer help, an
  opinion, Talk (a hobby), Push back, Tease back, gossip, Invite with an out.
  2 ⚡: Open up, Crack a joke, Tease, Brag, Invite to hang out, Put someone
  down. Things said to the whole group cost outgoing people 1 less, and cost
  reserved people 1 more in groups of four or more. A card you can't afford
  is greyed out ("Needs 2 ⚡ — you have 1"): tired, you can still listen and
  laugh along, but not open up or ask someone out.
- **Getting ⚡ back:** +2 at the end of a conversation with a close friend
  in it, +1 when your joke lands, resting in the evening, sleep. Being put
  down costs 2.
- **Blanks come from stress.** Stressed, sometimes you draw "Um…" instead of
  a card — your mind goes blank. It clogs your hand until you play it, which
  wastes a turn.
- **Head out** is a button, not a card.

## The sentence graph

Each line on a card is chosen to answer the exact line before it, from a
sentence graph in `src/game/replies.ts`: for a specific line, the lines that
make sense as a reply to it, by the kind of card the reply is played as.
"How's your week going?" → (Share) "Honestly? Kind of a lot." → (Really
listen) "A lot how?". "My weekend was kind of a disaster, ngl." → (Really
listen) "Oh no. What happened?" → (Share) "My little brother broke my phone.
Again." Replies are lines too, with replies of their own, so a conversation
can follow a thread. A test checks that every line in the graph can actually
be said. When a line has no reply written for the card being played, the
game falls back to the looser graph below, which picks by the kind of line
being answered.

## How the conversation screen shows it

- **Everyone in the conversation is a card** with a small portrait in their
  look's colors and shirt, what they're wearing ("Sporty · Static Lake fan
  tee"), how well you know them ("First time talking", "You've talked a
  little", "You know them well"), your read of them ("seems friendly"), and
  what you've heard them say they love or are into. Click a person to talk to
  them.
- **A card shows what you'd say,** not what it does: the title and the actual
  line in quotes. The line is picked when the card is drawn, so it doesn't
  change while you decide, and it's what your character says when you play it.
  A **?** on each card shows its family and its tip ("Safe, and people like
  being asked.") — tips are there when you want them, not by default.
- **Cards marked → go to the person you picked;** the rest are said to
  everyone. Switching person changes only that label, plus the opener below.
- **An opener about the person you picked** takes one of the five slots when
  you have something to go on, in this order:
  1. their fan shirt ("Ask about their Static Lake shirt", or "You love Static
     Lake too");
  2. something you heard them say they love ("Bring up Nova Ray");
  3. something you heard them talk about ("Ask about anime");
  4. a funny graphic tee ("Laugh at their shirt").

  An opener is an Ask that lands better: asking about what someone cares about
  warms them more than "how's your week?", and asking about something they
  don't care for falls a little flat. People in a plain tee who you've never
  heard talk give you nothing to go on — that's what shirts are for.

## Every card has a time and place

Like a trading card game, no card is good everywhere. Each card's **?** shows
when it works and when it backfires, and both come straight from what the
simulation does with it:

| Card | Good when | Bad when |
| --- | --- | --- |
| Ask about them | They're outgoing, or you ask about something they love | Earns liking, never respect; asking a lot of someone more popular who never asks back reads as trying too hard |
| Really listen | Right after someone shares or tells a story | Slow; reserved people warm to it more slowly |
| Laugh along | You don't know what to say | Barely moves anything; too much reads as trying too hard |
| Compliment | Friends, or people around your level | Toward someone far more popular: sucking up, lost respect |
| Share something small | You know them a bit: builds trust | With a stranger: awkward, they like you less |
| Open up | A close friend: the biggest trust boost | Too much too soon: they pull back |
| Offer help | Something you're really good at: trust, respect, a favor owed | So-so at it: little respect |
| Love / Diss: a topic | The group agrees | Everyone who disagrees cools on you at once |
| Go along | Wins over people who disagree, now | Say the opposite in front of them later: caught being fake |
| Talk (a hobby) | Fans respect what you know | Everyone else is a bit bored |
| Crack a joke | You're funny: liking, and respect from people who value funny | Falls flat: a little lost respect; flops more if you're not funny |
| Tease | A friend who likes you: affectionate, builds trust | A near-stranger or sensitive person: it stings, onlookers think you're mean |
| Brag | People who admire that skill | Everyone else; reads as trying too hard if you're not popular yet |
| Tell some gossip | Everyone likes you a little more, now | People believe your stories less later |
| Put someone down | A laugh; some wariness | Most people like you less, a lasting enemy, defenders, reports |
| Invite to hang out | Someone who already likes you | A no in front of everyone stings |
| Invite, leaving an out | Easy to say yes; a no costs nothing | Shows less interest: a yes means a little less |
| Head out | Low on energy, or it's going badly | You miss what happens next |
| Openers (their shirt, a thing they told you) | The warmest question you can ask | Falls flat if they don't care about it |

The How to Play guide has two pages on this: "Every card has a time and
place" (three cards with their good and bad sides) and "Read the table, then
play" (rules of thumb: warm with strangers, tease and open up with friends,
interested-not-eager with someone more popular, say less when tired, stay
calm when put down).

## Lines answer what was just said

Every line — yours and everyone else's — is picked to fit the line before it,
from a small **response graph** in `src/game/cards.ts`:

- **What's being answered** is sorted into a few kinds: nothing yet, a
  question to you, a question to someone else, an opinion, a hobby, a joke,
  something personal, gossip, a tease or put-down, a brag, a compliment, help.
- **Each card has lines for each kind** it can follow, plus a fallback. After
  "I love Island Love", Really listen says "Wait, why Island Love, though?";
  after "I don't really know anyone yet", it says "That sounds rough. Are you
  okay?"; asked "So what are you into?", Share says "Honestly? I don't really
  know anyone yet."
- **Opinions look back a few lines:** if someone just said what they think
  about the same thing, a new opinion agrees ("Okay, finally. Island Love is
  amazing.") or pushes back ("Hmm, no — Island Love is great.").
- **Changing the subject is marked** ("Totally different thing — is anyone
  here into soccer?"), and brags name the skill ("Honestly, sports is kind of
  my thing").
- **Your cards default to the last person who spoke,** since that's who
  you're answering. Click someone else to change it.

The graph only changes the words. What a card *does* is decided by the card,
not the line.

## Card anatomy

- Name and family.
- **Effect** on vibe and engagement, and on what the target and onlookers think
  of you.
- **Requirements** — rapport level, the current topic, knowledge.
- **Variance** — the chance it lands, affected by skill, rapport and the
  audience's taste.
- **Publicness** — some cards work in private and backfire in public, or the
  reverse.
- **Signal** — what it says socially: belonging, investment, help, dominance,
  warmth.
- **Example lines** — many variants, written ahead of time (AI-generated
  offline and reviewed), picked to fit the topic and vibe.

## Card families (starting set)

**Opening and reading**

- **Opener** — a low-risk way in ("hey what's up", "is this seat taken?").
  Works far better if someone present already knows and likes you. You have to
  play it soon: standing near a group without speaking builds a "lurking" signal.
- **Ask** — raises engagement, especially about their interests. A shirt
  about something gives both sides an obvious thing to ask about.
- **Listen / Follow-up** — rewards the speaker, builds affection, and reveals
  information (tells, interests).
- **Agree / Laugh** — cheap support. Overuse reads as trying too hard.

**Belonging**

- **Opinion (topic, stance)** — a belonging signal measured against the
  audience's norm. Costs you with onlookers from rival groups.
- **Know the Stuff (topic)** — an investment signal. Needs knowledge; overuse
  is showing off.
- **Inside Joke** — strong with that one person; may make others feel left out.

**Warmth**

- **Compliment** — works with rapport. From far below in status it reads as
  sucking up.
- **Share (personal)** — self-disclosure. Good when it matches your closeness
  and answers theirs; oversharing early backfires.
- **Offer Help** — builds trust and creates a favor owed.

**Edge**

- **Joke** — high variance: wins big or falls a bit flat.
- **Tease** — bonding with high rapport, an attack with low rapport, ambiguous
  to onlookers.
- **Brag** — status with some audiences, lost respect with others.
- **Gossip (a story)** — buys engagement now, marks you as a gossip, and leaves
  a traceable trail.
- **Put-down** — a dominance move (see below).

**Moves**

- **Invite** — four levels, from ambiguous and group ("a bunch of us are going
  to the game") to explicit and one-on-one. A ladder of deniability.
- **Ask a Favor.**
- **Defend** someone being targeted — a costly signal.
- **Change Subject** — rescue a dying conversation or escape a dangerous topic.
- **Exit** gracefully or abruptly.

## Frame contests

A **challenge** is a public card meant to make the target look small: a
put-down, a trap question ("why are you even here?"), mockery. Response cards:

- **Accept the frame** (justify, explain, plead) — loses. The audience sees
  dominance.
- **Snap back** (angry) — may escalate; you look rattled.
- **Counter-question** ("why do you care?") — refuses the frame.
- **Unbothered** — refuses the frame. Needs composure.
- **Reframe with humor** — can flip the audience. High variance.
- **Walk away calmly** — denies them the stage. A small loss, but no win for
  them.
- **Ally steps in** — a friend present may play Defend for you.

The audience decides who looked in control. **Composure decides which of these
you draw:** a rattled player draws Accept and Snap Back cards. The hint text on
the frame-refusing cards is the "how would a president respond?" idea.

## Saving face

- Every invite or request has a **publicness × explicitness** level. The cost of
  a rejection, to both people, grows with it. A high level also pushes the other
  person to answer in public, and they may say no just to protect their image.
- **Leave an Out** ("no worries if you're busy") lowers rejection cost and
  raises the chance of yes.
- **Letting others save face** — accepting a mumbled apology, giving a bully a
  graceful exit — earns respect from onlookers.
- The skilled path to a close friendship (or a crush) climbs the ladder: group
  hangout, then a smaller group, then one-on-one, then saying it.

## Luck and hidden hands

- You don't know the other person's personality, mood, or what they have heard
  about you. Walking up to a stranger is a gamble — they may be friendly or mean
  — but you can improve the odds: approach when they are with someone who likes
  you, or read their tells first.
- Cards have variance. A good player plays the odds and limits the downside with
  cheap openers and deniable invites.

## Manipulation cards

**Flatter, Spread Rumor, Two-Face** (a different stance for each audience),
**Use** (befriend someone for access, then drop them), and **Freeze Out.** They
pay off now and leave hidden records: stories that can surface, consistency
flags, resentment that feeds a
[cascade](regard-and-status.md#why-fear-based-status-collapses-the-cascade). The
simulation is tuned so their payoff over a semester is negative. Strategy bots
check this (see [build plan](build-plan.md#strategy-bots)).

## How students play

Students use the same cards. Their choice is weighted by personality —
extroverts play more cards, agreeable students rarely tease or put down, those
with high status drive brag and gossip — plus their read of the moment and some
noise.

## Example

Lunch, week two. A table of three: Dev (you know him from band), Priya and
Marcus (strangers).

1. You walk over. The game warns that lingering builds a lurking signal.
2. You play **Opener**: *"Hey Dev, mind if I sit?"* It lands, because Dev likes
   you. Vibe +1.
3. They are talking about a video game. You don't know it, so you have no card
   for it. You play **Ask**: *"Wait, is that the new one?"* Marcus lights up
   (a tell: he leans in). Engagement up.
4. Marcus plays **Tease** on Dev. Priya laughs. You can **Laugh** (cheap,
   safe), or **Tease** Dev yourself. Your rapport with Dev is moderate, so it
   might land or read as piling on.
5. You play **Listen**. Priya gives short answers and doesn't look up. Shy, or
   cold? The notebook records one clue for each.
6. The bell rings. Dev's and Marcus's affection is up a little. Priya's is
   unchanged and unknown. Two onlookers from the next table saw you sitting with
   Dev's group.
