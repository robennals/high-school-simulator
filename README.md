# High School Simulator

A strategy / sim / card game about the social side of high school. You arrive
as a freshman at a big school where you know nobody; 199 simulated students
are all trying to find their place too. Design: [docs/design](docs/design/README.md).

## Play

```bash
pnpm install
pnpm dev          # then open http://localhost:5317
```

## Simulation tools

```bash
pnpm sim --seed 1         # run a semester with no player; prints realism metrics
pnpm strategies           # strategy experiment: is any way of spending time an easy win?
pnpm test                 # unit tests, including a scripted player
node e2e/smoke.mjs http://localhost:5317/ <screenshot-dir>   # play a week in a real browser
```
