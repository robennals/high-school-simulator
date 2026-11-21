# Storyteller, events and missions

**Summary.** A director watches the simulation and adds pressure at a good pace,
like a city sim throwing problems at you. It picks which of the simulation's own
dramas reach you, and adds outside events the simulation can't produce itself.
It never decides outcomes.

## What it does

- **Paces tension.** It tracks a "drama level" around the player. After a quiet
  stretch it raises the odds of events; after a crisis it backs off. (This is
  the approach RimWorld's storyteller uses.)
- **Spotlights.** The student simulation produces plenty of drama on its own:
  fallings-out, crushes, pile-ons. The storyteller chooses which of these become
  decision points for the player.
- **Injects outside events** — see below.

## Events

**Calendar:** first day, tryouts and auditions, the first game, homecoming and
the dance, the fall play, midterms, a field trip, holiday break, weekend parties.

**Arrivals and departures:** a new student mid-semester; someone moves away and
their group reshuffles; a student is suspended.

**Triggered by the state of the simulation:**

- Two of your friends fall out, and both are watching which side you take.
- A friend is being targeted.
- A story about you is spreading.
- Your group is splitting, or two of its leaders are feuding.
- A rival group is squeezing yours (a lunch table, a role in the play).
- Two invites for the same night.
- Someone has a crush on you, or your friend's crush likes you (kept light).
- A dominant student is wobbling: stand up, wait, or join the pile-on.

## Missions

- **Offers built from the current state,** each with a deadline and visible
  stakes:
  - "Make the soccer team — tryouts Friday."
  - "Repair things with Sam before the dance."
  - "Get your group to take in the new kid."
  - "Get invited to Maya's party."
  - "Keep your seat at lunch this week."
- **Optional.** Ignoring a mission has consequences only through the
  simulation (if you don't repair things, the friendship keeps decaying).
- **Ambitions.** Longer goals chosen at the start and every few weeks, such as:
  - "Make the team and keep your old friends."
  - "Become someone people come to."
  - "Get into the theater crowd."

  Ambitions drive the end-of-semester score.

## Group strength matters

Group-level events — rivalries, a party only some are invited to, a fight over a
table — are resolved by group properties: cohesion, status, leaders. Investing
in your group's strength pays off here. That includes repairing rifts inside the
group and bringing in bridges to other groups.

## What's built (first batch)

Random events, run at the start of each day (`src/sim/storyteller.ts`). They hit
simulated students and the player alike; personal events find the player
more often (about four times as often) so there's always something going on.
When the player has a decision, it appears as a card at the start of the day;
simulated students decide by personality.

| Event | What it changes | Your choices |
|---|---|---|
| **Group project** (most weeks, one class) | Two weeks working with 3–4 classmates you didn't pick; working closely builds real trust | Take charge (more stress and grades, respect, they owe you) · do your share · let them carry it (they resent it, and you get no grade from their work) |
| **Sick** | Home for 2–3 days: you miss lunch, practice and stories. Close friends who check in earn trust | — |
| **New student** | Someone arrives knowing nobody; warmth toward them counts for more for three weeks | — |
| **Someone moves away** | Sometimes one of your close friends | — |
| **New seating chart** (week 8) | New neighbors in afternoon classes | — |
| **Friends fall out** | Two close friends turn on each other; shared friends are caught in the middle | Side with one · stay out of it · try to patch it up (they both owe you if it works; both annoyed if not) |
| **A false rumor about you** | It spreads like any story and lowers respect and trust | Ignore it · get your friends to vouch for you · confront whoever started it (might end it, might make it bigger) |
| **Stricter parents** | For three weeks, a higher grade bar and quicker grounding | — |
| **"Can I copy your homework?"** | A friend who's behind asks | Let them (they owe you; 20% chance you're both caught) · help them study instead (their studying goes further for a week) · say no |
| **Someone has it in for you** | A bully who's picked on you keeps at it for two weeks | Keep your head down · stick close to friends (harder to pick on) · tell a teacher (they're watched; their friends know it was you) |

Delayed consequences are surfaced too: if gossip you spread is traced back to
you, you find out.
