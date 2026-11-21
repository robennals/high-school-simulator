import { describe, expect, it } from 'vitest';
import { ABILITIES, ABILITY_BUDGET, ABILITY_MAX_POINTS } from '../content';
import { runDay, runSimulation } from '../day';
import { createWorld, pointBuy } from '../generate';
import { computeMetrics } from '../metrics';
import { Rng } from '../rng';

describe('point buy', () => {
  it('gives every student the same ability budget', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 100; i++) {
      const a = pointBuy(rng);
      const points = ABILITIES.reduce((t, k) => t + a[k] * ABILITY_MAX_POINTS, 0);
      expect(Math.round(points)).toBe(ABILITY_BUDGET);
    }
  });
});

describe('simulation', () => {
  it('is deterministic for a given seed', () => {
    const run = () => {
      const w = createWorld({ students: 60, weeks: 2, seed: 42, follow: null });
      runSimulation(w);
      return JSON.stringify(computeMetrics(w));
    };
    expect(run()).toBe(run());
  });
});

describe('the phone', () => {
  it('leaves heavy users worse off than the same students without phones', () => {
    const withPhones = createWorld({ students: 200, weeks: 16, seed: 1, follow: null });
    runSimulation(withPhones);
    const without = createWorld({ students: 200, weeks: 16, seed: 1, follow: null, phones: false });
    runSimulation(without);
    const heavy = [...withPhones.students].sort((a, b) => b.counts.phoneNights - a.counts.phoneNights).slice(0, 50);
    const mean = (f: (id: number) => number) => heavy.reduce((t, s) => t + f(s.id), 0) / heavy.length;
    expect(mean((id) => withPhones.students[id].grades)).toBeLessThan(mean((id) => without.students[id].grades));
    expect(mean((id) => withPhones.students[id].counts.stressTotal)).toBeGreaterThan(mean((id) => without.students[id].counts.stressTotal));
    expect(mean((id) => withPhones.students[id].status)).toBeLessThan(mean((id) => without.students[id].status));
  }, 60_000);
});

describe('grades', () => {
  it('never rise on their own: grades only go up on a night the student did homework', () => {
    // These students don't plan to study. (Grounded, the one who'd see friends gets sent to do homework
    // instead — then their grades may rise, because they studied.)
    const w = createWorld({ students: 120, weeks: 8, seed: 3, follow: null, storyteller: false, forcedEvening: new Map([[0, 'rest'], [1, 'friends'], [2, 'practice']]) });
    const watched = [0, 1, 2];
    let last = watched.map((id) => w.students[id].grades);
    while (w.day < 8 * 7) {
      runDay(w);
      const now = watched.map((id) => w.students[id].grades);
      now.forEach((g, i) => {
        if (!w.students[watched[i]].studiedTonight) expect(g).toBeLessThanOrEqual(last[i] + 1e-12);
      });
      last = now;
    }
  });
});

describe('the storyteller', () => {
  it('never raises the grades of someone who coasts and never studies', () => {
    const w = createWorld({ students: 200, weeks: 10, seed: 4, follow: null, forcedEvening: new Map([[0, 'rest']]) });
    let last = w.students[0].grades;
    while (w.day < 10 * 7) {
      runDay(w);
      for (const ev of w.events) if (ev.members.includes(0)) ev.effort.set(0, 'coast');
      expect(w.students[0].grades).toBeLessThanOrEqual(last + 1e-12);
      last = w.students[0].grades;
    }
    expect(w.tally.projects ?? 0).toBeGreaterThan(0);
  });
});
