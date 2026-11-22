/**
 * The realism report for the card rules: the same questions we ask of the current simulation, so the
 * two can be compared (spec §11). Friendships, who befriends whom, groups, bullying and whether it
 * pays, standing up to it, how stable status is, romance, grades, and how people spend evenings.
 */
import { pearson } from '../sim/metrics';
import { LEVEL } from './rules';
import type { World } from './types';
import { friendsOf, isClose } from './world';

export interface CardMetrics {
  weeks: number;
  friends: { mean: number; none: number; oneTwo: number; threeSix: number; sevenPlus: number };
  closeFriendsMean: number;
  sameGender: { share: number; baseline: number };
  sameFeeder: { share: number; baseline: number };
  /** Group sizes (3+), found by label propagation over Friend Bonds (8+), biggest first. */
  clusters: number[];
  bullying: {
    perStudentDay: number;
    /** Put-downs by the bully's Standing at the time, 1 (bottom) … 5 (top). */
    byStanding: number[];
    /** Average Standing change from week 2 to the end: people who bullied (2+ times) vs everyone else. */
    standingChange: { bullies: number; others: number; bullyCount: number };
  };
  pushback: { standUps: number; standUpsWorked: number; twoFacedCaught: number; tryingTooHard: number };
  gossip: { told: number; believed: number; loyal: number; knewFalse: number; rumors: number; liesFoundOut: number };
  /** Correlation of each person's Standing four weeks apart (1 = never changes). */
  standingStability: number;
  standingVsFriends: number;
  romance: { couplesNow: number; got: number; breakups: number; refused: number };
  gradesMean: number;
  evenings: Record<string, number>;
  aloneAtLunchPerDay: number;
  silencesPerDay: number;
  cardsPlayed: Record<string, number>;
  /** Measures for the research targets (targets.ts). */
  research: {
    /** Share of students put down, left out, or made the subject of a rumor during the semester. */
    bulliedShare: number;
    /** Share of students put down at least once. */
    putDownShare: number;
    /** Standing change by the Sunday after someone's first put-down, against non-bullies who had the same Standing. */
    bullyFirstWeekGain: number;
    /** Put-downs per student at each Standing, 1 … 5. */
    putdownRateByStanding: number[];
    /** Share of put-downs where someone stood up for the target. */
    interventionRate: number;
    /** When someone else stepped in, the share where standing up worked. */
    interventionWorked: number;
    bullyStandingChange: number;
    othersStandingChange: number;
    /** Share of Friend pairs at week 4 still Friends at the end. */
    friendshipsKept: number;
    /** Correlation of Standing at week 4 and at the end. */
    standingStabilityLong: number;
    rumorsFoundOutShare: number;
    rumorMakerStandingChange: number;
    /** Share of students who were in a relationship at some point. */
    romanceShare: number;
    /** Median length of relationships that ended, in weeks. */
    romanceMedianWeeks: number;
    /** Share of groups (3+) with 9 or fewer members. */
    groupsUpTo9: number;
  };
}

export function measure(w: World): CardMetrics {
  const n = w.n;
  const friendCounts = w.people.map((p) => friendsOf(w, p.id).length);
  const closeCounts = w.people.map((p) => w.people.filter((q) => isClose(w, p.id, q.id)).length);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  // Who befriends whom, against the share you'd get by chance.
  let pairs = 0;
  let sameG = 0;
  let sameF = 0;
  let allSameG = 0;
  let allSameF = 0;
  let all = 0;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const pa = w.people[a];
      const pb = w.people[b];
      all++;
      if (pa.gender === pb.gender) allSameG++;
      if (pa.feeder === pb.feeder) allSameF++;
      if (w.bond[a * n + b] >= LEVEL.friends) {
        pairs++;
        if (pa.gender === pb.gender) sameG++;
        if (pa.feeder === pb.feeder) sameF++;
      }
    }
  // Groups: label propagation over Friend Bonds (8+), as the current simulation detects groups.
  const label = Int32Array.from({ length: n }, (_, i) => i);
  for (let iter = 0; iter < 10; iter++)
    for (const a of w.rng.shuffle([...Array(n).keys()])) {
      const votes = new Map<number, number>();
      for (let b = 0; b < n; b++) {
        const v = w.bond[a * n + b];
        if (b !== a && v >= LEVEL.friends) votes.set(label[b], (votes.get(label[b]) ?? 0) + v);
      }
      let best = label[a];
      let bestV = 0;
      for (const [l, v] of votes) if (v > bestV) [best, bestV] = [l, v];
      label[a] = best;
    }
  const sizes = new Map<number, number>();
  for (let a = 0; a < n; a++) sizes.set(label[a], (sizes.get(label[a]) ?? 0) + 1);
  const clusters = [...sizes.values()].filter((x) => x >= 3).sort((a, b) => b - a);
  // Bullying.
  const byStanding = [0, 0, 0, 0, 0];
  for (const p of w.putdowns) byStanding[p.bullyStanding - 1]++;
  const bullyTimes = new Map<number, number>();
  for (const p of w.putdowns) bullyTimes.set(p.bully, (bullyTimes.get(p.bully) ?? 0) + 1);
  const early = w.standingHistory[1] ?? w.standingHistory[0];
  const change = (id: number) => (early ? w.standing[id] - early[id] : 0);
  const bullies = w.people.filter((p) => (bullyTimes.get(p.id) ?? 0) >= 2).map((p) => p.id);
  const othersIds = w.people.filter((p) => !bullies.includes(p.id)).map((p) => p.id);
  const hist = w.standingHistory;
  const stability = hist.length >= 5 ? pearson([...hist[hist.length - 5]].map(Number), [...hist[hist.length - 1]].map(Number)) : NaN;
  const t = (k: string) => w.tally.get(k) ?? 0;
  const evenings: Record<string, number> = {};
  const cardsPlayed: Record<string, number> = {};
  for (const [k, v] of w.tally) {
    if (k.startsWith('evening:')) evenings[k.slice(8)] = v;
    if (k.startsWith('card:')) cardsPlayed[k.slice(5)] = v;
  }
  const totalEvenings = Object.values(evenings).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(evenings)) evenings[k] = Math.round((100 * evenings[k]) / totalEvenings);
  const schoolDays = Math.ceil((w.day * 5) / 7) || 1;
  // Research measures.
  const victims = new Set<number>();
  for (const p of w.putdowns) victims.add(p.target);
  for (const s of w.stories) {
    if (s.kind === 'leaveout') victims.add(s.target);
    if (s.kind === 'rumor') victims.add(s.actor);
  }
  const perStanding = [0, 0, 0, 0, 0];
  for (const st of w.standingHistory.length ? w.standingHistory : [w.standing]) for (const v of st) perStanding[v - 1] += 1 / Math.max(1, w.standingHistory.length);
  const rateByStanding = byStanding.map((c, i) => c / Math.max(1, perStanding[i]));
  const stood = w.putdowns.filter((p) => p.intervened);
  let kept = 0;
  let had = 0;
  if (w.friendsWeek4)
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++)
        if (w.friendsWeek4[a * n + b]) {
          had++;
          if (w.bond[a * n + b] >= LEVEL.friends) kept++;
        }
  const rumors = w.stories.filter((s) => s.kind === 'rumor');
  const makers = [...new Set(rumors.flatMap((s) => s.madeUpBy ?? []))];
  const inRomance = new Set(w.romances.flatMap((r) => [r.a, r.b]));
  // Every relationship, counting ones still going as lasting until today (otherwise only the short ones count).
  const ended = w.romances.map((r) => ((r.end >= 0 ? r.end : w.day) - r.start) / 7).sort((a, b) => a - b);
  const week4 = w.standingHistory[3];
  // Does bullying pay at first? Compare like with like: high Standing drifts down for everyone.
  const firstPutdown = new Map<number, number>();
  for (const p of w.putdowns) if (!firstPutdown.has(p.bully)) firstPutdown.set(p.bully, p.day);
  const gains: number[] = [];
  for (const [id, day] of firstPutdown) {
    const k = Math.floor(day / 7);
    const after = hist[k];
    if (!after) continue;
    const before = (o: number) => (k ? hist[k - 1][o] : 3); // everyone starts at 3
    const peers = w.people.map((p) => p.id).filter((o) => !firstPutdown.has(o) && before(o) === before(id));
    if (peers.length) gains.push(after[id] - before(id) - mean(peers.map((o) => after[o] - before(o))));
  }
  const research = {
    bulliedShare: victims.size / n,
    putDownShare: new Set(w.putdowns.map((p) => p.target)).size / n,
    putdownRateByStanding: rateByStanding,
    interventionRate: w.putdowns.length ? stood.length / w.putdowns.length : 0,
    interventionWorked: stood.length ? stood.filter((p) => p.stopped).length / stood.length : NaN,
    bullyFirstWeekGain: gains.length ? mean(gains) : NaN,
    bullyStandingChange: mean(bullies.map(change)),
    othersStandingChange: mean(othersIds.map(change)),
    friendshipsKept: had ? kept / had : NaN,
    standingStabilityLong: week4 ? pearson([...week4].map(Number), [...w.standing].map(Number)) : NaN,
    rumorsFoundOutShare: rumors.length ? rumors.filter((s) => s.foundOut).length / rumors.length : NaN,
    rumorMakerStandingChange: makers.length ? mean(makers.map(change)) : NaN,
    romanceShare: inRomance.size / n,
    romanceMedianWeeks: ended.length ? ended[Math.floor(ended.length / 2)] : NaN,
    groupsUpTo9: clusters.length ? clusters.filter((x) => x <= 9).length / clusters.length : NaN,
  };
  return {
    research,
    weeks: Math.floor(w.day / 7),
    friends: {
      mean: mean(friendCounts),
      none: friendCounts.filter((c) => c === 0).length,
      oneTwo: friendCounts.filter((c) => c >= 1 && c <= 2).length,
      threeSix: friendCounts.filter((c) => c >= 3 && c <= 6).length,
      sevenPlus: friendCounts.filter((c) => c >= 7).length,
    },
    closeFriendsMean: mean(closeCounts),
    sameGender: { share: pairs ? sameG / pairs : 0, baseline: allSameG / all },
    sameFeeder: { share: pairs ? sameF / pairs : 0, baseline: allSameF / all },
    clusters,
    bullying: {
      perStudentDay: w.putdowns.length / (n * Math.max(1, w.day)),
      byStanding,
      standingChange: { bullies: mean(bullies.map(change)), others: mean(othersIds.map(change)), bullyCount: bullies.length },
    },
    pushback: { standUps: t('standUps'), standUpsWorked: t('standUpsWorked'), twoFacedCaught: t('twoFacedCaught'), tryingTooHard: t('tryingTooHard') },
    gossip: { told: t('storiesTold'), believed: t('heard:believed'), loyal: t('heard:loyal'), knewFalse: t('heard:false'), rumors: t('rumors'), liesFoundOut: t('liesFoundOut') },
    standingStability: stability,
    standingVsFriends: pearson([...w.standing].map(Number), friendCounts),
    romance: { couplesNow: w.people.filter((p) => p.partner > p.id).length, got: t('couples'), breakups: t('breakups'), refused: t('askoutRefused') },
    gradesMean: mean(w.people.map((p) => p.grades)),
    evenings,
    aloneAtLunchPerDay: t('aloneAtLunch') / schoolDays,
    silencesPerDay: t('silences') / Math.max(1, w.day),
    cardsPlayed,
  };
}
