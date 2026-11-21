/**
 * The storyteller: random events that shift what's worth doing for a while. They hit simulated
 * students and the player alike; when the player is involved and there's a decision, it becomes a
 * prompt the game shows. Simulated students decide by personality.
 *
 * Runs at the start of every day. Events never decide outcomes — they change the situation.
 */
import { runConversation } from './conversation';
import { closeFriendsOf, isAbsent, isGrounded } from './day';
import { addStudent, PERIODS, reseat } from './generate';
import { applyAct } from './perceive';
import { meet, nudge } from './rel';
import { clamp } from './rng';
import { count, createStory } from './stories';
import type { Act, ActiveEvent, PlayerPrompt, Student, World } from './types';

/** Made-up stories that go around about people. */
export const RUMORS = ['cheated on the last quiz', 'talks about their friends behind their backs', 'thinks they’re better than everyone', 'got kicked out of their old school', 'copies everyone’s homework'];

/** How much more often personal events find the human player, so there's always something going on. */
const SPOTLIGHT = 4;

function isPlayer(world: World, id: number): boolean {
  return world.player?.id === id;
}

function name(world: World, id: number): string {
  const s = world.students[id];
  return isPlayer(world, id) ? 'you' : `${s.first} ${s.last[0]}.`;
}

function tell(world: World, text: string, people: number[], aboutPlayer: boolean) {
  world.onStory?.(text, people, aboutPlayer);
}

/** Present people (not sick, not moved away). */
function here(world: World): Student[] {
  return world.students.filter((s) => !isAbsent(world, s));
}

/** Offer the player a decision, or let a simulated student decide by `npcChoice`. */
function decide(world: World, who: Student, prompt: Omit<PlayerPrompt, 'choose'>, npcChoice: () => string, apply: (id: string) => void) {
  if (isPlayer(world, who.id)) world.prompts.push({ ...prompt, choose: apply });
  else apply(npcChoice());
}

export function storyteller(world: World) {
  const dow = world.day % 7;
  const week = Math.floor(world.day / 7);
  const school = dow < 5;
  expire(world);
  runProjects(world);
  if (school) maybeSick(world);
  if (dow === 4) weekendInvite(world);
  if (dow !== 0 || world.day === 0) return;
  // Monday: the week's events.
  if (week >= 1) maybeProject(world);
  if (week >= 2 && week <= 13 && world.rng.chance(0.3)) newStudent(world);
  if (week >= 3 && world.rng.chance(0.15)) moveAway(world);
  if (week === 7) seatingChart(world);
  if (week >= 2) fallingOut(world);
  if (week >= 1) rumors(world);
  stricterParents(world);
  if (week >= 1) copyHomework(world);
  if (week >= 1) fixations(world);
}

function expire(world: World) {
  for (const s of world.students) {
    if (s.parentBarBoost > 0 && world.day >= s.strictUntil) s.parentBarBoost = 0;
    if (s.fixTarget !== null && world.day >= s.fixUntil) s.fixTarget = null;
  }
}

// ---------------------------------------------------------------- group projects

/** Most weeks, one class gets a two-week group project: random groups of three or four. */
function maybeProject(world: World) {
  if (!world.rng.chance(0.6)) return;
  const period = world.rng.int(PERIODS);
  const sections = new Map<number, Student[]>();
  for (const s of here(world)) sections.set(s.sections[period], [...(sections.get(s.sections[period]) ?? []), s]);
  // The player's class is picked more often, so they get projects too.
  const playerSection = world.player ? world.students[world.player.id].sections[period] : -1;
  const keys = [...sections.keys()];
  const section = world.rng.chance(SPOTLIGHT / (SPOTLIGHT + keys.length)) && sections.has(playerSection) ? playerSection : world.rng.pick(keys);
  const students = world.rng.shuffle([...(sections.get(section) ?? [])]);
  for (let i = 0; i + 2 < students.length; i += 4) {
    const members = students.slice(i, i + (students.length - i === 5 ? 5 : 4)).map((s) => s.id);
    const ev: ActiveEvent = { kind: 'project', members, until: world.day + 12, effort: new Map() };
    world.events.push(ev);
    for (const id of members) {
      const s = world.students[id];
      const others = members.filter((m) => m !== id);
      decide(
        world,
        s,
        {
          title: 'Group project',
          text: `You've been put in a group project for two weeks with ${others.map((o) => name(world, o)).join(', ')}. How much are you going to put in?`,
          options: [
            { id: 'lead', label: 'Take charge', text: 'Do the heavy lifting. More stress, better grades, and they’ll respect you — and owe you.' },
            { id: 'split', label: 'Do your share', text: 'Split it fairly. Time together builds friendships either way.' },
            { id: 'coast', label: 'Let them carry it', text: 'Save your energy. They’ll notice.' },
          ],
        },
        () => (s.traits.C > 0.65 ? 'lead' : s.traits.C < 0.3 ? 'coast' : 'split'),
        (choice) => ev.effort.set(id, choice as 'lead' | 'split' | 'coast'),
      );
    }
    count(world, 'projects');
  }
}

/** Every school day, project groups work together (time with people you didn't choose); at the end, a grade. */
function runProjects(world: World) {
  const school = world.day % 7 < 5;
  for (const ev of [...world.events]) {
    if (ev.kind !== 'project') continue;
    const present = ev.members.filter((m) => !isAbsent(world, world.students[m]));
    if (school && present.length >= 2) {
      // Working together closely builds real trust, like time outside school.
      runConversation(world, present, [], 'the group project', 2, { teacher: true, private: true });
      for (const id of present) {
        const s = world.students[id];
        const effort = ev.effort.get(id) ?? 'split';
        for (const o of present) {
          if (o === id) continue;
          const r = meet(world, world.students[o], s);
          if (effort === 'lead') {
            r.resp = nudge(r.resp, 0.012);
            r.owed = Math.min(1, r.owed + 0.03);
          } else if (effort === 'coast') r.aff = nudge(r.aff, -0.012);
        }
        if (effort === 'lead') s.stress += 0.02;
      }
    }
    if (world.day < ev.until) continue;
    world.events.splice(world.events.indexOf(ev), 1);
    const score = (id: number) => ({ lead: 1, split: 0.6, coast: 0.1 })[ev.effort.get(id) ?? 'split'] * (0.5 + 0.5 * world.students[id].abilities.academics);
    const quality = ev.members.reduce((t, id) => t + score(id), 0) / ev.members.length;
    for (const id of ev.members) {
      const s = world.students[id];
      // Doing your share is schoolwork, so it can raise your grade. Coasting earns nothing — but a bad
      // project still drags everyone down.
      const change = 0.06 * (quality - 0.35);
      if (ev.effort.get(id) !== 'coast' || change < 0) s.grades = clamp(s.grades + change, 0, 1);
    }
    if (world.player && ev.members.includes(world.player.id)) {
      const verdict = quality > 0.6 ? 'got a great grade' : quality > 0.4 ? 'did okay' : 'did badly';
      tell(world, `Your group project ${verdict}.`, ev.members.filter((m) => !isPlayer(world, m)), true);
    }
  }
}

// ---------------------------------------------------------------- illness

function maybeSick(world: World) {
  for (const s of here(world)) {
    if (!world.rng.chance(isPlayer(world, s.id) ? 0.012 : 0.006)) continue;
    s.absentUntil = world.day + 2 + world.rng.int(2);
    s.stress *= 0.7;
    // Close friends who check in earn trust.
    const checked: number[] = [];
    for (const f of closeFriendsOf(world, s)) {
      if (!world.rng.chance(0.6)) continue;
      const r = meet(world, s, world.students[f]);
      r.trust = nudge(r.trust, 0.05);
      r.aff = nudge(r.aff, 0.03);
      checked.push(f);
    }
    if (isPlayer(world, s.id))
      tell(world, `You're sick and stuck at home for a few days. ${checked.length ? `${checked.map((f) => name(world, f)).join(' and ')} texted to see how you're doing.` : 'Nobody checks in.'}`, checked, true);
    count(world, 'sickDays');
  }
}

// ---------------------------------------------------------------- arrivals and departures

function newStudent(world: World) {
  const s = addStudent(world);
  s.newUntil = world.day + 21;
  tell(world, `A new student, ${s.first} ${s.last}, started today. They don't know anyone yet.`, [s.id], false);
  count(world, 'newStudents');
}

function moveAway(world: World) {
  const pool = here(world).filter((s) => !isPlayer(world, s.id));
  // The player's friends are a little more likely to be the ones moving — it shakes things up.
  const player = world.player ? world.students[world.player.id] : null;
  const friends = player ? closeFriendsOf(world, player) : [];
  const s = friends.length && world.rng.chance(0.3) ? world.students[world.rng.pick(friends)] : world.rng.pick(pool);
  s.gone = true;
  // Close friends left behind feel it.
  for (const b of s.rels.keys()) {
    const them = world.students[b];
    if ((them.rels.get(s.id)?.aff ?? 0) > 0.4) them.stress += 0.1;
  }
  if (player && player.rels.has(s.id)) tell(world, `${s.first} ${s.last} moved away${friends.includes(s.id) ? ' — one of your close friends' : ''}.`, [s.id], friends.includes(s.id));
  count(world, 'movedAway');
}

/** Week 8: a new seating chart in the afternoon classes. Everyone gets new neighbors. */
function seatingChart(world: World) {
  reseat(world, 3);
  tell(world, 'New seating chart in your afternoon classes: new people to sit next to.', [], false);
}

// ---------------------------------------------------------------- friends falling out

function fallingOut(world: World) {
  // A couple of pairs of close friends fall out each week; their shared friends get caught in the middle.
  const pairs: [Student, Student][] = [];
  for (const a of here(world))
    for (const b of closeFriendsOf(world, a)) if (a.id < b && closeFriendsOf(world, world.students[b]).includes(a.id)) pairs.push([a, world.students[b]]);
  const player = world.player ? world.students[world.player.id] : null;
  // Prefer pairs the player is friends with, now and then.
  const playerPairs = player ? pairs.filter(([a, b]) => (player.rels.get(a.id)?.aff ?? 0) > 0.3 && (player.rels.get(b.id)?.aff ?? 0) > 0.3) : [];
  const picks: [Student, Student][] = [];
  if (playerPairs.length && world.rng.chance(0.25)) picks.push(world.rng.pick(playerPairs));
  for (let i = 0; i < 2 && pairs.length; i++) picks.push(world.rng.pick(pairs));
  for (const [a, b] of picks) {
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      const r = meet(world, x, y);
      r.aff = nudge(r.aff, -0.5);
      r.trust = nudge(r.trust, -0.4);
      r.hurt += 1;
    }
    const act: Act = { kind: 'fallout', actor: a.id, target: b.id, place: 'school', day: world.day };
    createStory(world, act, []);
    count(world, 'fallouts');
    // Friends of both are caught in the middle.
    const shared = here(world).filter((c) => c.id !== a.id && c.id !== b.id && (c.rels.get(a.id)?.aff ?? 0) > 0.3 && (c.rels.get(b.id)?.aff ?? 0) > 0.3);
    for (const c of shared) caughtInTheMiddle(world, c, a, b);
  }
}

function caughtInTheMiddle(world: World, c: Student, a: Student, b: Student) {
  decide(
    world,
    c,
    {
      title: 'Caught in the middle',
      text: `${name(world, a.id)} and ${name(world, b.id)} had a big falling out. They both want you on their side.`,
      options: [
        { id: 'a', label: `Side with ${a.first}`, text: `${a.first} will trust you more. ${b.first} won't forget it.` },
        { id: 'b', label: `Side with ${b.first}`, text: `${b.first} will trust you more. ${a.first} won't forget it.` },
        { id: 'neutral', label: 'Stay out of it', text: 'Nobody’s enemy — but both of them trust you a little less.' },
        { id: 'mediate', label: 'Try to patch it up', text: 'If it works, they both owe you. If not, they’re both annoyed with you.' },
      ],
    },
    () => {
      const la = c.rels.get(a.id)?.aff ?? 0;
      const lb = c.rels.get(b.id)?.aff ?? 0;
      if (c.traits.A > 0.7 && world.rng.chance(0.4)) return 'mediate';
      if (Math.abs(la - lb) < 0.1) return 'neutral';
      return la > lb ? 'a' : 'b';
    },
    (choice) => {
      const ra = meet(world, a, c);
      const rb = meet(world, b, c);
      if (choice === 'a' || choice === 'b') {
        const [win, lose] = choice === 'a' ? [ra, rb] : [rb, ra];
        win.trust = nudge(win.trust, 0.15);
        win.aff = nudge(win.aff, 0.08);
        lose.aff = nudge(lose.aff, -0.2);
        lose.trust = nudge(lose.trust, -0.2);
      } else if (choice === 'neutral') {
        ra.trust = nudge(ra.trust, -0.05);
        rb.trust = nudge(rb.trust, -0.05);
      } else {
        const odds = 0.25 + 0.4 * c.traits.A + 0.3 * Math.min(Math.max(0, ra.trust), Math.max(0, rb.trust));
        if (world.rng.chance(odds)) {
          for (const [x, y] of [
            [a, b],
            [b, a],
          ] as const) {
            const r = meet(world, x, y);
            r.aff = nudge(r.aff, 0.3);
            r.trust = nudge(r.trust, 0.2);
          }
          ra.trust = nudge(ra.trust, 0.1);
          rb.trust = nudge(rb.trust, 0.1);
          ra.owed = Math.min(1, ra.owed + 0.3);
          rb.owed = Math.min(1, rb.owed + 0.3);
          if (isPlayer(world, c.id)) tell(world, `You got ${a.first} and ${b.first} talking again. They both owe you one.`, [a.id, b.id], true);
        } else {
          ra.aff = nudge(ra.aff, -0.05);
          rb.aff = nudge(rb.aff, -0.05);
          if (isPlayer(world, c.id)) tell(world, `Trying to patch things up between ${a.first} and ${b.first} didn’t work. Now they’re both a bit annoyed with you.`, [a.id, b.id], true);
        }
      }
    },
  );
}

// ---------------------------------------------------------------- rumors

function rumors(world: World) {
  for (const s of here(world)) {
    if (!world.rng.chance(isPlayer(world, s.id) ? 0.04 * SPOTLIGHT : 0.012)) continue;
    // Started by someone who doesn't like them, if anyone; otherwise by someone who barely knows them.
    const knowers = world.students.filter((o) => o.id !== s.id && !o.gone && o.rels.has(s.id));
    if (knowers.length < 4) continue;
    const source = knowers.reduce((worst, o) => ((o.rels.get(s.id)!.aff < worst.rels.get(s.id)!.aff ? o : worst)), knowers[0]);
    const rumor = world.rng.int(RUMORS.length);
    const act: Act = { kind: 'rumor', actor: s.id, target: -1, place: 'school', day: world.day, rumor };
    const first = [source, ...world.rng.shuffle(knowers.filter((o) => o !== source)).slice(0, 2)];
    const story = createStory(world, act, first.map((o) => ({ id: o.id, wt: 1 })));
    story.knowers.delete(s.id);
    applyAct(world, act, first.map((o) => ({ id: o.id, wt: 0.5 })), true);
    count(world, 'rumors');
    decide(
      world,
      s,
      {
        title: 'A rumor',
        text: `People are saying you ${RUMORS[rumor]}. It isn’t true.`,
        options: [
          { id: 'ignore', label: 'Ignore it', text: 'Don’t feed it. Rumors fade — eventually.' },
          { id: 'friends', label: 'Ask your friends to set the record straight', text: 'Works if you have friends people trust.' },
          { id: 'confront', label: `Find out who started it and confront them`, text: 'Could shut it down. Could make it bigger.' },
        ],
      },
      () => (world.rng.chance(0.6) ? 'ignore' : s.traits.E > 0.6 ? 'confront' : 'friends'),
      (choice) => {
        if (choice === 'friends') {
          const friends = closeFriendsOf(world, s);
          let fixed = 0;
          for (const f of friends)
            for (const [k] of story.knowers) {
              const listener = world.students[k];
              const trust = listener.rels.get(f)?.trust ?? 0;
              if (k === f || trust <= 0 || !world.rng.chance(0.5)) continue;
              const r = meet(world, listener, s);
              r.resp = nudge(r.resp, 0.05 * (0.5 + trust));
              r.trust = nudge(r.trust, 0.06 * (0.5 + trust));
              fixed++;
            }
          story.juice *= 0.6;
          if (isPlayer(world, s.id)) tell(world, friends.length ? `Your friends pushed back on the rumor with ${fixed} people.` : 'You don’t have close friends to vouch for you yet. The rumor keeps going.', friends, true);
        } else if (choice === 'confront') {
          const backsDown = world.rng.chance(clamp(0.4 + s.status - source.status + 0.2 * (1 - s.traits.N), 0.1, 0.9));
          const rs = meet(world, source, s);
          rs.aff = nudge(rs.aff, -0.15);
          if (backsDown) {
            story.juice *= 0.4;
            for (const [k] of story.knowers) {
              const r = meet(world, world.students[k], source);
              r.resp = nudge(r.resp, -0.04);
            }
            if (isPlayer(world, s.id)) tell(world, `It was ${source.first} ${source.last[0]}. You called them on it, and they backed down. The rumor’s dying.`, [source.id], true);
          } else {
            story.juice = Math.min(1, story.juice + 0.2);
            if (isPlayer(world, s.id)) tell(world, `It was ${source.first} ${source.last[0]}. They denied it loudly — and now more people are talking about it.`, [source.id], true);
          }
        }
      },
    );
  }
}

// ---------------------------------------------------------------- weekend invitations

/** Friday: someone who likes the player may invite them over on Saturday. Saying no stings a little. */
function weekendInvite(world: World) {
  const p = world.player;
  if (!p || p.weekendHost !== null) return;
  const me = world.students[p.id];
  const hosts = here(world).filter((s) => s.id !== p.id && (s.rels.get(p.id)?.aff ?? 0) > 0.35 && !isGrounded(world, s));
  const host = hosts.sort((a, b) => b.rels.get(p.id)!.aff - a.rels.get(p.id)!.aff).find((s) => world.rng.chance(0.25 + 0.4 * s.traits.E));
  if (!host) return;
  world.prompts.push({
    title: 'An invitation',
    text: `${name(world, host.id)} asks if you want to come over on Saturday.`,
    options: [
      { id: 'yes', label: 'Sure!', text: 'Time outside school is what makes friends close.' },
      { id: 'no', label: 'Can’t this weekend', text: 'They’ll be a bit disappointed.' },
    ],
    choose: (id) => {
      if (id === 'yes') p.weekendHost = host.id;
      else {
        const r = meet(world, host, me);
        r.aff = nudge(r.aff, -0.03);
      }
    },
  });
}

// ---------------------------------------------------------------- parents, favors, bullies

function stricterParents(world: World) {
  for (const s of here(world)) {
    if (s.parentBarBoost > 0) continue;
    const behind = s.grades < 0.25 + 0.2 * s.parentStrictness + 0.05;
    const p = (0.01 + (behind ? 0.05 : 0)) * (isPlayer(world, s.id) ? SPOTLIGHT / 2 : 1);
    if (!world.rng.chance(p)) continue;
    s.parentBarBoost = 0.1;
    s.strictUntil = world.day + 21;
    if (isPlayer(world, s.id)) tell(world, 'Your parents saw your progress report. For the next few weeks, they want your grades up — and they’ll be quicker to ground you.', [], true);
    count(world, 'stricterParents');
  }
}

function copyHomework(world: World) {
  for (const asker of here(world)) {
    if (asker.grades > 0.35 || !world.rng.chance(0.15)) continue;
    const helpers = closeFriendsOf(world, asker).filter((f) => world.students[f].grades > 0.5);
    if (!helpers.length) continue;
    const helper = world.students[world.rng.pick(helpers)];
    if (!isPlayer(world, helper.id) && world.player && !world.rng.chance(0.5)) continue;
    decide(
      world,
      helper,
      {
        title: 'Can I copy your homework?',
        text: `${name(world, asker.id)} is behind and asks to copy your homework.`,
        options: [
          { id: 'yes', label: 'Let them', text: 'They’ll owe you. If a teacher notices, you’re both in trouble.' },
          { id: 'study', label: 'Offer to help them study instead', text: 'Takes some patience. For a week, their studying goes further — if they actually study.' },
          { id: 'no', label: 'Say no', text: 'Safe. They’ll be a bit put out.' },
        ],
      },
      () => ((helper.rels.get(asker.id)?.aff ?? 0) > 0.5 && helper.traits.C < 0.6 ? 'yes' : helper.traits.A > 0.6 ? 'study' : 'no'),
      (choice) => {
        const r = meet(world, asker, helper);
        if (choice === 'yes') {
          r.aff = nudge(r.aff, 0.08);
          r.owed = Math.min(1, r.owed + 0.4);
          if (world.rng.chance(0.2)) {
            for (const s of [asker, helper]) {
              s.grades = clamp(s.grades - 0.04, 0, 1);
              s.stress += 0.2;
              if (world.rng.chance(0.3 + 0.5 * s.parentStrictness)) s.groundedUntil = world.day + 7;
            }
            const act: Act = { kind: 'cheat', actor: helper.id, target: asker.id, place: 'class', day: world.day };
            createStory(world, act, []);
            count(world, 'caughtCheating');
            if (isPlayer(world, helper.id)) tell(world, `A teacher noticed your homework and ${asker.first}'s were identical. You’re both in trouble.`, [asker.id], true);
          } else if (isPlayer(world, helper.id)) tell(world, `You let ${asker.first} copy your homework. They owe you one.`, [asker.id], true);
        } else if (choice === 'study') {
          r.aff = nudge(r.aff, 0.03);
          r.trust = nudge(r.trust, 0.05);
          asker.tutoredUntil = world.day + 7;
          helper.stress += 0.03;
          if (isPlayer(world, helper.id)) tell(world, `You offered to help ${asker.first} study. Slower than copying — but it actually helps, if they put the time in.`, [asker.id], true);
        } else {
          r.aff = nudge(r.aff, -0.04);
        }
      },
    );
  }
}

/** A status-hungry student who has already picked on someone decides to keep at it for a couple of weeks. */
function fixations(world: World) {
  for (const bully of here(world)) {
    if (bully.fixTarget !== null || isGrounded(world, bully)) continue;
    const dominance = bully.statusDrive * (1 - bully.traits.A);
    if (dominance < 0.3) continue;
    // Someone they've already hurt and don't like.
    const victims = [...bully.rels].filter(([v, r]) => r.aff < -0.1 && (world.students[v].rels.get(bully.id)?.hurt ?? 0) >= 1).map(([v]) => v);
    if (!victims.length) continue;
    const playerVictim = victims.find((v) => isPlayer(world, v));
    if (!world.rng.chance(playerVictim !== undefined ? 0.35 : 0.1)) continue;
    const target = world.students[playerVictim ?? world.rng.pick(victims)];
    bully.fixTarget = target.id;
    bully.fixUntil = world.day + 14;
    count(world, 'fixations');
    decide(
      world,
      target,
      {
        title: `${bully.first} has it in for you`,
        text: `${name(world, bully.id)} keeps picking on you, and it doesn’t look like it’s going to stop.`,
        options: [
          { id: 'down', label: 'Keep your head down', text: 'Don’t give them a reaction. It might blow over.' },
          { id: 'friends', label: 'Stick close to your friends', text: 'For two weeks, never be alone. Hard to pick on someone with backup.' },
          { id: 'teacher', label: 'Tell a teacher', text: 'It’s been happening, so a teacher will act. Some people may call you a snitch.' },
        ],
      },
      () => (target.traits.E > 0.5 && world.rng.chance(0.5) ? 'friends' : world.rng.chance(0.2) ? 'teacher' : 'down'),
      (choice) => {
        if (choice === 'friends') target.stickCloseUntil = world.day + 14;
        if (choice === 'teacher') {
          const severity = Math.max(2, target.rels.get(bully.id)?.hurt ?? 2);
          const act: Act = { kind: 'report', actor: target.id, target: bully.id, place: 'school', day: world.day, severity };
          const ws = [{ id: bully.id, wt: 1 }, ...closeFriendsOf(world, bully).map((id) => ({ id, wt: 0.5 }))];
          applyAct(world, act, ws);
          createStory(world, act, ws);
          bully.inTroubleUntil = world.day + 14;
          bully.fixTarget = null;
          target.counts.reports++;
          if (isPlayer(world, target.id)) tell(world, `You told a teacher about ${bully.first}. They’re being watched now — but ${bully.first}'s friends know it was you.`, [bully.id], true);
        }
      },
    );
  }
}

