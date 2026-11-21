/** Entry point: title screen → profile → loading → the game. */
import { runDay, seatLunch } from '../sim/day';
import { createWorld } from '../sim/generate';
import { createCharacter } from './create';
import { Game } from './game';
import { titleSpots } from './places';
import { SchoolScene } from './scene';
import { wireButtonSounds } from './sfx';
import { loadingScreen, titleScreen } from './title';
import { Coach, showWelcome } from './tutorial';

const ui = document.getElementById('ui')!;
const sceneEl = document.getElementById('scene')!;
wireButtonSounds(ui);

/** A living school behind the title screen: a random school a few days in — lunch in the cafeteria, the teams out on the field. */
function backdrop(): SchoolScene {
  const world = createWorld({ students: 200, weeks: 1, seed: Math.floor(Math.random() * 1e9), follow: null, storyteller: false });
  for (let d = 0; d < 3; d++) runDay(world);
  const scene = new SchoolScene(sceneEl, Math.ceil(world.students.length / 7));
  scene.setSpots(world.students, titleSpots(world, scene.lunchSpots(seatLunch(world).tables)), -1);
  scene.setAttract(true);
  return scene;
}

const nextFrame = () => new Promise((r) => setTimeout(r, 60));

async function start() {
  const scene = backdrop();
  for (;;) {
    document.body.className = 'title';
    const choice = await titleScreen(ui);
    const coach = new Coach(choice === 'tutorial');
    if (choice === 'tutorial') await showWelcome();
    document.body.className = 'creating';
    const setup = await createCharacter(ui, coach);
    if (!setup) {
      coach.dispose();
      continue; // back to the title screen
    }
    document.body.className = '';
    loadingScreen(ui, 'Building your school…');
    await nextFrame();
    const game = new Game(ui, scene, setup, coach);
    await game.run();
    return;
  }
}

void start();
