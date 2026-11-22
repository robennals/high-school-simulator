/**
 * Print every canned thread in full, for a person to read: the deep path, with the exits at each turn.
 *
 *   pnpm threads [thread id]
 */
import { THREADS } from '../cards/threads.data';

const only = process.argv[2];
for (const t of THREADS) {
  if (only && t.id !== only) continue;
  const { entry } = t;
  console.log(`\n=== ${t.id} (${entry.card === 'talk' ? `talk: ${entry.interest}` : entry.card})`);
  console.log(`    ${t.facts}`);
  if (entry.card === 'ask') console.log(`Friend: ${entry.question}`);
  t.turns.forEach((line, turn) => {
    console.log(`${turn % 2 ? 'Friend' : ' Owner'}: ${line}`);
    if (turn !== 1 && turn !== 3 && turn !== 5) return;
    const { wrap, misses } = t.choices[turn];
    for (const [label, exit] of [['wrap', wrap], ...misses.map((m) => [m.kind, m] as const)] as const) {
      console.log(`          or [${label}] ${exit.line}`);
      console.log(`             -> ${exit.reaction}`);
    }
    if (turn !== 1) console.log(`          if too soon -> ${t.tooSoon[turn]}`);
  });
}
