/**
 * The playable game: runs the simulated school day by day and stops for the player's decisions —
 * where to sit, what to say, how to respond, how to spend the afternoon and evening — then shows a
 * weekly recap revealing what people really think.
 */
import { ACTIVITIES, LOOKS, LOOK_SHIRT_TOPICS, OPINION_TOPICS, type ActivityId, type Interest, type Look, type ShirtStyle } from '../sim/content';
import { openPlayerConversation, othersTakeTurns, playerAnswers, playerLeaves, playerPlays, type Convo, type ConvoOptions } from '../sim/conversation';
import {
  ELIGIBILITY_GRADE,
  PLAYER_LUNCH_CAP,
  afternoon,
  afterSchoolTime,
  bondOverRules,
  classPeriod,
  closeFriendsOf,
  endDay,
  finishLunch,
  deskNeighbors,
  deskOccupants,
  isAbsent,
  isGrounded,
  isSchoolDay,
  askToWalkWith,
  classmates,
  finishHallway,
  playerClassNeighbors,
  seatHallway,
  morning,
  playerSitsAlone,
  playerTriesTable,
  seatLunch,
  startDay,
  weekendDay,
  type LunchSeating,
  type PlayerTable,
} from '../sim/day';
import { PERIODS, createWorld } from '../sim/generate';
import type { Act, EveningChoice, PlayerSetup, Student, World } from '../sim/types';
import { ENERGY_MAX, NEED_WORDS, RESPONSE_LINES, addEnergy, adviceFor, buildDeck, cardCost, collection, energyPips, type CollectionEntry, cardToAct, dealHand, drawCard, lineFor, noteSaid, openerFor, resolveResponse, saidBefore, speak, outcomeNote, responseHand, type Card, type KnownAbout, type Need } from './cards';
import { PRINCIPLES, Tracker, direction, feelingWords } from './recap';
import { HALLWAY_ENTRANCE, afternoonPlace, afternoonSpots, hallwayGroupSpots } from './places';
import { CLASSROOM_COUNT, HAIR, LOOK_COLORS, SKIN, SchoolScene, classroomSeats, type KnownTone, type Place, type Spot, type TimeOfDay } from './scene';
import { setSound, sfx, soundOn } from './sfx';
import { LOOK_WORDS, colorLooks, lookLegend, lookWord } from './looks';
import { logo, showHowToPlay } from './title';
import { Coach } from './tutorial';
import { choose, fill, h } from './ui';
import { dayLabel, describeStranger, fullName, gradeLetter, knows, nameFor, playerOf, shirtName, tidy } from './view';

const WEEKS = 16;
const LUNCH_ROUNDS = 4;

interface Line {
  speaker: string;
  text: string;
  note?: string | null;
  tells?: string;
  mine?: boolean;
  system?: boolean;
}

export class Game {
  world: World;
  tracker: Tracker;
  scene: SchoolScene;
  private hud = h('div', { class: 'hud' });
  private feed = h('div', { class: 'feed' });
  private panel = h('div', { class: 'panel' });
  private modal = h('div', { class: 'modal hidden' });
  private notebook = h('div', { class: 'notebook hidden' });
  private tooltip = h('div', { class: 'tooltip hidden' });
  private phase = '';
  /** Running read of each person, from the reactions the player has seen (−1..1 per sighting). */
  /** People who've shown how they feel about the player (see regard). */
  private revealed = new Set<number>();
  /** How much each person's ♥ and ★ changed on the last turn, to show next to their meters. */
  private regardDelta = new Map<number, { like: number; respect: number }>();
  /** What the player has heard each person say they love or are into. */
  private known = new Map<number, KnownAbout>();
  /** The line on the card the player just played, so what they say matches what the card showed. */
  private playerLine: string | null = null;
  private lastSeating: LunchSeating | null = null;

  constructor(private root: HTMLElement, scene: SchoolScene, setup: PlayerSetup, private coach: Coach) {
    this.world = createWorld({ students: 200, weeks: WEEKS, seed: Math.floor(Math.random() * 1e9), follow: null, player: setup });
    this.tracker = new Tracker(this.world);
    this.scene = scene;
    scene.reset();
    scene.setAttract(false);
    this.scene.onPersonHover = (id) => this.showPersonTooltip(id);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.togglePause();
    });
    fill(
      root,
      this.hud,
      h('div', { class: 'feed-wrap' }, h('div', { class: 'feed-title' }, 'What’s happening'), this.feed),
      this.panel,
      this.notebook,
      this.modal,
      this.tooltip,
    );
    window.addEventListener('pointermove', (e) => {
      this.tooltip.style.left = `${e.clientX + 14}px`;
      this.tooltip.style.top = `${e.clientY + 14}px`;
    });
  }

  async run() {
    while (this.world.day < WEEKS * 7) await this.day();
    await this.finalReport();
  }

  // ------------------------------------------------------------------ the day

  private async day() {
    const w = this.world;
    // A new day: clear yesterday's last panel so it doesn't linger behind today's events.
    fill(this.panel);
    if (w.day === 0) await this.signup();
    startDay(w);
    if (w.day === 0) this.announceTryouts();
    this.flushFeed('News');
    await this.handlePrompts();
    if (isAbsent(w, playerOf(w))) {
      // Home sick: the school day goes on without you.
      this.setPhase('Home sick');
      this.showEmptyCampus('morning');
      if (isSchoolDay(w)) {
        morning(w);
        finishLunch(w, seatLunch(w));
        afternoon(w);
      } else weekendDay(w);
      fill(this.panel, h('div', { class: 'panel-title' }, 'Home sick'), h('p', null, 'You spend the day in bed. Life at school goes on without you.'), h('button', { class: 'big' }, 'Next day'));
      await this.waitForButton();
      const sunday = w.day % 7 === 6;
      endDay(w);
      this.flushFeed('While you were out');
      if (sunday) {
        this.setPhase('Weekly recap');
        await this.recap();
      }
      return;
    }
    this.showEmptyCampus('morning');
    await this.getDressed();
    if (isSchoolDay(w)) {
      this.setPhase('Before school');
      await this.beforeSchool();
      this.setPhase('On the way to class');
      await this.walkToClass();
      await this.attendClasses([0, 1, 2], w.day % 3);
      this.flushFeed('Morning classes');
      await this.lunch();
      await this.attendClasses([3, 4, 5], 3 + (w.day % 3));
      this.setPhase('After school');
      this.showEmptyCampus('afternoon');
      await this.afterSchoolChoice();
      await this.runAfterSchool();
    } else {
      this.setPhase('Weekend');
      this.showEmptyCampus('afternoon');
      await this.weekendChoice();
      weekendDay(w);
      this.flushFeed('This weekend');
    }
    this.setPhase('Evening');
    this.showEmptyCampus('evening');
    await this.eveningChoice();
    const sunday = w.day % 7 === 6;
    const firstDay = w.day === 0;
    endDay(w);
    this.flushFeed('Overnight');
    if (firstDay) this.coach.tip('endOfDay');
    if (sunday) {
      this.setPhase('Weekly recap');
      await this.recap();
    }
  }

  /** The whole campus, nobody around (arriving, at home, evening). */
  private showEmptyCampus(time: TimeOfDay) {
    this.scene.setTimeOfDay(time);
    this.scene.setSpots(this.world.students, new Map(), this.world.player!.id);
    this.scene.flyTo('campus');
  }

  /** Before school: the hallway and courtyard, everyone in their little groups. */
  /**
   * Before school: the hallway and courtyard, everyone in their little groups. You pick which group to
   * walk up to — they might not make room — and if you get in, it's a short chat before the bell.
   */
  private async beforeSchool() {
    const w = this.world;
    const me = playerOf(w);
    this.scene.setTimeOfDay('morning');
    // Close in on your end of the hallway, so you can see who's standing with whom (drag to look around).
    this.scene.flyClose(HALLWAY_ENTRANCE.clone().setX(HALLWAY_ENTRANCE.x - 14));
    const seating = seatHallway(w);
    let attempts = 0;
    for (;;) {
      const spots = hallwayGroupSpots(seating.tables);
      if (!seating.at.has(me.id)) spots.set(me.id, { pos: HALLWAY_ENTRANCE.clone(), face: HALLWAY_ENTRANCE.clone().setX(HALLWAY_ENTRANCE.x - 5) });
      this.scene.setSpots(w.students, spots, me.id);
      const choice = await this.pickGroup(seating, attempts);
      if (choice === 'seats') {
        await this.chooseSeats();
        this.scene.flyClose(HALLWAY_ENTRANCE.clone().setX(HALLWAY_ENTRANCE.x - 14));
        continue;
      }
      if (choice === null) {
        playerSitsAlone(w, seating);
        break;
      }
      if (playerTriesTable(w, seating, choice, 'hallway')) break;
      attempts++;
      this.flushFeed('Before school');
      this.say(seating.tables[choice].length === 1 ? 'They give you a short answer and look back at their phone.' : 'They don’t really make room for you.');
      if (attempts >= 3) {
        playerSitsAlone(w, seating);
        break;
      }
    }
    this.scene.setSpots(w.students, hallwayGroupSpots(seating.tables), me.id);
    const group = finishHallway(w, seating, true);
    this.flushFeed('Before school');
    if (group && group.members.length >= 2)
      await this.conversation(group, { title: 'Before school', rounds: 2, place: 'hallway', end: 'The bell rings.', leave: 'Head to class', opts: { hangout: true } });
    else {
      fill(this.panel, h('div', { class: 'panel-title' }, 'Before school'), h('p', null, 'You hang back on your own until the bell.'), h('button', { class: 'big' }, 'Head to class'));
      await this.waitForButton();
    }
  }

  /**
   * Before school: walk up to someone. Click anyone on the map, or pick from a short list: people you
   * know first, then a few people on their own, pairs, and groups.
   */
  private pickGroup(seating: LunchSeating, attempts: number): Promise<number | 'seats' | null> {
    this.coach.tip('hallway');
    const w = this.world;
    const pid = w.player!.id;
    const all = seating.tables.map((t, i) => ({ i, t, known: t.filter((id) => knows(w, id)).length })).filter((x) => x.t.length > 0);
    const byDistance = (a: { i: number }, b: { i: number }) => jitterOrder(a.i) - jitterOrder(b.i);
    const known = all.filter((x) => x.known > 0).sort((a, b) => b.known - a.known).slice(0, 4);
    const rest = all.filter((x) => x.known === 0).sort(byDistance);
    const shown = [
      ...known,
      ...rest.filter((x) => x.t.length === 1).slice(0, 3),
      ...rest.filter((x) => x.t.length === 2).slice(0, 2),
      ...rest.filter((x) => x.t.length >= 3).slice(0, 3),
    ];
    const describe = (t: number[]) =>
      t.length === 1 ? `On their own: ${knows(w, t[0]) ? nameFor(w, t[0]) : describeStranger(w.students[t[0]])}` : `${t.length === 2 ? 'Two' : `Group of ${t.length}`}: ${crowdWords(w, t)}`;
    const alone = all.filter((x) => x.t.length === 1).length;
    return new Promise((resolve) => {
      const done = (v: number | 'seats' | null) => {
        this.scene.onPersonClick = null;
        resolve(v);
      };
      // Click anyone on the map to walk up to them (and whoever they're standing with).
      this.scene.onPersonClick = (id) => {
        const ti = seating.at.get(id);
        if (id !== pid && ti !== undefined) done(ti);
      };
      fill(
        this.panel,
        h('div', { class: 'panel-title' }, attempts ? 'Try someone else?' : 'Before school — who do you walk up to?'),
        h(
          'p',
          { class: 'muted small' },
          `You’re just inside the front doors. ${alone ? `${alone} ${alone === 1 ? 'person is' : 'people are'} standing on their own; the rest are in pairs and groups.` : ''} People you’ve met have their name over their head (green if they like you, red if they don’t). Click anyone on the map to walk over, or pick from the list. People on their own are usually glad of the company; walking into a group of strangers is a gamble.`,
        ),
        lookLegend(),
        h('div', { class: 'row wrap' }, ...shown.map((x) => h('button', { class: 'chip', onclick: () => done(x.i) }, ...colorLooks(tidy(describe(x.t)))))),
        h('div', { class: 'row' }, h('button', { onclick: () => done(null) }, 'Stand by your locker'), h('button', { class: 'menu-btn seats-btn', onclick: () => done('seats') }, 'Change class seats')),
      );
    });
  }

  private async classMoment(period: number) {
    this.coach.tip('class');
    const w = this.world;
    const me = playerOf(w);
    const neighbors = playerClassNeighbors(w, period);
    if (!neighbors.length) return;
    this.scene.flyToClassroom(me.sections[period] % CLASSROOM_COUNT);
    const occupants = deskOccupants(w, period, me.sections[period]);
    const seats = classroomSeats(me.sections[period] % CLASSROOM_COUNT);
    const spots = new Map<number, Spot>();
    for (const [desk, id] of occupants) if (seats[desk]) spots.set(id, seats[desk]);
    this.scene.setSpots(w.students, spots, me.id);
    const choice = await this.choicePanel<string>(`${ordinal(period + 1)} period · ${SUBJECTS[period]}`, [
      ...neighbors.map((id) => ({ id: String(id), title: `Whisper to ${nameFor(w, id)}`, text: knows(w, id) ? this.readOf(id).replace(/^· /, '') : 'Sitting right next to you.', enabled: true })),
      { id: 'focus', title: 'Keep your head down', text: 'Pay attention. Nothing social happens.', enabled: true },
    ]);
    if (choice === 'focus') return;
    const them = Number(choice);
    await this.conversation(
      { members: [me.id, them], onlookers: neighbors.filter((n) => n !== them) },
      { title: `Whispering in ${SUBJECTS[period]}`, rounds: 2, place: 'class', end: 'The teacher looks your way.', leave: 'Back to class', opts: { teacher: true } },
    );
    if (Math.random() < 0.2) {
      me.stress += 0.05;
      this.say('The teacher told you two to quiet down.');
    }
  }

  /**
   * Walking to 1st period: pick someone from that class to walk with — people you know first, plus a
   * couple of faces you'd recognize — or walk alone. If they say yes, it's a quick two-turn chat.
   */
  private async walkToClass() {
    this.coach.tip('hud');
    this.coach.tip('walk');
    const w = this.world;
    const me = playerOf(w);
    const everyone = classmates(w, 0);
    const known = everyone.filter((id) => me.rels.has(id)).sort((a, b) => (me.rels.get(b)?.fam ?? 0) - (me.rels.get(a)?.fam ?? 0)).slice(0, 5);
    const strangers = everyone.filter((id) => !me.rels.has(id)).slice(0, 2);
    const choice = await this.choicePanel<string>(`On the way to 1st period (${SUBJECTS[0]})`, [
      ...[...known, ...strangers].map((id) => ({
        id: String(id),
        title: knows(w, id) ? `Walk with ${nameFor(w, id)}` : `Walk with ${describeStranger(w.students[id])}`,
        text: knows(w, id) ? this.readOf(id).replace(/^· /, '') : 'Someone from your class you haven’t met.',
        enabled: true,
      })),
      { id: 'alone', title: 'Walk alone', text: 'Head straight to class.', enabled: true },
    ]);
    if (choice === 'alone') return;
    const them = Number(choice);
    if (!askToWalkWith(w, them)) {
      this.say(tidy(`${nameFor(w, them, true)} is already walking with someone else.`));
      return;
    }
    // A few classmates walking the same way see you together.
    const passing = everyone.filter((id) => id !== them).slice(0, 4);
    await this.conversation(
      { members: [me.id, them], onlookers: passing },
      { title: `Walking to ${SUBJECTS[0]}`, rounds: 2, place: 'hallway', end: 'You get to class.', leave: 'Take your seat' },
    );
  }

  /**
   * Where you sit in each class. Seats stay put day to day; the people next to you are who you'll
   * end up talking to. On the first day you pick them all; after that you can move any morning.
   */
  /** Class periods the player has already picked a seat for (the first time in each class, they choose). */
  private seated = new Set<number>();

  /**
   * A run of class periods, one at a time. The first time you walk into a class, you pick where to sit —
   * and by then you may know people from earlier classes who you'd like to sit near. One period a day
   * (morning and afternoon) has a moment where you can whisper to whoever's next to you.
   */
  private async attendClasses(periods: number[], momentPeriod: number) {
    for (const p of periods) {
      this.setPhase(`${ordinal(p + 1)} period · ${SUBJECTS[p]}`);
      if (!this.seated.has(p)) {
        this.coach.tip('seats');
        await this.pickDesk(p, true);
        this.seated.add(p);
      }
      if (p === momentPeriod) await this.classMoment(p);
      classPeriod(this.world, p);
    }
    this.scene.setDeskPicking(null);
  }

  /** Who sits at the desks next to `desk` in one class (not counting the player). */
  private neighborsAt(period: number, desk: number): number[] {
    const me = playerOf(this.world);
    const occupants = deskOccupants(this.world, period, me.sections[period]);
    return deskNeighbors(desk)
      .map((d) => occupants.get(d))
      .filter((id): id is number => id !== undefined && id !== me.id);
  }

  private whoList(ids: number[]): string {
    return ids.length ? tidy(listWords(ids.map((id) => nameFor(this.world, id)))) : 'nobody';
  }

  private async chooseSeats() {
    const w = this.world;
    const me = playerOf(w);
    const room = (p: number) => me.sections[p] % CLASSROOM_COUNT;
    this.setPhase('Changing seats');
    for (;;) {
      const period = await new Promise<number | null>((resolve) => {
        this.scene.setDeskPicking(null);
        this.scene.flyTo('hallway');
        fill(
          this.panel,
          h('div', { class: 'panel-title' }, 'Change where you sit'),
          h('p', { class: 'muted small' }, 'Who sits near you is who you’ll end up talking to. You keep your seat until you change it.'),
          h(
            'div',
            { class: 'option-list' },
            ...Array.from({ length: PERIODS }, (_, p) =>
              h('button', { class: 'option', onclick: () => resolve(p) }, h('b', null, `${ordinal(p + 1)} period · ${SUBJECTS[p]}`), h('span', null, `Room ${room(p) + 1} — next to ${this.whoList(this.neighborsAt(p, me.seats[p]))}`)),
            ),
          ),
          h('button', { class: 'big', onclick: () => resolve(null) }, 'Done'),
        );
      });
      if (period === null) break;
      await this.pickDesk(period, false);
    }
    this.scene.setDeskPicking(null);
  }

  /**
   * Pick a desk in one class. `firstVisit`: it's your first time in this class, so the panel points out
   * anyone you've already met (they have name tags in the room).
   */
  private pickDesk(period: number, firstVisit: boolean): Promise<void> {
    const w = this.world;
    const me = playerOf(w);
    const r = me.sections[period] % CLASSROOM_COUNT;
    const neighborsAt = (p: number, desk: number) => this.neighborsAt(p, desk);
    const who = (ids: number[]) => this.whoList(ids);
    const met = [...deskOccupants(w, period, me.sections[period]).values()].filter((id) => id !== me.id && knows(w, id));
    const occupants = deskOccupants(w, period, me.sections[period]);
    const spots = new Map<number, Spot>();
    const seats = classroomSeats(r);
    for (const [desk, id] of occupants) if (seats[desk]) spots.set(id, seats[desk]);
    this.scene.setTimeOfDay('morning');
    this.scene.setSpots(w.students, spots, me.id);
    this.scene.flyToClassroom(r);
    const open = new Set([...seats.keys()].filter((d) => !occupants.has(d) || occupants.get(d) === me.id));
    this.scene.setDeskPicking(r, open, me.seats[period]);
    return new Promise((resolve) => {
      const render = (desk: number) =>
        fill(
          this.panel,
          h('div', { class: 'panel-title' }, `${ordinal(period + 1)} period · ${SUBJECTS[period]} · Room ${r + 1}${firstVisit ? ' — where do you sit?' : ''}`),
          firstVisit
            ? h(
                'p',
                { class: 'small' },
                met.length
                  ? tidy(`You know ${listWords(met.slice(0, 4).map((id) => nameFor(w, id)))}${met.length > 4 ? ` and ${met.length - 4} more` : ''} in here (look for name tags). Sit near them to keep getting to know them — or next to someone new.`)
                  : 'You don’t know anyone in here yet. Whoever you sit next to is who you’ll get to know in this class.',
              )
            : null,
          h('p', { class: 'muted small' }, 'Open desks glow green. Hover one to see who you’d be next to; click to sit there. You keep this seat until you change it.'),
          h('p', null, ...colorLooks(desk === me.seats[period] ? `Your seat now: next to ${who(neighborsAt(period, desk))}.` : `This desk: next to ${who(neighborsAt(period, desk))}.`)),
          h('button', { class: 'big', onclick: () => resolve() }, firstVisit ? 'Sit here' : 'Back to my classes'),
        );
      this.scene.onDeskHover = (desk) => render(desk);
      this.scene.onDeskClick = (desk) => {
        open.add(me.seats[period]); // your old desk is free now
        me.seats[period] = desk;
        spots.set(me.id, seats[desk]);
        this.scene.setSpots(w.students, spots, me.id);
        this.scene.setDeskPicking(r, open, desk);
        sfx.click();
        render(desk);
      };
      render(me.seats[period]);
    });
  }

  /** After school: run it, then show the player where they ended up and who was there. */
  private async runAfterSchool() {
    if (this.world.player!.afterSchool === 'activity') this.coach.tip('practice');
    const w = this.world;
    const p = w.player!;
    const hungOutWith = [...p.hangoutWith];
    const gymBefore = new Map(w.students.map((s) => [s.id, s.counts.behindGym]));
    const caughtBefore = w.students[p.id].counts.caught;
    afterSchoolTime(w);
    const behindGym = new Set(w.students.filter((s) => s.counts.behindGym > (gymBefore.get(s.id) ?? 0)).map((s) => s.id));
    this.flushFeed('In class and after school');
    const place = afternoonPlace(w);
    this.scene.setTimeOfDay('afternoon');
    this.scene.setSpots(w.students, afternoonSpots(w, behindGym, hungOutWith), p.id);
    this.scene.flyTo(place);
    const where: Record<Place, string> = {
      campus: 'You went home.',
      field: 'Soccer practice.',
      bandRoom: 'Band practice.',
      theater: 'Drama rehearsal.',
      robotics: 'Robotics club.',
      behindGym: 'Behind the gym, with the crowd that skips last period.',
      courtyard: hungOutWith.length ? tidy(`Hanging out with ${listWords(hungOutWith.map((id) => nameFor(w, id)))}.`) : 'Hanging out.',
      hallway: '',
      cafeteria: '',
      gym: '',
      library: '',
    };
    const me = w.students[p.id];
    const pa = w.playerAfternoon;
    if (me.counts.caught > caughtBefore) this.say('A teacher caught you skipping behind the gym.');
    if (pa && pa.groups.some((g) => g.length)) {
      const talk: Talk = {
        title: pa.place === 'after school' ? 'Hanging out' : pa.place === 'behind the gym' ? 'Behind the gym' : `At ${pa.place}`,
        rounds: pa.rounds,
        place: pa.place,
        end: pa.place === 'after school' ? 'It’s getting late. Time to head home.' : pa.place === 'behind the gym' ? 'Everyone drifts off.' : 'Practice wraps up.',
        leave: 'Head home',
        opts: { hangout: true, private: pa.private },
      };
      // Hanging out: the friends who came. At practice or behind the gym: you pick who to hang with.
      const group = pa.groups.length === 1 && pa.private ? pa.groups[0] : await this.pickAfternoonGroup(pa.groups, where[place], pa.place === 'behind the gym');
      if (group) {
        const everyone = pa.groups.flat();
        await this.conversation({ members: [me.id, ...group], onlookers: pa.private ? [] : everyone.filter((id) => !group.includes(id)).slice(0, 6) }, talk);
        if (pa.place === 'behind the gym') bondOverRules(w, [me.id, ...group]);
        return;
      }
    } else if (p.afterSchool === 'hangout') this.say('Nobody you know was free, so you went home.');
    fill(this.panel, h('div', { class: 'panel-title' }, 'After school'), h('p', null, where[place]), h('button', { class: 'big' }, 'Head home'));
    await this.waitForButton();
  }

  /**
   * At practice or behind the gym: people are in little groups. Pick one — from the list, or by clicking
   * someone on the map — or keep to yourself.
   */
  private pickAfternoonGroup(groups: number[][], where: string, gym: boolean): Promise<number[] | null> {
    const w = this.world;
    const pid = w.player!.id;
    const shown = groups
      .map((g) => ({ g, known: g.filter((id) => knows(w, id)).length }))
      .filter((x) => x.g.length)
      .sort((a, b) => b.known - a.known)
      .slice(0, 6);
    return new Promise((resolve) => {
      const done = (g: number[] | null) => {
        this.scene.onPersonClick = null;
        resolve(g);
      };
      this.scene.onPersonClick = (id) => {
        const g = groups.find((x) => x.includes(id));
        if (id !== pid && g) done(g);
      };
      fill(
        this.panel,
        h('div', { class: 'panel-title' }, `After school · ${where}`),
        h('p', { class: 'muted small' }, gym ? 'Who do you hang out with back here? Click someone on the map, or pick a group.' : 'Between drills there’s time to talk. Who do you hang out with? Click someone on the map, or pick a group.'),
        lookLegend(),
        h('div', { class: 'row wrap' }, ...shown.map((x) => h('button', { class: 'chip', onclick: () => done(x.g) }, ...colorLooks(tidy(crowdWords(w, x.g)))))),
        h('div', { class: 'row' }, h('button', { onclick: () => done(null) }, gym ? 'Keep to yourself' : 'Just focus on practice')),
      );
    });
  }

  private setPhase(phase: string) {
    this.phase = phase;
    this.renderHud();
    this.markKnownPeople();
  }

  /** Name tags and rings in the 3D view for everyone the player has met, colored by how they feel about you. */
  private markKnownPeople() {
    const w = this.world;
    const me = playerOf(w);
    const marks = new Map<number, { name: string; tone: KnownTone }>();
    for (const id of me.rels.keys()) {
      const g = this.regard(id);
      marks.set(id, { name: nameFor(w, id), tone: !g ? 'neutral' : g.like >= 15 ? 'friend' : g.like <= -15 ? 'cool' : 'neutral' });
    }
    this.scene.setKnown(marks);
  }

  private renderHud() {
    const w = this.world;
    const me = playerOf(w);
    const activity = me.activity ? ACTIVITIES.find((a) => a.id === me.activity)!.name : 'no activity';
    const bar = (label: string, value: number, cls: string) => h('div', { class: 'bar' }, h('span', null, label), h('div', { class: 'track' }, h('div', { class: `fill ${cls}`, style: `width:${Math.round(100 * Math.max(0, Math.min(1, value)))}%` })));
    fill(
      this.hud,
      h('div', { class: 'hud-name' }, fullName(me)),
      h('div', { class: 'hud-day' }, `${dayLabel(w)} · ${this.phase}`),
      bar(`Energy ⚡ ${energyPips(me)}`, me.energy, 'energy'),
      bar('Stress', Math.min(1, me.stress), 'stress'),
      h('div', { class: 'hud-row' }, h('span', null, `Grades: ${gradeLetter(me.grades)}`), h('span', null, activity), isGrounded(w, me) ? h('span', { class: 'warn' }, 'Grounded') : null),
      h('div', { class: 'row' }, h('button', { class: 'small-btn', onclick: () => this.toggleNotebook() }, 'Notebook'), h('button', { class: 'small-btn', onclick: () => this.togglePause() }, 'Menu')),
    );
  }

  /** Move new events into the feed. */
  private flushFeed(heading: string) {
    const t = this.tracker;
    const items = t.unread.splice(0);
    const chats = [...t.chattedWith].map((id) => nameFor(this.world, id));
    t.chattedWith.clear();
    if (!items.length && !chats.length) return;
    const block = h('div', { class: 'feed-block' }, h('div', { class: 'feed-head' }, `${dayLabel(this.world)} — ${heading}`));
    if (chats.length) block.append(h('div', { class: 'feed-item muted' }, ...colorLooks(tidy(`You chatted with ${listWords(chats.slice(0, 5))}${chats.length > 5 ? ' and others' : ''}.`))));
    for (const e of items) block.append(h('div', { class: 'feed-item' }, ...colorLooks(e.text)));
    this.feed.prepend(block);
    this.renderHud();
  }

  private say(text: string) {
    this.feed.prepend(h('div', { class: 'feed-block' }, h('div', { class: 'feed-item' }, text)));
  }

  /** Decisions the storyteller has set up for the player. */
  private async handlePrompts() {
    const w = this.world;
    while (w.prompts.length) {
      const prompt = w.prompts.shift()!;
      sfx.chime();
      this.coach.tip('event');
      const choice = await choose<string>((resolve) =>
        this.showModal(
          h('div', { class: 'event-tag' }, 'Something happened'),
          h('h2', null, prompt.title),
          h('p', null, tidy(prompt.text)),
          h('div', { class: 'option-list' }, ...prompt.options.map((o) => h('button', { class: 'option', onclick: () => resolve(o.id) }, h('b', null, o.label), h('span', null, o.text)))),
        ),
      );
      this.hideModal();
      prompt.choose(choice);
      this.flushFeed(prompt.title);
    }
  }

  /** Every morning: what to wear. A look says which crowd you're with; a shirt starts conversations with fans. */
  private async getDressed() {
    this.coach.tip('dressing');
    const w = this.world;
    const me = playerOf(w);
    this.setPhase('Getting dressed');
    let look = me.look;
    let shirt = me.shirt;
    let style = me.shirtStyle;
    /** A fan shirt has to go with the look; if the look changes, switch to one that does. */
    const fitShirt = () => {
      const fits = LOOK_SHIRT_TOPICS[look];
      shirt = style === 'fan' ? (shirt !== null && fits.includes(shirt) ? shirt : fits[0]) : null;
    };
    fitShirt();
    await new Promise<void>((resolve) => {
      const render = () => {
        const share = (l: Look) => Math.round(100 * (w.lookShare[l] ?? 0));
        fill(
          this.panel,
          h('div', { class: 'panel-title' }, 'Getting dressed'),
          h('p', { class: 'muted small' }, 'Dressing like a crowd tells them you’re one of them — but a look everyone wears doesn’t say much.'),
          h(
            'div',
            { class: 'row wrap' },
            ...LOOKS.map((l) => h('button', { class: l === look ? 'chip on' : 'chip', title: `${share(l)}% of your grade dresses this way`, onclick: () => ((look = l), fitShirt(), render()) }, lookWord(l), ' ', h('span', { class: 'muted small' }, `${share(l)}%`))),
          ),
          h('p', { class: 'muted small' }, 'Your shirt sets how approachable you look — and to whom.'),
          h(
            'div',
            { class: 'shirt-options' },
            ...SHIRT_CHOICES.map((c) =>
              h(
                'button',
                { class: style === c.style ? 'shirt-option on' : 'shirt-option', onclick: () => ((style = c.style), fitShirt(), render()) },
                h('b', null, c.title),
                h(
                  'span',
                  { class: 'shirt-approach', title: 'How many people come up to talk to you' },
                  h('span', { class: 'muted' }, 'Who comes up to you: '),
                  h('span', { class: 'approach-dots' }, ...Array.from({ length: 4 }, (_, i) => h('span', { class: i < c.approach ? 'dot on' : 'dot' }))),
                  h('span', { class: 'approach-text' }, c.approachText),
                ),
                h('span', { class: 'shirt-up' }, `+ ${c.up}`),
                h('span', { class: 'shirt-down' }, `− ${c.down}`),
              ),
            ),
          ),
          style === 'fan'
            ? h('div', { class: 'row wrap' }, h('span', { class: 'muted small' }, `About (what goes with ${LOOK_WORDS[look]}): `), ...LOOK_SHIRT_TOPICS[look].map((t) => h('button', { class: shirt === t ? 'chip on' : 'chip', onclick: () => ((shirt = t), render()) }, shirtName(t))))
            : null,
          h('button', { class: 'big', onclick: () => resolve() }, isSchoolDay(w) ? 'Head to school' : 'Done'),
        );
      };
      render();
    });
    me.look = look;
    me.ownLook = look;
    me.shirtStyle = style;
    me.shirt = style === 'fan' ? shirt : null;
    this.scene.refreshFigure(me);
  }

  // ------------------------------------------------------------------ week 1: sign-ups

  private async signup() {
    this.coach.tip('signup');
    const me = playerOf(this.world);
    const soccer: ActivityId = me.gender === 'boy' ? 'soccer-boys' : 'soccer-girls';
    const options: [ActivityId | null, string, string][] = [
      [soccer, 'Soccer', 'Tryouts. Fitness: more energy, less stress, steadier under pressure. Games most Fridays. Four practices a week.'],
      ['band', 'Band', 'No tryouts. A big group, plays at games. Some evening practice at home (calming, but less homework time).'],
      ['drama', 'Drama', 'Auditions. Builds poise: easier to walk up to people, steadier when challenged. Rehearsal crunch before the fall play.'],
      ['robotics', 'Robotics', 'No tryouts. Tech respect, a tight group. Build-season crunch before the competition.'],
      [null, 'Nothing for now', 'Free afternoons: hang out, go home, rest. Less to show for it.'],
    ];
    const choice = await choose<ActivityId | null>((resolve) =>
      this.showModal(
        h('h2', null, 'Activity sign-ups'),
        h('p', null, 'It’s the first day. Every club and team is signing people up. You can only really do one.'),
        h('div', { class: 'option-list' }, ...options.map(([id, title, text]) => h('button', { class: 'option', onclick: () => resolve(id) }, h('b', null, title), h('span', null, text)))),
      ),
    );
    this.world.player!.signup = choice;
    this.hideModal();
  }

  private announceTryouts() {
    const me = playerOf(this.world);
    const signup = this.world.player!.signup;
    if (!signup) return;
    const def = ACTIVITIES.find((a) => a.id === signup)!;
    if (me.activity === signup) this.say(def.tryout ? `You made it into ${def.name}!` : `You joined ${def.name}.`);
    else this.say(`You didn’t make the cut for ${def.name} this time.`);
  }

  // ------------------------------------------------------------------ lunch

  private async lunch() {
    this.coach.tip('lunch');
    this.coach.tip('feed');
    const w = this.world;
    const pid = w.player!.id;
    this.setPhase('Lunch');
    const seating = seatLunch(w);
    this.lastSeating = seating;
    this.scene.setTimeOfDay('noon');
    this.scene.flyTo('cafeteria');
    this.scene.setSeating(w.students, seating.tables, pid);
    this.scene.placePlayerAtDoor(pid, playerOf(w));
    let attempts = 0;
    for (;;) {
      const ti = await this.pickTable(seating, attempts);
      if (ti === null) {
        playerSitsAlone(w, seating);
        break;
      }
      if (playerTriesTable(w, seating, ti)) break;
      attempts++;
      const excluded = this.tracker.unread.some((e) => e.text.includes("couldn't sit"));
      this.flushFeed('Lunch');
      this.say(excluded ? 'Ouch. Someone said the seat was saved.' : 'Nobody really makes room for you.');
      if (attempts >= 2) {
        this.say('You end up sitting at an empty table.');
        playerSitsAlone(w, seating);
        break;
      }
    }
    this.scene.setPicking(false);
    this.scene.setSeating(w.students, seating.tables, pid);
    this.scene.markTable(seating.at.get(pid) ?? null);
    const table = finishLunch(w, seating, true);
    this.flushFeed('Lunch');
    if (!table || table.members.length < 2) {
      fill(this.panel, h('div', { class: 'panel-title' }, 'Lunch'), h('p', null, 'You eat lunch by yourself.'), h('button', { class: 'big' }, 'Continue'));
      await this.waitForButton();
      return;
    }
    await this.conversation(table);
  }

  private pickTable(seating: LunchSeating, attempts: number): Promise<number | null> {
    const w = this.world;
    const me = playerOf(w);
    const usual = me.lastTable.lunch;
    return new Promise((resolve) => {
      let selected = -1;
      // Tables with people at them, those where you know the most people first.
      const listed = seating.tables
        .map((t, i) => ({ i, t, known: t.filter((id) => knows(w, id)).length }))
        .filter((x) => x.t.length > 0 && x.t.length < PLAYER_LUNCH_CAP)
        .sort((a, b) => b.known - a.known || b.t.length - a.t.length)
        .slice(0, 8);
      const label = (t: number[]) => crowdWords(w, t);
      const render = (ti: number) => {
        const people = ti >= 0 ? seating.tables[ti] : [];
        fill(
          this.panel,
          h('div', { class: 'panel-title' }, attempts ? 'Try another table?' : 'Lunch — where do you sit?'),
          h('p', { class: 'muted' }, 'Hover a table to see who’s there. Click to walk over. Strangers might not make room. People you’ve met have name tags: green if they like you, red if they don’t.'),
          ti >= 0
            ? h(
                'div',
                { class: 'table-info' },
                people.length ? h('div', null, ...people.map((id) => this.personLine(id))) : h('div', { class: 'muted' }, 'Empty table.'),
                people.length >= PLAYER_LUNCH_CAP
                  ? h('div', { class: 'muted' }, 'No room at this table.')
                  : h('button', { class: 'big', onclick: () => resolve(ti) }, people.length ? (people.length >= PLAYER_LUNCH_CAP - 1 ? 'Pull up a chair' : 'Walk over and sit down') : 'Sit here'),
              )
            : null,
          lookLegend(),
          h('div', { class: 'row wrap' }, ...listed.map((x) => h('button', { class: x.i === ti ? 'chip on' : 'chip', onclick: () => ((selected = x.i), this.scene.markTable(x.i), render(x.i)) }, ...colorLooks(label(x.t))))),
          h(
            'div',
            { class: 'row' },
            usual !== undefined && seating.tables[usual]?.length ? h('button', { onclick: () => resolve(usual) }, 'Go to your usual table') : null,
            h('button', { onclick: () => resolve(null) }, 'Sit by yourself'),
          ),
        );
      };
      this.scene.onTableHover = (ti) => {
        if (ti >= 0) {
          selected = ti;
          render(ti);
        }
      };
      this.scene.onTableClick = (ti) => {
        if (ti === selected) resolve(ti);
      };
      this.scene.setPicking(true);
      render(-1);
    });
  }

  /** One line about a person: their name and your read, or what they look like. */
  private personLine(id: number): HTMLElement {
    const w = this.world;
    const s = w.students[id];
    const read = this.readOf(id);
    const loves = s.shirt !== null && playerOf(w).opinions[s.shirt] > 0.4 ? ` — wearing a ${shirtName(s.shirt)} shirt (you love that)` : '';
    return h('div', { class: 'person' }, h('b', null, ...(knows(w, id) ? [fullName(s)] : colorLooks(capitalize(describeStranger(s))))), h('span', { class: 'muted' }, knows(w, id) ? ` ${read}${loves} · ` : loves, knows(w, id) ? lookWord(s.look) : ''));
  }

  /** How someone feels about you, if they've shown it: "· ♥ 12 · ★ 5", or a note that you can't tell yet. */
  private readOf(id: number): string {
    const g = this.regard(id);
    return g ? `· ♥ ${g.like} · ★ ${g.respect}` : '· hasn’t shown what they think of you';
  }

  /**
   * How much someone likes (♥) and respects (★) you, from −100 to 100 — once they've shown it. People
   * show it by reacting where you can see, by saying something to you, or once you know each other
   * well. Until then it's hidden: some people keep their cards close.
   */
  private regard(id: number): { like: number; respect: number } | null {
    const w = this.world;
    const r = w.students[id].rels.get(w.player!.id);
    if (!r || !(this.revealed.has(id) || r.fam >= 0.3)) return null;
    return { like: Math.round(100 * r.aff), respect: Math.round(100 * r.resp) };
  }

  // ------------------------------------------------------------------ the conversation (card game)

  /** What the current conversation is (lunch, or walking to class): its title, length, and how it ends. */
  private talk: Talk = LUNCH_TALK;

  private async conversation(table: PlayerTable, talk: Talk = LUNCH_TALK) {
    this.coach.tip('conversation');
    this.coach.tip('hand');
    const w = this.world;
    const pid = w.player!.id;
    this.talk = talk;
    const c = openPlayerConversation(w, table.members, table.onlookers, talk.place, talk.opts ?? { hangout: true });
    const lines: Line[] = [];
    const feelings = new Map<number, number>();
    const feel = (id: number) => {
      const r = w.students[id].rels.get(pid);
      return r ? r.aff + 0.4 * r.resp + 0.3 * r.trust : 0;
    };
    for (const m of c.members) if (m !== pid) feelings.set(m, feel(m));
    let logIndex = 0;
    let target = c.members.find((m) => m !== pid)!;

    const consume = () => {
      for (; logIndex < (c.log?.length ?? 0); logIndex++) {
        const e = c.log![logIndex];
        if (e.kind === 'phone') {
          lines.push({ speaker: nameFor(w, e.actor, true), text: '(checks their phone)', system: true });
          continue;
        }
        lines.push(...this.linesFor(e.act, saidBefore(c, logIndex)));
        this.learnFrom(e.act);
        // Talking to you directly shows how they feel about you.
        if (e.act.target === pid && e.act.actor !== pid) this.revealed.add(e.act.actor);
      }
      // Reactions: how people's feelings toward you shifted, as body language you have to read.
      const tells: string[] = [];
      for (const m of c.members) {
        if (m === pid) continue;
        const now = feel(m);
        const d = now - (feelings.get(m) ?? now);
        feelings.set(m, now);
        const t = tellFor(w.students[m].traits.E, d);
        if (t) {
          tells.push(`${nameFor(w, m, true)} ${t.text}`);
          // A reaction you can see shows you where you stand with them.
          this.revealed.add(m);
        }
      }
      if (tells.length && lines.length) lines[lines.length - 1].tells = tells.join(' · ');
      target = c.members.includes(target) ? target : (c.members.find((m) => m !== pid) ?? target);
    };

    // Your deck for this conversation: dealt five, then one more each turn. Cards you play are spent;
    // the rest stay in your hand.
    const deck = buildDeck(w, c);
    const hand = dealHand(w, deck);
    for (let round = 0; round < talk.rounds; round++) {
      if (c.members.length < 2 || !c.members.includes(pid)) break;
      if (round > 0 && hand.length < 6) {
        const drawn = drawCard(w, deck);
        if (drawn) hand.push(drawn);
      }
      // You're answering whoever spoke last, so aim at them unless you pick someone else.
      const recent = saidBefore(c);
      if (recent[0] && recent[0].actor !== pid && c.members.includes(recent[0].actor)) target = recent[0].actor;
      // Response cards in your hand can only be played right after the line they answer.
      const handCards = hand.map((x) => {
        const playable = resolveResponse(w, c, x);
        const cost = cardCost(w, c, x);
        return playable ? { card: speak(w, playable, recent), needs: null, cost } : { card: { ...x, line: '' }, needs: x.needs!, cost };
      });
      this.noteRegardChanges(c.members);
      if (handCards.some((x) => x.card.needs && !x.needs)) this.coach.tip('responses');
      if (handCards.some((x) => x.cost > energyPips(playerOf(w)))) this.coach.tip('energy');
      const pickResult = await this.pickCard(c, handCards, deck.length, lines, round, target);
      target = pickResult.target;
      const card = pickResult.card;
      // Playing a card from your hand spends it.
      const spent = hand.findIndex((x) => x.key === card.key);
      if (spent >= 0) hand.splice(spent, 1);
      if (card.kind === 'leave') {
        playerLeaves(c);
        lines.push({ speaker: 'You', text: '(head out early)', mine: true, system: true });
        break;
      }
      if (card.key === 'quiet') {
        lines.push({ speaker: 'You', text: '(stay quiet)', mine: true, system: true });
      } else if (card.kind === 'stall') {
        lines.push({ speaker: 'You', text: 'Um…', note: 'You can’t think of anything to say.', mine: true });
      } else {
        const act = cardToAct(w, c, card, target);
        this.playerLine = card.line;
        addEnergy(playerOf(w), -cardCost(w, c, card));
        // The next speaker answers the exact line on your card.
        if (act) noteSaid(act, card.template);
        if (act) {
          playerPlays(w, c, act);
          // A joke that lands gives you a lift.
          if (act.kind === 'joke' && act.success) {
            addEnergy(playerOf(w), 1);
            this.say('Your joke landed. (+1 ⚡)');
          }
          if (act.kind === 'invite' && act.success) {
            w.player!.hangoutWith.push(act.target);
            w.player!.afterSchool = 'hangout';
          }
        }
      }
      consume();
      // Everyone else gets a couple of turns, so the table feels alive.
      for (let pass = 0; pass < 2 && !c.pending && c.members.includes(pid); pass++) {
        othersTakeTurns(w, c);
        consume();
      }
      while (c.pending) {
        const pending = c.pending;
        const answer = await this.answerPending(c, pending.kind, pending.act, lines);
        playerAnswers(w, c, answer);
        consume();
      }
    }
    lines.push({ speaker: '', text: talk.end, system: true });
    // Time with close friends recharges you.
    const friendsHere = closeFriendsOf(w, playerOf(w)).filter((f) => c.members.includes(f));
    if (friendsHere.length && c.members.includes(pid)) {
      addEnergy(playerOf(w), 2);
      lines.push({ speaker: '', text: tidy(`Time with ${listWords(friendsHere.map((f) => nameFor(w, f)))} recharges you. (+2 ⚡)`), system: true });
    }
    this.noteRegardChanges(c.members);
    this.flushFeed(talk.title);
    fill(this.panel, this.conversationView(c, lines), h('button', { class: 'big' }, talk.leave));
    await this.waitForButton();
  }

  /** Lines of dialogue for an act in the player's conversation. */
  private linesFor(act: Act, recent: Act[]): Line[] {
    const w = this.world;
    const pid = w.player!.id;
    const out: Line[] = [];
    const speaker = nameFor(w, act.actor, true);
    const toWhom = act.target >= 0 && act.target !== act.actor ? ` → ${nameFor(w, act.target)}` : '';
    const said = act.actor === pid && this.playerLine ? this.playerLine : lineFor(w, act, recent[0] ?? null, recent);
    if (act.actor === pid) this.playerLine = null;
    out.push({ speaker: speaker + toWhom, text: said, note: act.kind === 'putdown' ? null : outcomeNote(w, act), mine: act.actor === pid });
    if (act.kind === 'putdown') {
      if (act.defender !== undefined) out.push({ speaker: nameFor(w, act.defender, true), text: act.defender === pid ? 'Hey — leave them alone.' : 'Back off.', mine: act.defender === pid });
      else if (act.response) out.push({ speaker: nameFor(w, act.target, true), text: RESPONSE_LINES[act.response][Math.floor(Math.random() * RESPONSE_LINES[act.response].length)], mine: act.target === pid });
      out.push({ speaker: '', text: outcomeNote(w, act) ?? '', system: true });
    }
    if (act.kind === 'shove') out[0] = { speaker: '', text: `${speaker} shoves ${nameFor(w, act.target)}!`, system: true };
    if (act.kind === 'report') out[0] = { speaker: '', text: `${speaker} goes to tell a teacher.`, system: true };
    return out;
  }

  /** Remember what someone showed they like, from what they said in front of the player. */
  private learnFrom(act: Act) {
    if (act.actor === this.world.player!.id) return;
    const k = this.known.get(act.actor) ?? { loves: new Set<number>(), into: new Set<Interest>() };
    if (act.kind === 'opinion' && act.topic !== undefined) {
      if ((act.stance ?? 0) > 0) k.loves.add(act.topic);
      else k.loves.delete(act.topic);
    }
    if (act.kind === 'lore' && act.interest) k.into.add(act.interest);
    this.known.set(act.actor, k);
  }

  /**
   * The conversation so far: everyone at the table as a card (face, clothes, what you know about
   * them), then the transcript. When `pick` is given, clicking a person chooses who you talk to.
   */
  private conversationView(c: Convo, lines: Line[], round?: number, pick?: { target: number; choose: (id: number) => void }): HTMLElement {
    const w = this.world;
    const pid = w.player!.id;
    return h(
      'div',
      { class: 'convo' },
      h('div', { class: 'panel-title' }, `${this.talk.title}${round !== undefined ? ` — turn ${round + 1} of ${this.talk.rounds}` : ''}`),
      pick ? h('div', { class: 'muted small' }, 'Click someone to talk to them. Cards marked → go to them; the rest are said to everyone.') : null,
      h('div', { class: 'people-cards' }, ...c.members.filter((m) => m !== pid).map((m) => this.personCard(m, pick ? m === pick.target : false, pick ? () => pick.choose(m) : undefined))),
      h(
        'div',
        { class: 'transcript' },
        lines.length ? null : h('div', { class: 'line system' }, 'Nobody’s said anything yet — you go first.'),
        ...lines.slice(-8).map((l) =>
          l.system
            ? h('div', { class: 'line system' }, l.speaker ? `${l.speaker} ${l.text}` : l.text, l.tells ? h('div', { class: 'tells' }, l.tells) : null)
            : h(
                'div',
                { class: l.mine ? 'line mine' : 'line' },
                h('span', { class: 'speaker' }, l.speaker),
                h('span', { class: 'said' }, `“${l.text}”`),
                l.note ? h('span', { class: 'note' }, ` ${l.note}`) : null,
                l.tells ? h('div', { class: 'tells' }, l.tells) : null,
              ),
        ),
      ),
    );
  }

  /** Work out how each person's ♥ and ★ moved since the player last looked, to show as +3 / −2. */
  private lastRegard = new Map<number, { like: number; respect: number }>();
  private noteRegardChanges(ids: number[]) {
    this.markKnownPeople();
    if (ids.some((id) => id !== this.world.player!.id && this.regard(id))) this.coach.tip('meters');
    this.regardDelta.clear();
    for (const id of ids) {
      const g = this.regard(id);
      if (!g) continue;
      const before = this.lastRegard.get(id);
      if (before) this.regardDelta.set(id, { like: g.like - before.like, respect: g.respect - before.respect });
      this.lastRegard.set(id, g);
    }
  }

  /** ♥ and ★ meters for someone, with what just changed — or question marks if they haven't shown it. */
  private regardMeters(id: number): HTMLElement {
    const g = this.regard(id);
    if (!g) return h('div', { class: 'meters hidden-regard', title: 'They haven’t shown what they think of you yet.' }, h('span', null, '♥ ?'), h('span', null, '★ ?'));
    const d = this.regardDelta.get(id);
    const meter = (icon: string, cls: string, value: number, change: number | undefined, label: string) =>
      h(
        'div',
        { class: `meter ${cls}`, title: label },
        h('span', { class: 'meter-icon' }, icon),
        h('div', { class: 'meter-track' }, h('div', { class: `meter-fill ${value < 0 ? 'neg' : ''}`, style: `width:${Math.min(50, Math.abs(value))}%;${value < 0 ? 'right:50%' : 'left:50%'}` })),
        h('span', { class: 'meter-value' }, String(value)),
        change ? h('span', { class: `meter-change ${change > 0 ? 'up' : 'down'}` }, change > 0 ? `+${change}` : String(change)) : null,
      );
    return h('div', { class: 'meters' }, meter('♥', 'like', g.like, d?.like, 'How much they like you'), meter('★', 'respect', g.respect, d?.respect, 'How much they respect you'));
  }

  /** One person at the table: their face and clothes, and everything the player knows about them. */
  private personCard(id: number, selected: boolean, onclick?: () => void): HTMLElement {
    const w = this.world;
    const s = w.students[id];
    const me = playerOf(w);
    const r = me.rels.get(id);
    const fam = r?.fam ?? 0;
    const history = !knows(w, id) || fam < 0.05 ? 'First time talking' : fam < 0.3 ? 'You’ve talked a little' : 'You know them well';
    const k = this.known.get(id);
    const likes = [...(k?.loves ?? [])].map((t) => `loves ${OPINION_TOPICS[t]}`).concat([...(k?.into ?? [])].map((i) => `into ${i}`));
    const shirtMatch = s.shirt !== null && me.opinions[s.shirt] > 0.4 ? ' — you love that too' : '';
    return h(
      onclick ? 'button' : 'div',
      { class: `person-card${selected ? ' on' : ''}${onclick ? '' : ' static'}`, onclick },
      faceOf(s),
      h(
        'div',
        { class: 'person-info' },
        h('div', { class: 'person-name' }, knows(w, id) ? nameFor(w, id, true) : capitalize(describeStranger(s).replace(/ in a .*$/, ''))),
        h('div', { class: 'muted small' }, lookWord(s.look, capitalize(LOOK_WORDS[s.look])), ` · ${shirtWords(s)}${shirtMatch}`),
        h('div', { class: 'small' }, history),
        this.regardMeters(id),
        likes.length ? h('div', { class: 'small likes' }, capitalize(likes.slice(0, 3).join(', '))) : null,
        selected ? h('div', { class: 'talking-to' }, 'Talking to them') : null,
      ),
    );
  }

  /**
   * Your turn: respond to what was just said (free, this turn only), play a card from your hand (spent),
   * or head out.
   */
  private pickCard(c: Convo, hand: { card: Card; needs: Need | null; cost: number }[], deckLeft: number, lines: Line[], round: number, target: number): Promise<{ card: Card; target: number }> {
    const w = this.world;
    const tips = new Set<string>();
    // Openers about each person are worked out once per turn, so their lines don't change while you look.
    const openers = new Map<number, Card | null>();
    const openerOf = (id: number) => {
      if (!openers.has(id)) openers.set(id, openerFor(w, id, this.known.get(id)));
      return openers.get(id)!;
    };
    return new Promise((resolve) => {
      let t = target;
      const render = () => {
        const pips = energyPips(playerOf(w));
        const cardEl = (card: Card, aim: string, needs: Need | null = null, cost = 0) => {
          const short = !needs && cost > pips;
          const tipOpen = tips.has(card.key);
          const help = h('span', { class: 'card-help', title: 'When does this card work?' }, '?');
          help.addEventListener('click', (e) => {
            e.stopPropagation();
            if (tipOpen) tips.delete(card.key);
            else tips.add(card.key);
            render();
          });
          return h(
            'button',
            {
              class: `card ${card.family}${card.about !== undefined ? ' opener' : ''}${card.needs ? ' response' : ''}${needs || short ? ' unplayable' : ''}`,
              title: needs ? `A response card: you can play it right after ${NEED_WORDS[needs]}.` : short ? `You need ${cost} ⚡ and have ${pips}.` : undefined,
              onclick: () => !needs && !short && resolve({ card, target: card.responseTo ?? t }),
            },
            help,
            h('span', { class: `card-cost${cost === 0 ? ' free' : ''}`, title: cost ? `Costs ${cost} energy` : 'Free' }, cost ? '⚡'.repeat(cost) : 'free'),
            h('div', { class: 'card-title' }, card.title),
            h('div', { class: 'card-kind' }, needs ? 'Response' : aim),
            needs && !tipOpen
              ? h('div', { class: 'card-needs' }, `Needs ${NEED_WORDS[needs]}.`)
              : short && !tipOpen
                ? h('div', { class: 'card-needs' }, `Needs ${cost} ⚡ — you have ${pips}.`)
                : tipOpen
              ? h(
                  'div',
                  { class: 'card-blurb' },
                  h('div', { class: 'card-good' }, h('b', null, 'Good: '), adviceFor(card).good),
                  h('div', { class: 'card-bad' }, h('b', null, 'Bad: '), adviceFor(card).bad),
                )
              : h('div', { class: 'card-line' }, card.kind === 'stall' ? card.line : `“${card.line}”`),
          );
        };
        const opener = openerOf(t);
        if (opener) this.coach.tip('opener');
        const leave: Card = { key: 'leave', kind: 'leave', family: 'move', title: 'Head out', blurb: '', targeted: false, line: '' };
        fill(
          this.panel,
          this.conversationView(c, lines, round, { target: t, choose: (id) => ((t = id), render()) }),
          opener
            ? h(
                'div',
                { class: 'hand-section' },
                h('div', { class: 'hand-head' }, h('b', null, 'Right now'), h('span', { class: 'muted small' }, ` — something about ${nameFor(w, t)} you could bring up. Free, this turn only.`)),
                h('div', { class: 'hand' }, cardEl(opener, `About ${nameFor(w, t)}`, null, 0)),
              )
            : null,
          h(
            'div',
            { class: 'hand-section' },
            h(
              'div',
              { class: 'hand-head' },
              h('b', null, 'Your hand'),
              h('span', { class: 'energy-count', title: 'Energy: cards cost ⚡ to play' }, ` ⚡ ${pips} / ${ENERGY_MAX}`),
              h('span', { class: 'muted small' }, ` — ${hand.length} card${hand.length === 1 ? '' : 's'}, ${deckLeft} left in your deck. A card you play is used up; the rest stay. You draw one each turn. Response cards light up when someone says the thing they answer.`),
              h('span', { class: 'hand-buttons' },
                h('button', { class: 'small-btn quiet', title: 'Nothing to say? Let the others talk.', onclick: () => resolve({ card: { key: 'quiet', kind: 'stall', family: 'stall', title: 'Stay quiet', blurb: '', targeted: false, line: '' }, target: t }) }, 'Stay quiet'),
                h('button', { class: 'small-btn head-out', onclick: () => resolve({ card: leave, target: t }) }, 'Head out'),
              ),
            ),
            h('div', { class: 'hand' }, ...hand.map(({ card, needs, cost }) => cardEl(card, card.responseTo !== undefined ? `→ ${nameFor(w, card.responseTo)}` : card.targeted ? `→ ${nameFor(w, t)}` : 'To everyone', needs, cost))),
          ),
        );
      };
      render();
    });
  }

  private answerPending(c: Convo, kind: 'challenge' | 'witness', act: Act, lines: Line[]): Promise<{ response?: NonNullable<Act['response']>; defend?: boolean }> {
    this.coach.tip(kind);
    const w = this.world;
    lines.push({ speaker: `${nameFor(w, act.actor, true)} → ${nameFor(w, act.target)}`, text: lineFor(w, act, saidBefore(c, logIndexOf(c, act))[0] ?? null, saidBefore(c, logIndexOf(c, act))) });
    return new Promise((resolve) => {
      if (kind === 'challenge') {
        sfx.bad();
        // Being put down in front of people takes it out of you.
        addEnergy(playerOf(w), -2);
        fill(
          this.panel,
          this.conversationView(c, lines),
          h('div', { class: 'panel-title warn' }, `${nameFor(w, act.actor, true)} is trying to make you look small. Everyone’s watching.`),
          h(
            'div',
            { class: 'hand' },
            ...responseHand(w).map((r) =>
              h('button', { class: `card ${r.response === 'accept' || r.response === 'snap' ? 'edge' : 'warm'}`, onclick: () => resolve({ response: r.response }) }, h('div', { class: 'card-title' }, r.title), h('div', { class: 'card-blurb' }, r.blurb)),
            ),
          ),
        );
      } else {
        fill(
          this.panel,
          this.conversationView(c, lines),
          h('div', { class: 'panel-title warn' }, `${nameFor(w, act.actor, true)} is picking on ${nameFor(w, act.target)}.`),
          h(
            'div',
            { class: 'hand' },
            h('button', { class: 'card warm', onclick: () => resolve({ defend: true }) }, h('div', { class: 'card-title' }, `Stick up for ${nameFor(w, act.target)}`), h('div', { class: 'card-blurb' }, 'A risk — the bully might turn on you. They’ll remember it, and so will everyone watching.')),
            h('button', { class: 'card stall', onclick: () => resolve({ defend: false }) }, h('div', { class: 'card-title' }, 'Stay out of it'), h('div', { class: 'card-blurb' }, 'Safe for you. Someone else might step in — or not.')),
          ),
        );
      }
    });
  }

  // ------------------------------------------------------------------ afternoon, weekend, evening

  private async afterSchoolChoice() {
    this.coach.tip('afterSchool');
    const w = this.world;
    const p = w.player!;
    const me = playerOf(w);
    const grounded = isGrounded(w, me);
    const activity = me.activity ? ACTIVITIES.find((a) => a.id === me.activity)! : null;
    const friends = closeFriendsOf(w, me);
    const invited = p.hangoutWith.map((id) => nameFor(w, id));
    const options: [typeof p.afterSchool, string, string, boolean][] = [];
    if (activity)
      options.push(['activity', `Go to ${activity.name}`, me.grades < ELIGIBILITY_GRADE ? 'Your grades are too low — you’re benched until they come up.' : `Practice with the ${activity.name} crowd.`, me.grades >= ELIGIBILITY_GRADE]);
    options.push([
      'hangout',
      invited.length ? `Hang out with ${listWords(invited)}` : 'Hang out with friends',
      grounded ? 'You’re grounded.' : invited.length ? 'They said yes at lunch. Time outside school is what makes people close.' : friends.length ? 'Find a friend or two who’s free.' : 'Find someone free to hang out with (easier once you have close friends).',
      !grounded,
    ]);
    options.push(['gym', 'Hang out behind the gym', 'The crowd that skips last period. Easy to get in with. Not much respected — and you might get caught.', !grounded]);
    options.push(['home', 'Go home', 'Rest up. Nothing happens.', true]);
    const choice = await this.choicePanel('After school', options.map(([id, title, text, enabled]) => ({ id, title, text, enabled })));
    p.afterSchool = choice;
    if (choice === 'hangout') this.tracker.noteHangout();
  }

  private async weekendChoice() {
    this.coach.tip('weekend');
    const w = this.world;
    const me = playerOf(w);
    const grounded = isGrounded(w, me);
    const friends = closeFriendsOf(w, me);
    const choice = await this.choicePanel<'out' | 'home'>(`${w.day % 7 === 5 ? 'Saturday' : 'Sunday'}`, [
      {
        id: 'out',
        title: w.player!.weekendHost !== null && w.day % 7 === 5 ? tidy(`Go to ${nameFor(w, w.player!.weekendHost)}'s`) : friends.length ? 'Make plans with friends' : 'See what’s going on',
        text: grounded ? 'You’re grounded this weekend.' : w.player!.weekendHost !== null && w.day % 7 === 5 ? 'You said yes to their invitation.' : 'Hang out, go to anything you’re invited to.',
        enabled: !grounded,
      },
      { id: 'home', title: 'Stay home', text: 'Rest and recharge.', enabled: true },
    ]);
    w.player!.weekend = choice;
    if (choice === 'out' && friends.length) this.tracker.noteHangout();
  }

  private async eveningChoice() {
    this.coach.tip('evening');
    this.coach.tip('moreCards');
    const w = this.world;
    const me = playerOf(w);
    const grounded = isGrounded(w, me);
    const schoolNight = w.day % 7 < 4 || w.day % 7 === 6;
    const friends = closeFriendsOf(w, me);
    const choice = await this.choicePanel<EveningChoice>('Tonight', [
      { id: 'study', title: 'Homework', text: schoolNight ? 'The only way grades go up. Every night in a row adds a bit less, and it’s a little stressful.' : 'No homework tonight — this counts as practice.', enabled: true },
      { id: 'friends', title: 'See friends', text: grounded ? 'You’re grounded.' : friends.length ? `Call ${listWords(friends.slice(0, 3).map((f) => nameFor(w, f)))}…` : 'You don’t have close friends to call yet.', enabled: !grounded && friends.length > 0 },
      { id: 'practice', title: 'Practice a skill', text: 'Get better at what you do, and learn more about what you’re into.', enabled: true },
      { id: 'rest', title: 'Rest', text: 'Less stress, more energy tomorrow.', enabled: true },
      { id: 'phone', title: 'Phone', text: 'Feels like a break. Catch up on what everyone’s saying.', enabled: !grounded },
    ]);
    w.cfg.forcedEvening = new Map([[w.player!.id, choice]]);
    if (choice === 'phone') this.tracker.notePhoneNight();
    if (choice === 'friends') {
      w.player!.callFriends = await this.pickFriendsToCall();
      this.tracker.noteHangout();
    }
  }

  /** Who to call tonight: up to two of your close friends. They come if they're free. */
  private pickFriendsToCall(): Promise<number[]> {
    this.coach.tip('callFriends');
    const w = this.world;
    const friends = closeFriendsOf(w, playerOf(w));
    const picked = new Set<number>(friends.slice(0, 1));
    return new Promise((resolve) => {
      const render = () =>
        fill(
          this.panel,
          h('div', { class: 'panel-title' }, 'Who do you call?'),
          h('p', { class: 'muted small' }, 'Pick up to two. They’ll come if they’re free.'),
          h(
            'div',
            { class: 'row wrap' },
            ...friends.map((id) =>
              h(
                'button',
                {
                  class: picked.has(id) ? 'chip on' : 'chip',
                  onclick: () => {
                    if (picked.has(id)) picked.delete(id);
                    else if (picked.size < 2) picked.add(id);
                    render();
                  },
                },
                nameFor(w, id),
              ),
            ),
          ),
          h('button', { class: 'big', disabled: picked.size === 0, onclick: () => resolve([...picked]) }, 'Call them'),
        );
      render();
    });
  }

  private choicePanel<T extends string>(title: string, options: { id: T; title: string; text: string; enabled: boolean }[]): Promise<T> {
    return new Promise((resolve) => {
      fill(
        this.panel,
        h('div', { class: 'panel-title' }, title),
        h('div', { class: 'option-list' }, ...options.map((o) => h('button', { class: 'option', disabled: !o.enabled, onclick: () => resolve(o.id) }, h('b', null, ...colorLooks(o.title)), h('span', null, ...colorLooks(o.text))))),
      );
    });
  }

  private waitForButton(): Promise<void> {
    return new Promise((resolve) => {
      const btn = this.panel.querySelector('button.big');
      btn?.addEventListener('click', () => resolve());
    });
  }

  // ------------------------------------------------------------------ the weekly recap

  private async recap() {
    this.coach.tip('recap');
    const w = this.world;
    const me = playerOf(w);
    const week = Math.floor((w.day - 1) / 7) + 1;
    const changes = this.tracker.changes();
    const f = me.foundation;
    const close = closeFriendsOf(w, me);
    const learned = this.tracker.newlyUnlocked.map((id) => PRINCIPLES[id]).filter(Boolean);
    await choose<void>((resolve) =>
      this.showModal(
        h('h2', null, `Week ${week} — what really happened`),
        h('p', { class: 'muted' }, 'For once, you get to see inside people’s heads.'),
        changes.length
          ? h(
              'div',
              { class: 'changes' },
              ...changes.map((c) =>
                h(
                  'div',
                  { class: `change ${direction(c)}` },
                  h('div', { class: 'change-head' }, h('b', null, fullName(w.students[c.id])), ` ${direction(c) === 'up' ? '▲' : '▼'} now ${feelingWords(c.after).join(', ')}`),
                  c.reasons.length ? h('ul', null, ...c.reasons.map((r) => h('li', null, r))) : h('div', { class: 'muted small' }, 'No single moment — it built up from time together (or apart).'),
                ),
              ),
            )
          : h('p', null, 'Nobody’s opinion of you changed much this week.'),
        h(
          'div',
          { class: 'standing' },
          h('h3', null, 'Your standing'),
          h('p', null, `More people in your grade look up to you than ${Math.round(me.status * 100)}% of everyone.`),
          h(
            'div',
            { class: 'foundation' },
            h('div', { class: 'seg liked', style: `width:${Math.round(100 * f.liked)}%` }, f.liked > 0.12 ? `liked ${Math.round(100 * f.liked)}%` : ''),
            h('div', { class: 'seg admired', style: `width:${Math.round(100 * f.admired)}%` }, f.admired > 0.12 ? `admired ${Math.round(100 * f.admired)}%` : ''),
            h('div', { class: 'seg feared', style: `width:${Math.round(100 * f.feared)}%` }, f.feared > 0.12 ? `feared ${Math.round(100 * f.feared)}%` : ''),
          ),
          h('p', { class: 'muted small' }, 'What your standing rests on. Only the “feared” part is fragile.'),
          h('p', null, close.length ? `Close friends: ${listWords(close.map((id) => fullName(w.students[id])))}.` : 'No close friends yet. Closeness takes time outside school.'),
          h('p', null, `Grades: ${gradeLetter(me.grades)}.`),
        ),
        learned.length ? h('div', { class: 'learned' }, h('h3', null, 'Something you noticed'), ...learned.map((p) => h('div', { class: 'principle' }, h('b', null, p.title), h('p', null, p.text)))) : null,
        h('button', { class: 'big', onclick: () => resolve() }, week >= WEEKS ? 'See how the semester went' : `Start week ${week + 1}`),
      ),
    );
    this.hideModal();
    this.tracker.startNewWeek();
  }

  private async finalReport() {
    const w = this.world;
    const me = playerOf(w);
    const close = closeFriendsOf(w, me);
    this.showModal(
      h('h2', null, 'End of the fall semester'),
      h('p', null, `Close friends: ${close.length ? listWords(close.map((id) => fullName(w.students[id]))) : 'none yet'}.`),
      h('p', null, `Standing: more people look up to you than ${Math.round(me.status * 100)}% of your grade.`),
      h('p', null, `Grades: ${gradeLetter(me.grades)}.`),
      h('p', null, `Things you noticed along the way: ${this.tracker.unlocked.size} of ${Object.keys(PRINCIPLES).length}.`),
      h('button', { class: 'big', onclick: () => location.reload() }, 'Play again'),
    );
  }

  // ------------------------------------------------------------------ pause menu

  private pauseLayer: HTMLElement | null = null;

  private togglePause() {
    if (this.pauseLayer) {
      this.pauseLayer.remove();
      this.pauseLayer = null;
      return;
    }
    const render = () => {
      const layer = this.pauseLayer!;
      fill(
        layer,
        h(
          'div',
          { class: 'pause-card' },
          logo('logo-svg small'),
          h('div', { class: 'muted' }, `${dayLabel(this.world)} — paused`),
          h('div', { class: 'menu' }, 
            h('button', { class: 'menu-btn primary', onclick: () => this.togglePause() }, 'Resume'),
            h('button', { class: 'menu-btn', onclick: () => showHowToPlay(this.root, () => {}) }, 'How to Play'),
            h('button', { class: 'menu-btn', onclick: () => (setSound(!soundOn()), render()) }, `Sound: ${soundOn() ? 'On' : 'Off'}`),
            h('button', { class: 'menu-btn', onclick: () => confirm('Quit to the title screen? This semester won’t be saved.') && location.reload() }, 'Quit to Title'),
          ),
        ),
      );
    };
    this.pauseLayer = h('div', { class: 'modal pause fade-in' });
    this.root.append(this.pauseLayer);
    render();
  }

  // ------------------------------------------------------------------ notebook, tooltips, modal

  private notebookTab: 'people' | 'cards' = 'people';

  private toggleNotebook() {
    if (!this.notebook.classList.contains('hidden')) {
      this.notebook.classList.add('hidden');
      return;
    }
    this.renderNotebook();
    this.notebook.classList.remove('hidden');
  }

  /** The notebook: everyone you've met, or your card collection and where each card comes from. */
  private renderNotebook() {
    const w = this.world;
    const me = playerOf(w);
    const tab = (id: 'people' | 'cards', label: string) => h('button', { class: this.notebookTab === id ? 'chip on' : 'chip', onclick: () => ((this.notebookTab = id), this.renderNotebook()) }, label);
    const head = h(
      'div',
      { class: 'panel-title' },
      'Notebook',
      h('span', { class: 'nb-tabs' }, tab('people', 'People'), tab('cards', 'Your cards')),
      h('button', { class: 'small-btn', onclick: () => this.notebook.classList.add('hidden') }, 'Close'),
    );
    if (this.notebookTab === 'cards') {
      const entries = collection(w);
      const total = entries.reduce((t, e) => t + e.copies, 0);
      const row = (e: CollectionEntry) =>
        h(
          'div',
          { class: `nb-card ${e.card.family}` },
          h('b', null, `${e.card.title}${e.copies > 1 ? ` ×${e.copies}` : ''}`),
          e.card.needs ? h('span', { class: 'muted small' }, ` — play right after ${NEED_WORDS[e.card.needs]}`) : null,
          h('div', { class: 'small' }, e.why),
        );
      fill(
        this.notebook,
        head,
        h(
          'p',
          { class: 'muted small' },
          `Your deck: ${total} cards. Every conversation, you shuffle it and draw six. Your cards come from who you are, so you get more by changing: practice a skill (more brag and help cards), get into a hobby (talk about it), hear gossip (pass it on), feel strongly about something (say so), make close friends (more to open up about). Your personality sets your mix of responses.`,
        ),
        h('div', { class: 'nb-section' }, 'Things you can bring up'),
        ...entries.filter((e) => !e.card.needs).map(row),
        h('div', { class: 'nb-section' }, 'Responses — only playable right after the line they answer'),
        ...entries.filter((e) => e.card.needs).map(row),
      );
      return;
    }
    const known = [...me.rels].sort((a, b) => b[1].fam - a[1].fam).slice(0, 40);
    fill(
      this.notebook,
      head,
      h('p', { class: 'muted small' }, 'Everyone you’ve met. ♥ is how much they like you, ★ how much they respect you — shown once they’ve let you see it.'),
      ...known.map(([id]) => {
        const s = w.students[id];
        const heard = me.knownStories.filter((st) => st.act.actor === id || st.act.target === id).length;
        const activity = s.activity && w.students[id].rels.get(me.id) && (me.rels.get(id)?.fam ?? 0) > 0.25 ? ACTIVITIES.find((a) => a.id === s.activity)!.name : null;
        return h(
          'div',
          { class: 'nb-person' },
          h('b', null, fullName(s)),
          h('span', { class: 'muted small' }, ` ${this.readOf(id)}`),
          h('div', { class: 'small' }, [describeStranger(s).replace(/^a /, ''), activity, heard ? `${heard} stor${heard === 1 ? 'y' : 'ies'} you’ve heard` : null].filter(Boolean).join(' · ')),
        );
      }),
    );
  }

  private showPersonTooltip(id: number | null) {
    if (id === null) {
      this.tooltip.classList.add('hidden');
      return;
    }
    const w = this.world;
    const s = w.students[id];
    fill(this.tooltip, ...(id === w.player!.id ? ['You'] : knows(w, id) ? [`${fullName(s)} ${this.readOf(id)} · `, lookWord(s.look)] : colorLooks(capitalize(describeStranger(s)))));
    this.tooltip.classList.remove('hidden');
  }

  private showModal(...children: (Node | null)[]) {
    fill(this.modal, h('div', { class: 'modal-card' }, ...children));
    this.modal.classList.remove('hidden');
  }

  private hideModal() {
    this.modal.classList.add('hidden');
  }
}

/** A little portrait: skin, hair and shirt colors as the 3D figures have them, with the shirt's mark. */
function faceOf(s: Student): HTMLElement {
  const css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  const shirt = s.shirtStyle === 'hoodie' ? 'hoodie' : s.shirtStyle;
  return h(
    'div',
    { class: `face ${shirt}`, style: `--skin:${css(SKIN[s.skin % SKIN.length])};--hair:${css(HAIR[s.hair % HAIR.length])};--shirt:${css(LOOK_COLORS[s.look])}` },
    h('div', { class: 'face-body' }),
    h('div', { class: `face-head ${s.gender}` }),
  );
}

/** "Static Lake fan tee", "funny graphic tee", "hoodie", "plain tee". */
function shirtWords(s: Student): string {
  switch (s.shirtStyle) {
    case 'fan':
      return s.shirt !== null ? `${shirtName(s.shirt)} fan tee` : 'fan tee';
    case 'graphic':
      return 'funny graphic tee';
    case 'hoodie':
      return 'hoodie';
    default:
      return 'plain tee';
  }
}

function familyLabel(f: Card['family']): string {
  return { warm: 'Warmth', belong: 'Belonging', edge: 'Edge', move: 'Move', stall: 'Blank' }[f];
}

/** Body language for a shift in someone's feelings toward you. Reserved people show less. */
function tellFor(extraversion: number, delta: number): { text: string; sign: number } | null {
  const shows = Math.random() < 0.45 + 0.5 * extraversion;
  if (Math.abs(delta) < 0.004 || !shows) return null;
  // Body language is noisy: sometimes people look one way and feel another.
  const sign = Math.random() < 0.85 ? Math.sign(delta) : -Math.sign(delta);
  const strong = Math.abs(delta) > 0.03;
  const pos = strong ? ['grins at you', 'laughs', 'leans in'] : ['smiles', 'nods', 'looks interested'];
  const neg = strong ? ['rolls their eyes', 'crosses their arms', 'looks away'] : ['gives a tight smile', 'glances away', 'goes quiet'];
  const list = sign > 0 ? pos : neg;
  return { text: list[Math.floor(Math.random() * list.length)], sign: sign * (strong ? 1 : 0.5) };
}

/**
 * A group at a glance: the names of people you know, then what everyone else looks like —
 * "Maya L. + 3 sporty boys, a preppy boy · 2 in Static Lake shirts".
 */
function crowdWords(w: World, ids: number[]): string {
  const names = ids.filter((id) => knows(w, id)).map((id) => nameFor(w, id));
  const strangers = ids.filter((id) => !knows(w, id)).map((id) => w.students[id]);
  const kinds = new Map<string, number>();
  for (const s of strangers) kinds.set(`${LOOK_WORDS[s.look]} ${s.gender}`, (kinds.get(`${LOOK_WORDS[s.look]} ${s.gender}`) ?? 0) + 1);
  const sorted = [...kinds].sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, 2).map(([kind, n]) => (n === 1 ? `${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}` : `${n} ${kind}s`));
  const others = sorted.slice(2).reduce((t, [, n]) => t + n, 0);
  if (others) shown.push(`${others} more`);
  const fans = new Map<number, number>();
  for (const s of strangers) if (s.shirtStyle === 'fan' && s.shirt !== null) fans.set(s.shirt, (fans.get(s.shirt) ?? 0) + 1);
  const topFan = [...fans].sort((a, b) => b[1] - a[1])[0];
  const fanName = topFan ? shirtName(topFan[0]) : '';
  const shirt = topFan ? ` · ${topFan[1] === 1 ? `one in ${/^[AEIOU]/.test(fanName) ? 'an' : 'a'}` : `${topFan[1]} in`} ${fanName} shirt${topFan[1] === 1 ? '' : 's'}` : '';
  return [names.slice(0, 3).join(', '), shown.join(', ')].filter(Boolean).join(' + ') + shirt;
}

/** Where an act sits in a conversation's log (the end of the log if it isn't there yet). */
function logIndexOf(c: Convo, act: Act): number {
  const i = c.log?.findIndex((e) => e.kind === 'act' && e.act === act) ?? -1;
  return i >= 0 ? i : (c.log?.length ?? 0);
}

/** A fixed shuffle of spot numbers, so the list of strangers to walk up to isn't always the first spots. */
function jitterOrder(i: number): number {
  return ((i + 1) * 2654435761) % 1000;
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/** The subject taught each period (just flavor). */
const SUBJECTS = ['English', 'Math', 'Biology', 'World History', 'Spanish', 'Art'];

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

/** What kind of conversation is being played: its title, length, where, and how it ends. */
interface Talk {
  title: string;
  rounds: number;
  place: string;
  end: string;
  leave: string;
  opts?: ConvoOptions;
}

const LUNCH_TALK: Talk = { title: 'Lunch conversation', rounds: LUNCH_ROUNDS, place: 'lunch', end: 'The bell rings.', leave: 'Head to class' };

/**
 * The kinds of shirt you can put on: how many people come up to you (on a scale of 1–4, so the
 * difference between them is plain to see), then what that gets you and costs you.
 */
const SHIRT_CHOICES: { style: ShirtStyle; title: string; approach: number; approachText: string; up: string; down: string }[] = [
  { style: 'plain', title: 'Plain tee', approach: 2, approachText: 'The usual', up: 'Safe: nothing to tease you about.', down: 'No conversation starter: to meet people, you walk up to them.' },
  { style: 'graphic', title: 'Funny graphic tee', approach: 3, approachText: 'More fun, outgoing people', up: 'An easy opener: people who like funny people come over and ask about it.', down: 'Edgy people tease it. More interruptions in class.' },
  { style: 'fan', title: 'Fan tee', approach: 4, approachText: 'Lots of fans', up: 'An easy opener for fans of the thing — and you share a topic.', down: 'People who can’t stand it keep away, or mock it.' },
  { style: 'hoodie', title: 'Hoodie', approach: 1, approachText: 'Fewer people', up: 'Teased less, fewer interruptions, better focus.', down: 'Slower to make friends: you mostly do the approaching.' },
]
