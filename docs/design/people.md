# People

**Summary.** Every student is a fully simulated person: a personality, a drive
to climb, things they admire, skills, interests, opinions, and a daily state.
None of it is shown to the player as numbers; it shows through behavior.

## Scale

- **About 800 students in four grades of about 200.** The player is a freshman.
  A big school matters: there are more people than you can track, so finding a
  manageable circle is part of the game (see
  [notebook](fog-notebook-debrief.md#the-notebook)).
- **Everyone is simulated at the same level of detail.** Each student only has
  meaningful relationships with roughly 50–150 others, so this is cheaper than it
  sounds. If it turns out slow, older grades can be simulated more coarsely.
- **Older students are mostly a layer above you.** You meet them through
  activities, siblings, the bus and hallways. To a freshman they are mostly
  faces with reputations.
- **Freshmen arrive with history.** They come from three or four feeder middle
  schools, so most arrive with existing friendships, rivalries and reputations.
  By default the player comes from a small school or homeschool and knows zero to
  two people — exactly the situation of the target audience. Easier starts
  (grew up here, has friends) are a difficulty setting.

## Traits

Fixed or slowly changing, each on a 0–1 scale.

**Big Five personality:**

- **Openness** — curiosity. Likes new people and topics; less bound by group
  opinion norms.
- **Conscientiousness** — reliability. Shows up to practice, keeps promises,
  does homework.
- **Extraversion** — energy from people. Talks more, approaches more; social
  energy recovers in company instead of draining.
- **Agreeableness** — warmth versus edge. Less likely to put people down, more
  likely to defend others, forgives faster.
- **Neuroticism** — sensitivity. Reads ambiguous acts as hostile, loses
  composure faster, holds grudges.

**Climbing:**

- **Status drive** — how much they care about rank.
- **Route** — not a separate trait; it falls out of the others. High status
  drive with low agreeableness leans to the *dominance* route (fear, put-downs,
  exclusion). High status drive with skill and conscientiousness leans to the
  *prestige* route (being good at things, being generous). This split is a
  standard idea in research on status (Henrich & Gil-White, dominance versus
  prestige).
- **Loyalty** — how much they stick with friends when it costs them.
- **Conformity** — how strongly their public behavior follows the people they
  watch. Derived mostly from low openness and high neuroticism, plus noise.

**Tastes:**

- **Admires** — weights over qualities: athletic, funny, smart, kind,
  cool/edgy, stylish, creative, tough. Drifts toward their group's average over
  time.
- **Interests** — knowledge in topic areas (a sport, a video game, a music
  scene, anime, fashion, a show). Knowledge grows with time spent and is what
  makes "knowing the group's stuff" possible.
- **Opinions** — a stance from love to mock on about 20 topics (a team, a show,
  a teacher, a band, school spirit). Groups pull members toward a shared stance.

**Background:** feeder school, neighborhood and bus route, siblings in the
school, home constraints (strict parents, a job, money for events).

**Gender and appearance.** Boys and girls. Most prefer friends of their own
gender, but not entirely, and how strongly varies by person. Race appears only
in names and appearance and has no effect on behavior or friendships.
Sexuality is not modeled.

## Abilities: a fixed budget

Abilities are athletics, academics, humor, music/arts, style and tech. They
decide tryouts, earn respect, and improve cards. They grow with practice.

- **Everyone gets the same budget** of points to spread across abilities, like
  a D&D character. The player chooses their build; other students get a random
  one with one or two strengths.
- **No build is best.** Each ability is admired by different people and is
  useful in different activities, so standing can be built from any of them.
  The headless simulation checks this: no ability should strongly predict
  end-of-semester status or friend count.
- **The lesson:** everyone is good at something, and nobody is good at
  everything.

The player also chooses their personality. Every trait has an upside and a
downside (an extrovert gets energy from crowds but finds Listen harder to play
well; an introvert is the reverse), so no personality is best either.

## Daily state

- **Social energy** — spent by interactions. Introverts recover alone,
  extroverts recover with friends.
- **Mood** — how they treat people today.
- **Stress and composure** — composure drops with stress, bad sleep and recent
  humiliation. Low composure makes people handle confrontations badly. For the
  player, it fills the hand with weak cards (see
  [cards](conversation-cards.md#your-deck)).
- **Current goals** — for the week: get noticed by a particular person, make the
  team, get back at someone.

## How students decide

Each student makes the same choices the player does, in the same time slots (see
[time](time-and-activities.md)): where to be, who to approach, which cards to
play. Each option gets a score from:

- the expected change in their standing (weighted by status drive),
- the expected change in closeness with people they care about,
- enjoyment (interests, extraversion),
- risk (neuroticism makes possible losses weigh more),
- energy cost.

Then add **noise** (people aren't optimal) and **habit** (they mostly sit at
yesterday's lunch table).

Students act on their **beliefs, not the truth**. They are in the same fog the
player is: they guess who likes whom, who is rising, and who would defend whom.

## Showing personality without numbers

Each trait shows through **tells** — noisy body language and behavior. Shy
students give short answers even when they like you. Sensitive students flinch at
teasing. Agreeable students laugh along; edgy ones smirk. Players learn to read
tells over time, and the [notebook](fog-notebook-debrief.md#tells-and-trait-guesses)
records guesses with a confidence level. Personality is never stated outright
until the debrief confirms a guess.
