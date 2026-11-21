import { ABILITY_QUALITY } from './content';
import { meet, novelty, nudge, nudge01, schoolKnowledge, tag, tagOf } from './rel';
import { sigmoid } from './rng';
import { count } from './stories';

import type { Act, ActKind, Rel, Student, Witness, World } from './types';

/** Acts loud enough that you'd notice (and remember) a stranger doing them. */
const NOTABLE: ReadonlySet<ActKind> = new Set(['putdown', 'shove', 'exclude', 'askout', 'breakup', 'report', 'star', 'rumor', 'fallout', 'cheat']);

/** Status above which everyone knows who you are. */
const FAMOUS = 0.9;

/**
 * What `viewer` thinks of `other`, if they'd have an opinion at all. Bystanders don't
 * form opinions of strangers doing small talk; they do notice strangers doing something
 * notable, and everyone notices the famous.
 */
function noticed(world: World, viewer: Student, other: Student, act: Act, wt: number): Rel | null {
  const known = viewer.rels.get(other.id);
  if (known) return known;
  if (wt >= 0.9 || other.status > FAMOUS || (NOTABLE.has(act.kind) && wt >= 0.3)) return meet(world, viewer, other);
  return null;
}

/**
 * How everyone who saw (or heard about) an act updates what they think.
 * The same function handles eyewitnesses (wt = 1) and gossip (wt < 1),
 * which is what makes stories matter.
 */
export function applyAct(world: World, act: Act, witnesses: Witness[], hearsay = false) {
  world.onAct?.(act, witnesses, hearsay);
  const actor = world.students[act.actor];
  const target = act.target >= 0 ? world.students[act.target] : null;
  for (const w of witnesses) {
    if (w.id === act.actor) continue;
    const viewer = world.students[w.id];
    if (target && w.id === target.id) onTarget(world, act, viewer, actor, w.wt);
    else onOnlooker(world, act, viewer, actor, target, w.wt);
  }
}

/** Effects on the person the act was aimed at. */
function onTarget(world: World, act: Act, me: Student, actor: Student, wt: number) {
  const r = meet(world, me, actor);
  // The new kid is grateful for any warmth: it counts for more.
  const k = wt * novelty(r) * (world.day < me.newUntil ? 1.8 : 1);
  r.fam = nudge01(r.fam, 0.02 * wt);
  switch (act.kind) {
    case 'greet':
      r.aff = nudge(r.aff, 0.01 * k);
      break;
    case 'ask':
    case 'listen':
      r.aff = nudge(r.aff, 0.035 * k * (0.6 + me.traits.E * 0.6));
      // Asking about something they care about (their shirt, a thing they love) lands better;
      // bringing up something they don't care for falls a little flat.
      if (act.topic !== undefined) r.aff = nudge(r.aff, 0.03 * k * me.opinions[act.topic]);
      if (act.interest !== undefined) r.aff = nudge(r.aff, 0.03 * k * (me.interests[act.interest] - 0.3));
      // They wore that shirt to be talked to: noticing it is an easy, welcome opener.
      if (act.aboutShirt) r.aff = nudge(r.aff, 0.02 * k);
      break;
    case 'agree':
      r.aff = nudge(r.aff, 0.015 * k);
      break;
    case 'compliment': {
      // From far below, a compliment reads as sucking up.
      const gap = me.status - actor.status;
      r.aff = nudge(r.aff, 0.04 * k);
      if (gap > 0.35) {
        r.resp = nudge(r.resp, -0.02 * k);
        tag(r, 'tryhard', 0.04 * wt);
      }
      break;
    }
    case 'share': {
      // Self-disclosure pays only when it matches how close we already are.
      const close = r.aff * 0.6 + r.fam * 0.4;
      const depth = act.stance ?? 0.3;
      if (close >= depth - 0.15) {
        r.aff = nudge(r.aff, 0.05 * k);
        r.trust = nudge(r.trust, 0.05 * k);
      } else {
        r.aff = nudge(r.aff, -0.03 * k);
      }
      break;
    }
    case 'help':
      // Helping shows off what you're good at, and builds trust.
      r.aff = nudge(r.aff, 0.04 * k);
      r.trust = nudge(r.trust, 0.06 * k);
      tag(r, 'kind', 0.05 * wt);
      if (act.ability) {
        // Help with schoolwork reflects what you currently know, so doing the work pays off here.
        const q = ABILITY_QUALITY[act.ability];
        const strength = act.ability === 'academics' ? schoolKnowledge(actor) : actor.abilities[act.ability];
        r.resp = nudge(r.resp, wt * strength * (me.admires[q] - 0.1) * 0.1 * novelty(r));
        // Real help leaves me owing them, and I'm grateful whether or not I admire brains.
        r.owed = Math.min(1, r.owed + 0.15 * strength * wt);
        r.resp = nudge(r.resp, 0.03 * strength * wt);
      }
      break;
    case 'tease':
      if (act.friendly) {
        r.aff = nudge(r.aff, 0.04 * k);
        r.trust = nudge(r.trust, 0.015 * k);
      } else {
        r.aff = nudge(r.aff, -0.07 * k);
        r.hurt += 0.5 * wt;
        tag(r, 'mean', 0.08 * wt);
        me.stress += 0.05 * wt;
      }
      break;
    case 'putdown':
      r.aff = nudge(r.aff, -0.12 * k);
      r.hurt += wt;
      tag(r, 'mean', 0.15 * wt);
      if (act.outcome === 'dominated') {
        r.fear = nudge01(r.fear, 0.08 * wt);
        me.stress += 0.15 * wt;
      }
      if (act.defender !== undefined && act.defender !== me.id) {
        // Someone stood up for me — and even more if they took a hit for it.
        const d = meet(world, me, world.students[act.defender]);
        const tookHit = act.outcome === 'backfired' ? 1.3 : 1;
        d.trust = nudge(d.trust, 0.25 * wt * tookHit);
        d.aff = nudge(d.aff, 0.15 * wt * tookHit);
        tag(d, 'loyal', 0.25 * wt);
      }
      break;
    case 'exclude':
      r.aff = nudge(r.aff, -0.1 * k);
      r.hurt += 0.6 * wt;
      me.stress += 0.1 * wt;
      break;
    case 'shove':
      r.aff = nudge(r.aff, -0.25 * k);
      r.fear = nudge01(r.fear, 0.1 * wt);
      r.hurt += 2 * wt;
      me.stress += 0.25 * wt;
      break;
    case 'report':
      // The reported student resents the reporter.
      r.aff = nudge(r.aff, -0.15 * k);
      tag(r, 'snitch', 0.3 * wt);
      break;
    case 'ditch':
      r.aff = nudge(r.aff, -0.06 * k);
      r.trust = nudge(r.trust, -0.08 * k * (0.5 + me.loyalty));
      break;
    case 'askout':
      if (act.success) {
        r.aff = nudge(r.aff, 0.1 * k);
      }
      break;
    case 'invite':
      if (act.success) {
        // An invite with an easy out shows a little less interest, so a yes means a little less.
        r.aff = nudge(r.aff, (act.leaveOut ? 0.03 : 0.04) * k);
        r.trust = nudge(r.trust, 0.02 * k);
      } else if (!act.leaveOut) r.aff = nudge(r.aff, -0.02 * k);
      break;
    case 'breakup':
      r.aff = nudge(r.aff, -0.2 * k);
      r.trust = nudge(r.trust, -0.15 * k);
      break;
    case 'opinion':
    case 'lore':
    case 'joke':
    case 'brag':
    case 'gossip':
    case 'star':
      onOnlooker(world, act, me, actor, null, wt);
      break;
  }
}

/** Effects on everyone else who saw or heard about it. */
function onOnlooker(world: World, act: Act, me: Student, actor: Student, target: Student | null, wt: number) {
  const r = noticed(world, me, actor, act, wt);
  if (!r) return;
  const k = wt * novelty(r);
  const likesTarget = target ? (me.rels.get(target.id)?.aff ?? 0) : 0;
  switch (act.kind) {
    case 'opinion': {
      const t = act.topic!;
      const stance = act.stance!;
      const align = stance * me.opinions[t];
      r.aff = nudge(r.aff, 0.04 * k * align);
      // Two-facing: they told me the opposite before.
      if (wt >= 0.9) {
        if (!r.said) r.said = new Map();
        const before = r.said.get(t);
        if (before !== undefined && Math.abs(before - stance) > 1.2) {
          r.trust = nudge(r.trust, -0.06);
          tag(r, 'fake', 0.2);
          count(world, 'fakeCaught');
        }
        r.said.set(t, stance);
      }
      break;
    }
    case 'lore': {
      const interest = me.interests[act.interest!];
      const knows = actor.interests[act.interest!];
      if (interest > 0.4) {
        r.resp = nudge(r.resp, 0.04 * k * knows * interest);
        r.aff = nudge(r.aff, 0.02 * k * interest);
      } else {
        r.aff = nudge(r.aff, -0.01 * k);
      }
      break;
    }
    case 'joke':
      if (act.success) {
        r.aff = nudge(r.aff, 0.02 * k);
        r.resp = nudge(r.resp, 0.015 * k * me.admires.funny);
        tag(r, 'funny', 0.04 * wt);
      } else {
        r.resp = nudge(r.resp, -0.015 * k);
      }
      break;
    case 'brag': {
      const q = act.ability ? ABILITY_QUALITY[act.ability] : 'stylish';
      r.resp = nudge(r.resp, 0.04 * k * (me.admires[q] - 0.45));
      if (actor.status < 0.5) tag(r, 'tryhard', 0.03 * wt);
      break;
    }
    case 'gossip':
      r.aff = nudge(r.aff, 0.015 * k);
      tag(r, 'gossip', 0.05 * wt);
      break;
    case 'star':
      displayStar(me, r, act, wt);
      break;
    case 'tease': {
      if (!target) break;
      // Onlookers read the tease through their own lens (reputation, sensitivity).
      const friendlyRead = sigmoid(3 * (r.aff - tagOf(r, 'mean')) - 2 * (me.traits.N - 0.5) + (act.friendly ? 1.5 : -1.5));
      if (friendlyRead > 0.5) r.aff = nudge(r.aff, 0.01 * k);
      else {
        if (likesTarget > 0.3) r.aff = nudge(r.aff, -0.04 * k);
        tag(r, 'mean', 0.03 * wt);
      }
      break;
    }
    case 'putdown':
      onPutdownSeen(world, act, me, actor, target!, r, k, wt, likesTarget);
      break;
    case 'exclude':
      if (likesTarget > 0.2) r.aff = nudge(r.aff, -0.05 * k);
      r.aff = nudge(r.aff, -0.02 * k * me.traits.A);
      r.fear = nudge01(r.fear, 0.02 * wt);
      tag(r, 'mean', 0.04 * wt);
      break;
    case 'shove':
      r.aff = nudge(r.aff, -0.12 * k);
      r.resp = nudge(r.resp, -0.04 * k);
      r.fear = nudge01(r.fear, 0.03 * wt);
      tag(r, 'mean', 0.15 * wt);
      break;
    case 'report': {
      // Serious things: fair enough. Minor stuff: snitch.
      const severity = act.severity ?? 0;
      const friendOfReported = target ? (me.rels.get(target.id)?.aff ?? 0) > 0.35 : false;
      if (severity < 2) {
        tag(r, 'snitch', 0.15 * wt);
        r.resp = nudge(r.resp, -0.04 * k);
      } else if (friendOfReported) {
        tag(r, 'snitch', 0.08 * wt);
        r.aff = nudge(r.aff, -0.04 * k);
      }
      const rt = target && severity >= 2 ? noticed(world, me, target, act, wt) : null;
      if (rt) rt.fear = nudge01(rt.fear, -0.05 * wt);
      break;
    }
    case 'ditch':
      r.trust = nudge(r.trust, -0.02 * k * me.loyalty);
      break;
    case 'invite':
      // Being asked is flattering; turning down a pushy public ask is a little awkward.
      if (act.success) r.aff = nudge(r.aff, 0.03 * k);
      else if (!act.leaveOut) r.aff = nudge(r.aff, -0.01 * k);
      break;
    case 'rumor':
      // A made-up story about someone: believers think less of them.
      r.resp = nudge(r.resp, -0.06 * k);
      r.trust = nudge(r.trust, -0.07 * k);
      r.aff = nudge(r.aff, -0.02 * k);
      break;
    case 'cheat':
      // Caught copying homework: a little less respect.
      r.resp = nudge(r.resp, -0.04 * k);
      tag(r, 'troublemaker', 0.05 * wt);
      break;
    case 'fallout':
      // Two people falling out: onlookers mostly just know about it.
      r.fam = nudge01(r.fam, 0.01 * wt);
      break;
    case 'sneakoff':
      // Most people respect it less; the edgy crowd finds it a bit cool.
      r.resp = nudge(r.resp, 0.05 * k * (me.admires.edgy - 0.55) - 0.02 * k * me.traits.C);
      tag(r, 'troublemaker', 0.08 * wt);
      break;
    case 'askout':
      if (!act.success) r.resp = nudge(r.resp, -0.03 * k);
      else r.resp = nudge(r.resp, 0.02 * k);
      break;
    case 'breakup':
      if (target && likesTarget > 0.4) r.aff = nudge(r.aff, -0.05 * k);
      break;
    default:
      // Small talk seen from the side builds a little familiarity, nothing else.
      r.fam = nudge01(r.fam, 0.003 * wt);
  }
}

function displayStar(me: Student, r: ReturnType<typeof meet>, act: Act, wt: number) {
  const q = ABILITY_QUALITY[act.ability!];
  r.resp = nudge(r.resp, 0.08 * wt * (me.admires[q] - 0.2));
  r.aff = nudge(r.aff, 0.01 * wt);
  r.fam = nudge01(r.fam, 0.01 * wt);
}

function onPutdownSeen(
  world: World,
  act: Act,
  me: Student,
  actor: Student,
  target: Student,
  r: ReturnType<typeof meet>,
  k: number,
  wt: number,
  likesTarget: number,
) {
  const rt = noticed(world, me, target, act, wt);
  if (!rt) return;
  // Most people privately dislike watching it, more so if they're kind or like the target.
  r.aff = nudge(r.aff, -k * (0.03 + 0.05 * me.traits.A + 0.1 * Math.max(0, likesTarget)));
  tag(r, 'mean', 0.08 * wt);
  switch (act.outcome) {
    case 'dominated':
      // It "worked": the actor looks powerful, the target looks small — but it earns fear, not respect,
      // and only people who admire edginess are impressed.
      r.fear = nudge01(r.fear, 0.05 * wt);
      r.resp = nudge(r.resp, 0.04 * k * (me.admires.edgy - 0.5));
      rt.resp = nudge(rt.resp, -0.04 * k);
      break;
    case 'refused':
    case 'walked':
      rt.resp = nudge(rt.resp, (act.outcome === 'refused' ? 0.03 : 0.0) * k);
      r.resp = nudge(r.resp, -0.02 * k);
      break;
    case 'flipped':
      rt.resp = nudge(rt.resp, 0.06 * k);
      rt.aff = nudge(rt.aff, 0.03 * k);
      r.resp = nudge(r.resp, -0.05 * k);
      r.fear = nudge01(r.fear, -0.06 * wt);
      break;
    case 'defended': {
      r.resp = nudge(r.resp, -0.03 * k);
      r.fear = nudge01(r.fear, -0.06 * wt);
      const d = act.defender !== undefined && act.defender !== me.id ? noticed(world, me, world.students[act.defender], act, wt) : null;
      if (d) {
        d.resp = nudge(d.resp, 0.06 * wt * (0.5 + Math.max(0, likesTarget)));
        d.aff = nudge(d.aff, 0.03 * wt);
        tag(d, 'loyal', 0.1 * wt);
      }
      break;
    }
    case 'backfired': {
      // The bully turned on the defender and won this round. Still, people who like the target saw a brave act.
      r.fear = nudge01(r.fear, 0.04 * wt);
      const d = act.defender !== undefined && act.defender !== me.id ? noticed(world, me, world.students[act.defender], act, wt) : null;
      if (d) {
        d.resp = nudge(d.resp, wt * (0.05 * Math.max(0, likesTarget) - 0.02));
        d.aff = nudge(d.aff, 0.02 * wt);
        tag(d, 'loyal', 0.08 * wt);
      }
      rt.resp = nudge(rt.resp, -0.02 * k);
      break;
    }
  }
}
