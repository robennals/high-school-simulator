# Build plan and realism checks

**Summary.** Build the student simulation first and prove it behaves like a real
school with nobody playing. Then add a 3D view to watch it, then the player.

## Milestones

1. **Design doc and questions** (this document).
2. **Headless simulation, no player.** Start with one grade (about 200
   freshmen), then all 800. Output:
   - metrics (below),
   - a plain-English event log ("Tue lunch: Jake teased Ana in front of four
     people; three laughed"),
   - weekly snapshots of the groups.
3. **Realism tuning.** Compare against the checks below and adjust until it
   looks like a real school.
4. **3D observer.** Watch the school run.
5. **The player.** Schedule, decision points, cards, notebook, debrief — one
   semester.
6. **Storyteller and missions.**
7. **Playtests with real people.**

## Realism checks

Rough targets based on research on teenage social networks. Each needs checking
against sources before we tune hard against it.

- Most students have a handful (about three to six) of close mutual friends; a
  few have many; some (perhaps 5–10%) have none.
- Friendships are mostly, but not always, mutual.
- Friends resemble each other in activities, personality and background.
- Clear groups of about three to ten, with bridges between them and some
  loners.
- Friendships change: a real share of close friendships shift over a semester.
- Being seen as popular and being liked are only moderately related; some
  students are popular but disliked.
- Aggression peaks in the middle-to-upper part of the hierarchy, not at the
  very top or bottom.
- A juicy story reaches most of a grade within days.
- Fear-based status sometimes collapses suddenly.
- Bullying targets are disproportionately isolated students.

## Strategy experiments

Built: `pnpm strategies` (`src/headless/strategies.ts`). In each run, 60
students are assigned one option — an after-school activity, or an evening
habit — and everyone else behaves normally. Options rotate across runs so
every one of those students tries every option; each comparison is the same
student, with the same skills and situation, choosing differently. It reports
each option's average effect on status, close friends, grades, calm and skill;
any option that is beaten on every outcome; how often each option is a
student's best; and whether students' strongest ability predicts which option
is best for them.

Each school is also run with two different event seeds — the same students
with different luck — and the report shows how often a student's best option
survives a change of luck, and the average starting attributes of the students
each option suits. Grades are scored by what they do for you in the game:
they count a lot up to comfortably above your parents' bar and little beyond.

Targets:
- No option is beaten on every outcome (except the phone, by design).
- Mixes beat single habits for most students, and a plan that responds to how
  things are going beats fixed plans.
- Which option is best depends on who you are (skills, personality) and on
  what happens to you (luck) — so there is no easy winning strategy, and
  playing well means paying attention.

## Strategy bots (planned)

Run the headless simulation with bot "players" using fixed strategies:

- **Nice and loyal**
- **Social climber** — always moves toward higher status
- **Manipulator** — flattery, gossip, two-facing
- **Loner**
- **Joiner** — joins everything, shallow everywhere

The checks:

- The manipulator should do well early and badly by the end of the semester.
- No single strategy should dominate.
- Different ambitions should require real trade-offs.

If a bot strategy wins by repeating one cheap action, that is grinding, and the
rules need a cost.
