// Rendering layer (Pixi). Reads State, draws it. Never mutates simulation state.
import { Application, Graphics } from 'pixi.js';
import type { State } from './sim.js';
export async function mount(el: HTMLElement) {
  const app = new Application();
  await app.init({ background: '#101018', resizeTo: el });
  el.appendChild(app.canvas);
  const dot = new Graphics();
  app.stage.addChild(dot);
  return (s: State) => {
    dot.clear();
    dot.circle(200 + s.x, 150, 8).fill('#7af');
  };
}
