/** Static game content: abilities, topics, activities, names. */

export const ABILITIES = ['athletics', 'academics', 'humor', 'arts', 'style', 'tech'] as const;
export type Ability = (typeof ABILITIES)[number];

/** Points each student spreads across abilities (like a D&D point buy). Max 5 per ability. */
export const ABILITY_BUDGET = 12;
export const ABILITY_MAX_POINTS = 5;

export const QUALITIES = ['athletic', 'smart', 'funny', 'creative', 'stylish', 'techy', 'kind', 'edgy'] as const;
export type Quality = (typeof QUALITIES)[number];

/** Which admired quality each ability displays. */
export const ABILITY_QUALITY: Record<Ability, Quality> = {
  athletics: 'athletic',
  academics: 'smart',
  humor: 'funny',
  arts: 'creative',
  style: 'stylish',
  tech: 'techy',
};

/** Interest areas you can know a lot about ("know the group's stuff"). */
export const INTERESTS = [
  'soccer',
  'basketball',
  'video games',
  'anime',
  'pop music',
  'hip-hop',
  'fashion',
  'TV shows',
  'coding',
  'books',
] as const;
export type Interest = (typeof INTERESTS)[number];

/** Things people have opinions about. Stances run from -1 (mock it) to 1 (love it). */
export const OPINION_TOPICS = [
  'school spirit',
  'Mr. Dunn',
  'Ms. Okafor',
  'the cafeteria pizza',
  'the Starfall movies',
  'Nova Ray',
  'Blockfront',
  'pep rallies',
  'the new phone rule',
  'Static Lake',
  'Island Love',
  'the dress code',
] as const;

/** Overall looks. Wearing what a group wears signals you're one of them. */
export const LOOKS = ['sporty', 'preppy', 'alt', 'artsy', 'techy', 'plain'] as const;
export type Look = (typeof LOOKS)[number];

/**
 * Things you can wear a shirt about (indexes into OPINION_TOPICS): the school team, a movie series,
 * a pop star, a game, a band, a show. A shirt states your opinion publicly — an easy opener with
 * people who love it, and an out-group signal to people who mock it.
 */
export const SHIRT_TOPICS = [0, 4, 5, 6, 9, 10];

/**
 * Which fan shirts go with which look — a band tee doesn't go with a sporty outfit. The low-key
 * look goes with anything. Indexes into OPINION_TOPICS: 0 the school team, 4 the Starfall movies,
 * 5 Nova Ray (pop star), 6 Blockfront (game), 9 Static Lake (band), 10 Island Love (show).
 */
export const LOOK_SHIRT_TOPICS: Record<Look, number[]> = {
  sporty: [0],
  preppy: [5, 10],
  alt: [9, 6],
  artsy: [9, 4],
  techy: [6, 4],
  plain: SHIRT_TOPICS,
};

/** The fan shirt someone with these opinions would pick, among the ones that go with their look. */
export function favoriteShirtTopic(opinions: number[], look: Look): number {
  const fits = LOOK_SHIRT_TOPICS[look];
  return fits.reduce((b, t) => (opinions[t] > opinions[b] ? t : b), fits[0]);
}

/**
 * Kinds of shirt. Everyone wears one; the kind sets how approachable you look.
 * - plain: no signal.
 * - graphic: a funny graphic tee — more people of every kind come talk to you (and interrupt you).
 * - fan: about something you love (see SHIRT_TOPICS) — fans come to you, people who mock it stay away.
 * - hoodie: keeps people at a distance — fewer interruptions, slower to make friends.
 */
export const SHIRT_STYLES = ['plain', 'graphic', 'fan', 'hoodie'] as const;
export type ShirtStyle = (typeof SHIRT_STYLES)[number];

export type ActivityId = 'soccer-boys' | 'soccer-girls' | 'band' | 'drama' | 'robotics';

export interface ActivityDef {
  id: ActivityId;
  name: string;
  ability: Ability;
  interest: Interest | null;
  gender: 'boy' | 'girl' | null;
  capacity: number;
  /** Whether getting in needs a tryout/audition (limited spots by skill). */
  tryout: boolean;
  /** Week of the big public event (game days are handled separately for soccer). */
  showcaseWeek: number | null;
  /** What the big public event is called. */
  showcaseName: string;
  /** Side effects of each practice, beyond skill and friendships. */
  builds: { fitness?: number; poise?: number };
  /** Weeks of crunch (rehearsals, build season): evenings go to the activity instead of homework or friends. */
  crunchWeeks: number[];
  /** Some activities mean practicing at home on some evenings (an instrument). */
  homePracticeNights: number;
}

export const ACTIVITIES: ActivityDef[] = [
  { id: 'soccer-boys', name: 'boys soccer', ability: 'athletics', interest: 'soccer', gender: 'boy', capacity: 18, tryout: true, showcaseWeek: null, showcaseName: 'the soccer game', builds: { fitness: 0.012 }, crunchWeeks: [], homePracticeNights: 0 },
  { id: 'soccer-girls', name: 'girls soccer', ability: 'athletics', interest: 'soccer', gender: 'girl', capacity: 18, tryout: true, showcaseWeek: null, showcaseName: 'the soccer game', builds: { fitness: 0.012 }, crunchWeeks: [], homePracticeNights: 0 },
  { id: 'band', name: 'band', ability: 'arts', interest: null, gender: null, capacity: 30, tryout: false, showcaseWeek: 9, showcaseName: 'the band concert', builds: {}, crunchWeeks: [], homePracticeNights: 1 },
  { id: 'drama', name: 'drama', ability: 'arts', interest: null, gender: null, capacity: 20, tryout: true, showcaseWeek: 11, showcaseName: 'the fall play', builds: { poise: 0.01 }, crunchWeeks: [10], homePracticeNights: 0 },
  { id: 'robotics', name: 'robotics', ability: 'tech', interest: 'coding', gender: null, capacity: 20, tryout: false, showcaseWeek: 13, showcaseName: 'the robotics competition', builds: {}, crunchWeeks: [12], homePracticeNights: 0 },
];

/**
 * Name pools. Heritage only picks names and appearance; it has no effect on
 * behavior or friendships (a deliberate design decision).
 */
export const HERITAGES: { boys: string[]; girls: string[]; last: string[]; skin: number[] }[] = [
  {
    boys: ['Jake', 'Ethan', 'Ryan', 'Connor', 'Tyler', 'Owen', 'Liam', 'Mason', 'Cole', 'Noah', 'Luke', 'Hunter'],
    girls: ['Emma', 'Ava', 'Hannah', 'Chloe', 'Madison', 'Grace', 'Lily', 'Sophie', 'Claire', 'Abby', 'Megan', 'Riley'],
    last: ['Miller', 'Walsh', 'Peterson', 'Hughes', 'Becker', 'Sullivan', 'Fischer', 'Brooks', 'Carter', 'Murphy'],
    skin: [0, 1],
  },
  {
    boys: ['Marcus', 'Jalen', 'Darius', 'Andre', 'Isaiah', 'Malik', 'Terrence', 'Elijah', 'Jordan', 'Xavier'],
    girls: ['Aaliyah', 'Imani', 'Jasmine', 'Nia', 'Kiara', 'Destiny', 'Zoe', 'Maya', 'Simone', 'Tiana'],
    last: ['Washington', 'Jackson', 'Robinson', 'Okafor', 'Coleman', 'Banks', 'Mensah', 'Harris', 'Freeman', 'Adeyemi'],
    skin: [3, 4],
  },
  {
    boys: ['Mateo', 'Diego', 'Carlos', 'Luis', 'Adrian', 'Gabriel', 'Javier', 'Marco', 'Santiago', 'Emilio'],
    girls: ['Sofia', 'Camila', 'Valeria', 'Isabella', 'Lucia', 'Ana', 'Daniela', 'Elena', 'Gabriela', 'Mariana'],
    last: ['Garcia', 'Martinez', 'Lopez', 'Hernandez', 'Ramirez', 'Torres', 'Flores', 'Morales', 'Ortiz', 'Reyes'],
    skin: [1, 2, 3],
  },
  {
    boys: ['Kevin', 'Daniel', 'Jason', 'Ryan', 'Eric', 'Brian', 'Justin', 'Andrew', 'Leo', 'Kai'],
    girls: ['Mei', 'Grace', 'Amy', 'Jenny', 'Michelle', 'Hana', 'Emily', 'Yuna', 'Lily', 'Alice'],
    last: ['Chen', 'Kim', 'Nguyen', 'Park', 'Wong', 'Tanaka', 'Li', 'Tran', 'Huang', 'Liu'],
    skin: [1, 2],
  },
  {
    boys: ['Dev', 'Arjun', 'Rohan', 'Nikhil', 'Sameer', 'Omar', 'Zain', 'Aarav', 'Kabir', 'Ravi'],
    girls: ['Priya', 'Ananya', 'Aisha', 'Leila', 'Sana', 'Meera', 'Nadia', 'Riya', 'Zara', 'Isha'],
    last: ['Patel', 'Sharma', 'Khan', 'Singh', 'Gupta', 'Rahman', 'Mehta', 'Ali', 'Reddy', 'Iyer'],
    skin: [2, 3],
  },
];

export const SKIN_TONES = 5;
export const HAIR_COLORS = 6;

/** Feeder middle schools. The last one stands for "a small school or homeschool". */
export const FEEDER_SCHOOLS = ['Lincoln Middle', 'Westbrook Middle', 'Riverside Middle', 'Oak Hill Middle', 'a small school'];
