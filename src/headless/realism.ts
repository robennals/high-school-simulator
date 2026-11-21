/**
 * Realism check: run a no-player semester for a few seeds and print the numbers that tell you
 * whether the school behaves like a real one (friendships, groups, bullying, gossip, grades).
 *
 *   node --import tsx src/headless/realism.ts [--seeds 3] [--weeks 16]
 */
import { runSimulation } from '../sim/day';
import { createWorld } from '../sim/generate';
import { computeMetrics } from '../sim/metrics';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const SEEDS = arg('seeds', 3);
const WEEKS = arg('weeks', 16);

for (let seed = 1; seed <= SEEDS; seed++) {
  const w = createWorld({ students: 200, weeks: WEEKS, seed, follow: null });
  runSimulation(w);
  const m = computeMetrics(w);
  const t = w.tally;
  const grades = w.students.map((s) => s.grades);
  const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
  const sd = Math.sqrt(grades.reduce((a, b) => a + (b - mean) ** 2, 0) / grades.length);
  console.log(`--- seed ${seed}`);
  console.log(`friends ${m.mutualFriendMean} buckets ${JSON.stringify(m.friendBuckets)} reciprocity ${m.reciprocity} sameGender ${m.sameGenderShare} sameFeeder ${m.sameFeederShare}/${m.sameFeederBaseline}`);
  console.log(`groups ${m.groups} sizes ${m.groupSizes.slice(0, 8).join(',')}… ungrouped ${m.ungrouped}  popular-vs-liked ${m.popularityVsLikedCorr}  sociometric ${JSON.stringify(m.sociometric)}`);
  console.log(`strategic put-downs /100 student-days by decile at the time: ${m.putdownRateAtTime.strategic.join(' ')}`);
  console.log(`lashing out by decile at the time:                       ${m.putdownRateAtTime.lashOut.join(' ')}`);
  console.log(`bully targets' friends ${m.bullyTargetFriends} vs ${m.averageFriends}; story reach ${m.storyReach}`);
  console.log(`defenses held ${t.defenseHeld ?? 0} backfired ${t.defenseBackfired ?? 0} favors returned ${t.favorReturned ?? 0}`);
  console.log(`grades mean ${mean.toFixed(2)} sd ${sd.toFixed(2)}; groundings ${t.groundings ?? 0}, grounded now ${m.groundedNow}, benched now ${m.ineligibleNow}`);
  console.log(`behind the gym: ${JSON.stringify(m.behindGym)}`);
  console.log(`ability→status ${JSON.stringify(m.abilityStatusCorr)}; largest look ${m.clothes.mostCommonLookShare}`);
}
