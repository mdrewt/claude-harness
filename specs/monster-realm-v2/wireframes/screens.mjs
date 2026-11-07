// screens.mjs — every wf-1 screen: its CURRENT capture(s) and its PROPOSED layout, assembled from one
// small kit (frame, TabBar, rows, ContextSheet, feedback strip, hint bar). That the whole set is built
// from these few functions IS the milestone's argument (094, 175; research implication 1).
import { box, CONTENT_MAX_REM, SHEET_WIDTH_REM } from './lib.mjs';

const ROW = 1.65; // body line (0.875rem x 1.6) + space-1 padding: measured 26.4 px at x1
const chipsDefault = ['A OK', 'B Back', 'Start Close', 'Select Help'];

function hint(chips = chipsDefault) {
  const kids = chips.map((c) => box(c, 'S', { w: 0.6 * c.length + 1.5, h: 1.425, style: 'chip' }));
  return { dir: 'col', h: 2.5, children: [{ h: 0.575, spacer: true }, box('Hint bar', 'S', { h: 1.925, style: 'panel', hideText: true, dir: 'row', gap: 0.5, pad: 0.25, children: kids })] };
}

const rows = (labels, o = {}) => labels.map((l, i) => box(l, 'S', {
  h: ROW,
  style: i === (o.focus ?? -1) ? 'focus' : 'row',
}));

function tabBar(tabs, sel) {
  const strip = tabs.map((t, i) => box(t, 'S', { w: 7.5, style: i === sel ? 'tabsel' : 'tab', center: true, h: 2 }));
  // Tabs share the strip evenly up to 7.5rem each, and the strip keeps qf-11's horizontal scroll at extremes.
  return {
    dir: 'row', h: 2, gap: 0.25,
    children: [box('LB', 'S', { w: 3.25, style: 'chip', h: 2 }), { dir: 'row', grow: 1, gap: 0.25, children: strip }, box('RB', 'S', { w: 3.25, style: 'chip', h: 2 })],
  };
}

const sep = () => box('separator', 'F', { hpx: 2, style: 'sep', hideText: true });

/** The frame anatomy (uif-1): title bar -> TabBar -> body (grows) -> feedback strip (overlay). */
function frame(title, o = {}) {
  const kids = [box(title, 'S', { h: 2.5, style: 'title' }), sep()];
  if (o.tabs) kids.push({ dir: 'col', h: 2.25, pad: 0.125, children: [tabBar(o.tabs, o.sel ?? 0)] });
  const shellBody = box('Body', 'V', { grow: 1, style: o.tabs ? 'panel' : 'frame', hideText: true, maxW: CONTENT_MAX_REM, dir: 'col', pad: 0.75, gap: o.bodyGap ?? 0, children: [...(o.body ?? []), ...(o.sheet ? [o.sheet] : [])], ...(o.scrolls ? { scrolls: true } : {}) });
  kids.push(shellBody);
  const overlays = [];
  if (o.strip) overlays.push(box(o.strip, 'S', { style: 'strip', abs: { corner: 'bc', inset: 0, w: 'fill', h: 1.75 } }));
  if (o.toast) overlays.push(box(o.toast, 'S', { style: 'toast', abs: { corner: 'tr', inset: 0.75, top: 3, w: 18, h: 2.25 } }));
  return box(`${title} frame`, 'V', { style: 'frame', hideText: true, grow: 1, dir: 'col', pad: 0.125, children: [...kids, ...overlays] });
}

/** A ContextSheet: bordered, sized by row count, last row Back/Close, corner-anchored (WF1.4). */
function sheet(title, labels) {
  const n = labels.length;
  const h = (title ? 2 : 0) + n * ROW + 0.75;
  const kids = [];
  if (title) kids.push(box(title, 'S', { h: 1.9, style: 'header' }));
  kids.push(...rows(labels, { focus: 0 }));
  return box('ContextSheet', 'S', {
    style: 'sheet', hideText: true, dir: 'col', pad: 0.25, children: kids,
    abs: { corner: 'br', inset: 0.75, bottom: 2.25, w: SHEET_WIDTH_REM, h },
  });
}

const shell = (frameNode, chips) => ({ dir: 'col', children: [{ dir: 'col', grow: 1, pad: 0.5, children: [frameNode] }, hint(chips)] });
const card = (l, o = {}) => box(l, 'H', { style: 'card', grow: 1, topText: true, ...o });
const slotRow = (a, b) => ({ dir: 'row', grow: 1, gap: 0.5, children: [a, b] });

const partyBody = (focus = 0) => {
  const names = ['Flameling Lv5 HP 282/300', 'Tidalin Lv4 HP 120/120', 'Slot 3 (empty)', 'Slot 4 (empty)', 'Slot 5 (empty)', 'Slot 6 (empty)'];
  const cell = (i) => card(names[i], { style: i === focus ? 'tabsel' : 'card' });
  return [{ dir: 'col', grow: 1, gap: 0.5, children: [slotRow(cell(0), cell(1)), slotRow(cell(2), cell(3)), slotRow(cell(4), cell(5))] }];
};
const storageBody = () => {
  const rowsOf = [];
  for (let r = 0; r < 4; r++) {
    const kids = [];
    for (let c = 0; c < 6; c++) {
      const i = r * 6 + c;
      kids.push(box(i < 14 ? `Mon ${i + 1}` : '(free)', 'H', { style: i === 0 ? 'tabsel' : 'card', grow: 1, topText: true }));
    }
    rowsOf.push({ dir: 'row', grow: 1, gap: 0.5, children: kids });
  }
  return [{ dir: 'col', grow: 1, gap: 0.5, children: rowsOf }, box('Position cue', 'V', { style: 'thumb', hideText: true, abs: { corner: 'cr', inset: 0.25, w: 0.5, h: 8 } })];
};

const MONSTERS = ['Party', 'Storage'];
const SOCIAL = ['Players', 'Trades', 'Challenges', 'Rankings'];
const POCKETS = ['Bait', 'Food', 'Medicine', 'Other'];

export const REQUIRED_SCREENS = [
  'main-menu', 'monsters-party', 'monsters-storage', 'monsters-sheet', 'monsters-summary', 'inventory', 'journal',
  'social-players', 'social-trades', 'social-challenges', 'social-rankings', 'profile',
  'help-introduction', 'help-encyclopedia', 'help-detail', 'controls-buttons', 'controls-shortcuts', 'controls-display',
  'shop', 'heal', 'dialogue', 'trade-propose', 'world-sheets', 'tactics-deploy', 'tactics-board', 'tactics-results',
];
export const THREE_SIZE_SCREENS = ['main-menu', 'monsters-party', 'monsters-storage', 'tactics-board'];
export const WINDOW_SIZES = [
  { w: 960, h: 540, dpr: 1 },
  { w: 1536, h: 864, dpr: 1.25 },
  { w: 1920, h: 1080, dpr: 1 },
];

export const SCREENS = {
  'main-menu': {
    title: 'Main menu',
    current: ['main-menu'],
    build: () => ({
      worldBack: true, dir: 'col', children: [
        { dir: 'row', grow: 1, children: [
          { grow: 1 },
          { dir: 'col', pct: 32, children: [{ h: 1.25, spacer: true }, box('Menu frame', 'H', {
            style: 'frame', hideText: true, grow: 1, dir: 'col', pad: 0.125, children: [
              box('Menu', 'S', { h: 2.5, style: 'title' }), sep(),
              { dir: 'col', grow: 1, pad: 0.5, children: rows(['Monsters', 'Inventory', 'Journal', 'Social (New)', 'Profile', 'How to Play', 'Controls', 'Close'], { focus: 0 }) },
              box('See your party and stored monsters.', 'S', { style: 'strip', abs: { corner: 'bc', inset: 0, w: 'fill', h: 1.75 } }),
            ],
          }), { h: 0.75, spacer: true }] },
          { w: 1.5, spacer: true },
        ] },
        hint(),
      ],
    }),
  },
  'monsters-party': {
    title: 'Monsters: Party',
    current: ['monsters-party-two'],
    build: () => shell(frame('Monsters', { tabs: MONSTERS, sel: 0, body: partyBody() })),
  },
  'monsters-storage': {
    title: 'Monsters: Storage',
    current: ['monsters-storage-filled'],
    build: () => shell(frame('Monsters', { tabs: MONSTERS, sel: 1, body: storageBody() })),
  },
  'monsters-sheet': {
    title: 'Monsters: sheet',
    current: ['monsters-sheet'],
    build: () => shell(frame('Monsters', {
      tabs: MONSTERS, sel: 0, body: partyBody(),
      sheet: sheet('Flameling', ['Summary', 'Care', 'Feed…', 'Evolve…', 'Nickname', 'Move', 'Close']),
    })),
  },
  'monsters-summary': {
    title: 'Monsters: Summary',
    current: ['monsters-summary'],
    build: () => shell(frame('Monsters', {
      tabs: MONSTERS, sel: 0, bodyGap: 0.5,
      body: [
        box('Flameling (Flameling) Lv5 Fire', 'S', { h: 2, style: 'header' }),
        box('HP 282/300 meter', 'H', { h: 1.5, style: 'card' }),
        { dir: 'row', grow: 1, gap: 0.5, children: [
          box('ATK 9 DEF 250 SPD 11 SP.ATK 12 SP.DEF 250', 'H', { grow: 1, style: 'card', topText: true }),
          box('Ability, skills, essence, nature', 'H', { grow: 1, style: 'card', topText: true }),
        ] },
      ],
    })),
  },
  inventory: {
    title: 'Inventory',
    current: ['inventory-food', 'inventory-sheet', 'inventory-picker', 'inventory-pocket-2'],
    build: () => shell(frame('Inventory', {
      tabs: POCKETS, sel: 1, scrolls: true,
      body: [...rows(['Power Root x3', 'Lure Berry x80'], { focus: 0 }), box('Position cue', 'V', { style: 'thumb', hideText: true, abs: { corner: 'tr', inset: 0.25, w: 0.5, h: 3 } })],
      sheet: sheet('Power Root', ['Feed', 'Info', 'Close']),
    })),
  },
  journal: {
    title: 'Journal',
    current: ['journal'],
    build: () => shell(frame('Journal', {
      bodyGap: 0.5,
      body: [
        box('No active quests.', 'S', { h: 2, style: 'header' }),
        box('Talk to villagers to find out who needs help.', 'S', { h: ROW, style: 'muted' }),
      ],
    })),
  },
  'social-players': {
    title: 'Social: Players',
    current: ['social-players'],
    build: () => shell(frame('Social', { tabs: SOCIAL, sel: 0, scrolls: true, body: [...rows(['Player Nearby'], { focus: 0 }), box('Walk up to Player and press A', 'S', { h: ROW, style: 'muted' })] })),
  },
  'social-trades': {
    title: 'Social: Trades',
    current: ['social-trades', 'social-trades-sheet'],
    build: () => shell(frame('Social', {
      tabs: SOCIAL, sel: 1, bodyGap: 0.5,
      body: [...rows(['Offer received'], { focus: 0 }), box('You offer: (nothing)', 'S', { h: 1.7, style: 'text' }), box('You receive: Flameling Lv5 HP 15/15', 'S', { h: 1.7, style: 'text' })],
      sheet: sheet(null, ['Accept', 'Decline', 'Back']),
    })),
  },
  'social-challenges': {
    title: 'Social: Challenges',
    current: ['social-challenges'],
    build: () => shell(frame('Social', {
      tabs: SOCIAL, sel: 2, bodyGap: 0.5,
      body: [box('Player challenges you (RowCard)', 'H', { h: 3.5, style: 'tabsel', topText: true }), box('Other player: 2 vs 2 (RowCard)', 'H', { h: 3.5, style: 'card', topText: true })],
    })),
  },
  'social-rankings': {
    title: 'Social: Rankings',
    current: ['social-rankings'],
    build: () => shell(frame('Social', {
      tabs: SOCIAL, sel: 3, scrolls: true,
      body: [...['1. Player Rating 1216', '2. Other Rating 1184', '3. Another Rating 1160'].map((l) => box(l, 'S', { h: ROW, style: 'muted' })), box('Position cue', 'V', { style: 'thumb', hideText: true, abs: { corner: 'tr', inset: 0.25, w: 0.5, h: 3 } })],
    })),
  },
  profile: {
    title: 'Profile',
    current: ['main-menu-profile', 'profile-name', 'profile-account', 'profile-privacy'],
    build: () => shell(frame('Profile', {
      bodyGap: 0.25, scrolls: true,
      body: [
        box('Name', 'S', { h: 1.9, style: 'header' }),
        box('[ Player ]', 'S', { h: ROW, style: 'focus' }), box('Rename', 'S', { h: ROW, style: 'row' }), sep(),
        box('Account', 'S', { h: 1.9, style: 'header' }),
        box('Keep your guest progress: sign in to claim it on this device.', 'S', { h: ROW, style: 'muted' }),
        ...rows(['Sign in', 'Decline']), sep(),
        box('Privacy', 'S', { h: 1.9, style: 'header' }),
        box('Account status and data export.', 'S', { h: ROW, style: 'muted' }),
        ...rows(['Request my data export', 'Delete my account']), sep(),
        box('Close', 'S', { h: ROW, style: 'row' }),
      ],
    })),
  },
  'help-introduction': {
    title: 'How to Play: Introduction',
    current: ['help-screen'],
    build: () => shell(frame('How to Play', {
      tabs: ['Introduction', 'Encyclopedia'], sel: 0, bodyGap: 0.5,
      body: [
        box('Book-jacket blurb, a couple of paragraphs, capped at 80ch (no spoilers)', 'V', { grow: 1, style: 'text', topText: true }),
        box('Report a problem', 'S', { h: ROW, style: 'focus' }),
      ],
    })),
  },
  'help-encyclopedia': {
    title: 'How to Play: Encyclopedia',
    current: ['help-goals'],
    build: () => shell(frame('How to Play', {
      tabs: ['Introduction', 'Encyclopedia'], sel: 1, scrolls: true,
      body: [...rows(['Party and Storage', 'Recruit and bait', 'Evolution and essence', 'Affinity', 'Status effects', 'Tactical AP', 'Initiative', 'Action queue', 'Idle clock', 'Stances', 'Guard', 'Deploy', 'Ranked'], { focus: 1 }), box('Position cue', 'V', { style: 'thumb', hideText: true, abs: { corner: 'tr', inset: 0.25, w: 0.5, h: 5 } })],
    })),
  },
  'help-detail': {
    title: 'How to Play: detail',
    notShipped: 'No entry detail ships: the Goals tab is three static lines (nearest screen shown).',
    current: ['help-goals'],
    build: () => shell(frame('How to Play', {
      tabs: ['Introduction', 'Encyclopedia'], sel: 1, scrolls: true,
      body: rows(['Party and Storage', 'Recruit and bait', 'Evolution and essence', 'Affinity', 'Status effects'], { focus: 1 }),
      sheet: box('ContextSheet: detail variant', 'S', {
        style: 'sheet', hideText: true, dir: 'col', pad: 0.5, gap: 0.25,
        abs: { corner: 'cc', inset: 0, w: 40, h: 16 },
        children: [box('Recruit and bait', 'S', { h: 2, style: 'header' }), box('Definition, then related mechanics', 'V', { grow: 1, style: 'text', topText: true }), box('Back', 'S', { h: ROW, style: 'focus' })],
      }),
    })),
  },
  'controls-buttons': {
    title: 'Controls: Buttons',
    current: ['controls-buttons'],
    build: () => shell(frame('Controls', {
      tabs: ['Buttons', 'Shortcuts', 'Display'], sel: 0, scrolls: true,
      body: rows(['Up: W   (alt) ArrowUp', 'Down: S   (alt) ArrowDown', 'Left: A   (alt) ArrowLeft', 'Right: D   (alt) ArrowRight', 'Confirm (A): Enter', 'Back (B): Backspace', 'Jump (X): Space', 'Info (Y): F', 'Previous tab (LB): Q', 'Next tab (RB): E', 'Menu (Start): Esc', 'Help (Select): R', 'Reset all'], { focus: 0 }),
      strip: 'Press a key for Up…',
      toast: 'Saved.',
    })),
  },
  'controls-shortcuts': {
    title: 'Controls: Shortcuts',
    current: ['controls-shortcuts'],
    build: () => shell(frame('Controls', {
      tabs: ['Buttons', 'Shortcuts', 'Display'], sel: 1, scrolls: true,
      body: rows(['Storage: B', 'Inventory: I', 'Party: V', 'Journal: J', 'Trades: U', 'Challenges: P', 'Rankings: L', 'Name: N', 'Account: C', 'Controls: Y', 'Save bug report: F9', 'Dismiss error: F8', 'Reset all'], { focus: 0 }),
    })),
  },
  'controls-display': {
    title: 'Controls: Display',
    notShipped: 'No Display tab ships; the text never scales. Nearest: the Options sub-list it replaces.',
    current: ['main-menu-options'],
    build: () => shell(frame('Controls', {
      tabs: ['Buttons', 'Shortcuts', 'Display'], sel: 2, bodyGap: 0.25,
      body: [box('Text size', 'S', { h: 1.9, style: 'header' }), ...rows(['Normal (x1)', 'Large (x1.5)', 'Extra large (x2)'], { focus: 0 })],
    })),
  },
  shop: {
    title: 'Shop',
    current: ['shop-buy', 'shop-qty', 'shop-confirm', 'shop-sell'],
    build: () => shell(frame('Pebble Town Shop · Gold 5000', {
      tabs: ['Buy', 'Sell'], sel: 0, scrolls: true,
      body: rows(['Lure Berry 200g [Buy]', 'Power Root 300g [Buy]', 'Antidote 150g [Buy]', 'Tidewell Shard 500g [Buy]', 'Emberheart Cinder 500g [Buy]'], { focus: 0 }),
      sheet: sheet('Buy how many Lure Berry?', ['Quantity: 1  (Left/Right)', 'Back']),
    })),
  },
  heal: {
    title: 'Heal',
    current: ['heal'],
    build: () => shell(frame('Heal here (Free)', { bodyGap: 0.25, body: [box('Heal party for Free?', 'S', { h: 1.9, style: 'text' }), ...rows(['Yes', 'No'], { focus: 0 })] })),
  },
  dialogue: {
    title: 'Dialogue box',
    current: ['dialogue'],
    build: () => ({
      worldBack: true, dir: 'col', children: [
        { grow: 1 },
        { dir: 'col', h: 9.5, pad: 0.5, children: [box('Dialogue box (blocking text box)', 'H', {
          style: 'frame', hideText: true, grow: 1, dir: 'col', pad: 0.5, children: [
            box('elder_oak', 'S', { h: 1.9, style: 'header' }), box('The ancient oak spirit greets you.', 'H', { grow: 1, style: 'text', topText: true }), box('Accept a quest', 'S', { h: ROW, style: 'focus' }),
          ],
        })] },
        hint(),
      ],
    }),
  },
  'trade-propose': {
    title: 'Trade-propose wizard',
    current: ['tradepropose-offer', 'tradepropose-coins', 'tradepropose-review', 'tradepropose-confirm'],
    build: () => shell(frame('Trade with Player', {
      tabs: ['Offer', 'Coins', 'Ask', 'Review'], sel: 0, scrolls: true,
      body: rows(['[x] Flameling Lv5', '[ ] Tidalin Lv4'], { focus: 0 }),
      sheet: sheet('Send this offer?', ['Yes', 'No']),
    })),
  },
  'world-sheets': {
    title: 'World sheets',
    current: ['world-picker', 'world-challenge-confirm', 'world-request-banner', 'world-request-sheet'],
    build: () => ({
      worldBack: true, dir: 'col', children: [
        { dir: 'col', grow: 1, children: [
          box('World picker: anchored to the tile, as shipped', 'S', { style: 'sheet', hideText: true, dir: 'col', pad: 0.25, abs: { corner: 'tl', inset: 7, w: 18, h: 6 }, children: rows(['Trade: Player', 'Challenge: Player', 'Close'], { focus: 0 }) }),
          box('Request sheet: low centre, as shipped', 'S', { style: 'sheet', hideText: true, dir: 'col', pad: 0.25, abs: { corner: 'bc', inset: 1, bottom: 11, w: 18, h: 7.5 }, children: rows(['Accept', 'Decline', 'View', 'Close'], { focus: 0 }) }),
          box('Entering Verdant Hollow (toast)', 'S', { style: 'toast', abs: { corner: 'tr', inset: 0.5, w: 18, h: 2.25 } }),
        ] },
        hint(['Player wants to trade', 'A OK', 'B Back', 'Start Close', 'Select Help']),
      ],
    }),
  },
  'tactics-deploy': {
    title: 'Tactical: deploy',
    current: ['tactics-deploy', 'tactics-deploy-editor'],
    build: () => shell(frame('Battle: deploy', {
      bodyGap: 0.25,
      body: [
        box('Tidalin Lv4 (wild pack)', 'S', { h: ROW, style: 'muted' }), box('Flameling Lv7 (wild pack)', 'S', { h: ROW, style: 'muted' }), sep(),
        box('Slot 1 Flameling Lv5 HP 282/300', 'S', { h: ROW, style: 'row' }), box('Slot 2 Tidalin Lv4 HP 120/120', 'S', { h: ROW, style: 'row' }), box('Slot 3 Empty', 'S', { h: ROW, style: 'disabled' }), sep(),
        ...rows(['Deploy', 'Edit formation'], { focus: 0 }),
      ],
    })),
  },
  'tactics-board': {
    title: 'Tactical: board + HUD + command menu + forecast',
    current: ['tactics-forecast', 'tactics-menu'],
    build: () => shell(box('Battle frame', 'V', {
      style: 'frame', hideText: true, grow: 1, dir: 'col', pad: 0.125, children: [
        { dir: 'row', h: 2, gap: 0.25, children: [box('Round 2', 'S', { w: 6.5, style: 'title', fs: 0.875 }), ...['Flameling', 'Tidalin', 'Flameling', 'Tidalin'].map((n, i) => box(n, 'S', { w: 7.5, h: 1.5, style: i === 0 ? 'tabsel' : 'tab', fs: 0.75 }))] },
        box('Board', 'V', { grow: 1, style: 'board', topText: true, grid: { cols: 7, rows: 7 } }),
        box('Ticker (last lines of the capped list)', 'S', { h: 3.75, style: 'hud', topText: true }),
        { dir: 'row', h: 11, gap: 0.5, pad: 0.25, children: [
          { dir: 'col', w: 8.5, gap: 0.125, children: ['Danger overlay', 'Previous unit', 'Next unit'].map((l) => box(l, 'S', { h: 1.4, style: 'chip', fs: 0.7 })) },
          box('Command menu', 'S', { w: 12, style: 'sheet', hideText: true, dir: 'col', pad: 0.125, children: rows(['Move', 'Skills', 'Items', 'Recruit', 'Flee', 'Guard'], { focus: 1 }) }),
          box('Forecast: vs Tidalin, Hit 95%, 4-6 damage, Type +1/2', 'S', { w: 34, style: 'hud', topText: true }),
        ] },
        box('Flameling Lv5 HP 297/300 Fire, AP pips', 'S', { style: 'hud', abs: { corner: 'tl', inset: 0.5, top: 2.5, w: 20, h: 3 } }),
        box('Tidalin Lv4 HP 18/18 Water', 'S', { style: 'hud', abs: { corner: 'tr', inset: 0.5, top: 2.5, w: 14, h: 3 } }),
        box("Flameling's turn", 'S', { style: 'chip', center: true, abs: { corner: 'bc', inset: 0, bottom: 15.75, w: 10, h: 1.9 } }),
      ],
    }), ['A OK', 'B Back', 'X Danger', 'LB Previous unit', 'RB Next unit', 'Start Guard', 'Select Help']),
  },
  'tactics-results': {
    title: 'Tactical: results',
    current: ['tactics-results'],
    build: () => shell(frame('Battle: results', { bodyGap: 0.25, body: [box('Tidalin joined your team!', 'S', { h: 2, style: 'header' }), box('Rewards list', 'V', { grow: 1, style: 'text', topText: true }), ...rows(['Continue'], { focus: 0 })] })),
  },
};
