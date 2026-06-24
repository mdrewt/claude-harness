// Browser entrypoint: wires the headless sim to the renderer at a fixed timestep.
import { mount } from './render.js';
import { init, step } from './sim.js';

const el = document.getElementById('app');
if (el) {
  const draw = await mount(el);
  let state = init(Date.now() >>> 0);
  draw(state);
  setInterval(() => {
    state = step(state);
    draw(state);
  }, 1000 / 30);
}
