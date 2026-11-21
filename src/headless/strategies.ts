/**
 * Strategy experiment: is there an easy winning way to spend your time?
 *
 * In each run, 60 "subject" students are assigned one option; everyone else behaves normally.
 * Options rotate across runs so every subject tries every option — each comparison is the same
 * student, with the same skills and situation, making a different choice. Each school is also run
 * with two different event seeds: same students, different luck.
 *
 * What we want to see:
 *   - no option is beaten on every outcome (except the phone, by design);
 *   - mixes beat single habits for most students;
 *   - which option is best depends on who you are (attributes) and on what happens to you (luck).
 *
 *   node --import tsx src/headless/strategies.ts [--seeds 2] [--luck 2] [--weeks 16] [--no-events] [--only shirt]
 */
import { ABILITIES, ACTIVITIES, SHIRT_STYLES, type Ability, type ActivityId, type ShirtStyle } from '../sim/content';
import { gradeBar, runSimulation } from '../sim/day';
import { createWorld } from '../sim/generate';
import { mutualFriends } from '../sim/metrics';
import { sigmoid } from '../sim/rng';
import type { EveningPlan, SimConfig, Student, World } from '../sim/types';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}
const SCHOOLS = arg('seeds', 2);
const LUCK = arg('luck', 2);
const WEEKS = arg('weeks', 16);
const STUDENTS = 200;
const SUBJECTS = 60;
/** `--no-events` turns the storyteller off, to see how much random events change the best strategy. */
const EVENTS = !process.argv.includes('--no-events');
/** `--only shirt` runs just the experiments whose title mentions that word. */
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].toLowerCase() : null;

const DIMENSIONS = ['status', 'friends', 'grades', 'calm', 'skill'] as const;
type Dimension = (typeof DIMENSIONS)[number];
type Outcome = Record<Dimension, number>;

/**
 * What a student ends the semester with. Grades count for what they do for you in the game —
 * staying clear of your parents' bar (no grounding, no benching, being the one people ask for help) —
 * so they matter a lot up to "comfortably above the bar" and little beyond it.
 */
function outcome(world: World, id: number): Outcome {
  const s = world.students[id];
  const top2 = ABILITIES.map((a) => s.abilities[a]).sort((a, b) => b - a).slice(0, 2);
  return {
    status: s.status,
    friends: mutualFriends(world, id).length,
    grades: sigmoid(12 * (s.grades - gradeBar(s) - 0.1)),
    calm: -s.counts.stressTotal / world.day,
    skill: (top2[0] + top2[1]) / 2,
  };
}

/** Starting attributes we check against: does who you are change what's best for you? */
const ATTRIBUTES: [string, (s: Student) => number][] = [
  ['extraversion', (s) => s.traits.E],
  ['conscientiousness', (s) => s.traits.C],
  ['neuroticism', (s) => s.traits.N],
  ['academics', (s) => s.abilities.academics],
  ['status drive', (s) => s.statusDrive],
  ['strict parents', (s) => s.parentStrictness],
];

interface Experiment<O extends string> {
  title: string;
  options: O[];
  /** Options that are mixes; the report checks how often a mix beats every single-habit option. */
  mixes?: O[];
  configure: (cfg: SimConfig, assign: Map<number, O>, school: World) => void;
  /** Which ability (if any) an option draws on, to check whether your skills decide what's best for you. */
  ability?: (o: O) => Ability | null;
}

/** One subject in one school under one run of luck. */
interface Trial {
  key: string;
  luck: number;
  student: Student;
}

function run<O extends string>(exp: Experiment<O>) {
  if (ONLY && !exp.title.toLowerCase().includes(ONLY)) return;
  const trials: Trial[] = [];
  /** outcomes[trial index][option] */
  const outcomes: Map<O, Outcome>[] = [];
  for (let school = 1; school <= SCHOOLS; school++) {
    const probe = createWorld({ students: STUDENTS, weeks: WEEKS, seed: school, follow: null });
    const subjects = probe.students.filter((_, i) => i % Math.round(STUDENTS / SUBJECTS) === 0).slice(0, SUBJECTS);
    for (let luck = 0; luck < LUCK; luck++) {
      const first = trials.length;
      for (const s of subjects) {
        trials.push({ key: `${school}:${s.id}`, luck, student: s });
        outcomes.push(new Map());
      }
      for (let r = 0; r < exp.options.length; r++) {
        const assign = new Map<number, O>(subjects.map((s, i) => [s.id, exp.options[(i + r) % exp.options.length]]));
        const cfg: SimConfig = { students: STUDENTS, weeks: WEEKS, seed: school, eventSeed: 1000 * school + luck, follow: null, storyteller: EVENTS };
        exp.configure(cfg, assign, probe);
        const world = createWorld(cfg);
        runSimulation(world);
        subjects.forEach((s, i) => outcomes[first + i].set(assign.get(s.id)!, outcome(world, s.id)));
      }
    }
  }

  // Standardize each dimension across all observations, so the dimensions are comparable.
  const all = outcomes.flatMap((m) => [...m.values()]);
  const mean: Outcome = { status: 0, friends: 0, grades: 0, calm: 0, skill: 0 };
  const sd: Outcome = { status: 1, friends: 1, grades: 1, calm: 1, skill: 1 };
  for (const d of DIMENSIONS) {
    const xs = all.map((o) => o[d]);
    mean[d] = xs.reduce((a, b) => a + b, 0) / xs.length;
    sd[d] = Math.sqrt(xs.reduce((a, b) => a + (b - mean[d]) ** 2, 0) / xs.length) || 1;
  }
  const z = (o: Outcome, d: Dimension) => (o[d] - mean[d]) / sd[d];
  const score = (o: Outcome) => DIMENSIONS.reduce((t, d) => t + z(o, d), 0);

  console.log(`\n=== ${exp.title} ===`);
  console.log(`Average outcome per option, in standard deviations from the overall average (${trials.length} trials: ${SUBJECTS} students × ${SCHOOLS} schools × ${LUCK} runs of luck):`);
  console.log('  ' + 'option'.padEnd(14) + DIMENSIONS.map((d) => d.padStart(9)).join('') + '    total');
  const avgZ = new Map<O, Outcome>();
  for (const o of exp.options) {
    const row: Outcome = { status: 0, friends: 0, grades: 0, calm: 0, skill: 0 };
    for (const d of DIMENSIONS) row[d] = outcomes.reduce((t, m) => t + z(m.get(o)!, d), 0) / outcomes.length;
    avgZ.set(o, row);
    console.log('  ' + o.padEnd(14) + DIMENSIONS.map((d) => row[d].toFixed(2).padStart(9)).join('') + DIMENSIONS.reduce((t, d) => t + row[d], 0).toFixed(2).padStart(9));
  }
  const dominated = exp.options.filter((b) => exp.options.some((a) => a !== b && DIMENSIONS.every((d) => avgZ.get(a)![d] > avgZ.get(b)![d])));
  console.log(`  Options worse than some other option on every outcome: ${dominated.length ? dominated.join(', ') : 'none'}`);

  // Best option per trial, scoring each outcome equally.
  const best = outcomes.map((m) => exp.options.reduce((b, o) => (score(m.get(o)!) > score(m.get(b)!) ? o : b), exp.options[0]));
  const share = (o: O) => best.filter((b) => b === o).length / best.length;
  console.log('  Share of trials where each option is best:');
  for (const o of exp.options) console.log(`    ${o.padEnd(14)} ${(100 * share(o)).toFixed(0)}%`);

  if (exp.mixes) {
    const singles = exp.options.filter((o) => !exp.mixes!.includes(o));
    const mixWins = outcomes.filter((m) => Math.max(...exp.mixes!.map((x) => score(m.get(x)!))) > Math.max(...singles.map((o) => score(m.get(o)!)))).length;
    console.log(`  Trials where some mix beats every single habit: ${((100 * mixWins) / outcomes.length).toFixed(0)}%`);
  }

  // Luck: same student, same school, different events. How often is the best option the same?
  if (LUCK > 1) {
    const byKey = new Map<string, O[]>();
    trials.forEach((t, i) => byKey.set(t.key, [...(byKey.get(t.key) ?? []), best[i]]));
    const same = [...byKey.values()].filter((bs) => bs.every((b) => b === bs[0])).length;
    const chance = exp.options.reduce((t, o) => t + share(o) ** LUCK, 0);
    console.log(
      `  Luck: same student, different events — best option unchanged for ${((100 * same) / byKey.size).toFixed(0)}% of students ` +
        `(${(100 * chance).toFixed(0)}% if it were pure chance, 100% if luck didn't matter).`,
    );
  }

  // Attributes: do the students each option suits look different?
  console.log('  Who each option suits — average starting attributes of the trials where it was best (everyone in brackets):');
  console.log('    ' + 'option'.padEnd(14) + ATTRIBUTES.map(([name]) => name.padStart(18)).join(''));
  const overall = ATTRIBUTES.map(([, f]) => trials.reduce((t, x) => t + f(x.student), 0) / trials.length);
  console.log('    ' + '(everyone)'.padEnd(14) + overall.map((v) => v.toFixed(2).padStart(18)).join(''));
  for (const o of exp.options) {
    const suited = trials.filter((_, i) => best[i] === o);
    if (suited.length < 3) continue;
    console.log('    ' + `${o} (${suited.length})`.padEnd(14) + ATTRIBUTES.map(([, f]) => (suited.reduce((t, x) => t + f(x.student), 0) / suited.length).toFixed(2).padStart(18)).join(''));
  }

  if (exp.ability) {
    console.log("  When an option draws on a student's strongest ability, how often is it their best option?");
    for (const o of exp.options) {
      const ab = exp.ability(o);
      if (!ab) continue;
      const strong = trials.map((t, i) => [t, i] as const).filter(([t]) => ABILITIES.every((x) => t.student.abilities[ab] >= t.student.abilities[x]));
      const hits = strong.filter(([, i]) => best[i] === o).length;
      console.log(`    ${o.padEnd(14)} ${hits}/${strong.length} trials whose strongest ability is ${ab}; ${(100 * share(o)).toFixed(0)}% of all trials`);
    }
  }
}

type ActivityOption = 'soccer' | Exclude<ActivityId, 'soccer-boys' | 'soccer-girls'> | 'none';
const activityAbility = (o: ActivityOption): Ability | null => (o === 'none' ? null : o === 'soccer' ? 'athletics' : ACTIVITIES.find((a) => a.id === o)!.ability);

run<ActivityOption>({
  title: 'After-school activity',
  options: ['soccer', 'band', 'drama', 'robotics', 'none'],
  configure: (cfg, assign, school) => {
    cfg.forcedActivity = new Map(
      [...assign].map(([id, o]) => [id, o === 'none' ? null : o === 'soccer' ? (school.students[id].gender === 'boy' ? 'soccer-boys' : 'soccer-girls') : o]),
    );
  },
  ability: activityAbility,
});

/** Single habits, and mixes that rotate through several things night by night. */
const EVENING_PLANS: Record<string, EveningPlan> = {
  study: 'study',
  friends: 'friends',
  practice: 'practice',
  rest: 'rest',
  phone: 'phone',
  'study+friends': ['study', 'friends'],
  'mix of four': ['study', 'friends', 'practice', 'rest'],
  adaptive: 'adaptive',
};

run<string>({
  title: 'Evening habit (single habits versus mixes)',
  options: Object.keys(EVENING_PLANS),
  mixes: ['study+friends', 'mix of four', 'adaptive'],
  configure: (cfg, assign) => {
    cfg.forcedEvening = new Map([...assign].map(([id, name]) => [id, EVENING_PLANS[name]]));
  },
});

run<ShirtStyle>({
  title: 'Kind of shirt (worn all semester)',
  options: [...SHIRT_STYLES],
  configure: (cfg, assign) => {
    cfg.forcedShirt = new Map(assign);
  },
});
