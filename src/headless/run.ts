/**
 * Run the school with no player and report whether it behaves like a real one.
 *
 *   pnpm sim [--students 200] [--weeks 16] [--seed 1] [--follow <id>]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { runSimulation } from '../sim/day';
import { createWorld } from '../sim/generate';
import { computeMetrics, type Metrics } from '../sim/metrics';
import type { SimConfig } from '../sim/types';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const cfg: SimConfig = {
  students: arg('students', 200),
  weeks: arg('weeks', 16),
  seed: arg('seed', 1),
  follow: process.argv.includes('--follow') ? arg('follow', 0) : null,
};

const t0 = performance.now();
const world = createWorld(cfg);
const weekly: Metrics[] = [];
const weekTimes: number[] = [];
/** Each student's status percentile and fear-backed share, week by week. */
const history: { status: number; foundation: { liked: number; admired: number; feared: number } }[][] = world.students.map(() => []);
let last = performance.now();
runSimulation(world, (week) => {
  const now = performance.now();
  weekTimes.push(now - last);
  for (const s of world.students) history[s.id].push({ status: s.status, foundation: s.foundation });
  const m = computeMetrics(world);
  weekly.push(m);
  console.log(
    `week ${String(week).padStart(2)}  friends/student ${m.mutualFriendMean.toFixed(2)}  none ${m.friendBuckets.none}  groups ${m.groups} (ungrouped ${m.ungrouped})  ` +
      `put-downs by status decile [${m.putdownsByStatusDecile.join(', ')}]  couples ${m.couples}  opinions/student ${m.opinionsPerStudent.median} (max ${m.opinionsPerStudent.max})  ${(now - last).toFixed(0)}ms`,
  );
  last = performance.now();
});
const total = performance.now() - t0;

const final = weekly[weekly.length - 1];
console.log('\n=== Final report ===');
console.log(JSON.stringify(final, null, 1));
console.log('\nTallies:', JSON.stringify(world.tally));
console.log(`\nTime: ${total.toFixed(0)}ms total, ${(weekTimes.reduce((a, b) => a + b, 0) / weekTimes.length).toFixed(0)}ms per simulated week, ${cfg.students} students`);

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

// Rise and fall: who reached the top, how much of it rested on fear, and where they ended up.
console.log('\n=== Biggest falls from the top (peak status percentile ≥ 0.85) ===');
const falls = world.students
  .map((s) => {
    const h = history[s.id];
    let peakWeek = 0;
    h.forEach((x, i) => (x.status > h[peakWeek].status ? (peakWeek = i) : 0));
    const peak = h[peakWeek];
    return { s, peakWeek, peak, end: h[h.length - 1] };
  })
  .filter((x) => x.peak.status >= 0.85)
  .map((x) => ({ ...x, drop: x.peak.status - x.end.status }))
  .sort((a, b) => b.drop - a.drop);
for (const f of falls.slice(0, 8))
  console.log(
    `  ${f.s.first} ${f.s.last[0]}.: peak ${f.peak.status.toFixed(2)} in week ${f.peakWeek + 1} (liked ${pct(f.peak.foundation.liked)} / admired ${pct(f.peak.foundation.admired)} / feared ${pct(f.peak.foundation.feared)}) → ${f.end.status.toFixed(2)} at end; put-downs ${f.s.counts.putdowns}`,
  );
const fearful = falls.filter((f) => f.peak.foundation.feared > 0.5);
const respected = falls.filter((f) => f.peak.foundation.feared <= 0.5);
const avgDrop = (xs: typeof falls) => (xs.length ? xs.reduce((t, x) => t + x.drop, 0) / xs.length : 0);
console.log(`  Average fall: mostly fear-backed at peak ${avgDrop(fearful).toFixed(2)} (n=${fearful.length}), mostly liked or admired ${avgDrop(respected).toFixed(2)} (n=${respected.length})`);

// Does bullying pay? Compare status change (week 2 → end) for frequent bullies versus everyone else.
{
  const change = (id: number) => history[id][history[id].length - 1].status - history[id][1].status;
  const likedBy = (id: number) => world.students.filter((s) => (s.rels.get(id)?.aff ?? 0) > 0.3).length;
  const sorted = [...world.students].sort((a, b) => b.counts.putdowns - a.counts.putdowns);
  const bullies = sorted.slice(0, Math.round(sorted.length / 10));
  const rest = sorted.slice(Math.round(sorted.length / 10));
  const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
  console.log('\n=== Does bullying pay? (top tenth by put-downs vs everyone else) ===');
  console.log(`  put-downs each: ${mean(bullies.map((s) => s.counts.putdowns)).toFixed(1)} vs ${mean(rest.map((s) => s.counts.putdowns)).toFixed(1)}`);
  console.log(`  status change week 2 → end: ${mean(bullies.map((s) => change(s.id))).toFixed(2)} vs ${mean(rest.map((s) => change(s.id))).toFixed(2)}`);
  console.log(`  people who like them at the end: ${mean(bullies.map((s) => likedBy(s.id))).toFixed(1)} vs ${mean(rest.map((s) => likedBy(s.id))).toFixed(1)}`);
  console.log(`  put-downs that left the target flustered: ${(100 * world.students.reduce((t, s) => t + s.bullyWins, 0) / Math.max(1, world.students.reduce((t, s) => t + s.bullyAttempts, 0))).toFixed(0)}%`);
}

// Standing up for people: does it pay, and what does it cost?
{
  const change = (id: number) => history[id][history[id].length - 1].status - history[id][1].status;
  const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
  const trustedBy = (id: number) => world.students.filter((s) => (s.rels.get(id)?.trust ?? 0) > 0.3).length;
  const sorted = [...world.students].sort((a, b) => b.counts.defended - a.counts.defended);
  const defenders = sorted.slice(0, Math.round(sorted.length / 10));
  const rest = sorted.slice(Math.round(sorted.length / 10));
  const held = world.tally.defenseHeld ?? 0;
  const backfired = world.tally.defenseBackfired ?? 0;
  console.log('\n=== Standing up for people (top tenth by times stepped in vs everyone else) ===');
  console.log(`  times stepped in: ${held + backfired}; bully backed off ${held}, turned on the defender ${backfired}; favors returned ${world.tally.favorReturned ?? 0}`);
  console.log(`  stepped in each: ${mean(defenders.map((s) => s.counts.defended)).toFixed(1)} vs ${mean(rest.map((s) => s.counts.defended)).toFixed(1)}`);
  console.log(`  status change week 2 → end: ${mean(defenders.map((s) => change(s.id))).toFixed(2)} vs ${mean(rest.map((s) => change(s.id))).toFixed(2)}`);
  console.log(`  people who trust them at the end: ${mean(defenders.map((s) => trustedBy(s.id))).toFixed(1)} vs ${mean(rest.map((s) => trustedBy(s.id))).toFixed(1)}`);
  console.log(`  times targeted themselves: ${mean(defenders.map((s) => s.counts.targeted)).toFixed(1)} vs ${mean(rest.map((s) => s.counts.targeted)).toFixed(1)}`);
}

// The phone: does it cost more than it gives? Top quarter by phone evenings versus the rest.
{
  const change = (id: number) => history[id][history[id].length - 1].status - history[id][1].status;
  const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
  const sorted = [...world.students].sort((a, b) => b.counts.phoneNights - a.counts.phoneNights);
  const q = Math.round(sorted.length / 4);
  const heavy = sorted.slice(0, q);
  const rest = sorted.slice(q);
  const closeFriends = (s: (typeof world.students)[number]) => [...s.rels.values()].filter((r) => r.aff > 0.4 && r.trust > 0.2).length;
  const row = (label: string, f: (s: (typeof world.students)[number]) => number) => console.log(`  ${label}: ${mean(heavy.map(f)).toFixed(2)} vs ${mean(rest.map(f)).toFixed(2)}`);
  console.log('\n=== The phone (top quarter by phone evenings vs everyone else) ===');
  row('phone evenings', (s) => s.counts.phoneNights);
  row('phone habit at end', (s) => s.phoneHabit);
  row('average nightly stress', (s) => s.counts.stressTotal / world.day);
  row('grades at end', (s) => s.grades);
  row('close friends at end', closeFriends);
  row('status change week 2 → end', (s) => change(s.id));
}

mkdirSync('out', { recursive: true });
const logPath = `out/run-seed${cfg.seed}.log`;
writeFileSync(logPath, world.log.join('\n'));
writeFileSync(`out/run-seed${cfg.seed}-metrics.json`, JSON.stringify(weekly, null, 1));
console.log(`\nEvent log: ${logPath} (${world.log.length} lines). Sample:`);
const step = Math.max(1, Math.floor(world.log.length / 25));
for (let i = 0; i < world.log.length; i += step) console.log('  ' + world.log[i]);
