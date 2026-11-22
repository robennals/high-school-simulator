/**
 * Run a semester under the card rules and print the realism report.
 *
 *   node --import tsx src/headless/cards-sim.ts [--seed 1] [--weeks 16] [--students 200] [--seeds 3] [--detail]
 *
 * Prints whether the simulation meets each research target (targets.ts); --detail adds each run's numbers.
 */
import { runSemester } from '../cards/day';
import { measure, type CardMetrics } from '../cards/metrics';
import { evaluate } from '../cards/targets';
import { createWorld } from '../cards/world';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const seed = arg('seed', 1);
const seeds = arg('seeds', 1);
const weeks = arg('weeks', 16);
const students = arg('students', 200);

const pct = (x: number) => `${Math.round(100 * x)}%`;
const r2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '—');

function report(m: CardMetrics, s: number, ms: number) {
  console.log(`--- seed ${s}: ${m.weeks} weeks in ${(ms / 1000).toFixed(1)}s`);
  console.log(`friends (Bond 8+) per student ${r2(m.friends.mean)}  [none ${m.friends.none}, 1–2 ${m.friends.oneTwo}, 3–6 ${m.friends.threeSix}, 7+ ${m.friends.sevenPlus}]  close (12+) ${r2(m.closeFriendsMean)}`);
  console.log(`friendships same gender ${pct(m.sameGender.share)} (chance ${pct(m.sameGender.baseline)}), same old school ${pct(m.sameFeeder.share)} (chance ${pct(m.sameFeeder.baseline)})`);
  console.log(`groups (3+): ${m.clusters.length}, sizes ${m.clusters.slice(0, 12).join(', ')}${m.clusters.length > 12 ? '…' : ''}`);
  const b = m.bullying;
  console.log(
    `put-downs ${(100 * b.perStudentDay).toFixed(2)} per 100 student-days; by bully's Standing 1→5: ${b.byStanding.join(' / ')}; ` +
      `Standing change since week 2: bullies ${r2(b.standingChange.bullies)} (n=${b.standingChange.bullyCount}) vs others ${r2(b.standingChange.others)}`,
  );
  const pb = m.pushback;
  console.log(`pushing back: stand-ups ${pb.standUps} (${pb.standUpsWorked} worked); two-faced caught ${pb.twoFacedCaught}; trying too hard ${pb.tryingTooHard}`);
  const g = m.gossip;
  console.log(`gossip: ${g.told} stories told; heard and believed ${g.believed}, sided with their friend ${g.loyal}, knew it was a lie ${g.knewFalse}; rumors made up ${g.rumors}, lies found out ${g.liesFoundOut}`);
  console.log(`Standing stability (4 weeks apart) ${r2(m.standingStability)}; Standing vs friends ${r2(m.standingVsFriends)}`);
  console.log(`romance: ${m.romance.couplesNow} couples now, ${m.romance.got} got together, ${m.romance.breakups} breakups, ${m.romance.refused} asked and refused`);
  console.log(`grades mean ${r2(m.gradesMean)}/10; evenings ${JSON.stringify(m.evenings)}; alone at lunch ${r2(m.aloneAtLunchPerDay)}/day; silences ${r2(m.silencesPerDay)}/day`);
  const top = Object.entries(m.cardsPlayed).sort((a, b) => b[1] - a[1]);
  console.log(`cards played: ${top.map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

const runs: CardMetrics[] = [];
for (let s = seed; s < seed + seeds; s++) {
  const start = Date.now();
  const w = createWorld({ students, seed: s });
  runSemester(w, weeks);
  const m = measure(w);
  runs.push(m);
  if (process.argv.includes('--detail')) report(m, s, Date.now() - start);
}

// The research targets: pass or fail, with the source and how well it's backed.
const results = evaluate(runs);
const show = (v: number, t: (typeof results)[number]['target']) => (!Number.isFinite(v) ? '—' : t.format === 'pct' ? pct(v) : r2(v));
console.log(`\n=== Research targets (${seeds} seed${seeds === 1 ? '' : 's'}, ${weeks} weeks): ${results.filter((x) => x.pass).length} of ${results.length} pass ===`);
for (const x of results) {
  console.log(`${x.pass ? 'PASS' : 'FAIL'}  ${x.target.name}: ${show(x.mean, x.target)}  [${x.values.map((v) => show(v, x.target)).join(', ')}]`);
  console.log(`      want ${x.target.expect} — ${x.target.source} (${x.target.confidence})`);
}
