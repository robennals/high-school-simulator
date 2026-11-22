/**
 * Realism targets for the card rules: what research finds about real high schools, with sources, and a
 * few design rules that deliberately depart from research (Rob: anti-social strategies should pay less
 * well than in real life, so players don't learn to use them).
 *
 * `confidence` says how well each number is backed:
 * - confirmed: checked against the source;
 * - secondhand: quoted from a later paper citing the source;
 * - unverified: a well-established pattern, but the exact number wasn't confirmed;
 * - design: a choice for the game, not a research finding.
 *
 * A semester is half a school year, so year-long figures are scaled where that makes sense.
 */
import type { CardMetrics } from './metrics';

export interface Target {
  name: string;
  /** What research (or the design) says, in words. */
  expect: string;
  source: string;
  confidence: 'confirmed' | 'secondhand' | 'unverified' | 'design';
  /** The measured value, for the report. */
  value: (m: CardMetrics) => number;
  format?: 'pct' | 'num';
  pass: (v: number, m: CardMetrics) => boolean;
}

const r = (m: CardMetrics) => m.research;

export const TARGETS: Target[] = [
  {
    name: 'Friends per student',
    expect: 'about 2–4 named friends (we allow 2–5)',
    source: 'Add Health, two schools: 2.0–3.4 friends named on average (PMC2352147)',
    confidence: 'confirmed',
    value: (m) => m.friends.mean,
    pass: (v) => v >= 2 && v <= 5,
  },
  {
    name: 'Students with no friends',
    expect: 'a small minority, 3–15%',
    source: 'Add Health isolate studies (no national figure found)',
    confidence: 'unverified',
    value: (m) => m.friends.none / (m.friends.none + m.friends.oneTwo + m.friends.threeSix + m.friends.sevenPlus),
    format: 'pct',
    pass: (v) => v >= 0.03 && v <= 0.15,
  },
  {
    name: 'Same-gender friendships',
    expect: 'strongly same-gender at this age: 70% or more',
    source: 'Gender homophily in adolescent networks (Add Health; exact share not confirmed)',
    confidence: 'unverified',
    value: (m) => m.sameGender.share,
    format: 'pct',
    pass: (v) => v >= 0.7,
  },
  {
    name: 'Group sizes',
    expect: 'cliques of about 3–9: 80%+ of groups have 9 or fewer',
    source: 'Brown; Ennett & Bauman (not rechecked)',
    confidence: 'unverified',
    value: (m) => r(m).groupsUpTo9,
    format: 'pct',
    pass: (v) => v >= 0.8,
  },
  {
    name: 'Friendships that last (week 4 → end)',
    expect: 'about half of friendships last a school year, so most (40–85%) last a semester',
    source: 'Bowker 2004; Poulin & Chan 2010, cited in Frontiers 2024',
    confidence: 'secondhand',
    value: (m) => r(m).friendshipsKept,
    format: 'pct',
    pass: (v) => v >= 0.4 && v <= 0.85,
  },
  {
    name: 'Students bullied',
    expect: 'about 19% in a school year; 10–25% in a semester',
    source: 'NCES School Crime Supplement 2021–22: 19.2% (26% middle, 16% high school)',
    confidence: 'confirmed',
    value: (m) => r(m).bulliedShare,
    format: 'pct',
    pass: (v) => v >= 0.1 && v <= 0.25,
  },
  {
    name: 'Bullying happens',
    expect: 'at least 5% of students get put down in a semester, so the player meets it',
    source: 'Design (Rob): handling bullying, of you and of others, is part of the game',
    confidence: 'design',
    value: (m) => r(m).putDownShare,
    format: 'pct',
    pass: (v) => v >= 0.05,
  },
  {
    name: 'Bullying pays at first',
    expect: 'by the Sunday after a first put-down, the bully is up on non-bullies who had the same Standing',
    source: 'Design (Rob): it should seem to work short term, and cost long term',
    confidence: 'design',
    value: (m) => r(m).bullyFirstWeekGain,
    pass: (v) => v > 0,
  },
  {
    name: 'Who bullies',
    expect: 'rises with status: the upper half (Standing 3–5) more than the lower (1–2)',
    source: 'Faris & Felmlee 2011, American Sociological Review (drops only at the very top ~2%)',
    confidence: 'confirmed',
    value: (m) => {
      const x = r(m).putdownRateByStanding;
      return (x[2] + x[3] + x[4]) / 3 / Math.max(1e-9, (x[0] + x[1]) / 2);
    },
    pass: (v) => v > 1.2,
  },
  {
    name: 'Bystanders step in',
    expect: 'peers step in during about 19% of episodes (we allow 10–30%)',
    source: 'Hawkins, Pepler & Craig 2001, Social Development: present 88%, intervene 19%',
    confidence: 'confirmed',
    value: (m) => r(m).interventionRate,
    format: 'pct',
    pass: (v) => v >= 0.1 && v <= 0.3,
  },
  {
    name: 'Stepping in works',
    expect: 'stops the bullying about 57% of the time (we allow 40%+)',
    source: 'Hawkins, Pepler & Craig 2001, abstract: 57% of interventions effective',
    confidence: 'confirmed',
    value: (m) => r(m).interventionWorked,
    format: 'pct',
    pass: (v) => v >= 0.4,
  },
  {
    name: "Bullying doesn't pay long term (Standing)",
    expect: 'over the semester, bullies lose Standing relative to everyone else (stricter than real life, on purpose)',
    source: 'Design (Rob). Research: aggression can raise perceived popularity (Cillessen & Borch 2006)',
    confidence: 'design',
    value: (m) => r(m).bullyStandingChange - r(m).othersStandingChange,
    pass: (v) => v < 0,
  },
  {
    name: 'Rumors usually backfire (found out)',
    expect: 'most made-up rumors are found out: 50%+',
    source: 'Design (Rob)',
    confidence: 'design',
    value: (m) => r(m).rumorsFoundOutShare,
    format: 'pct',
    pass: (v) => !(v < 0.5),
  },
  {
    name: 'Rumors usually backfire (Standing)',
    expect: 'people who make up rumors lose Standing',
    source: 'Design (Rob)',
    confidence: 'design',
    value: (m) => r(m).rumorMakerStandingChange - r(m).othersStandingChange,
    pass: (v) => !(v >= 0),
  },
  {
    name: 'Popular students have more friends',
    expect: 'a modest positive link between Standing and friends (0.15–0.6)',
    source: 'Design (Rob): popularity is friends plus respect, so this holds partly by construction',
    confidence: 'design',
    value: (m) => m.standingVsFriends,
    pass: (v) => v >= 0.15 && v <= 0.6,
  },
  {
    name: 'Status is fairly stable (week 4 → end)',
    expect: 'stable but not fixed: r about 0.5–0.9 (about 0.70 across a year)',
    source: 'Cillessen & Mayeux 2004, cited in J. Early Adolescence 2009',
    confidence: 'secondhand',
    value: (m) => r(m).standingStabilityLong,
    pass: (v) => v >= 0.5 && v <= 0.9,
  },
  {
    name: 'Students who date during the semester',
    expect: '15–45% (about 65% of 12–18 year olds over 18 months; fewer at 14–15)',
    source: 'Carver, Joyner & Udry 2003 (Add Health); age-15 figure not confirmed',
    confidence: 'secondhand',
    value: (m) => r(m).romanceShare,
    format: 'pct',
    pass: (v) => v >= 0.15 && v <= 0.45,
  },
  {
    name: 'Relationships last a while',
    expect: 'median length 3+ weeks (most last weeks to months)',
    source: 'Carver, Joyner & Udry 2003 (durations vary by age)',
    confidence: 'secondhand',
    value: (m) => r(m).romanceMedianWeeks,
    pass: (v) => !(v < 3),
  },
];

/** Evaluate the targets across several runs: a target passes when the average passes. No data is a fail. */
export function evaluate(runs: CardMetrics[]): { target: Target; values: number[]; mean: number; pass: boolean }[] {
  return TARGETS.map((target) => {
    const values = runs.map((m) => target.value(m));
    const finite = values.filter((v) => Number.isFinite(v));
    const mean = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : NaN;
    return { target, values, mean, pass: Number.isFinite(mean) && target.pass(mean, runs[0]) };
  });
}
