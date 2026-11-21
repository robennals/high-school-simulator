# High School Simulator — Design

**Summary.** A strategy game where the thing you build is a social life. You
arrive as a freshman at a big high school (about 800 students). Every student is
a simulated person with their own personality, goals and opinions, and every one
of them is also trying to climb. You decide how to spend your time, who to
approach, and what to say, using a hand of conversation cards. Most of what
people really think stays hidden. At the end of each school week, a debrief
reveals part of what was really going on and why.

**Audience.** Ages 11 and up, especially kids heading into high school from a
small or protective middle school, or from homeschool, who (or whose parents)
don't feel ready. It has to be fun enough that they would play it anyway. The
feel we want is a strategy card game crossed with a city builder.

## Pillars

1. **No scripts.** Every situation comes out of the simulation. A storyteller
   adds pressure (tryouts, a party, a new kid) but never decides outcomes.
2. **Everything costs something.** No grinding. Every action that wins something
   spends time, energy, risk or goodwill. Like chess, the depth comes from a few
   rules interacting.
3. **Every way to spend time has several benefits and several costs.** No
   option is simply "the social one" or "the responsible one", so choosing a
   week's schedule is a real trade-off (see
   [time and activities](time-and-activities.md#what-each-choice-gives-and-costs)).
   And no single choice repeated wins: the best plan is always a mix (see
   [mixing beats repeating](time-and-activities.md#mixing-beats-repeating)).
4. **The fog of social life.** You see what people do, not what they think. The
   weekly debrief reveals hidden truths, so things make sense in hindsight — like
   a card game where you can't see the other hands until the round ends.
5. **Everyone else is playing too.** All ~800 students pursue status and
   friendship by their own strategies, whether or not you are involved.
6. **Shortcuts win short term and lose long term.** Manipulation, gossip and
   fear all work — for a while. The rules, not a lecture, make them fail.
7. **Learnable principles.** Kids should leave with rules they can name and use:
   signals are worth what they cost, the audience matters, leave people an out,
   don't give a bully a stage.
8. **Every social decision is yours; classwork isn't played.** Who you stand
   with before school, who you walk to class with, who you whisper to in class,
   where you sit, who you eat with, who you hang out with at practice, who you
   call, which invitations you accept — the player makes all of these.
   Grades come from how you spend your evenings, not from playing classwork.

## The social physics (four core rules)

Almost everything in the game follows from these:

1. **Every action is a signal read by an audience.** The basic unit of the
   simulation is *who did what, to whom, in front of whom, and how openly*.
2. **A signal is worth what it cost.** Time, risk, burned bridges and skills you
   sacrificed to build are what make a signal believable. Cheap talk is
   discounted.
3. **Public stance and private opinion differ.** People defer in public to
   those they privately resent. That gap makes fear-based power fragile.
4. **Ambiguity is a tool.** Deniable moves let you test the waters and let
   everyone save face.

## Documents

Read in this order:

1. [People](people.md) — what each student is made of and how they decide.
2. [Regard and status](regard-and-status.md) — what students think of each
   other, how status works, and the status-versus-liking tension.
3. [Signals, gossip and groups](signals-and-gossip.md) — how actions are read,
   how stories spread, how groups form, and how bullying works.
4. [Time and activities](time-and-activities.md) — the calendar, energy,
   activities, and how the game plays fast.
5. [Conversation cards](conversation-cards.md) — the card game you talk with.
6. [Storyteller](storyteller.md) — events and missions.
7. [Fog, notebook and debrief](fog-notebook-debrief.md) — what you can see,
   how the game tracks it for you, and the weekly reveal.
8. [Visuals and tech](visuals-and-tech.md) — low-poly three.js, and a
   simulation core that runs without graphics.
9. [Build plan](build-plan.md) — milestones, realism checks, strategy bots.
10. [Tutorial](tutorial.md) — the welcome pages and the coach that walks you
    through your first day.

Also:

- [Decisions](decisions.md) — choices made while writing this, each with the
  alternative that was rejected. For review.
- [Resolved questions](open-questions.md) — Rob's answers on adults, romance,
  gender and race, aggression, character building, and scale.
