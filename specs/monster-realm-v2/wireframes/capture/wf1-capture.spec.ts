// wf-1 capture: drives the REAL client at master and records CURRENT. It lives in the harness and is never
// committed to the game repo. To re-measure (uif-17's as-shipped section):
//   1. `git worktree add --detach <dir> <sha>` of monster-realm; symlink client/node_modules; `wasm-pack build client-wasm --target bundler`;
//      `cargo build -p monster-realm-module --release --target wasm32-unknown-unknown --features dev_reducers`.
//   2. `spacetime start --listen-addr 127.0.0.1:3597 --in-memory --non-interactive`; `spacetime publish -s http://127.0.0.1:3597 --bin-path <wasm> --delete-data -y wf1`;
//      `spacetime call -s http://127.0.0.1:3597 wf1 sync_content`.
//   3. Copy this file to client/e2e/ and wf1.config.ts to client/; `WF1_OUT=<out> STDB_SERVER=http://127.0.0.1:3597 VITE_STDB_DB=wf1 VITE_STDB_URI=ws://127.0.0.1:3597
//      MR_E2E_PORT=5597 npx playwright test -c wf1.config.ts`; then `node build.mjs --import <out> && node build.mjs`.
// Update the `sha` literal in snap() to the commit measured.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, expect, type Page, test } from '@playwright/test';
import {
  closeAll, deployByButtons, fleeByButtons, interactWithNpc, menuCursorTo, openFaceToFace, openMenu, pressAccel, pressButton,
  readTactics, readWorld, recruitByButtons, sides, tileDistance, turnKey, waitOwnTurnOrEnd, walkTo, TACTICS, attackByButtons,
  draftMoveToward, endTurn, waitExecuted, readOwnMonsters, faceTile, type Tile, type Dir,
} from './controls';

const OUT = process.env.WF1_OUT as string;
mkdirSync(OUT, { recursive: true });
const failures: string[] = [];
const done: string[] = [];

const sql = (q: string): string => execFileSync('spacetime', ['sql', '-s', 'http://127.0.0.1:3597', 'wf1', q], { encoding: 'utf8', timeout: 15000 });
type W = any;
const g = (p: Page, expr: string) => p.evaluate(`window.__game().${expr}`);

async function snap(p: Page, name: string, note = ''): Promise<void> {
  await p.waitForTimeout(450);
  const vp = p.viewportSize();
  const data = await p.evaluate(() => {
    const out: any[] = [];
    const walk = (el: Element, depth: number) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      const inView = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => (n.textContent ?? '').trim()).filter(Boolean).join(' ');
      const bf = getComputedStyle(el, '::before').content;
      const bfText = bf && bf !== 'none' && bf !== 'normal' ? bf.replace(/^"([^"]*)".*$/, '$1').trim() : '';
      const bg = cs.backgroundColor;
      const hasPaint = (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
      const he = el as HTMLElement;
      if (inView && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
        const cx = Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)); const cy = Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2));
        const top = document.elementFromPoint(cx, cy);
        const occ = cs.pointerEvents !== 'none' && top !== null && top !== el && !el.contains(top) && !top.contains(el);
        out.push({ occ: occ || undefined, off: r.y >= innerHeight || r.x >= innerWidth || undefined,
          t: el.tagName.toLowerCase(), id: el.id || undefined, cls: he.className && typeof he.className === 'string' ? he.className : undefined,
          role: el.getAttribute('role') || undefined, tid: el.getAttribute('data-testid') || undefined,
          sel: el.getAttribute('aria-selected') || undefined, cur: el.getAttribute('aria-current') || undefined, dis: el.getAttribute('aria-disabled') || undefined,
          d: depth, x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
          text: ((bfText ? bfText + ' ' : '') + own).trim().slice(0, 90) || undefined, paint: hasPaint || undefined, fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, fg: cs.color, bg: bg, pad: cs.padding, mar: cs.margin, gap: cs.gap,
          bd: cs.borderTopWidth + ' ' + cs.borderRightWidth + ' ' + cs.borderBottomWidth + ' ' + cs.borderLeftWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
          pos: cs.position, dsp: cs.display, ov: cs.overflowY, op: cs.opacity, sh: he.scrollHeight, ch: he.clientHeight, sw: he.scrollWidth, cw: he.clientWidth,
        });
      }
      if (el.tagName === 'CANVAS' || el.tagName === 'SVG') return;
      for (const c of el.children) walk(c, depth + 1);
    };
    walk(document.body, 0);
    const w = (window as any);
    return { stack: w.__game ? w.__game().stack : null, navActive: w.__game ? w.__game().navActive : null, dpr: window.devicePixelRatio, inner: [window.innerWidth, window.innerHeight], rootFont: getComputedStyle(document.documentElement).fontSize, focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null, els: out };
  });
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ name, note, viewport: vp, sha: 'd90c32c9', ...data }));
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 62 });
  done.push(name);
}

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  try { await fn(); } catch (e) { failures.push(`${name}: ${(e as Error).message.slice(0, 400)}`); console.log(`[wf1] STEP FAIL ${name}: ${(e as Error).message.slice(0, 300)}`); }
  writeFileSync(`${OUT}/_progress.json`, JSON.stringify({ done, failures }, null, 1));
}

async function activeText(p: Page): Promise<string> {
  return (await p.evaluate(() => {
    const els = [...document.querySelectorAll('.mr-nav-item.is-active, [aria-selected="true"]')].filter((e) => (e as HTMLElement).offsetParent !== null && !(e.getAttribute('role') === 'tab'));
    return els.length ? (els[els.length - 1].textContent ?? '').replace(/\s+/g, ' ').trim() : '';
  })) as string;
}
async function seek(p: Page, label: string, max = 12): Promise<void> {
  for (let i = 0; i < max; i++) {
    const t = await activeText(p);
    if (t.toLowerCase().startsWith(label.toLowerCase())) return;
    await pressButton(p, 'Down');
    await p.waitForTimeout(90);
  }
  throw new Error(`seek: no row ${label}; last=${await activeText(p)}`);
}
async function openRoot(p: Page): Promise<void> { await closeAll(p); await pressButton(p, 'Start'); await p.waitForTimeout(200); }
async function ready(p: Page): Promise<void> {
  await p.waitForFunction(() => { const w = (window as W).__game; if (!w) return false; const s = w(); return s.identity !== '' && s.ownAuthTile !== null && s.ownMonsters.length > 0; }, null, { timeout: 40000 });
}
function shuttleDir(tile: Tile): string { if (tile.x === 1 && tile.y === 1) return 'South'; if (tile.x === 1 && tile.y === 2) return 'East'; if (tile.x === 2 && tile.y === 2) return 'West'; if (tile.y > 2) return 'North'; if (tile.x > 2) return 'West'; return 'South'; }
async function hunt(p: Page, label: string) {
  await closeAll(p);
  await walkTo(p, { x: 1, y: 2 }, label).catch(() => undefined);
  for (let i = 0; i < 200; i++) {
    const s: W = await p.evaluate(() => { const g = (window as W).__game(); return { b: g.ongoingBattle, t: g.ownAuthTile }; });
    if (s.b !== null) break;
    await p.evaluate((d) => (window as W).__game().step(d), shuttleDir(s.t));
    await p.waitForFunction((f: Tile) => { const s = (window as W).__game(); return s.ongoingBattle !== null || (s.ownAuthTile && (s.ownAuthTile.x !== f.x || s.ownAuthTile.y !== f.y)); }, s.t, { timeout: 8000 }).catch(() => undefined);
  }
  await expect.poll(async () => (await readTactics(p))?.battleId ?? null, { timeout: 20000 }).not.toBeNull();
  return (await readTactics(p))!;
}

test('wf1 capture', async () => {
  const bA = await chromium.launch(); const bB = await chromium.launch();
  const cA = await bA.newContext({ viewport: { width: 1280, height: 720 } });
  const cB = await bB.newContext({ viewport: { width: 1280, height: 720 } });
  const A = await cA.newPage(); const B = await cB.newPage();
  await A.goto('/'); await ready(A); await B.goto('/'); await ready(B);
  const idA = String(await g(A, 'identity')).toLowerCase().replace(/^0x/, '');
  const sA: W = await A.evaluate(() => (window as W).__game());
  const starter = sA.ownMonsters[0].monsterId as string;
  const sB: W = await B.evaluate(() => (window as W).__game());
  const bMon = sB.ownMonsters[0].monsterId as string; const idB = String(sB.identity);

  await step('seed', async () => {
    for (const t of ['monster', 'monster_pub']) for (const [c, v] of [['stat_hp', 300], ['current_hp', 300], ['stat_defense', 250], ['stat_sp_defense', 250]] as const) sql(`UPDATE ${t} SET ${c} = ${v} WHERE monster_id = ${starter}`);
    sql(`INSERT INTO inventory (inv_id, owner_identity, item_id, count) VALUES (0, 0x${idA}, 1, 80)`);
    sql(`INSERT INTO inventory (inv_id, owner_identity, item_id, count) VALUES (0, 0x${idA}, 2, 3)`);
    try { sql(`INSERT INTO player_wallet (owner_identity, balance) VALUES (0x${idA}, 5000)`); } catch (e) { console.log('[wf1] wallet seed failed ' + (e as Error).message.slice(0, 200)); }
    await A.waitForTimeout(700);
  });

  // --- world + face-to-face while both stand at spawn
  await step('world', () => snap(A, 'world', 'bare world with hint bar'));
  await step('world-picker', async () => {
    await expect.poll(async () => A.evaluate(() => (window as W).__mrTrade.allPlayers().length), { timeout: 15000 }).toBeGreaterThan(1);
    await A.waitForTimeout(500);
    await pressButton(A, 'A');
    await expect(A.locator('#interact-prompt [role="option"]').first()).toBeVisible({ timeout: 6000 });
    await snap(A, 'world-picker', 'world picker (own tile candidates)');
    await pressButton(A, 'B'); await A.waitForTimeout(200);
  });
  await step('world-challenge-pick', async () => {
    await pressButton(A, 'A'); await expect(A.locator('#interact-prompt [role="option"]').first()).toBeVisible({ timeout: 6000 });
    await seek(A, 'Challenge'); await pressButton(A, 'A');
    await A.waitForTimeout(300);
    await snap(A, 'world-challenge-confirm', 'challenge size pick');
    await pressButton(A, 'B'); await A.waitForTimeout(150); await pressButton(A, 'B'); await A.waitForTimeout(150); await closeAll(A);
  });
  await step('trade-propose', async () => {
    await openFaceToFace(A, 'Trade', undefined, B);
    await A.waitForTimeout(400);
    await snap(A, 'tradepropose-offer', 'wizard step Offer');
    await pressButton(A, 'A'); await A.waitForTimeout(120);
    await pressButton(A, 'RB'); await A.waitForTimeout(250);
    await snap(A, 'tradepropose-coins', 'wizard step Coins');
    await pressButton(A, 'A'); await A.waitForTimeout(250);
    await snap(A, 'tradepropose-review', 'wizard step Review (or next)');
    await pressButton(A, 'A'); await A.waitForTimeout(250);
    await snap(A, 'tradepropose-confirm', 'wizard confirm prompt');
    await closeAll(A);
  });
  await step('world-request', async () => {
    await closeAll(A); await A.evaluate(() => (window as W).__game().step('East')); await A.waitForTimeout(500);
    await B.evaluate((a: W) => (window as W).__mrTrade.proposeTrade({ counterparty: a.c, initiatorMonsterIds: [a.m], initiatorItems: [], initiatorCurrency: '0', counterpartyMonsterIds: [], counterpartyItems: [], counterpartyCurrency: '0' }), { c: sA.identity, m: bMon });
    await expect(A.locator('#notice-banner')).toBeVisible({ timeout: 20000 });
    await snap(A, 'world-request-banner', 'non-modal request banner over the world');
    await pressButton(A, 'Y'); await A.waitForTimeout(250);
    await snap(A, 'world-request-sheet', 'request sheet: Accept/Decline/View');
    await pressButton(A, 'B'); await A.waitForTimeout(250);
  });

  // --- main menu + its groups
  await step('main-menu', async () => { await openRoot(A); await snap(A, 'main-menu', 'root'); });
  await step('main-menu-social', async () => { await seek(A, 'Social'); await pressButton(A, 'A'); await snap(A, 'main-menu-social', 'Social sub-list'); await pressButton(A, 'B'); });
  await step('main-menu-profile', async () => { await seek(A, 'Profile'); await pressButton(A, 'A'); await snap(A, 'main-menu-profile', 'Profile sub-list'); await pressButton(A, 'B'); });
  await step('main-menu-options', async () => { await seek(A, 'Options'); await pressButton(A, 'A'); await snap(A, 'main-menu-options', 'Options sub-list'); await pressButton(A, 'B'); });

  // --- Monsters
  await step('monsters', async () => {
    await closeAll(A); await pressAccel(A, 'V'); await A.waitForTimeout(350);
    await snap(A, 'monsters-party', 'Party tab, one starter');
    await pressButton(A, 'A'); await A.waitForTimeout(250);
    await snap(A, 'monsters-sheet', 'per-monster sheet');
    await pressButton(A, 'A'); await A.waitForTimeout(250);
    await snap(A, 'monsters-summary', 'Summary pane');
    await pressButton(A, 'B'); await A.waitForTimeout(200);
    await pressButton(A, 'Down'); await A.waitForTimeout(100); await pressButton(A, 'Down'); await A.waitForTimeout(100); await pressButton(A, 'A'); await A.waitForTimeout(250);
    await snap(A, 'monsters-feed', 'Feed sub-list');
    await pressButton(A, 'B'); await A.waitForTimeout(150); await pressButton(A, 'B'); await A.waitForTimeout(150);
    await pressButton(A, 'RB'); await A.waitForTimeout(300);
    await snap(A, 'monsters-storage', 'Storage tab, empty');
    await closeAll(A);
  });
  // --- Inventory
  await step('inventory', async () => {
    await pressAccel(A, 'I'); await A.waitForTimeout(350);
    await snap(A, 'inventory', 'first pocket');
    await pressButton(A, 'RB'); await A.waitForTimeout(250);
    await snap(A, 'inventory-food', 'Food pocket');
    await pressButton(A, 'A'); await A.waitForTimeout(250);
    await snap(A, 'inventory-sheet', 'item sheet');
    await pressButton(A, 'A'); await A.waitForTimeout(250);
    await snap(A, 'inventory-picker', 'feed picker');
    await pressButton(A, 'B'); await A.waitForTimeout(120); await pressButton(A, 'B'); await A.waitForTimeout(120);
    for (let i = 0; i < 3; i++) { await pressButton(A, 'RB'); await A.waitForTimeout(200); const empty = await A.evaluate(() => (document.body.innerText || '').match(/empty|nothing|no items/i) !== null); await snap(A, `inventory-pocket-${i + 2}`, `pocket ${i + 2} empty=${empty}`); }
    await closeAll(A);
  });
  await step('journal', async () => { await pressAccel(A, 'J'); await A.waitForTimeout(300); await snap(A, 'journal', 'empty journal'); await closeAll(A); });
  // --- Social
  await step('social', async () => {
    await pressAccel(A, 'U'); await A.waitForTimeout(350);
    await snap(A, 'social-trades', 'Trades tab');
    await pressButton(A, 'A'); await A.waitForTimeout(300);
    await snap(A, 'social-trades-sheet', 'Trades row sheet');
    await pressButton(A, 'B'); await A.waitForTimeout(200);
    await pressAccel(A, 'P').catch(() => undefined); await A.waitForTimeout(350);
    await closeAll(A); await pressAccel(A, 'P'); await A.waitForTimeout(350);
    await snap(A, 'social-challenges', 'Challenges tab');
    await closeAll(A); await pressAccel(A, 'L'); await A.waitForTimeout(350);
    await snap(A, 'social-rankings', 'Rankings tab');
    await pressButton(A, 'RB'); await A.waitForTimeout(300);
    await snap(A, 'social-players', 'Players tab (next of Rankings)');
    await pressButton(A, 'A'); await A.waitForTimeout(300);
    await snap(A, 'social-sheet', 'row sheet');
    await closeAll(A);
  });
  // --- Profile
  await step('profile', async () => {
    await pressAccel(A, 'N'); await A.waitForTimeout(350); await snap(A, 'profile-name', 'Rename'); await closeAll(A);
    await pressAccel(A, 'C'); await A.waitForTimeout(350); await snap(A, 'profile-account', 'Claim/account'); await closeAll(A);
    await openRoot(A); await seek(A, 'Profile'); await pressButton(A, 'A'); await A.waitForTimeout(200); await seek(A, 'Privacy'); await pressButton(A, 'A'); await A.waitForTimeout(350);
    await snap(A, 'profile-privacy', 'Privacy'); await closeAll(A);
  });
  // --- Controls + help
  await step('controls', async () => {
    await pressAccel(A, 'Y'); await A.waitForTimeout(350); await snap(A, 'controls-buttons', 'first tab');
    await pressButton(A, 'RB'); await A.waitForTimeout(250); await snap(A, 'controls-shortcuts', 'second tab'); await closeAll(A);
  });
  await step('help', async () => {
    await openRoot(A); await seek(A, 'Options'); await pressButton(A, 'A'); await A.waitForTimeout(200); await seek(A, 'How to play'); await pressButton(A, 'A'); await A.waitForTimeout(350);
    await snap(A, 'help-screen', 'help first tab');
    await pressButton(A, 'RB'); await A.waitForTimeout(250); await snap(A, 'help-controls', 'help second tab');
    await pressButton(A, 'RB'); await A.waitForTimeout(250); await snap(A, 'help-goals', 'help third tab'); await closeAll(A);
  });
  // --- Dialogue + Heal (zone 0)
  await step('dialogue', async () => {
    await interactWithNpc(A, { stand: { x: 6, y: 3 }, facing: 'South' as Dir, opened: A.locator('#dialogue-overlay'), maxAttempts: 21, label: 'wf1 dialogue' });
    await A.waitForTimeout(350); await snap(A, 'dialogue', 'NPC dialogue box');
    await closeAll(A);
  });
  await step('heal', async () => {
    await A.waitForTimeout(400);
    await faceTile(A, { x: 7, y: 3 }, 'East' as Dir, 'wf1 heal');
    await A.waitForTimeout(600);
    await pressButton(A, 'A'); await A.waitForTimeout(450);
    await snap(A, 'heal', 'heal screen');
    await closeAll(A);
  });
  // --- Shop (zone 1)
  await step('shop', async () => {
    await walkTo(A, { x: 1, y: 4 }, 'wf1 warp').catch(() => undefined);
    await A.evaluate(() => (window as W).__game().step('South'));
    await A.waitForTimeout(2000);
    await walkTo(A, { x: 6, y: 5 }, 'z1');
    await walkTo(A, { x: 6, y: 1 }, 'z1 n');
    await A.evaluate(() => (window as W).__game().step('East')); await A.waitForTimeout(500);
    await pressButton(A, 'A'); await A.waitForTimeout(600);
    const shop = A.locator('#shop-overlay');
    if (!(await shop.isVisible())) {
      await snap(A, 'shop-dialogue', 'shopkeeper greeting');
      const btn = A.locator('[data-shop-id]');
      if (await btn.count()) { await btn.first().click({ timeout: 3000 }); }
      await A.waitForTimeout(500);
    }
    await expect(shop).toBeVisible({ timeout: 5000 });
    await snap(A, 'shop-buy', 'Buy tab');
    await pressButton(A, 'A'); await A.waitForTimeout(300); await snap(A, 'shop-qty', 'quantity phase');
    await pressButton(A, 'A'); await A.waitForTimeout(300); await snap(A, 'shop-confirm', 'confirm phase');
    await pressButton(A, 'B'); await A.waitForTimeout(250);
    if (await shop.isVisible()) { await pressButton(A, 'RB'); await A.waitForTimeout(300); await snap(A, 'shop-sell', 'Sell tab'); }
    await closeAll(A);
    await walkTo(A, { x: 1, y: 4 }, 'back').catch(() => undefined);
    await A.evaluate(() => (window as W).__game().step('South'));
    await A.waitForTimeout(2000);
  });
  // --- Tactical
  await step('tactics', async () => {
    let captured = false;
    let recruited = false;
    for (let battle = 0; battle < 6 && !recruited; battle++) {
      const start = await hunt(A, `b${battle}`);
      console.log(`[wf1] battle ${battle} phase ${start.phase}`);
      await expect(A.locator(TACTICS.shell)).toBeVisible({ timeout: 20000 });
      let last: string | null = null;
      for (let turn = 0; turn < 16; turn++) {
        const t = await waitOwnTurnOrEnd(A, last, 15000);
        if (t.phase === 'Finished') { recruited = t.units.some((u) => u.side === 'B' && u.state === 'Recruited'); break; }
        last = turnKey(t);
        const { me, enemy: wild } = sides(t);
        if (!captured) await snap(A, 'tactics-board', 'board + HUD at start of own turn');
        await openMenu(A, me);
        if (!captured) await snap(A, 'tactics-menu', 'board + HUD + command menu');
        if (tileDistance(me, wild) === 1) {
          const weak = wild.curHp * 100 <= wild.maxHp * 45;
          if (weak && (await recruitByButtons(A, 'bait:1'))) continue;
          // capture the forecast once
          if (!captured) {
            const skills = A.locator(TACTICS.menuRow('skills'));
            if ((await skills.getAttribute('aria-disabled')) !== 'true') {
              await menuCursorTo(A, 'skills'); await pressButton(A, 'A'); await A.waitForTimeout(200);
              await snap(A, 'tactics-skills', 'skills sub-menu');
              const sk = A.locator('.tactics-menu-row[data-row^="skill:"]:not([aria-disabled="true"])').first();
              const key = await sk.getAttribute('data-row');
              await menuCursorTo(A, key as string); await pressButton(A, 'A'); await A.waitForTimeout(350);
              await snap(A, 'tactics-forecast', 'board + aim + forecast');
              captured = true;
              await pressButton(A, 'B'); await A.waitForTimeout(100); await pressButton(A, 'B'); await A.waitForTimeout(100);
            }
          }
          const hit = await attackByButtons(A, { allowKo: false, enemyHp: wild.curHp });
          if (hit === 'attacked') { await waitExecuted(A, t.events); await endTurn(A); continue; }
          if (hit === 'kills' && (await recruitByButtons(A, 'bait:1'))) continue;
          await endTurn(A); continue;
        }
        const d = await draftMoveToward(A, wild);
        if (!d) await pressButton(A, 'B');
        await endTurn(A);
      }
      await expect(A.locator(TACTICS.results)).toBeVisible({ timeout: 20000 }).catch(() => undefined);
      if (await A.locator(TACTICS.results).isVisible()) { await A.waitForTimeout(150); await snap(A, 'tactics-results', `results (recruited=${recruited})`); }
      await expect.poll(async () => (await readWorld(A)).stackLength, { timeout: 25000 }).toBe(1);
    }
    if (!recruited) throw new Error('no recruit');
  });
  await step('monsters-two', async () => {
    const own = await readOwnMonsters(A);
    const rec = own.find((m) => m.monsterId !== starter);
    if (!rec) throw new Error('no recruit');
    await closeAll(A); await pressAccel(A, 'B'); await A.waitForTimeout(350);
    await snap(A, 'monsters-storage-filled', 'Storage with the recruit');
    await closeAll(A);
    for (const t of ['monster', 'monster_pub']) { for (const [c, v] of [['party_slot', 1], ['stat_hp', 120], ['current_hp', 120], ['stat_defense', 250], ['stat_sp_defense', 250]] as const) sql(`UPDATE ${t} SET ${c} = ${v} WHERE monster_id = ${rec.monsterId}`); }
    await A.waitForTimeout(700);
    await pressAccel(A, 'V'); await A.waitForTimeout(350);
    await snap(A, 'monsters-party-two', 'Party with two');
    await closeAll(A);
  });
  await step('tactics-deploy', async () => {
    for (let i = 0; i < 25; i++) {
      const t = await hunt(A, `deploy${i}`);
      if (t.phase === 'Deploying') {
        await expect(A.locator(TACTICS.deploy)).toBeVisible({ timeout: 20000 }).catch(() => undefined);
        await A.waitForTimeout(350);
        await snap(A, 'tactics-deploy', 'deploy confirm');
        await pressButton(A, 'X'); await A.waitForTimeout(350);
        await snap(A, 'tactics-deploy-editor', 'deploy editor');
        await pressButton(A, 'B'); await A.waitForTimeout(250);
        await deployByButtons(A, 'wf1');
        await waitOwnTurnOrEnd(A, null, 40000);
        // Viewport growth probe for the tactical board.
        await A.setViewportSize({ width: 1920, height: 1080 }); await A.waitForTimeout(500);
        await snap(A, 'tactics-board-1920', 'board at 1920x1080');
        await A.setViewportSize({ width: 1280, height: 720 }); await A.waitForTimeout(400);
        const tt = await waitOwnTurnOrEnd(A, null, 15000);
        if (tt.phase === 'Active') await fleeByButtons(A);
        await expect(A.locator(TACTICS.results)).toBeVisible({ timeout: 20000 }).catch(() => undefined);
        await expect.poll(async () => (await readWorld(A)).stackLength, { timeout: 25000 }).toBe(1);
        return;
      }
      await fleeByButtons(A);
      await expect(A.locator(TACTICS.results)).toBeVisible({ timeout: 20000 }).catch(() => undefined);
      await expect.poll(async () => (await readWorld(A)).stackLength, { timeout: 25000 }).toBe(1);
    }
    throw new Error('no pack of two');
  });
  // --- growth probes for CURRENT (fixed fonts vs window)
  await step('growth', async () => {
    await closeAll(A);
    await A.setViewportSize({ width: 1920, height: 1080 }); await A.waitForTimeout(400);
    await pressButton(A, 'Start'); await A.waitForTimeout(300); await snap(A, 'main-menu-1920', 'root at 1920x1080'); await closeAll(A);
    await pressAccel(A, 'V'); await A.waitForTimeout(350); await snap(A, 'monsters-party-1920', 'party at 1920x1080'); await closeAll(A);
    await A.setViewportSize({ width: 960, height: 540 }); await A.waitForTimeout(400);
    await pressButton(A, 'Start'); await A.waitForTimeout(300); await snap(A, 'main-menu-960', 'root at 960x540'); await closeAll(A);
    await A.setViewportSize({ width: 1280, height: 720 });
  });
  console.log(`[wf1] done=${done.length} failures=${failures.length}\n${failures.join('\n')}`);
  await bA.close(); await bB.close();
});
