#!/usr/bin/env node
// check.mjs — the wf-1 acceptance CHECKs. `node check.mjs WF1.n` prints `WF1.n OK ...` and exits 0, or
// lists what is wrong and exits 1. `node check.mjs --selftest` proves each check rejects a damaged input.
// Structure, arithmetic and freshness are checked here; whether the verdicts and the per-screen judgments
// are any GOOD is the reviewer lens's job (spec: "verified by a reviewer lens against the document").
// The checks take their inputs as arguments, so the selftest can damage copies. Node 18 compatible.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHANNELS, KINDS } from './channels.mjs';
import { anchorSheet, contrast, CONTRAST_PAIRS, REM_BASE, scaleOf, sheetWidth, SIZING, solve, TOKENS, UI_SCALE_MAX, UI_SCALE_MIN } from './lib.mjs';
import { fillRegions, proposedAt, sizesSvg, spreadSvg } from './build.mjs';
import { REQUIRED_SCREENS, SCREENS, THREE_SIZE_SCREENS, WINDOW_SIZES } from './screens.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHA = 'd90c32c9';
const live = () => ({
  doc: readFileSync(join(HERE, '..', 'M-ui-foundation-wireframes.md'), 'utf8'),
  spec: readFileSync(join(HERE, '..', 'M-ui-foundation.spec.md'), 'utf8'),
  svg: (name) => { const p = join(HERE, 'svg', `${name}.svg`); return existsSync(p) ? readFileSync(p, 'utf8') : null; },
  capture: (n) => { const p = join(HERE, 'current', `${n}.json`); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null; },
  shipped: (n) => existsSync(join(HERE, 'shipped', `${n}.jpg`)),
});

const section = (doc, id) => {
  const m = new RegExp(`^### ${id}$`, 'm').exec(doc);
  if (!m) return null;
  const rest = doc.slice(m.index + m[0].length);
  const next = /^#{2,3} /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
};

export function wf11(input) {
  const bad = [];
  for (const id of REQUIRED_SCREENS) {
    const s = SCREENS[id];
    if (!s) { bad.push(`${id}: no screen definition`); continue; }
    const svg = input.svg(id);
    if (svg === null) { bad.push(`${id}: no committed diagram`); continue; }
    if (!svg.includes('data-panel="current"') || !svg.includes('data-panel="proposed"')) bad.push(`${id}: not side by side`);
    if (svg !== spreadSvg(id)) bad.push(`${id}: the committed diagram is stale (node build.mjs)`);
    for (const n of s.current) {
      const c = input.capture(n);
      if (c === null) { bad.push(`${id}: capture ${n} missing`); continue; }
      if (c.sha !== SHA) bad.push(`${id}: capture ${n} is not from ${SHA}`);
      if (c.viewport.width !== 1280 || c.viewport.height !== 720) bad.push(`${id}: capture ${n} is not 1280x720`);
      if (c.els.length === 0) bad.push(`${id}: capture ${n} is empty`);
      if (!input.shipped(n)) bad.push(`${id}: shipped screenshot ${n} missing`);
    }
    if (!(input.doc.includes(`](wireframes/svg/${id}.svg)`))) bad.push(`${id}: the document does not link its diagram`);
  }
  return { bad, ok: `${REQUIRED_SCREENS.length} screens side by side, captures at ${SHA}` };
}

export function wf12(input) {
  const bad = [];
  const names = new Set(Object.values(SIZING));
  let elements = 0;
  const each = (id, svg) => {
    const groups = svg.split('<g class="el"').slice(1);
    for (const g of groups) {
      elements += 1;
      const head = g.slice(0, g.indexOf('>'));
      const annotations = [...head.matchAll(/data-sizing="([^"]*)"/g)].map((m) => m[1]);
      if (annotations.length !== 1) bad.push(`${id}: element with ${annotations.length} annotations: ${head}`);
      else if (!names.has(annotations[0])) bad.push(`${id}: unknown annotation ${annotations[0]}`);
    }
    if (groups.length === 0) bad.push(`${id}: no annotated elements`);
  };
  for (const id of REQUIRED_SCREENS) { const svg = input.svg(id); if (svg === null) bad.push(`${id}: missing`); else each(id, svg); }
  if (WINDOW_SIZES.length !== 3) bad.push('three window sizes required');
  if (!WINDOW_SIZES.some((w) => !Number.isInteger(w.dpr))) bad.push('no fractional devicePixelRatio');
  for (const req of ['main-menu', 'monsters-party', 'tactics-board']) if (!THREE_SIZE_SCREENS.includes(req)) bad.push(`${req}: not in the three-size set`);
  for (const id of THREE_SIZE_SCREENS) {
    const svg = input.svg(`${id}-sizes`);
    if (svg === null) { bad.push(`${id}: no three-size sheet`); continue; }
    if (svg !== sizesSvg(id)) bad.push(`${id}: three-size sheet stale`);
    each(`${id}-sizes`, svg);
    for (const w of WINDOW_SIZES) if (!svg.includes(`data-window="${w.w}x${w.h}@${w.dpr}"`)) bad.push(`${id}: not drawn at ${w.w}x${w.h}@${w.dpr}`);
    if (!input.doc.includes(`](wireframes/svg/${id}-sizes.svg)`)) bad.push(`${id}: the document does not link its size sheet`);
  }
  for (const id of REQUIRED_SCREENS) for (const w of WINDOW_SIZES) {
    for (const i of proposedAt(id, w).issues) bad.push(`${id} at ${w.w}x${w.h}: ${i}`);
  }
  return { bad, ok: `${elements} elements carry exactly one annotation; ${THREE_SIZE_SCREENS.length} screens at 3 sizes incl. fractional dpr` };
}

const CONTRACTS = ['tab-bar contract', 'list and grid contract', 'context-menu contract', 'message channels', 'empty states'];
export function wf13(input) {
  const bad = [];
  const seen = new Set();
  for (const id of REQUIRED_SCREENS) {
    const s = section(input.doc, id);
    if (s === null) { bad.push(`${id}: no section`); continue; }
    const genre = /^\*\*Genre:\*\*(.*)$/m.exec(s);
    const named = genre ? CONTRACTS.filter((c) => genre[1].includes(c)) : [];
    if (named.length === 0) bad.push(`${id}: names no genre convention`);
    named.forEach((n) => seen.add(n));
    const adopted = /^\*\*Adopted:\*\*\s*(\S.*)$/m.exec(s);
    const rejected = /^\*\*Rejected:\*\*\s*(\S.*)$/m.exec(s);
    if (!adopted) bad.push(`${id}: no Adopted line`);
    if (!rejected) bad.push(`${id}: no Rejected line`);
    else if (!/\b(because|since|so that|would|cannot|needs)\b/.test(rejected[1])) bad.push(`${id}: Rejected line gives no reason`);
  }
  for (const c of CONTRACTS) if (!seen.has(c)) bad.push(`no screen contrasts with the ${c}`);
  return { bad, ok: `${REQUIRED_SCREENS.length} screens state genre, adopted, rejected and why` };
}

const heading = (doc, h) => {
  const m = new RegExp(`^### ${h}$`, 'm').exec(doc);
  if (!m) return '';
  const rest = doc.slice(m.index + m[0].length);
  const next = /^#{2,3} /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
};
export function wf14(input) {
  const bad = [];
  for (const [h, must] of [
    ['Verdict: sheet placement', ['corner-anchored', 'beside-the-slot', 'in-slot-buttons', '053', '#586 D2']],
    ['Verdict: Summary page', ['#586 D2']],
    ['Verdict: Profile section order', ['Name', 'Account', 'Privacy']],
  ]) {
    const s = heading(input.doc, h);
    if (!s) { bad.push(`no "${h}" section`); continue; }
    if (!/^\*\*Verdict:\*\*\s*\S/m.test(s)) bad.push(`${h}: no verdict line`);
    if (!/^\*\*Reason:\*\*\s*\S/m.test(s)) bad.push(`${h}: no reason line`);
    for (const m of must) if (!s.includes(m)) bad.push(`${h}: does not address ${m}`);
  }
  return { bad, ok: '3 verdicts with reasons, sheet placement across all three options' };
}

// Parses the spec's own scale table and recomputes every row from the published formula.
function scaleRows(spec) {
  const out = [];
  for (const m of spec.matchAll(/^\| (\d+)×(\d+), ([\d.]+) \| ([\d.]+) \| (\d+) \(?[a-z ]*\)?\s*\| ([\d.]+)[^|]*\| ([\d.]+) px \|$/gm)) {
    out.push({ w: +m[1], h: +m[2], dpr: +m[3], continuous: +m[4], deviceScale: +m[5], uiScale: +m[6], body: +m[7] });
  }
  return out;
}
export function wf15(input) {
  const bad = [];
  for (const [n, f, b, floor] of CONTRAST_PAIRS) {
    for (const tier of ['base', 'more']) {
      const c = contrast(TOKENS[tier][f], TOKENS[tier][b]);
      if (c < floor) bad.push(`${n} (${tier}) ${c.toFixed(2)} below ${floor}`);
    }
  }
  const rows = scaleRows(input.spec);
  if (rows.length !== 6) bad.push(`expected the 6-row scale table in the spec, parsed ${rows.length}`);
  for (const r of rows) {
    const s = scaleOf(r.w, r.h, r.dpr);
    if (Math.abs(s.continuous - r.continuous) > 0.01) bad.push(`${r.w}x${r.h}: continuous ${s.continuous} vs ${r.continuous}`);
    if (s.deviceScale !== r.deviceScale) bad.push(`${r.w}x${r.h}: deviceScale ${s.deviceScale} vs ${r.deviceScale}`);
    if (Math.abs(s.uiScale - r.uiScale) > 0.001) bad.push(`${r.w}x${r.h}: uiScale ${s.uiScale} vs ${r.uiScale}`);
    if (Math.abs(14 * s.uiScale - r.body) > 0.01) bad.push(`${r.w}x${r.h}: body ${14 * s.uiScale} vs ${r.body}`);
  }
  if (UI_SCALE_MIN !== 0.875 || UI_SCALE_MAX !== 3) bad.push('UI_SCALE bounds differ from the scale table');
  const seen = new Set();
  for (const k of KINDS) {
    if (seen.has(k.kind)) bad.push(`${k.kind}: assigned twice`);
    seen.add(k.kind);
    if (!CHANNELS.includes(k.channel)) bad.push(`${k.kind}: unknown channel ${k.channel}`);
    if (k.channel === 'toast' && k.action && !k.persists) bad.push(`${k.kind}: action-required toast names no persistent state`);
  }
  for (const c of CHANNELS) if (!KINDS.some((k) => k.channel === c)) bad.push(`channel ${c} carries nothing`);
  if (fillRegions(input.doc) !== input.doc) bad.push('generated tables in the document are stale (node build.mjs)');
  for (const k of KINDS) if (!input.doc.includes(`| \`${k.kind}\` |`)) bad.push(`${k.kind}: not in the document's table`);
  for (const t of ['--mr-space-1', '--mr-font-title', '--mr-panel-bg', '--mr-separator', '--mr-text-muted', '--mr-text-disabled', '--mr-state-ok', '--mr-state-warn', '--mr-state-error', '--mr-focus', '--mr-content-max', 'UI_SCALE_MIN', 'UI_SCALE_MAX']) if (!input.doc.includes(t)) bad.push(`${t}: not published`);
  return { bad, ok: `${CONTRAST_PAIRS.length} contrast pairs at both tiers, ${rows.length} scale rows recomputed, ${KINDS.length} kinds in ${CHANNELS.length} channels` };
}

// Every amendment the document declares must appear in the spec with its id, and uif-1 waits on wf-1.
export function wf16(input) {
  const bad = [];
  const am = heading(input.doc, 'Amendments made in this diff');
  const ids = [...am.matchAll(/^- \*\*(WF1-A\d+)\*\*/gm)].map((m) => m[1]);
  if (ids.length === 0) bad.push('the document declares no amendment list');
  for (const id of ids) if (!input.spec.includes(id)) bad.push(`${id}: declared but absent from M-ui-foundation.spec.md`);
  for (const m of input.spec.matchAll(/WF1-A\d+/g)) if (!ids.includes(m[0])) bad.push(`${m[0]}: in the spec but not declared`);
  const sec = /^### uif-1 [^\n]*\n[\s\S]*?^after: \[([^\]]*)\]/m.exec(input.spec);
  if (!sec || !sec[1].includes('wf-1')) bad.push('uif-1 is not after wf-1');
  return { bad, ok: `${ids.length} amendments declared and present in the spec; uif-1 after wf-1` };
}

// The anchor property the sheet verdict rests on, over every proposed slot at every size (UIF3.4).
export function anchorProperty() {
  const bad = [];
  let cases = 0;
  for (const id of ['monsters-party', 'monsters-storage']) {
    for (const w of [...WINDOW_SIZES, { w: 640, h: 240, dpr: 1 }, { w: 1280, h: 720, dpr: 1 }]) {
      const rem = REM_BASE * scaleOf(w.w, w.h, w.dpr).uiScale;
      const { out } = solve(SCREENS[id].build(), { x: 0, y: 0, w: w.w, h: w.h }, rem);
      const body = out.find((e) => e.label === 'Body').rect;
      for (const step of [1, 1.5, 2]) {
        const r = rem * step;
        const sw = sheetWidth(body.w, r);
        const sh = 8 * 1.65 * r + 2.75 * r;
        for (const slot of out.filter((e) => e.style === 'card' || e.style === 'tabsel')) {
          cases += 1;
          const a = anchorSheet(body, slot.rect, { w: sw, h: sh }, 0.75 * rem).rect;
          const hit = a.x < slot.rect.x + slot.rect.w && slot.rect.x < a.x + a.w && a.y < slot.rect.y + slot.rect.h && slot.rect.y < a.y + a.h;
          if (hit) bad.push(`${id} ${w.w}x${w.h} x${step}: sheet covers ${slot.label}`);
        }
      }
    }
  }
  return { bad, ok: `${cases} slot/size/text-step cases, none covered` };
}

const GATES = { 'WF1.1': wf11, 'WF1.2': wf12, 'WF1.3': wf13, 'WF1.4': wf14, 'WF1.5': wf15, 'WF1.6': wf16 };

function selftest() {
  const base = live();
  const fails = [];
  const expectFail = (name, gate, damaged) => { if (gate({ ...base, ...damaged }).bad.length === 0) fails.push(`${name}: the check passed damaged input`); };
  expectFail('missing diagram', wf11, { svg: (n) => (n === 'journal' ? null : base.svg(n)) });
  expectFail('stale diagram', wf11, { svg: (n) => (n === 'journal' ? `${base.svg(n)} ` : base.svg(n)) });
  expectFail('capture from another sha', wf11, { capture: (n) => ({ ...base.capture(n), sha: 'deadbeef' }) });
  expectFail('double annotation', wf12, { svg: (n) => (n === 'heal' ? base.svg(n).replace('data-sizing="', 'data-sizing="fixed" data-sizing="') : base.svg(n)) });
  expectFail('unknown annotation', wf12, { svg: (n) => (n === 'heal' ? base.svg(n).replace(/data-sizing="[^"]*"/, 'data-sizing="stretchy"') : base.svg(n)) });
  expectFail('no three-size sheet', wf12, { svg: (n) => (n === 'main-menu-sizes' ? null : base.svg(n)) });
  expectFail('section without rejected', wf13, { doc: base.doc.replace(/^\*\*Rejected:\*\*.*$/m, '') });
  expectFail('rejected without a reason', wf13, { doc: base.doc.replace(/^\*\*Rejected:\*\*.*$/m, '**Rejected:** Nothing here.') });
  expectFail('verdict without a reason', wf14, { doc: base.doc.replace(/^\*\*Reason:\*\*.*$/m, '') });
  expectFail('verdict ignoring an option', wf14, { doc: base.doc.replaceAll('beside-the-slot', 'near') });
  expectFail('stale table', wf15, { doc: base.doc.replace(/\| [\d.]+:1 \|/, '| 9.99:1 |') });
  expectFail('scale table edited', wf15, { spec: base.spec.replace('| 1920×1080, 1 | 3.07 | 3 | 1.50 |', '| 1920×1080, 1 | 3.07 | 3 | 1.60 |') });
  expectFail('amendment absent from spec', wf16, { spec: base.spec.replaceAll('WF1-A1', 'WF1-XX') });
  expectFail('uif-1 not after wf-1', wf16, { spec: base.spec.replace('after: [wf-1]', 'after: []') });
  if (anchorProperty().bad.length !== 0) fails.push(`anchor property: ${anchorProperty().bad[0]}`);
  const covered = anchorSheet({ x: 0, y: 0, w: 100, h: 100 }, { x: 0, y: 0, w: 100, h: 90 }, { w: 40, h: 40 }, 2).rect;
  if (covered.y + covered.h > 100) fails.push('anchor: capped sheet leaves the area');
  return fails;
}

const arg = process.argv[2];
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (arg === '--selftest') {
    const f = selftest();
    if (f.length) { console.error(f.join('\n')); process.exit(1); }
    console.log('SELFTEST OK');
  } else if (GATES[arg]) {
    const r = GATES[arg](live());
    const extra = arg === 'WF1.4' ? anchorProperty() : { bad: [], ok: '' };
    const bad = [...r.bad, ...extra.bad];
    if (bad.length) { console.error(`${arg} FAILED\n${bad.slice(0, 40).join('\n')}`); process.exit(1); }
    console.log(`${arg} OK ${r.ok}${extra.ok ? `; anchor: ${extra.ok}` : ''}`);
  } else { console.error('usage: node check.mjs WF1.1..WF1.6 | --selftest'); process.exit(2); }
}
