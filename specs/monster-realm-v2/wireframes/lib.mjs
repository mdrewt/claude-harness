// lib.mjs — the wf-1 wireframe kit: token values, the scale formula, a small box solver and the SVG
// writer. Zero dependencies; every PROPOSED diagram is computed from these numbers, so the token
// table in M-ui-foundation-wireframes.md and the drawings cannot drift apart (check.mjs compares them).
// Original schematics only: boxes and labels, nothing copied from any game.

// ---- sizing vocabulary (WF1.2, operator item 014) ------------------------------------------
export const SIZING = {
  V: 'grows-vertically',
  H: 'grows-horizontally',
  S: 'scales-with-resolution',
  F: 'fixed',
};
const SIZING_COLOR = { V: '#2f7d4f', H: '#2b6cb0', S: '#8a5a12', F: '#6b7280' };

// ---- the scale formula, verbatim from M-ui-foundation.spec.md "Shape of the kit" ----------
export const UI_SCALE_MIN = 0.875;
export const UI_SCALE_MAX = 3;
const TILE_PX = 32;
const TARGET_VISIBLE_TILES = 11;
const UI_REFERENCE_CSS_PX = 720;
export function scaleOf(cssW, cssH, dpr) {
  const shorter = Math.min(cssW, cssH);
  const continuous = (shorter * dpr) / (TILE_PX * TARGET_VISIBLE_TILES);
  const deviceScale = Math.max(1, Math.round(continuous));
  const uiScale = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, shorter / UI_REFERENCE_CSS_PX));
  return { continuous, deviceScale, uiScale, tileCssPx: (TILE_PX * deviceScale) / dpr };
}
export const REM_BASE = 16;

// ---- tokens: the values wf-1 publishes (WF1.5) ---------------------------------------------
export const TOKENS = {
  base: {
    '--mr-frame-bg': '#1e1e2e', '--mr-panel-bg': '#181826', '--mr-frame-fg': '#e0e0e0', '--mr-frame-border': '#e0e0e0',
    '--mr-separator': '#6b6b82', '--mr-text-muted': '#b4b4c2', '--mr-text-disabled': '#8a8a9a',
    '--mr-state-ok': '#34d399', '--mr-state-warn': '#f59e0b', '--mr-state-error': '#f87171', '--mr-focus': '#ffd866',
  },
  more: {
    '--mr-frame-bg': '#101018', '--mr-panel-bg': '#000000', '--mr-frame-fg': '#ffffff', '--mr-frame-border': '#ffffff',
    '--mr-separator': '#bbbbbb', '--mr-text-muted': '#dddddd', '--mr-text-disabled': '#aaaaaa',
    '--mr-state-ok': '#6ee7b7', '--mr-state-warn': '#fcd34d', '--mr-state-error': '#fca5a5', '--mr-focus': '#ffe08a',
  },
};
export const SPACE = { '--mr-space-1': 0.25, '--mr-space-2': 0.5, '--mr-space-3': 0.75, '--mr-space-4': 1 };
export const FONT = {
  '--mr-font-title': { rem: 1.25, weight: 'bold', lh: 1.4 },
  '--mr-font-header': { rem: 1, weight: 'bold', lh: 1.4 },
  '--mr-font-body': { rem: 0.875, weight: 'normal', lh: 1.6 },
  '--mr-font-small': { rem: 0.75, weight: 'normal', lh: 1.4 },
};
export const CONTENT_MAX_REM = 80;

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255);
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// The pairs the table reports: [row name, fg token, bg token, floor, why that floor].
export const CONTRAST_PAIRS = [
  ['Body text on frame', '--mr-frame-fg', '--mr-frame-bg', 4.5],
  ['Body text on panel', '--mr-frame-fg', '--mr-panel-bg', 4.5],
  ['Muted text on frame', '--mr-text-muted', '--mr-frame-bg', 4.5],
  ['Muted text on panel', '--mr-text-muted', '--mr-panel-bg', 4.5],
  ['Disabled text on frame', '--mr-text-disabled', '--mr-frame-bg', 3],
  ['Disabled text on panel', '--mr-text-disabled', '--mr-panel-bg', 3],
  ['Focused row (inverted fill)', '--mr-frame-bg', '--mr-frame-fg', 4.5],
  ['Separator on frame', '--mr-separator', '--mr-frame-bg', 3],
  ['Separator on panel', '--mr-separator', '--mr-panel-bg', 3],
  ['State ok on frame', '--mr-state-ok', '--mr-frame-bg', 3],
  ['State warn on frame', '--mr-state-warn', '--mr-frame-bg', 3],
  ['State error on frame', '--mr-state-error', '--mr-frame-bg', 3],
  ['Focus ring on frame', '--mr-focus', '--mr-frame-bg', 3],
];

// ---- box solver ----------------------------------------------------------------------------
// A node is an ELEMENT when it has a `label`; it must then carry exactly one `size` key (V|H|S|F).
// Unlabelled nodes are layout helpers: invisible and unannotated.
// Lengths are rem (`hpx`: a height in CSS px). In a col: h (rem) or grow; width follows the parent, or w/maxW
// centered. In a row: w (rem), pct (of the parent) or grow; height follows the parent or h.
// `abs: {corner, inset, w, h}` overlays the parent; painted after the flow.
export const box = (label, size, o = {}) => ({ label, size, ...o });

function len(v, rem) { return v * rem; }
const hOf = (k, rem) => (k.hpx !== undefined ? k.hpx : len(k.h ?? 0, rem));

/** The ContextSheet anchor (WF1.4, UIF3.4): horizontally away from the slot, bottom corner first,
 *  growing upward; a slot with no horizontal clearance flips the corner vertically; if neither corner
 *  is clear the sheet caps to the taller free band and scrolls. The result always stays inside the
 *  area with a positive height; a sheet taller than the area scrolls. Pure. */
export function anchorSheet(area, slot, sheet, inset, minH = 4 * inset) {
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const side = slot.x + slot.w / 2 < area.x + area.w / 2 ? 'r' : 'l';
  const w = Math.min(sheet.w, area.w - 2 * inset);
  const maxH = area.h - 2 * inset;
  const h0 = Math.min(sheet.h, maxH);
  const place = (v, h) => ({
    x: side === 'r' ? area.x + area.w - w - inset : area.x + inset,
    y: v === 't' ? area.y + inset : area.y + area.h - h - inset,
    w,
    h,
  });
  const clipped = h0 < sheet.h;
  const bottom = place('b', h0);
  if (!hit(bottom, slot)) return { corner: `b${side}`, rect: bottom, scrolls: clipped };
  const top = place('t', h0);
  if (!hit(top, slot)) return { corner: `t${side}`, rect: top, scrolls: clipped };
  const above = slot.y - area.y;
  const below = area.y + area.h - (slot.y + slot.h);
  const v = above >= below ? 't' : 'b';
  const h = Math.min(maxH, Math.max(minH, Math.max(above, below) - 2 * inset));
  return { corner: `${v}${side}`, rect: place(v, h), scrolls: true };
}
export const SHEET_WIDTH_REM = 18;
export const SHEET_WIDTH_MAX_FRACTION = 0.45;
export const sheetWidth = (areaW, rem) => Math.min(SHEET_WIDTH_REM * rem, SHEET_WIDTH_MAX_FRACTION * areaW);

export function solve(node, rect, rem, out = [], issues = []) {
  const n = { ...node, rect };
  if (node.label !== undefined) out.push(n);
  const pad = len(node.pad ?? 0, rem);
  const inner = { x: rect.x + pad, y: rect.y + pad, w: rect.w - 2 * pad, h: rect.h - 2 * pad };
  const kids = node.children ?? [];
  const flow = kids.filter((k) => !k.abs);
  const g = len(node.gap ?? 0, rem);
  if (node.dir === 'col' || node.dir === undefined) {
    const fixed = flow.reduce((s, k) => s + (k.grow ? 0 : hOf(k, rem)), 0) + g * Math.max(0, flow.length - 1);
    const grow = flow.reduce((s, k) => s + (k.grow ?? 0), 0);
    const free = inner.h - fixed;
    if (free < -0.5 && !node.scrolls) issues.push(`${node.label ?? 'col'} overflows by ${(-free).toFixed(1)}px`);
    let y = inner.y;
    for (const k of flow) {
      const h = k.grow ? (Math.max(0, free) * k.grow) / grow : hOf(k, rem);
      let w = k.w !== undefined ? len(k.w, rem) : inner.w;
      if (k.maxW !== undefined) w = Math.min(w, len(k.maxW, rem));
      const x = inner.x + (inner.w - w) / 2;
      if (!k.spacer) solve(k, { x, y, w, h }, rem, out, issues);
      y += h + g;
    }
  } else {
    const pctW = (k) => (k.pct !== undefined ? (inner.w * k.pct) / 100 : len(k.w ?? 0, rem));
    const fixed = flow.reduce((s, k) => s + (k.grow ? 0 : pctW(k)), 0) + g * Math.max(0, flow.length - 1);
    const grow = flow.reduce((s, k) => s + (k.grow ?? 0), 0);
    const free = inner.w - fixed;
    if (free < -0.5 && !node.scrolls) issues.push(`${node.label ?? 'row'} overflows by ${(-free).toFixed(1)}px`);
    let x = inner.x;
    for (const k of flow) {
      const w = k.grow ? (Math.max(0, free) * k.grow) / grow : pctW(k);
      const h = k.h !== undefined || k.hpx !== undefined ? hOf(k, rem) : inner.h;
      const y = inner.y + (inner.h - h) / 2;
      if (!k.spacer) solve(k, { x, y, w, h }, rem, out, issues);
      x += w + g;
    }
  }
  for (const k of kids.filter((c) => c.abs)) {
    const a = k.abs;
    const w = a.w === 'fill' ? rect.w - 2 * len(a.inset ?? 0, rem) : a.pct ? (rect.w * a.pct) / 100 : len(a.w, rem);
    const h = a.h === 'fill' ? rect.h - 2 * len(a.inset ?? 0, rem) : len(a.h, rem);
    const i = len(a.inset ?? 0, rem);
    const b = len(a.bottom ?? a.inset ?? 0, rem);
    const t = len(a.top ?? a.inset ?? 0, rem);
    const x = a.corner.includes('l') ? rect.x + i : a.corner.includes('r') ? rect.x + rect.w - w - i : rect.x + (rect.w - w) / 2;
    const y = a.corner.includes('t') ? rect.y + t : a.corner.includes('b') ? rect.y + rect.h - h - b : rect.y + (rect.h - h) / 2;
    solve(k, { x, y, w, h }, rem, out, issues);
  }
  return { out, issues };
}

// ---- SVG -----------------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => String(Math.round(n * 100) / 100);
const MONO = 'ui-monospace,Menlo,Consolas,monospace';

const STYLE = {
  frame: { fill: '#1e1e2e', stroke: '#e0e0e0', sw: 2 },
  panel: { fill: '#181826', stroke: '#6b6b82', sw: 1 },
  card: { fill: '#181826', stroke: '#6b6b82', sw: 1, fs: 0.875, color: '#e0e0e0' },
  title: { fill: 'none', fs: 1.25, bold: true, color: '#e0e0e0' },
  header: { fill: 'none', fs: 1, bold: true, color: '#e0e0e0' },
  text: { fill: 'none', fs: 0.875, color: '#e0e0e0' },
  muted: { fill: 'none', fs: 0.875, color: '#b4b4c2' },
  row: { fill: 'none', fs: 0.875, color: '#e0e0e0' },
  focus: { fill: '#e0e0e0', fs: 0.875, color: '#1e1e2e', stroke: '#1e1e2e', sw: 1 },
  disabled: { fill: 'none', fs: 0.875, color: '#8a8a9a' },
  tab: { fill: 'none', fs: 0.875, color: '#b4b4c2', stroke: '#6b6b82', sw: 1 },
  tabsel: { fill: '#181826', fs: 0.875, bold: true, color: '#e0e0e0', stroke: '#e0e0e0', sw: 2 },
  chip: { fill: '#1e1e2e', fs: 0.75, color: '#e0e0e0', stroke: '#e0e0e0', sw: 1 },
  sheet: { fill: '#1e1e2e', stroke: '#e0e0e0', sw: 2 },
  strip: { fill: '#181826', fs: 0.75, color: '#e0e0e0', stroke: '#6b6b82', sw: 1 },
  toast: { fill: '#181826', fs: 0.875, color: '#34d399', stroke: '#34d399', sw: 2 },
  sep: { fill: '#6b6b82' },
  board: { fill: '#20402c', stroke: '#6b6b82', sw: 1, fs: 0.875, color: '#d7e8db' },
  thumb: { fill: '#6b6b82' },
  hud: { fill: '#181826', stroke: '#6b6b82', sw: 1, fs: 0.75, color: '#e0e0e0' },
};

export function drawProposed(elements, rem) {
  const parts = [];
  for (const e of elements) {
    const s = STYLE[e.style ?? 'text'] ?? STYLE.text;
    const { x, y, w, h } = e.rect;
    const code = e.size;
    const name = SIZING[code];
    parts.push(`<g class="el" data-el="${esc(e.label)}" data-sizing="${name}">`);
    parts.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(Math.max(h, 1))}" fill="${s.fill ?? 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.sw ?? 1}"` : ''}/>`);
    const fs = (e.fs ?? s.fs ?? 0.875) * rem;
    if (e.grid) {
      const cell = Math.min((w - 4) / e.grid.cols, (h - 4) / e.grid.rows);
      const gx = x + (w - cell * e.grid.cols) / 2;
      const gy = y + (h - cell * e.grid.rows) / 2;
      for (let r = 0; r < e.grid.rows; r++) for (let c = 0; c < e.grid.cols; c++) parts.push(`<rect x="${fmt(gx + c * cell)}" y="${fmt(gy + r * cell)}" width="${fmt(cell)}" height="${fmt(cell)}" fill="none" stroke="#5f8f70" stroke-width="1"/>`);
    }
    if (s.color) {
      const chars = Math.floor((w - 0.75 * rem - 22) / (fs * 0.6));
      const text = e.hideText ? '' : e.label.length > chars && chars > 3 ? `${e.label.slice(0, chars - 1)}…` : e.label;
      const tx = e.center ? x + w / 2 : x + 0.5 * rem;
      const ty = e.topText ? y + fs * 1.2 : y + h / 2 + fs * 0.34;
      if (text) parts.push(`<text x="${fmt(tx)}" y="${fmt(ty)}" font-family="${MONO}" font-size="${fmt(fs)}"${s.bold ? ' font-weight="bold"' : ''} fill="${s.color}"${e.center ? ' text-anchor="middle"' : ''}>${esc(text)}</text>`);
    }
    // The annotation badge: one letter per element, top-right, legend in the header.
    const bs = 16;
    const bx = x + w - bs - 1 - (e.children?.length ? bs + 2 : 0);
    const by = h >= bs + 2 ? y + 1 : y - bs / 2 + h / 2;
    parts.push(`<rect x="${fmt(bx)}" y="${fmt(by)}" width="${bs}" height="${bs}" fill="${SIZING_COLOR[code]}"/><text x="${fmt(bx + bs / 2)}" y="${fmt(by + 12)}" font-family="${MONO}" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">${code}</text></g>`);
  }
  return parts.join('\n');
}

export function worldGrid(w, h, tile) {
  const lines = [`<rect x="0" y="0" width="${w}" height="${h}" fill="#10141a"/>`];
  for (let x = tile; x < w; x += tile) lines.push(`<line x1="${fmt(x)}" y1="0" x2="${fmt(x)}" y2="${h}" stroke="#222b36" stroke-width="1"/>`);
  for (let y = tile; y < h; y += tile) lines.push(`<line x1="0" y1="${fmt(y)}" x2="${w}" y2="${fmt(y)}" stroke="#222b36" stroke-width="1"/>`);
  return lines.join('');
}

const px = (s) => Number.parseFloat(s) || 0;
const padLeft = (p) => { const a = String(p ?? '').trim().split(/\s+/).map(px); return a.length === 4 ? a[3] : a.length >= 2 ? a[1] : a[0] ?? 0; };

/** CURRENT: draws measured rects, in DOM order, with measured colors, text and font sizes. */
export function drawCurrent(capture) {
  const parts = [];
  const { width: W, height: H } = capture.viewport;
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#000"/>`);
  for (const e of capture.els) {
    if (e.t === 'canvas') {
      parts.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="#10141a"/>`);
      parts.push(`<text x="${e.x + 16}" y="${e.y + 28}" font-family="${MONO}" font-size="14" fill="#7f8ea3">world canvas</text>`);
      continue;
    }
    const bd = String(e.bd ?? '').split(' ');
    const bw = bd.slice(0, 4).map(px);
    const hasBg = e.bg && e.bg !== 'rgba(0, 0, 0, 0)' && e.bg !== 'transparent';
    const color = bd.slice(5).join(' ');
    const uniform = bw.every((b) => b === bw[0]) && bw[0] > 0;
    if (hasBg || uniform) {
      parts.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${hasBg ? e.bg : 'none'}"${uniform ? ` stroke="${color}" stroke-width="${bw[0]}"` : ''}/>`);
    }
    if (!uniform) {
      if (bw[0] > 0) parts.push(`<line x1="${e.x}" y1="${e.y}" x2="${e.x + e.w}" y2="${e.y}" stroke="${color}" stroke-width="${bw[0]}"/>`);
      if (bw[2] > 0) parts.push(`<line x1="${e.x}" y1="${e.y + e.h}" x2="${e.x + e.w}" y2="${e.y + e.h}" stroke="${color}" stroke-width="${bw[2]}"/>`);
      if (bw[3] > 0) parts.push(`<line x1="${e.x}" y1="${e.y}" x2="${e.x}" y2="${e.y + e.h}" stroke="${color}" stroke-width="${bw[3]}"/>`);
    }
    if (e.text) {
      const fs = px(e.fs) || 14;
      parts.push(`<text x="${fmt(e.x + padLeft(e.pad))}" y="${fmt(e.y + e.h / 2 + fs * 0.34)}" font-family="${MONO}" font-size="${fmt(fs)}"${px(e.fw) >= 600 || e.fw === 'bold' ? ' font-weight="bold"' : ''} fill="${e.fg}">${esc(e.text)}</text>`);
    }
  }
  return parts.join('\n');
}

export function legend(x, y) {
  const parts = [];
  let cx = x;
  for (const [code, name] of Object.entries(SIZING)) {
    parts.push(`<rect x="${cx}" y="${y - 15}" width="18" height="18" fill="${SIZING_COLOR[code]}"/><text x="${cx + 9}" y="${y - 1}" font-family="${MONO}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">${code}</text><text x="${cx + 24}" y="${y}" font-family="${MONO}" font-size="16" fill="#e5e7eb">${name}</text>`);
    cx += 24 + name.length * 10 + 26;
  }
  return parts.join('');
}
export const svgDoc = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${esc(title)}</title><rect width="${w}" height="${h}" fill="#111827"/>\n${body}\n</svg>\n`;
export const label = (x, y, text, size = 20, color = '#e5e7eb', bold = true) => `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}"${bold ? ' font-weight="bold"' : ''} fill="${color}">${esc(text)}</text>`;
