/**
 * The school, in low-poly 3D: a cutaway campus (no roofs, so you can see inside) with a hallway and
 * classrooms, cafeteria, gym, library, theater, band room, robotics lab, courtyard and soccer field.
 * Students stand wherever the simulation puts them; the camera flies to where the player is, and the
 * light follows the time of day. Flat shading, chunky figures, no textures.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Look } from '../sim/content';
import type { Student } from '../sim/types';
import { LOOK_COLORS } from './looks';

export { LOOK_COLORS } from './looks';
export const SKIN = [0xf1d0b5, 0xe0b08c, 0xc68863, 0x8d5a3b, 0x5c3a26];
export const HAIR = [0x2b1d14, 0x5a3a22, 0xa36b2b, 0xd9b35b, 0x1a1a1a, 0x7a4b3a];

/** Places on campus the camera can fly to. */
export type Place = 'campus' | 'hallway' | 'cafeteria' | 'field' | 'gym' | 'behindGym' | 'bandRoom' | 'theater' | 'robotics' | 'library' | 'courtyard';
export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening';

interface Area {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floor: number;
  label: string;
  /** Low cutaway walls around it (a room or building) or open ground. */
  walls: boolean;
}

/** The campus layout, in world units (x to the right, z toward the camera). */
export const AREAS: Record<Exclude<Place, 'campus'>, Area> = {
  cafeteria: { x0: -4, z0: -4, x1: 27.6, z1: 21, floor: 0xe9dcc3, label: 'Cafeteria', walls: true },
  hallway: { x0: -4, z0: -24, x1: 52, z1: -18, floor: 0xd8d2c4, label: 'Hallway', walls: false },
  gym: { x0: 32, z0: -2, x1: 54, z1: 20, floor: 0xd9a066, label: 'Gym', walls: true },
  behindGym: { x0: 56, z0: 2, x1: 66, z1: 16, floor: 0x8a8a8a, label: 'Behind the gym', walls: false },
  library: { x0: -26, z0: -36, x1: -8, z1: -24, floor: 0xb7c9a8, label: 'Library', walls: true },
  theater: { x0: -26, z0: -18, x1: -8, z1: -4, floor: 0x7a3b4a, label: 'Theater', walls: true },
  bandRoom: { x0: -26, z0: -2, x1: -8, z1: 10, floor: 0xc9b37e, label: 'Band room', walls: true },
  robotics: { x0: -26, z0: 12, x1: -8, z1: 22, floor: 0x9fb4c7, label: 'Robotics lab', walls: true },
  courtyard: { x0: -4, z0: 23, x1: 28, z1: 29, floor: 0xcfc6b4, label: 'Courtyard', walls: false },
  field: { x0: -4, z0: 32, x1: 54, z1: 60, floor: 0x6fbf5a, label: 'Soccer field', walls: false },
};

/** Classrooms: four along each side of the hallway. Class sections map onto these rooms. */
export const CLASSROOM_COUNT = 8;
const CLASSROOMS = Array.from({ length: CLASSROOM_COUNT }, (_, i) => ({
  x0: -4 + 14 * (i % 4),
  x1: 10 + 14 * (i % 4),
  z0: i < 4 ? -36 : -18,
  z1: i < 4 ? -24 : -6,
}));
const CLASSROOM_COLORS = [0xf2e3c6, 0xe8d9f0, 0xd9ecf2, 0xf2dcd0];

const TABLE_COLS = 6;
const SPACING_X = 4.6;
const SPACING_Z = 4.2;
const SEATS = 8;
const CAMPUS_CENTER = new THREE.Vector3(19, 0, 10);

const SKY: Record<TimeOfDay, { sky: number; sun: number; sunColor: number; hemi: number }> = {
  morning: { sky: 0xcfe7f5, sun: 1.4, sunColor: 0xfff1d6, hemi: 1.5 },
  noon: { sky: 0xbfe3f2, sun: 1.7, sunColor: 0xffffff, hemi: 1.6 },
  afternoon: { sky: 0xf6d8a8, sun: 1.4, sunColor: 0xffd6a0, hemi: 1.4 },
  evening: { sky: 0x2f3a5c, sun: 0.5, sunColor: 0xff9e6b, hemi: 0.75 },
};

interface Figure {
  group: THREE.Group;
  phase: number;
  target: THREE.Vector3;
}

export interface Spot {
  pos: THREE.Vector3;
  /** A point to face (e.g. a table center or the front of the room). */
  face?: THREE.Vector3;
}

export class SchoolScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private tables: THREE.Mesh[] = [];
  /** Desk meshes for each classroom, by desk number. */
  private desks = new Map<number, THREE.Mesh[]>();
  /** Desk picking: which room, which desks are open, which is hovered. */
  private deskPick: { room: number; open: Set<number>; hovered: number } | null = null;
  private figures = new Map<number, Figure>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private hovered = -1;
  private picking = false;
  private marker: THREE.Mesh;
  /** Title-screen mode: the camera slowly circles the campus and ignores the mouse. */
  private attract = false;
  /** Where the camera is flying to, if it's moving. */
  private flight: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  onTableClick: ((ti: number) => void) | null = null;
  onTableHover: ((ti: number) => void) | null = null;
  onPersonHover: ((id: number | null) => void) | null = null;
  /** When set, clicking a person on the map calls this (e.g. to walk up to them before school). */
  onPersonClick: ((id: number) => void) | null = null;
  private hoveredPerson: number | null = null;
  onDeskHover: ((desk: number) => void) | null = null;
  onDeskClick: ((desk: number) => void) | null = null;

  constructor(private container: HTMLElement, private tableCount: number) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(0xbfe3f2, 110, 220);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.maxPolarAngle = Math.PI * 0.42;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 130;
    this.controls.enableDamping = true;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x7d8a63, 1.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(CAMPUS_CENTER.x + 30, 60, CAMPUS_CENTER.z + 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    sc.far = 200;
    this.sun.target.position.copy(CAMPUS_CENTER);
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.buildGrounds();
    for (const [key, area] of Object.entries(AREAS)) this.buildArea(key as keyof typeof AREAS, area);
    CLASSROOMS.forEach((room, i) => this.buildClassroom(room, i));
    for (let ti = 0; ti < tableCount; ti++) this.buildTable(ti);

    this.marker = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.75, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }));
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.scene.add(this.marker);

    this.setTimeOfDay('noon');
    this.jumpTo('campus');
    window.addEventListener('resize', () => this.resize());
    this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.renderer.domElement.addEventListener('click', () => {
      if (this.picking && this.hovered >= 0) this.onTableClick?.(this.hovered);
      if (this.onPersonClick && this.hoveredPerson !== null) this.onPersonClick(this.hoveredPerson);
      if (this.deskPick && this.deskPick.hovered >= 0) this.onDeskClick?.(this.deskPick.hovered);
    });
    this.resize();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  // ---------------------------------------------------------------- building the campus

  private box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, cast = true): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, flatShading: true }));
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  private buildGrounds() {
    const grass = new THREE.Mesh(new THREE.BoxGeometry(220, 1, 200), new THREE.MeshLambertMaterial({ color: 0x8fca6a }));
    grass.position.set(CAMPUS_CENTER.x, -0.55, CAMPUS_CENTER.z);
    grass.receiveShadow = true;
    this.scene.add(grass);
    // Paths linking the buildings, the courtyard and the field.
    const path = 0xd9d2c0;
    this.box(4, 0.06, 12, path, 12, 0.03, 30, false);
    this.box(4, 0.06, 8, path, 60, 0.03, -2, false);
    this.box(30, 0.06, 4, path, -40, 0.03, -21, false);
    // Trees around the edge.
    const trees: [number, number][] = [
      [-34, -40], [-38, -10], [-36, 20], [-34, 44], [-14, 66], [20, 68], [56, 66], [72, 44], [74, 20], [72, -14], [64, -40], [30, -46], [-6, -46],
      [62, 26], [-30, 30], [8, 64], [44, 66],
    ];
    for (const [x, z] of trees) this.tree(x, z);
    // A flagpole in the courtyard.
    this.box(0.25, 9, 0.25, 0xdddddd, 26, 4.5, 26);
    this.box(2.2, 1.3, 0.08, 0xd9483b, 27.2, 8.1, 26);
  }

  private tree(x: number, z: number) {
    this.box(0.6, 2, 0.6, 0x7a5233, x, 1, z);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5, 6), new THREE.MeshLambertMaterial({ color: 0x3f8f4a, flatShading: true }));
    top.position.set(x, 4.4, z);
    top.castShadow = true;
    this.scene.add(top);
  }

  private walls(x0: number, z0: number, x1: number, z1: number, color: number) {
    const h = 1.4;
    const t = 0.4;
    this.box(x1 - x0, h, t, color, (x0 + x1) / 2, h / 2, z0);
    this.box(x1 - x0, h, t, color, (x0 + x1) / 2, h / 2, z1);
    this.box(t, h, z1 - z0, color, x0, h / 2, (z0 + z1) / 2);
    this.box(t, h, z1 - z0, color, x1, h / 2, (z0 + z1) / 2);
  }

  private buildArea(key: keyof typeof AREAS, a: Area) {
    const floor = this.box(a.x1 - a.x0, 0.12, a.z1 - a.z0, a.floor, (a.x0 + a.x1) / 2, 0.06, (a.z0 + a.z1) / 2, false);
    floor.receiveShadow = true;
    if (a.walls) this.walls(a.x0, a.z0, a.x1, a.z1, 0xf4a259);
    const cx = (a.x0 + a.x1) / 2;
    const cz = (a.z0 + a.z1) / 2;
    switch (key) {
      case 'cafeteria':
        this.box((a.x1 - a.x0) * 0.6, 1.1, 1.2, 0xbc4b51, cx, 0.55, a.z0 + 1.4);
        break;
      case 'gym': {
        const line = 0xffffff;
        this.box(0.15, 0.02, a.z1 - a.z0 - 4, line, cx, 0.13, cz, false);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.08, 4, 24), new THREE.MeshBasicMaterial({ color: line }));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(cx, 0.14, cz);
        this.scene.add(ring);
        for (const x of [a.x0 + 1.2, a.x1 - 1.2]) {
          this.box(0.2, 4, 0.2, 0x777777, x, 2, cz);
          this.box(0.1, 1.2, 1.8, 0xffffff, x + (x < cx ? 0.3 : -0.3), 3.6, cz);
        }
        break;
      }
      case 'behindGym':
        this.box(3, 1.6, 1.6, 0x3f6b4a, a.x1 - 2.5, 0.8, a.z0 + 1.5);
        break;
      case 'library':
        for (let i = 0; i < 4; i++) this.box(1, 2.2, 8, 0x8a5a3b, a.x0 + 3 + i * 4, 1.1, cz);
        break;
      case 'theater':
        this.box(a.x1 - a.x0 - 2, 0.7, 4, 0x5a2a36, cx, 0.35, a.z0 + 3);
        this.box(a.x1 - a.x0 - 2, 3, 0.2, 0xb02e3a, cx, 1.5, a.z0 + 0.8);
        for (let r = 0; r < 3; r++) this.box(a.x1 - a.x0 - 4, 0.5, 0.8, 0x3a1a22, cx, 0.25, a.z0 + 7 + r * 2);
        break;
      case 'bandRoom':
        for (let r = 0; r < 2; r++)
          for (let i = 0; i < 5; i++) this.box(0.8, 0.5, 0.8, 0x444444, a.x0 + 3 + i * 3, 0.25, a.z0 + 4 + r * 3);
        break;
      case 'robotics':
        for (let i = 0; i < 3; i++) this.box(3.5, 0.9, 2, 0x6c7a89, a.x0 + 3.5 + i * 5.5, 0.45, cz);
        break;
      case 'courtyard':
        for (const x of [2, 10, 18]) this.box(3, 0.5, 0.8, 0x8a5a3b, x, 0.25, a.z0 + 1);
        break;
      case 'field': {
        const line = 0xffffff;
        this.box(a.x1 - a.x0 - 4, 0.02, 0.2, line, cx, 0.13, a.z0 + 2, false);
        this.box(a.x1 - a.x0 - 4, 0.02, 0.2, line, cx, 0.13, a.z1 - 2, false);
        this.box(0.2, 0.02, a.z1 - a.z0 - 4, line, cx, 0.13, cz, false);
        for (const x of [a.x0 + 2, a.x1 - 2]) {
          this.box(0.2, 2.4, 0.2, line, x, 1.2, cz - 3.5);
          this.box(0.2, 2.4, 0.2, line, x, 1.2, cz + 3.5);
          this.box(0.2, 0.2, 7.2, line, x, 2.4, cz);
        }
        // Bleachers.
        for (let r = 0; r < 3; r++) this.box(24, 0.6, 1.2, 0x9aa5b1, cx, 0.3 + r * 0.6, a.z1 + 1.5 + r * 1.2);
        break;
      }
    }
    this.label(a.label, cx, a.walls ? 6 : 4.5, cz);
  }

  private buildClassroom(room: { x0: number; z0: number; x1: number; z1: number }, i: number) {
    this.box(room.x1 - room.x0, 0.12, room.z1 - room.z0, CLASSROOM_COLORS[i % CLASSROOM_COLORS.length], (room.x0 + room.x1) / 2, 0.06, (room.z0 + room.z1) / 2, false);
    this.walls(room.x0, room.z0, room.x1, room.z1, 0xe07a5f);
    const desks = classroomSeats(i).map((d, desk) => {
      // The desk sits in front of the student, toward the front of the room.
      const m = this.box(0.9, 0.7, 0.55, 0xa47148, d.pos.x, 0.35, d.pos.z + (i < 4 ? -0.55 : 0.55));
      m.userData.desk = desk;
      return m;
    });
    this.desks.set(i, desks);
    // Teacher's desk and board at the front.
    const northSide = i < 4;
    this.box(2.5, 0.9, 1, 0x6b4a2f, (room.x0 + room.x1) / 2, 0.45, northSide ? room.z0 + 2.2 : room.z1 - 2.2);
    this.box(6, 1.4, 0.1, 0x2f4f3f, (room.x0 + room.x1) / 2, 1.4, northSide ? room.z0 + 0.4 : room.z1 - 0.4);
    if (i === 0) this.label('Classrooms', 24, 6, -30);
  }

  /** A floating label above a place. */
  private label(text: string, x: number, y: number, z: number) {
    const sprite = labelSprite(text, 'rgba(29,36,51,0.85)', 0.04);
    sprite.position.set(x, y, z);
    this.scene.add(sprite);
  }

  /**
   * Mark the people the player has met, so they're easy to spot in a crowd: their name above their
   * head and a ring at their feet — green if they like you, red if they don't, blue otherwise (so
   * they don't look like the dark place labels).
   */
  setKnown(people: Map<number, { name: string; tone: KnownTone }>) {
    this.known = people;
    for (const [id, f] of this.figures) this.applyMark(id, f.group);
  }

  private known = new Map<number, { name: string; tone: KnownTone }>();
  private applyMark(id: number, group: THREE.Group) {
    const info = this.known.get(id);
    const old = group.getObjectByName('known');
    const key = info ? `${info.name}|${info.tone}` : '';
    if (old && old.userData.key === key) return;
    if (old) group.remove(old);
    if (!info) return;
    const color = { friend: 0x2f9e6e, cool: 0xd9483b, neutral: 0x3d7bd9 }[info.tone];
    const mark = new THREE.Group();
    mark.name = 'known';
    mark.userData.key = key;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 20), new THREE.MeshBasicMaterial({ color, depthWrite: false, transparent: true, opacity: 0.9 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    const tag = labelSprite(info.name, { friend: 'rgba(47,158,110,0.92)', cool: 'rgba(217,72,59,0.92)', neutral: 'rgba(61,123,217,0.92)' }[info.tone], 0.026);
    tag.position.y = 1.9;
    // Hovering or clicking the ring or name counts as pointing at the person.
    ring.userData.person = id;
    tag.userData.person = id;
    mark.add(ring, tag);
    group.add(mark);
  }

  private tablePos(ti: number): THREE.Vector3 {
    return new THREE.Vector3((ti % TABLE_COLS) * SPACING_X, 0, Math.floor(ti / TABLE_COLS) * SPACING_Z);
  }

  private buildTable(ti: number) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.14, 10), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
    const pos = this.tablePos(ti);
    top.position.set(pos.x, 0.8, pos.z);
    top.castShadow = true;
    top.receiveShadow = true;
    top.userData.ti = ti;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x8a8a8a }));
    leg.position.set(pos.x, 0.4, pos.z);
    this.scene.add(top, leg);
    this.tables.push(top);
  }

  private seatPos(ti: number, seat: number, seated: number): THREE.Vector3 {
    const a = (seat / Math.max(SEATS, seated)) * Math.PI * 2 + Math.PI / 8;
    const p = this.tablePos(ti);
    return new THREE.Vector3(p.x + Math.cos(a) * 1.75, 0, p.z + Math.sin(a) * 1.75);
  }

  // ---------------------------------------------------------------- figures

  private buildFigure(s: Student, isPlayer: boolean): THREE.Group {
    const g = new THREE.Group();
    // The shirt is the top half of the body; its color says which crowd they're with.
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.5, 7), new THREE.MeshLambertMaterial({ color: LOOK_COLORS[s.look], flatShading: true }));
    body.position.y = 0.67;
    g.add(...lowerBody(s));
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), new THREE.MeshLambertMaterial({ color: SKIN[s.skin % SKIN.length], flatShading: true }));
    head.position.y = 1.15;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: HAIR[s.hair % HAIR.length], flatShading: true }));
    hair.position.y = 1.2;
    g.add(body, head, hair);
    if (s.gender === 'girl') {
      const long = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.2), new THREE.MeshLambertMaterial({ color: HAIR[s.hair % HAIR.length], flatShading: true }));
      long.position.set(0, 1.0, -0.17);
      g.add(long);
    }
    // The shirt: a yellow patch for a fan tee, a bright pink one for a funny graphic tee, a hood for a hoodie.
    if (s.shirtStyle === 'fan' || s.shirtStyle === 'graphic') {
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.05), new THREE.MeshLambertMaterial({ color: s.shirtStyle === 'fan' ? 0xfff1a8 : 0xff5fa2 }));
      patch.position.set(0, 0.7, 0.3);
      g.add(patch);
    }
    if (s.shirtStyle === 'hoodie') {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.22), new THREE.MeshLambertMaterial({ color: new THREE.Color(LOOK_COLORS[s.look]).multiplyScalar(0.75), flatShading: true }));
      hood.position.set(0, 0.98, -0.22);
      g.add(hood);
    }
    if (isPlayer) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      star.position.y = 1.75;
      star.name = 'star';
      g.add(star);
    }
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.userData.person = s.id;
      }
    });
    return g;
  }

  private figure(s: Student, playerId: number): Figure {
    let f = this.figures.get(s.id);
    if (!f) {
      const group = this.buildFigure(s, s.id === playerId);
      group.visible = false;
      this.applyMark(s.id, group);
      this.scene.add(group);
      f = { group, phase: Math.random() * Math.PI * 2, target: new THREE.Vector3() };
      this.figures.set(s.id, f);
    }
    return f;
  }

  /**
   * Put people where they are. Everyone else is already there; only the player walks.
   * Anyone not listed is hidden (gone home, or somewhere we're not showing).
   */
  setSpots(students: Student[], spots: Map<number, Spot>, playerId: number) {
    for (const [id, spot] of spots) {
      const f = this.figure(students[id], playerId);
      f.target = spot.pos.clone();
      if (id !== playerId || !f.group.visible) f.group.position.copy(spot.pos);
      f.group.visible = true;
      if (spot.face) f.group.lookAt(spot.face.x, 0, spot.face.z);
    }
    for (const [id, f] of this.figures) if (!spots.has(id)) f.group.visible = false;
  }

  /** Where everyone sits at lunch, table by table. */
  lunchSpots(tables: number[][]): Map<number, Spot> {
    const spots = new Map<number, Spot>();
    tables.forEach((t, ti) => t.forEach((id, seat) => spots.set(id, { pos: this.seatPos(ti, seat, t.length), face: this.tablePos(ti) })));
    return spots;
  }

  /** Lunch: everyone at their cafeteria tables. */
  setSeating(students: Student[], tables: number[][], playerId: number) {
    this.setSpots(students, this.lunchSpots(tables), playerId);
  }

  /** Show the player at the cafeteria door, about to choose a table. */
  placePlayerAtDoor(playerId: number, student: Student) {
    const f = this.figure(student, playerId);
    f.target = new THREE.Vector3(11.8, 0, 22.5);
    f.group.position.copy(f.target);
    f.group.visible = true;
  }

  /** Rebuild someone's figure after they change clothes. */
  refreshFigure(student: Student) {
    const f = this.figures.get(student.id);
    if (!f) return;
    const isPlayer = !!f.group.getObjectByName('star');
    const fresh = this.buildFigure(student, isPlayer);
    fresh.position.copy(f.group.position);
    fresh.rotation.copy(f.group.rotation);
    fresh.visible = f.group.visible;
    this.applyMark(student.id, fresh);
    this.scene.remove(f.group);
    this.scene.add(fresh);
    f.group = fresh;
  }

  /** Clear everyone out, for a new game. */
  reset() {
    for (const f of this.figures.values()) this.scene.remove(f.group);
    this.figures.clear();
    this.marker.visible = false;
    this.onTableClick = null;
    this.onTableHover = null;
    this.onPersonHover = null;
    this.setPicking(false);
  }

  // ---------------------------------------------------------------- camera and light

  private viewFor(place: Place): { pos: THREE.Vector3; target: THREE.Vector3 } {
    if (place === 'campus') return { target: CAMPUS_CENTER.clone(), pos: new THREE.Vector3(CAMPUS_CENTER.x, 72, CAMPUS_CENTER.z + 78) };
    const a = AREAS[place];
    const target = new THREE.Vector3((a.x0 + a.x1) / 2, 0, (a.z0 + a.z1) / 2);
    const size = Math.max(a.x1 - a.x0, a.z1 - a.z0);
    const dist = Math.max(14, size * 1.15);
    return { target, pos: new THREE.Vector3(target.x, dist * 0.85, target.z + dist * 0.9) };
  }

  /** Smoothly fly the camera to a place. */
  flyTo(place: Place) {
    this.flight = this.viewFor(place);
    this.controls.enabled = false;
  }

  /**
   * Fly in close on a point, from fairly high up, so people and groups are easy to tell apart. The view
   * aims a little in front of the point, so it shows above the panel at the bottom of the screen.
   */
  flyClose(point: THREE.Vector3, dist = 26) {
    const target = new THREE.Vector3(point.x, 0, point.z + dist * 0.2);
    this.flight = { target, pos: new THREE.Vector3(point.x, dist * 0.95, point.z + dist * 0.75) };
    this.controls.enabled = false;
  }

  /** Cut straight to a place. */
  jumpTo(place: Place) {
    const v = this.viewFor(place);
    this.camera.position.copy(v.pos);
    this.controls.target.copy(v.target);
    this.camera.lookAt(v.target);
  }

  setTimeOfDay(time: TimeOfDay) {
    const s = SKY[time];
    this.scene.background = new THREE.Color(s.sky);
    (this.scene.fog as THREE.Fog).color.setHex(s.sky);
    this.sun.intensity = s.sun;
    this.sun.color.setHex(s.sunColor);
    this.hemi.intensity = s.hemi;
    const low = time === 'evening' || time === 'afternoon';
    this.sun.position.set(CAMPUS_CENTER.x + (low ? 70 : 30), low ? 25 : 60, CAMPUS_CENTER.z + 10);
  }

  /** Title-screen mode on or off. */
  setAttract(on: boolean) {
    this.attract = on;
    this.controls.enabled = !on;
    if (!on) this.jumpTo('campus');
  }

  // ---------------------------------------------------------------- picking tables

  setPicking(on: boolean) {
    this.picking = on;
    if (!on) this.setHover(-1);
  }

  /** Let the player pick an open desk in a classroom (null to stop). Open desks glow; the chosen one glows brighter. */
  setDeskPicking(room: number | null, open: Set<number> = new Set(), chosen = -1) {
    if (this.deskPick) {
      const old = this.deskPick.room;
      this.deskPick = { room: old, open: new Set(), hovered: -1 };
      this.paintDesks();
    }
    this.deskPick = room === null ? null : { room, open, hovered: chosen };
    if (this.deskPick) this.paintDesks();
  }

  private paintDesks() {
    if (!this.deskPick) return;
    for (const m of this.desks.get(this.deskPick.room) ?? []) {
      const d = m.userData.desk as number;
      const glow = d === this.deskPick.hovered ? 0x8a6a00 : this.deskPick.open.has(d) ? 0x2f6b00 : 0x000000;
      (m.material as THREE.MeshLambertMaterial).emissive.setHex(glow);
    }
  }

  /** Fly to one classroom. */
  flyToClassroom(room: number) {
    const target = classroomCenter(room);
    this.flight = { target, pos: new THREE.Vector3(target.x, 15, target.z + (room < 4 ? 13 : -13)) };
    this.controls.enabled = false;
  }

  /** Highlight a table (e.g. the one you're sitting at). */
  markTable(ti: number | null) {
    if (ti === null) {
      this.marker.visible = false;
      return;
    }
    const p = this.tablePos(ti);
    this.marker.position.set(p.x, 0.14, p.z);
    this.marker.visible = true;
  }

  private setHover(ti: number) {
    if (ti === this.hovered) return;
    if (this.hovered >= 0) (this.tables[this.hovered].material as THREE.MeshLambertMaterial).emissive.setHex(0x000000);
    this.hovered = ti;
    if (ti >= 0) (this.tables[ti].material as THREE.MeshLambertMaterial).emissive.setHex(0x3a6f00);
    this.renderer.domElement.style.cursor = ti >= 0 ? 'pointer' : 'default';
    this.onTableHover?.(ti);
  }

  private onPointerMove(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const people = [...this.figures.values()].filter((f) => f.group.visible).map((f) => f.group);
    const hitPerson = this.raycaster.intersectObjects(people, true)[0];
    this.hoveredPerson = hitPerson ? (hitPerson.object.userData.person as number) : null;
    this.onPersonHover?.(this.hoveredPerson);
    if (this.onPersonClick) this.renderer.domElement.style.cursor = this.hoveredPerson !== null ? 'pointer' : 'default';
    if (this.deskPick) {
      const desks = (this.desks.get(this.deskPick.room) ?? []).filter((m) => this.deskPick!.open.has(m.userData.desk as number));
      const hitDesk = this.raycaster.intersectObjects(desks)[0];
      const desk = hitDesk ? (hitDesk.object.userData.desk as number) : -1;
      if (desk !== this.deskPick.hovered) {
        this.deskPick.hovered = desk;
        this.paintDesks();
        this.renderer.domElement.style.cursor = desk >= 0 ? 'pointer' : 'default';
        if (desk >= 0) this.onDeskHover?.(desk);
      }
    }
    if (!this.picking) return;
    const hit = this.raycaster.intersectObjects(this.tables)[0];
    this.setHover(hit ? (hit.object.userData.ti as number) : -1);
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame(t: number) {
    if (this.attract) {
      const a = t / 26000;
      this.camera.position.set(CAMPUS_CENTER.x + Math.cos(a) * 85, 58, CAMPUS_CENTER.z + Math.sin(a) * 85);
      this.camera.lookAt(CAMPUS_CENTER);
    } else if (this.flight) {
      this.camera.position.lerp(this.flight.pos, 0.07);
      this.controls.target.lerp(this.flight.target, 0.07);
      this.camera.lookAt(this.controls.target);
      if (this.camera.position.distanceTo(this.flight.pos) < 0.2) {
        this.flight = null;
        this.controls.enabled = true;
      }
    } else this.controls.update();
    for (const f of this.figures.values()) {
      if (!f.group.visible) continue;
      // Walk toward the target, then idle-bob.
      const pos = f.group.position;
      const dx = f.target.x - pos.x;
      const dz = f.target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, 0.16);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        pos.y = Math.abs(Math.sin(t / 90 + f.phase)) * 0.12;
      } else {
        pos.y = Math.sin(t / 600 + f.phase) * 0.02;
      }
      const star = f.group.getObjectByName('star');
      if (star) star.rotation.y = t / 500;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

// ---------------------------------------------------------------- where people stand

/** Desk positions in a classroom, facing the front. */
export function classroomSeats(room: number): Spot[] {
  const r = CLASSROOMS[room % CLASSROOMS.length];
  const northSide = room < 4;
  const front = new THREE.Vector3((r.x0 + r.x1) / 2, 0, northSide ? r.z0 : r.z1);
  const out: Spot[] = [];
  // Six rows of six desks; desk 0 is front-left, matching the simulation's desk numbers.
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 6; col++) {
      const x = r.x0 + 2 + col * 2;
      const z = northSide ? r.z0 + 3.6 + row * 1.35 : r.z1 - 3.6 - row * 1.35;
      out.push({ pos: new THREE.Vector3(x, 0, z), face: front });
    }
  return out;
}

/** The middle of a classroom, for the camera. */
export function classroomCenter(room: number): THREE.Vector3 {
  const r = CLASSROOMS[room % CLASSROOMS.length];
  return new THREE.Vector3((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2);
}

/** People standing in a loose circle, chatting. */
/** Pants and skirts are one dark color for everyone, so the shirt stays the only clue to someone's crowd. */
const LEGWEAR = new THREE.MeshLambertMaterial({ color: 0x34405a, flatShading: true });

/**
 * Below the shirt: straight pant legs for boys, a flared skirt over bare legs for girls — a silhouette
 * you can tell apart from across the room.
 */
function lowerBody(s: Student): THREE.Mesh[] {
  const parts: THREE.Mesh[] = [];
  if (s.gender === 'boy') {
    for (const x of [-0.13, 0.13]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.44, 6), LEGWEAR);
      leg.position.set(x, 0.22, 0);
      parts.push(leg);
    }
  } else {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.56, 0.34, 10), LEGWEAR);
    skirt.position.y = 0.4;
    parts.push(skirt);
    const skin = new THREE.MeshLambertMaterial({ color: SKIN[s.skin % SKIN.length], flatShading: true });
    for (const x of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 5), skin);
      leg.position.set(x, 0.13, 0);
      parts.push(leg);
    }
  }
  return parts;
}

/** How someone you've met feels about you, for the color of their marker. */
export type KnownTone = 'friend' | 'neutral' | 'cool';

/** A text tag that floats in the scene and stays the same small size on screen however close the camera is. */
function labelSprite(text: string, background: string, height: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = 'bold 44px Trebuchet MS, sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 40;
  canvas.width = w;
  canvas.height = 72;
  ctx.font = font;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, 72, 18);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, 38);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false }));
  sprite.scale.set((height * w) / 72, height, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function circle(center: THREE.Vector3, n: number, radius = 1.1): Spot[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    const r = n > 1 ? radius : 0;
    return { pos: new THREE.Vector3(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r), face: center };
  });
}

/** A random point inside an area, away from its edges. */
export function pointIn(place: Exclude<Place, 'campus'>, margin = 2): THREE.Vector3 {
  const a = AREAS[place];
  return new THREE.Vector3(a.x0 + margin + Math.random() * (a.x1 - a.x0 - 2 * margin), 0, a.z0 + margin + Math.random() * (a.z1 - a.z0 - 2 * margin));
}

export function areaCenter(place: Exclude<Place, 'campus'>): THREE.Vector3 {
  const a = AREAS[place];
  return new THREE.Vector3((a.x0 + a.x1) / 2, 0, (a.z0 + a.z1) / 2);
}
