import { nudge, priv, tag } from './rel';
import { count } from './stories';
import { TAGS, type Rel, type Student, type World } from './types';

/**
 * Status is public deference, computed like PageRank: deference from
 * high-status people counts for more. Also splits each student's deference
 * into the part backed by real regard and the part backed only by fear.
 */
interface Deference {
  to: number;
  w: number;
  liked: number;
  admired: number;
  feared: number;
}

export function computeStatus(world: World) {
  const { students } = world;
  const n = students.length;
  // Each deference edge is split by what backs it: liking (affection, trust), admiration (respect),
  // or nothing private at all — fear, or just going along with the crowd.
  const edges: Deference[][] = students.map((s) => {
    const out: Deference[] = [];
    for (const [to, r] of s.rels) {
      // Deference from inside your own group counts for less: a clique can't make itself popular.
      const insider = s.group >= 0 && s.group === world.students[to].group ? 0.5 : 1;
      const warm = insider * Math.max(0, r.pub) * r.fam;
      const w = warm + insider * 0.7 * r.fear;
      if (w <= 0.01) continue;
      const liking = Math.max(0, 0.7 * r.aff + 0.3 * r.trust);
      const admiring = Math.max(0, r.resp);
      const backed = liking + admiring > 0.05;
      out.push({
        to,
        w,
        liked: backed ? (warm * liking) / (liking + admiring) : 0,
        admired: backed ? (warm * admiring) / (liking + admiring) : 0,
        feared: insider * 0.7 * r.fear + (backed ? 0 : warm),
      });
    }
    return out;
  });
  let rank = new Array(n).fill(1 / n);
  for (let iter = 0; iter < 30; iter++) {
    const next = new Array(n).fill(0.15 / n);
    for (let a = 0; a < n; a++) {
      const out = edges[a];
      const total = out.reduce((t, e) => t + e.w, 0);
      if (total <= 0) {
        for (let b = 0; b < n; b++) next[b] += (0.85 * rank[a]) / n;
        continue;
      }
      for (const e of out) next[e.to] += (0.85 * rank[a] * e.w) / total;
    }
    rank = next;
  }
  const order = rank.map((r, i) => [r, i] as const).sort((x, y) => x[0] - y[0]);
  order.forEach(([r, i], pos) => {
    students[i].statusRaw = r * n;
    students[i].status = pos / (n - 1);
  });
  const sums = students.map(() => ({ liked: 0, admired: 0, feared: 0 }));
  for (let a = 0; a < n; a++)
    for (const e of edges[a]) {
      sums[e.to].liked += e.liked;
      sums[e.to].admired += e.admired;
      sums[e.to].feared += e.feared;
    }
  for (let i = 0; i < n; i++) {
    const t = sums[i].liked + sums[i].admired + sums[i].feared;
    students[i].foundation = t > 0 ? { liked: sums[i].liked / t, admired: sums[i].admired / t, feared: sums[i].feared / t } : { liked: 0, admired: 0, feared: 0 };
  }
}

/** Overnight: memories fade, public stances drift toward what the people I watch show, try-hards get noticed. */
/** Roughly how many people one person can keep track of (Dunbar's number). */
export const MAX_OPINIONS = 150;

/** How much someone matters to me: how well I know them, how strongly I feel, how prominent they are. */
function salience(world: World, b: number, r: Rel): number {
  return 1.5 * r.fam + Math.abs(r.aff) + Math.abs(r.trust) + 0.5 * Math.abs(r.resp) + r.fear + 0.3 * world.students[b].status;
}

/** Forgetting trims down to a bit below the cap, so it doesn't have to run every night. */
const FORGET_TO = MAX_OPINIONS - 15;

/** Over the cap, people forget those who matter least to them (never their partner, crush, or the people they watch). */
function forget(world: World, s: Student) {
  if (s.rels.size <= MAX_OPINIONS) return;
  const keep = new Set([...s.refSet, s.partner ?? -1, s.crush ?? -1]);
  const ranked = [...s.rels].filter(([b]) => !keep.has(b)).sort((x, y) => salience(world, x[0], x[1]) - salience(world, y[0], y[1]));
  for (const [b] of ranked.slice(0, s.rels.size - FORGET_TO)) s.rels.delete(b);
}

export function nightly(world: World) {
  const { students } = world;
  for (const s of students) forget(world, s);

  // 1. Fading: friendships need upkeep; fear fades fastest.
  for (const s of students)
    for (const r of s.rels.values()) {
      r.aff *= 0.996;
      r.trust *= 0.998;
      r.resp *= 0.998;
      r.fear *= 0.97;
      r.fam *= 0.999;
      r.given *= 0.8;
      r.hurt *= 0.95;
      r.owed *= 0.97;
      for (const t of TAGS) {
        const v = r.tags[t];
        if (v !== undefined) r.tags[t] = v * 0.99;
      }
    }

  // 2. Public stance = private view mixed with what the people I watch show, plus deference to people I fear.
  //    Thresholds produce cascades (sudden pile-ons and sudden acceptance).
  const newPub: Map<number, number>[] = students.map(() => new Map());
  for (const s of students) {
    for (const [b, r] of s.rels) {
      let sum = 0;
      let count = 0;
      let neg = 0;
      let pos = 0;
      for (const m of s.refSet) {
        if (m === b) continue;
        const mr = students[m].rels.get(b);
        if (!mr || mr.fam < 0.15) continue;
        sum += mr.pub;
        count++;
        if (mr.pub < -0.15) neg++;
        if (mr.pub > 0.35) pos++;
      }
      const p = priv(r);
      let pub = p;
      if (count > 0) {
        const consensus = sum / count;
        pub = (1 - s.conformity) * p + s.conformity * consensus;
        if (count >= 2 && neg / count >= s.threshold) pub -= 0.25;
        else if (count >= 2 && pos / count >= s.threshold) pub += 0.1;
        // Over time we come to privately believe a bit of what our circle believes.
        if (count >= 2) r.aff = nudge(r.aff, 0.002 * s.conformity * (consensus - r.aff));
      }
      pub += 0.5 * r.fear;
      // I defer, in public, to people I owe.
      pub += 0.2 * r.owed;
      newPub[s.id].set(b, Math.max(-1, Math.min(1, pub)));
    }
  }
  for (const s of students) for (const [b, p] of newPub[s.id]) s.rels.get(b)!.pub = p;

  // 3. Trying too hard: investing far more than you get back, in someone above you.
  for (const a of students)
    for (const [b, r] of a.rels) {
      if (r.given < 0.5) continue;
      const back = students[b].rels.get(a.id)?.given ?? 0;
      if (back < r.given * 0.35 && a.status < students[b].status) {
        const br = students[b].rels.get(a.id);
        if (!br) continue;
        br.resp = nudge(br.resp, -0.012);
        tag(br, 'tryhard', 0.03);
        count(world, 'tryhardNoticed');
      }
    }

  // Stress fades overnight; fitter students shake it off faster.
  for (const s of students) {
    s.counts.stressTotal += s.stress;
    // Conditioning fades without practice, slowly.
    s.fitness *= 0.998;
    s.stress *= 0.85 - 0.05 * s.fitness;
  }
  computeStatus(world);
}

/** Weekly: who do I watch to judge who's in? Close friends and high-status people I know. */
/** Weekly: rule-breaking drifts toward your close friends' level (friends pull each other in, or out). */
export function peerDrift(world: World) {
  const next = world.students.map((s) => {
    let sum = 0;
    let n = 0;
    for (const [b, r] of s.rels)
      if (r.aff > 0.4 && r.trust > 0.2) {
        sum += world.students[b].ruleBreaking;
        n++;
      }
    return n ? s.ruleBreaking + 0.08 * (sum / n - s.ruleBreaking) : s.ruleBreaking;
  });
  world.students.forEach((s, i) => (s.ruleBreaking = Math.max(0, Math.min(1, next[i]))));
}

export function updateRefSets(world: World) {
  for (const s of world.students) {
    const scored: [number, number][] = [];
    for (const [b, r] of s.rels) if (r.fam > 0.25) scored.push([b, r.aff + 0.5 * r.resp + 1.5 * world.students[b].status]);
    scored.sort((x, y) => y[1] - x[1]);
    s.refSet = scored.slice(0, 4).map((x) => x[0]);
  }
}

/**
 * Weekly: find groups from who chose to spend free time together (weighted label propagation).
 * Groups are never defined anywhere else.
 */
export function detectGroups(world: World): number[][] {
  const { students, rng } = world;
  const n = students.length;
  const adj: Map<number, number>[] = students.map(() => new Map());
  const add = (m: Map<number, number>, f: number) => {
    for (const [k, w] of m) {
      const a = Math.floor(k / 100000);
      const b = k % 100000;
      adj[a].set(b, (adj[a].get(b) ?? 0) + w * f);
      adj[b].set(a, (adj[b].get(a) ?? 0) + w * f);
    }
  };
  add(world.hangout, 1);
  add(world.lastHangout, 0.5);
  // Only count ties strong enough to be "hanging out", and only if mutual liking is non-negative.
  for (let a = 0; a < n; a++)
    for (const [b, w] of adj[a]) {
      const ra = students[a].rels.get(b);
      const rb = students[b].rels.get(a);
      const likes = Math.min(ra?.aff ?? 0, rb?.aff ?? 0);
      if (w < 3 || likes < 0.1) adj[a].delete(b);
    }
  const label = students.map((s) => s.id);
  for (let iter = 0; iter < 15; iter++) {
    let changed = false;
    for (const a of rng.shuffle(students.map((s) => s.id))) {
      if (adj[a].size === 0) continue;
      const score = new Map<number, number>();
      for (const [b, w] of adj[a]) score.set(label[b], (score.get(label[b]) ?? 0) + w);
      let best = label[a];
      let bestW = -1;
      for (const [l, w] of score) if (w > bestW || (w === bestW && l < best)) [best, bestW] = [l, w];
      if (best !== label[a]) {
        label[a] = best;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const byLabel = new Map<number, number[]>();
  label.forEach((l, i) => {
    if (adj[i].size === 0) return;
    byLabel.set(l, [...(byLabel.get(l) ?? []), i]);
  });
  const groups = [...byLabel.values()].filter((g) => g.length >= 2).sort((x, y) => y.length - x.length);
  for (const s of students) s.group = -1;
  groups.forEach((g, gi) => g.forEach((i) => (students[i].group = gi)));
  return groups;
}

export function resetWeek(world: World) {
  world.lastHangout = world.hangout;
  world.hangout = new Map();
}
