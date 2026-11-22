/**
 * Read some conversations in words, to judge whether they sound like people talking.
 *
 *   pnpm talk [--seed 1] [--weeks 6] [--count 8]
 */
import { runConvo } from '../cards/convo';
import { runSemester } from '../cards/day';
import { transcript } from '../cards/lines';
import { createWorld, friendsOf } from '../cards/world';

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};
const w = createWorld({ students: 200, seed: arg('seed', 1) });
runSemester(w, arg('weeks', 6));

const count = arg('count', 8);
for (let i = 0; i < count; i++) {
  for (const p of w.people) {
    p.energy = 10;
    p.used.clear();
    p.openUpsThisWeek = 0;
  }
  const first = w.rng.int(w.n);
  // Take turns between a table of friends, a table with whoever's around, and two friends alone.
  const friends = friendsOf(w, first);
  const others = w.rng.shuffle(w.people.map((p) => p.id).filter((id) => id !== first && !friends.includes(id)));
  const members = i % 3 === 2 && friends.length ? [first, friends[0]] : [first, ...(i % 3 === 0 ? friends : []), ...others].slice(0, 4);
  const c = runConvo(w, members, [], 10, { private: members.length === 2 });
  const name = (id: number) => w.people[id].name.replace(/ (\S)\S*$/, ' $1.');
  console.log(`\n--- ${members.map(name).join(', ')}`);
  transcript(w, c).forEach((s, j) => {
    const { card, success } = c.plays[j];
    const how = card === 'standup' ? (success ? ', it works' : ', it fails') : card === 'joke' && !success ? ', it flops' : '';
    console.log(`${name(s.speaker).padStart(11)}: ${s.text}  [${card}${how}]`);
    if (s.answer) console.log(`${name(s.answer.speaker).padStart(11)}: ${s.answer.text}`);
  });
}
