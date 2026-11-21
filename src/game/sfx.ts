/**
 * Small synthesized UI sounds (no audio files): a soft click for buttons, a card flick, a chime for
 * events. The sound setting is remembered between visits.
 */
const KEY = 'hss-sound';
let ctx: AudioContext | null = null;
let on = localStorage.getItem(KEY) !== 'off';

export function soundOn(): boolean {
  return on;
}

export function setSound(value: boolean) {
  on = value;
  localStorage.setItem(KEY, value ? 'on' : 'off');
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number, slideTo?: number) {
  if (!on) return;
  ctx ??= new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export const sfx = {
  click: () => tone(660, 0.06, 'triangle', 0.05),
  card: () => tone(420, 0.12, 'triangle', 0.06, 880),
  chime: () => {
    tone(784, 0.25, 'sine', 0.05);
    setTimeout(() => tone(1047, 0.35, 'sine', 0.04), 90);
  },
  bad: () => tone(220, 0.25, 'sawtooth', 0.025, 140),
};

/** Every button click makes a soft sound; cards and big buttons have their own. */
export function wireButtonSounds(root: HTMLElement) {
  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('button');
    if (!el || (el as HTMLButtonElement).disabled) return;
    if (el.classList.contains('card')) sfx.card();
    else sfx.click();
  });
}
