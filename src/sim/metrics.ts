import { ABILITIES } from './content';
import { peek } from './rel';
import type { World } from './types';

/** "A counts B as a close friend." */
export function isCloseFriend(world: World, a: number, b: number): boolean {
  const r = peek(world, a, b);
  return !!r && r.aff > 0.4 && r.trust > 0.2;
}

export function mutualFriends(world: World, a: number): number[] {
  const out: number[] = [];
  for (const b of world.students[a].rels.keys()) if (isCloseFriend(world, a, b) && isCloseFriend(world, b, a)) out.push(b);
  return out;
}

export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

export interface Metrics {
  week: number;
  mutualFriendMean: number;
  friendBuckets: { none: number; oneTwo: number; threeSix: number; sevenPlus: number };
  reciprocity: number;
  sameGenderShare: number;
  sameGenderBaseline: number;
  sameFeederShare: number;
  sameFeederBaseline: number;
  sharedActivityShare: number;
  groups: number;
  groupSizes: number[];
  ungrouped: number;
  popularityVsLikedCorr: number;
  popularButDisliked: number;
  sociometric: Record<string, number>;
  putdownsByStatusDecile: number[];
  /** Put-downs per 100 student-days, by the bully's status decile at the time. */
  putdownRateAtTime: { strategic: number[]; lashOut: number[] };
  bullyTargetFriends: number;
  averageFriends: number;
  storyReach: number;
  abilityStatusCorr: Record<string, number>;
  abilityFriendsCorr: Record<string, number>;
  couples: number;
  aloneAtLunchShare: number;
  /** The top students by status, and what their standing rests on. */
  top: { name: string; status: number; liked: number; admired: number; feared: number }[];
  gradesVsStatusCorr: number;
  gradesVsFriendsCorr: number;
  /** Average grades of the most and least status-hungry thirds. */
  gradesByStatusDrive: { low: number; high: number };
  groundedNow: number;
  /** Activity members currently sitting out because their grades are too low. */
  ineligibleNow: number;
  /** Clothes: share of mutual friendships between people with the same look, and how shirts relate to friendships. */
  clothes: { sameLookShare: number; sameLookBaseline: number; looks: Record<string, number>; mostCommonLookShare: number; shirtWearers: number; wearersFansAmongFriends: number; othersFansAmongFriends: number; approachesPerRegularWearer: number };
  /** Students who went behind the gym on at least 10 afternoons, versus everyone else. */
  behindGym: { regulars: number; friends: number; othersFriends: number; status: number; othersStatus: number; grades: number; othersGrades: number; startedLonely: number; caughtTotal: number };
  /** For each activity: members' average nightly stress over the semester, fitness, poise, grades, and how often they got flustered when put down. */
  byActivity: Record<string, { n: number; stress: number; fitness: number; poise: number; grades: number; flusteredRate: number }>;
  /** How many people each student has an opinion about. */
  opinionsPerStudent: { median: number; max: number };
}

export function computeMetrics(world: World): Metrics {
  const { students } = world;
  const n = students.length;
  const mutual = students.map((s) => mutualFriends(world, s.id));
  const counts = mutual.map((m) => m.length);

  let nominations = 0;
  let reciprocated = 0;
  for (const a of students)
    for (const b of a.rels.keys())
      if (isCloseFriend(world, a.id, b)) {
        nominations++;
        if (isCloseFriend(world, b, a.id)) reciprocated++;
      }

  let pairs = 0;
  let sameGender = 0;
  let sameFeeder = 0;
  let sharedActivity = 0;
  mutual.forEach((m, a) =>
    m.forEach((b) => {
      if (b < a) return;
      pairs++;
      if (students[a].gender === students[b].gender) sameGender++;
      if (students[a].feeder === students[b].feeder) sameFeeder++;
      if (students[a].activity && students[a].activity === students[b].activity) sharedActivity++;
    }),
  );
  const feederCounts = new Map<number, number>();
  for (const s of students) feederCounts.set(s.feeder, (feederCounts.get(s.feeder) ?? 0) + 1);
  const sameFeederBaseline = [...feederCounts.values()].reduce((t, c) => t + (c / n) ** 2, 0);

  const groupMap = new Map<number, number[]>();
  for (const s of students) if (s.group >= 0) groupMap.set(s.group, [...(groupMap.get(s.group) ?? []), s.id]);
  const groups = [...groupMap.values()].sort((a, b) => b.length - a.length);

  // Liked = how many people like you; disliked = how many dislike you.
  const liked = new Array(n).fill(0);
  const disliked = new Array(n).fill(0);
  for (const a of students)
    for (const [b, r] of a.rels) {
      if (r.aff > 0.3) liked[b]++;
      if (r.aff < -0.1) disliked[b]++;
    }
  const statuses = students.map((s) => s.status);
  const z = (xs: number[]) => {
    const m = xs.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / n) || 1;
    return xs.map((x) => (x - m) / sd);
  };
  const zl = z(liked);
  const zd = z(disliked);
  const sociometric: Record<string, number> = { popular: 0, rejected: 0, neglected: 0, controversial: 0, average: 0 };
  for (let i = 0; i < n; i++) {
    const pref = zl[i] - zd[i];
    const impact = zl[i] + zd[i];
    if (pref > 1 && zl[i] > 0 && zd[i] < 0) sociometric.popular++;
    else if (pref < -1 && zd[i] > 0 && zl[i] < 0) sociometric.rejected++;
    else if (impact < -1 && zl[i] < 0 && zd[i] < 0) sociometric.neglected++;
    else if (impact > 1 && zl[i] > 0 && zd[i] > 0) sociometric.controversial++;
    else sociometric.average++;
  }

  const decile = new Array(10).fill(0);
  const decileN = new Array(10).fill(0);
  for (const s of students) {
    const q = Math.min(9, Math.floor(s.status * 10));
    decile[q] += s.counts.putdowns;
    decileN[q]++;
  }

  const targets = students.filter((s) => s.counts.targeted >= 3);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const juicy = world.stories.filter((s) => s.juice > 0.6 && world.day - s.act.day >= 5);
  // The juiciest tenth of stories: how much of the grade heard them?
  const topJuicy = [...juicy].sort((a, b) => b.juice - a.juice).slice(0, Math.max(1, Math.ceil(juicy.length / 10)));
  const storyReach = avg(topJuicy.map((s) => s.knowers.size / n));

  const abilityStatusCorr: Record<string, number> = {};
  const abilityFriendsCorr: Record<string, number> = {};
  for (const a of ABILITIES) {
    abilityStatusCorr[a] = round(pearson(students.map((s) => s.abilities[a]), statuses));
    abilityFriendsCorr[a] = round(pearson(students.map((s) => s.abilities[a]), counts));
  }

  const top = [...students].sort((a, b) => b.status - a.status).slice(0, 8);

  return {
    week: Math.floor(world.day / 7),
    mutualFriendMean: round(avg(counts)),
    friendBuckets: {
      none: counts.filter((c) => c === 0).length,
      oneTwo: counts.filter((c) => c >= 1 && c <= 2).length,
      threeSix: counts.filter((c) => c >= 3 && c <= 6).length,
      sevenPlus: counts.filter((c) => c >= 7).length,
    },
    reciprocity: round(nominations ? reciprocated / nominations : 0),
    sameGenderShare: round(pairs ? sameGender / pairs : 0),
    sameGenderBaseline: 0.5,
    sameFeederShare: round(pairs ? sameFeeder / pairs : 0),
    sameFeederBaseline: round(sameFeederBaseline),
    sharedActivityShare: round(pairs ? sharedActivity / pairs : 0),
    groups: groups.length,
    groupSizes: groups.map((g) => g.length),
    ungrouped: students.filter((s) => s.group < 0).length,
    popularityVsLikedCorr: round(pearson(statuses, liked)),
    popularButDisliked: students.filter((s, i) => s.status > 0.8 && zd[i] > 1).length,
    sociometric,
    putdownRateAtTime: {
      strategic: world.putdownsByDecile.strategic.map((x) => round((100 * x) / ((n / 10) * Math.max(1, world.day)))),
      lashOut: world.putdownsByDecile.lashOut.map((x) => round((100 * x) / ((n / 10) * Math.max(1, world.day)))),
    },
    putdownsByStatusDecile: decile.map((q, i) => round(q / Math.max(1, decileN[i]))),
    bullyTargetFriends: round(avg(targets.map((t) => counts[t.id]))),
    averageFriends: round(avg(counts)),
    storyReach: round(storyReach),
    abilityStatusCorr,
    abilityFriendsCorr,
    couples: students.filter((s) => s.partner !== null).length / 2,
    aloneAtLunchShare: round(avg(students.map((s) => s.counts.aloneLunches)) / Math.max(1, Math.floor(world.day / 7) * 5)),
    opinionsPerStudent: (() => {
      const sizes = students.map((s) => s.rels.size).sort((a, b) => a - b);
      return { median: sizes[n >> 1], max: sizes[n - 1] };
    })(),
    top: top.map((s) => ({ name: `${s.first} ${s.last[0]}.`, status: round(s.statusRaw), liked: round(s.foundation.liked), admired: round(s.foundation.admired), feared: round(s.foundation.feared) })),
    gradesVsStatusCorr: round(pearson(students.map((s) => s.grades), statuses)),
    gradesVsFriendsCorr: round(pearson(students.map((s) => s.grades), counts)),
    gradesByStatusDrive: (() => {
      const byDrive = [...students].sort((a, b) => a.statusDrive - b.statusDrive);
      const third = Math.floor(n / 3);
      return { low: round(avg(byDrive.slice(0, third).map((s) => s.grades))), high: round(avg(byDrive.slice(-third).map((s) => s.grades))) };
    })(),
    groundedNow: students.filter((s) => s.groundedUntil > world.day).length,
    ineligibleNow: students.filter((s) => s.activity !== null && s.grades < 0.22).length,
    clothes: (() => {
      let pairsAll = 0;
      let sameLook = 0;
      mutual.forEach((ms, a) =>
        ms.forEach((b) => {
          if (b < a) return;
          pairsAll++;
          if (students[a].look === students[b].look) sameLook++;
        }),
      );
      const looks: Record<string, number> = {};
      for (const s of students) looks[s.look] = (looks[s.look] ?? 0) + 1;
      const baseline = Object.values(looks).reduce((t, c) => t + (c / n) ** 2, 0);
      // Among wearers: what share of their friends love the thing on their shirt, versus friends of non-wearers who love that same thing.
      const wearers = students.filter((s) => s.shirt !== null);
      const fanShare = (s: (typeof students)[number], topic: number) => (mutual[s.id].length ? mutual[s.id].filter((f) => students[f].opinions[topic] > 0.4).length / mutual[s.id].length : 0);
      const others = students.filter((s) => s.shirt === null);
      return {
        sameLookShare: round(pairsAll ? sameLook / pairsAll : 0),
        sameLookBaseline: round(baseline),
        looks,
        mostCommonLookShare: round(Math.max(...Object.values(looks)) / n),
        shirtWearers: wearers.length,
        wearersFansAmongFriends: round(avg(wearers.map((s) => fanShare(s, s.shirt!)))),
        othersFansAmongFriends: round(avg(wearers.map((w) => avg(others.map((o) => fanShare(o, w.shirt!)))))),
        // Strangers who came over because of a shirt, per student who has worn one at some point.
        approachesPerRegularWearer: round(avg(students.filter((s) => s.counts.approachedForShirt > 0 || s.shirt !== null).map((s) => s.counts.approachedForShirt))),
      };
    })(),
    behindGym: (() => {
      const reg = students.filter((s) => s.counts.behindGym >= 10);
      const rest = students.filter((s) => s.counts.behindGym < 10);
      return {
        regulars: reg.length,
        friends: round(avg(reg.map((s) => counts[s.id]))),
        othersFriends: round(avg(rest.map((s) => counts[s.id]))),
        status: round(avg(reg.map((s) => s.status))),
        othersStatus: round(avg(rest.map((s) => s.status))),
        grades: round(avg(reg.map((s) => s.grades))),
        othersGrades: round(avg(rest.map((s) => s.grades))),
        startedLonely: reg.filter((s) => world.startedLonely.has(s.id)).length,
        caughtTotal: students.reduce((t, s) => t + s.counts.caught, 0),
      };
    })(),
    byActivity: (() => {
      const out: Metrics['byActivity'] = {};
      const groups = new Map<string, typeof students>();
      for (const s of students) groups.set(s.activity ?? 'none', [...(groups.get(s.activity ?? 'none') ?? []), s]);
      for (const [k, g] of groups) {
        const targeted = g.reduce((t, s) => t + s.counts.targeted, 0);
        out[k] = {
          n: g.length,
          stress: round(avg(g.map((s) => s.counts.stressTotal / Math.max(1, world.day)))),
          fitness: round(avg(g.map((s) => s.fitness))),
          poise: round(avg(g.map((s) => s.poise))),
          grades: round(avg(g.map((s) => s.grades))),
          flusteredRate: round(targeted ? g.reduce((t, s) => t + s.counts.dominated, 0) / targeted : 0),
        };
      }
      return out;
    })(),
  };
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}
