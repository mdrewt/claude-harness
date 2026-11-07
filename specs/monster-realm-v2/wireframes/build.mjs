#!/usr/bin/env node
// build.mjs — regenerates the wf-1 diagrams. Deterministic: same inputs, same bytes.
//   node build.mjs                      current/*.json + screens.mjs -> svg/*.svg
//   node build.mjs --import <captureDir>  reduces a capture run into current/ and shipped/
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BATTLE_HUD, KINDS } from './channels.mjs';
import { CONTENT_MAX_REM, contrast, CONTRAST_PAIRS, drawCurrent, drawProposed, FONT, label, legend, REM_BASE, scaleOf, SHEET_WIDTH_MAX_FRACTION, SHEET_WIDTH_REM, solve, SPACE, svgDoc, TOKENS, UI_SCALE_MAX, UI_SCALE_MIN, worldGrid } from './lib.mjs';
import { SCREENS, THREE_SIZE_SCREENS, WINDOW_SIZES } from './screens.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 1280; const H = 720; const GUT = 60; const TOP = 110;

export function readCapture(name) { return JSON.parse(readFileSync(join(HERE, 'current', `${name}.json`), 'utf8')); }

function importCapture(dir) {
  mkdirSync(join(HERE, 'current'), { recursive: true });
  mkdirSync(join(HERE, 'shipped'), { recursive: true });
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json') && !n.startsWith('_'))) {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const els = c.els
      .filter((e) => (e.t === 'canvas' || !e.occ) && !e.off && !(e.cls ?? '').includes('sr-only') && e.w >= 1 && e.h >= 1)
      .filter((e) => e.t === 'canvas' || e.text || e.paint)
      .map(({ t, id, cls, role, tid, sel, dis, x, y, w, h, text, fs, fw, fg, bg, bd, pad, gap, pos, ov, sh, ch }) => ({
        t, id, cls: cls || undefined, role, tid, sel, dis, x, y, w, h, text, fs, fw, fg, bg, bd, pad, gap: gap === 'normal' ? undefined : gap, pos: pos === 'static' ? undefined : pos,
        scrolls: ov === 'auto' || ov === 'scroll' ? sh > ch + 1 : undefined,
      }));
    const out = { name: c.name, note: c.note, sha: c.sha, viewport: c.viewport, dpr: c.dpr, rootFont: c.rootFont, stack: c.stack, navActive: c.navActive, els };
    writeFileSync(join(HERE, 'current', f), `${JSON.stringify(out)}\n`);
    copyFileSync(join(dir, f.replace('.json', '.jpg')), join(HERE, 'shipped', f.replace('.json', '.jpg')));
  }
}

function proposedAt(id, win) {
  const { uiScale, tileCssPx, deviceScale } = scaleOf(win.w, win.h, win.dpr);
  const rem = REM_BASE * uiScale;
  const root = SCREENS[id].build();
  const { out, issues } = solve(root, { x: 0, y: 0, w: win.w, h: win.h }, rem);
  const body = (root.worldBack ? worldGrid(win.w, win.h, tileCssPx) : `<rect width="${win.w}" height="${win.h}" fill="#000"/>`) + drawProposed(out, rem);
  return { body, elements: out, issues, uiScale, deviceScale, tileCssPx, rem };
}
export { proposedAt };

const panel = (x, y, w, h, attrs, inner) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${attrs}>${inner}</svg>`;

function currentPanel(s) {
  const names = s.current;
  if (names.length === 1) return drawCurrent(readCapture(names[0]));
  const cw = W / 2; const ch = H / 2;
  return names.map((n, i) => {
    const x = (i % 2) * cw; const y = Math.floor(i / 2) * ch;
    const c = readCapture(n);
    return `<g transform="translate(${x} ${y}) scale(0.5)" data-capture="${n}">${drawCurrent(c)}<rect width="${W}" height="${H}" fill="none" stroke="#fbbf24" stroke-width="3"/>${label(16, 44, n, 30, '#fbbf24')}</g>`;
  }).join('\n');
}

export function spreadSvg(id) {
  const s = SCREENS[id];
  const ref = { w: W, h: H, dpr: 1 };
  const p = proposedAt(id, ref);
  const hd = [
    label(0, 30, s.title, 28),
    legend(W + GUT, 30),
    label(0, TOP - 16, `CURRENT: read from the running client at d90c32c9, 1280x720${s.notShipped ? ' (NOT SHIPPED; nearest screen)' : ''}`, 20, s.notShipped ? '#fca5a5' : '#fbbf24'),
    label(W + GUT, TOP - 16, 'PROPOSED: 1280x720, dpr 1, uiScale 1.00 (original schematic)', 20, '#86efac'),
  ];
  if (s.notShipped) hd.push(label(0, 66, s.notShipped, 18, '#fca5a5', false));
  const body = [
    ...hd,
    panel(0, TOP, W, H, `data-panel="current" data-captures="${s.current.join(',')}"`, currentPanel(s)),
    panel(W + GUT, TOP, W, H, 'data-panel="proposed" data-window="1280x720@1"', p.body),
  ].join('\n');
  return svgDoc(W * 2 + GUT, TOP + H + 4, body, `${s.title}: CURRENT vs PROPOSED`);
}

export function sizesSvg(id) {
  const s = SCREENS[id];
  const parts = [label(0, 30, `${s.title}: PROPOSED at three window sizes`, 28), legend(900, 30)];
  let y = 60;
  let maxW = 0;
  for (const win of WINDOW_SIZES) {
    const p = proposedAt(id, win);
    parts.push(label(0, y + 28, `${win.w}x${win.h} CSS, dpr ${win.dpr} (${Math.round(win.w * win.dpr)}x${Math.round(win.h * win.dpr)} device): uiScale ${p.uiScale.toFixed(3)}, world deviceScale ${p.deviceScale}, tile ${p.tileCssPx.toFixed(1)} CSS px, body text ${(0.875 * p.rem).toFixed(2)} px`, 22, '#86efac'));
    parts.push(panel(0, y + 44, win.w, win.h, `data-panel="proposed" data-window="${win.w}x${win.h}@${win.dpr}"`, p.body));
    y += 44 + win.h + 32;
    maxW = Math.max(maxW, win.w);
  }
  return svgDoc(Math.max(maxW, 1500), y, parts.join('\n'), `${s.title}: three window sizes`);
}

// ---- generated doc regions: the tables cannot drift from the numbers the drawings use ----------
export const DOC = join(HERE, '..', 'M-ui-foundation-wireframes.md');
const ratio = (n) => `${n.toFixed(2)}:1`;
export function tokenTable() {
  const L = ['| Token | Value | `prefers-contrast: more` |', '|---|---|---|'];
  for (const name of Object.keys(TOKENS.base)) L.push(`| \`${name}\` | \`${TOKENS.base[name]}\` | \`${TOKENS.more[name]}\` |`);
  L.push('', '| Pair | Floor | Measured | Measured (`more`) |', '|---|---|---|---|');
  for (const [n, f, b, floor] of CONTRAST_PAIRS) L.push(`| ${n} | ${floor}:1 | ${ratio(contrast(TOKENS.base[f], TOKENS.base[b]))} | ${ratio(contrast(TOKENS.more[f], TOKENS.more[b]))} |`);
  L.push('', '| Spacing token | rem | px at uiScale 1 |', '|---|---|---|');
  for (const [n, v] of Object.entries(SPACE)) L.push(`| \`${n}\` | ${v} | ${v * REM_BASE} |`);
  L.push('', '| Type token | rem | px at uiScale 1 | Weight | Line height |', '|---|---|---|---|---|');
  for (const [n, f] of Object.entries(FONT)) L.push(`| \`${n}\` | ${f.rem} | ${f.rem * REM_BASE} | ${f.weight} | ${f.lh} |`);
  return L.join('\n');
}
export function scaleTable() {
  const L = [`\`UI_SCALE_MIN\` = ${UI_SCALE_MIN}, \`UI_SCALE_MAX\` = ${UI_SCALE_MAX}, reference ${720} CSS px on the shorter axis. \`--mr-content-max\` = ${CONTENT_MAX_REM}rem. Sheet width = min(${SHEET_WIDTH_REM}rem, ${SHEET_WIDTH_MAX_FRACTION * 100}% of the body).`, '', '| Window (css, dpr) | continuous | deviceScale | uiScale | Body text | 1rem | Content width |', '|---|---|---|---|---|---|---|'];
  for (const [w, h, d] of [[640, 240, 1], [960, 540, 1], [1280, 720, 1], [1536, 864, 1.25], [1920, 1080, 1], [2560, 1440, 1], [3440, 1440, 1], [3840, 2160, 1]]) {
    const s = scaleOf(w, h, d);
    const rem = REM_BASE * s.uiScale;
    const inner = w - 2 * 0.5 * rem - 4;
    const content = Math.min(inner, CONTENT_MAX_REM * rem);
    L.push(`| ${w}×${h}, ${d} | ${s.continuous.toFixed(2)} | ${s.deviceScale} | ${s.uiScale.toFixed(3)} | ${(0.875 * rem).toFixed(2)} px | ${rem.toFixed(1)} px | ${content.toFixed(0)} px${content < inner ? ' (capped)' : ''} |`);
  }
  return L.join('\n');
}
const CH_NAME = { hint: 'Hint line', toast: 'Toast', modal: 'Modal', 'text-box': 'Blocking text box' };
export function channelTable() {
  const L = ['| Kind | Channel | Sink at d90c32c9 | Player must act | Also carried by |', '|---|---|---|---|---|'];
  for (const r of KINDS) L.push(`| \`${r.kind}\` | ${CH_NAME[r.channel]} | ${r.sink} | ${r.action ? 'yes' : 'no'} | ${r.persists || ''} |`);
  L.push('', `In-battle HUD, not policy kinds (screen content, stays as shipped under \`uif-11\`): ${BATTLE_HUD.map((b) => `\`${b}\``).join(', ')}.`);
  return L.join('\n');
}
export function measuredTable() {
  const L = ['| Capture | Frame (x, y, w×h) | Title (font, x) | Tab strip (x, y, w×h) | First row or card (x, w) | Scrolls |', '|---|---|---|---|---|---|'];
  const seen = new Set();
  for (const s of Object.values(SCREENS)) for (const n of s.current) {
    if (seen.has(n)) continue;
    seen.add(n);
    const c = readCapture(n);
    const has = (e, t) => (e.cls ?? '').split(/\s+/).includes(t);
    const fr = c.els.find((e) => has(e, 'mr-frame') && e.w > 200 && !has(e, 'mr-frame--prompt'));
    const body = fr ? c.els.filter((e) => e.x >= fr.x && e.y >= fr.y && e.x + e.w <= fr.x + fr.w + 1 && e.y + e.h <= fr.y + fr.h + 1 && e !== fr) : [];
    const isTab = (e) => e.role === 'tab' || /-tab-/.test(e.id ?? '') || (e.cls ?? '').includes('mr-nav-tab');
    const firstText = body.find((e) => e.text && e.w > 1);
    const title = firstText && !isTab(firstText) ? firstText : undefined;
    const tabs = body.filter(isTab);
    const strip = tabs.length ? { x: Math.min(...tabs.map((e) => e.x)), y: tabs[0].y, w: Math.round(Math.max(...tabs.map((e) => e.x + e.w)) - Math.min(...tabs.map((e) => e.x))), h: tabs[0].h } : undefined;
    const first = body.find((e) => !isTab(e) && ((e.cls ?? '').includes('mr-nav-item') || e.role === 'option' || (e.bd ?? '').startsWith('1px') || (e.bd ?? '').startsWith('2px')));
    const scrolls = c.els.some((e) => e.scrolls);
    L.push(`| \`${n}\` | ${fr ? `${fr.x}, ${fr.y}, ${fr.w}×${fr.h}` : 'none'} | ${title ? `${title.fs} ${Number(title.fw) >= 600 ? 'bold' : 'normal'}, x ${title.x}` : ''} | ${strip ? `${strip.x}, ${strip.y}, ${strip.w}×${strip.h}` : 'none'} | ${first ? `x ${first.x}, w ${first.w}` : ''} | ${scrolls ? 'yes' : 'no'} |`);
  }
  return L.join('\n');
}
export const REGIONS = { tokens: tokenTable, scale: scaleTable, channels: channelTable, measured: measuredTable };
export function fillRegions(doc) {
  let out = doc;
  for (const [k, fn] of Object.entries(REGIONS)) {
    const a = `<!-- generated:${k}:begin -->`; const b = `<!-- generated:${k}:end -->`;
    const i = out.indexOf(a); const j = out.indexOf(b);
    if (i !== -1 && j !== -1) out = `${out.slice(0, i + a.length)}\n${fn()}\n${out.slice(j)}`;
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--import') { importCapture(args[1]); return; }
  mkdirSync(join(HERE, 'svg'), { recursive: true });
  for (const id of Object.keys(SCREENS)) writeFileSync(join(HERE, 'svg', `${id}.svg`), spreadSvg(id));
  for (const id of THREE_SIZE_SCREENS) writeFileSync(join(HERE, 'svg', `${id}-sizes.svg`), sizesSvg(id));
  const issues = [];
  for (const id of Object.keys(SCREENS)) for (const win of [{ w: W, h: H, dpr: 1 }, ...WINDOW_SIZES]) { for (const i of proposedAt(id, win).issues) issues.push(`${id} ${win.w}x${win.h}: ${i}`); }
  if (issues.length) console.log(issues.join('\n'));
  if (existsSync(DOC)) writeFileSync(DOC, fillRegions(readFileSync(DOC, 'utf8')));
  console.log(`built ${Object.keys(SCREENS).length} spreads, ${THREE_SIZE_SCREENS.length} size sheets; ${issues.length} layout issues`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
