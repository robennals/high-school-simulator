# No-player simulation: results

**Summary.** 200 freshmen, one fall semester (16 weeks), no player, three
random seeds. Friendships, groups, bullying, gossip, grades and status all
land in realistic ranges, and no ability or way of spending time is an easy
win. Run it with `pnpm sim --seed 1`; test strategies with `pnpm strategies`.

## Realism checks (seeds 1 / 2 / 3)

| Check | Target | Result |
|---|---|---|
| Close mutual friends per student | about 3–6 | 4.0 / 3.9 / 3.9; 127–128 of 200 have 3–6; 4–8 have none |
| Friendships that are mutual | most, not all | 61–65% |
| Same-gender friendships | most, not all | 66–71% (random: 50%) |
| Friends from the same middle school | high at first, falling | 45–51% (random: 22–23%) |
| Groups | 3–10, bridges, loners | 43–48 groups, largest 11–18; 9–12 students in none |
| Popular vs liked | moderately related | correlation 0.40–0.50 |
| Strategic put-downs by bully's status *at the time* | peak in upper-middle, drop at the very top | peak in the 80–90th percentile decile (4.5–5.9 per 100 student-days), top decile 2.1–2.3, bottom three deciles ~0 |
| Lashing out | from stressed, lower-status kids | highest in the bottom decile (2.0–3.7), lowest near the top |
| Bullying targets | more isolated | 3.5–3.7 friends vs 3.9–4.0 average |
| Does bullying pay? | no | frequent bullies' status falls 0.18–0.33 while everyone else's holds; liked by 11–12 people vs 17 |
| Standing up for someone | pays in trust, is risky | frequent defenders end with more trust (6.6–7.0 vs 5.4–5.7) and higher status (+0.06 to +0.17); 37–44% of defenses backfire |
| Fear-backed status | fragile | top students whose status was mostly fear fell 0.26–0.48; mostly liked or admired fell 0.20–0.22 |
| Juicy stories | reach most of the grade | top tenth reach 64–65% |
| Grades | rise only with studying | enforced by a test; mean 0.39–0.41 |
| Groundings | occasional | 61–88 a semester; 3–5% grounded at any time |
| Rule-breaking crowd | easy to join, low respect | 20–30 regulars; status 0.44–0.45 vs 0.51; lower grades; 5–9 of them started the year with at most one close friend |
| No ability gives a clear edge | correlations near 0 | every ability within ±0.19 of zero against status |
| Looks stay varied | no one look takes over | largest look 21–25% of the school |
| The phone | always worse long term | same 50 heaviest users, with phones vs without: lower grades, more stress, 1.8–2.4 fewer close friends, lower status — every seed |

## Strategy experiment (`pnpm strategies`)

Same students trying each option, in 2 schools × 2 runs of luck.

- **Activities:** no activity is beaten on every outcome. Best option for:
  soccer 34%, band 20%, none 19%, robotics 15%, drama 12%. Skill matters:
  soccer is best in 32 of 60 trials for students strongest in athletics.
- **Evenings:** some mix beats every single habit in 78% of trials; the
  adaptive plan (study when grades slip, rest when worn down, otherwise
  friends and practice) is best most often (38%). Only the phone and "always
  rest" are beaten on every outcome.
- **Luck matters:** the same student's best option survives a change of luck
  only 36–38% of the time (23–27% would be pure chance).

## Known gaps

- **Favors are rarely returned in kind** (0–3 times a semester): the person
  you defended has to be there when you're picked on. Realistic, but rare.
- **Defenders aren't targeted more overall** than other students (3.2–3.5
  times vs 2.9–4.0), though the bully turns on them in about 40% of
  defenses.
- **Few "controversial" students** (liked by many and disliked by many): 2–6.
- **Speed:** 0.25 s per simulated week at 200 students; about 3 s at 800.
