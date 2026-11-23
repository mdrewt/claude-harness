# Tester brief — ci-fix-20261108T0800 (TEST-ONLY slice: you write the e2e change; nothing else changes)

Worktree (ALL paths relative to it):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ci-fix-20261108T0800`
(branch `ci-fix-20261108T0800`, base origin/master 3d5f4a63). Read with Read/Grep/Glob only. Your Bash is static-check-only
(hook): `node --check <file>` is allowed; playwright / vitest / cargo / npx are NOT. The orchestrator runs the spec against a
live SpacetimeDB and feeds the output back. Edit ONLY `client/e2e/battle-dpad.spec.ts`. Do not touch `client/e2e/controls.ts`,
anything under client/src, server-module, game-core, .claude. Ignore `client/e2e/zz-probe-approach.spec.ts` (a throwaway
diagnostic the orchestrator deletes before the gate run — do not import from it, do not edit it).
Plan (read §0 facts, §1 design, §5 REV 2 deltas R1–R9 — they amend §1):
`/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-ci-fix-20261108T0800-plan.md`.
Verification SSOT: `/home/mdrewt/projects/ai-apps/claude-harness/standards/testing-tdd.md` — no assertion may be removed,
relaxed, skipped or moved into a comment; every wait keeps a numeric bound and a message naming it; no try/catch around any
`expect` or helper (the ONE exception is the diagnostic SQL read below).
Formatting: biome (2-space, single quotes, trailing commas, 100 cols) — match the surrounding code exactly; the PostToolUse
format hook may rewrite your edit, re-read after editing.

## Why (the measured defect — do not re-diagnose)

Master CI failed CTL8J-2-DPAD-BATTLE-A at `battle-dpad.spec.ts:464`: `the wild never stood adjacent on a fresh own turn
within MAX_APPROACH_TURNS=12 own turns in any of 3 of MAX_ADJACENT_HUNTS=3 hunts`. Zone 0's species 3 (Sproutlet) is the
Skittish stance: with the player ADJACENT at its turn start it cannot attack and kites to distance 5; the loop then steps
adjacent again (`draftMoveToward` picks the band tile nearest the wild) and ends the turn — so on EVERY fresh own turn the
wild stands at d5: adjacency is unreachable for that species, by the rules, for the whole battle. Three Sproutlet battles
in a row (P ≈ (5/22)³ ≈ 1.2 %) spent the three hunts. Reproduced locally (probe, 10 battles): both Sproutlet battles ran
the full 12-turn bound with the CI ping-pong `me(2,5) wild(6,6) d5 | me(6,5) wild(2,6) d5 | …`; every species-1/2 battle
stood adjacent on own turn 2 or 3. Not a uif-7 regression (that PR changed only the Monsters screen). The fix: recognise
the kite the turn it happens and give that battle up at once, and widen the hunt budget so the draw cannot exhaust it.

## The change — exact contract (all inside CTL8J-2-DPAD-BATTLE-A unless stated)

### A. Constants (lines ~84–86)
A1. `MAX_ADJACENT_HUNTS` 3 → 8. Rewrite its doc comment to state: the first battle is CTL8J-3x's; a battle whose wild
    steps away from adjacency (a kiting, Skittish wild) is given up at once (`kitedAway`), fled and the grass re-hunted;
    zone 0's FROZEN encounter weights 10/7/5 make such a battle ≤ 5/22 ≈ 23 % of draws (pack slots roll independently;
    this identity owns one monster so every battle is one wild), so 8 hunts fail only when 8 kiters come in a row,
    ≈ 7e-6 per run; cost model (measured): a kiter hunt ≈ 10–15 s (recognised on own turn 2–3), a battle that runs the
    whole `MAX_APPROACH_TURNS` bound ≈ 37 s, so even 8 bound hunts plus the fight that follows stay under the 600 s
    test timeout. `MAX_APPROACH_TURNS` stays 12; add to its comment that it is the fallback for geometry the kite
    judgement cannot read (a far spawn behind rough ground may need an extra approach turn before adjacency is reached).
A2. No other constant changes. `test.setTimeout(600_000)`, `TURN_WAIT_MS`, `MAX_OWN_TURNS` untouched.

### B. Two file-level helpers (place them after `expectTerminalResults` / `continueWith`, before `test.describe`)
B1. The kite judgement — a PURE function, exactly this rule (`Tile` is the file's interface; `TacticsSnap` is imported):
    ```ts
    /** CTL8J-2-A: what the last own turn stepped toward — the wild (by unitId) and where it stood — and
     *  the tile the Move left (`from`). */
    interface Stepped {
      unitId: number;
      x: number;
      y: number;
      from: Tile;
    }

    /** True when the last own turn's Move reached the tile next to where `stepped` stood and that same
     *  wild, still conscious, is no longer adjacent: it stepped away from us. A kiting (Skittish) wild
     *  does this on every turn we end adjacent, so no number of approach turns can bring it adjacent on a
     *  fresh own turn. Judged from the fresh turn's snapshot, after the adjacency check. */
    function kitedAway(me: Tile, stepped: Stepped | null, units: TacticsSnap['units']): boolean {
      if (stepped === null || tileDistance(me, stepped) !== 1) return false;
      const wild = units.find((u) => u.unitId === stepped.unitId);
      return wild !== undefined && wild.state === 'Active' && tileDistance(me, wild) > 1;
    }
    ```
B2. The species read — DIAGNOSTIC ONLY, never an oracle, and it must not be able to fail the test:
    ```ts
    /** The battle's wild species and level (`s<species_id>L<level>`, `+`-joined by wild_index) by owner
     *  SQL on the private `battle_wild_unit` row — DIAGNOSTIC ONLY (it tells a Skittish kite from an AI
     *  that disengages in the CI log); `?` when the read fails, so a CLI hiccup cannot fail the test. */
    function wildSpecies(battleId: string): string {
      if (!/^[0-9]+$/.test(battleId)) return '?';
      try {
        const rows = sqlRows(
          sql(`SELECT * FROM battle_wild_unit WHERE battle_id = ${battleId}`, 'wild species'),
          'wild species',
        );
        rows.sort((a, b) => Number(a.wild_index) - Number(b.wild_index));
        const text = rows.map((r) => `s${r.species_id}L${r.level}`).join('+');
        return text === '' ? '?' : text;
      } catch {
        return '?';
      }
    }
    ```
    (`sql` and `sqlRows` exist in this file; the query fits `sql`'s charset guard. If biome rejects the bare `catch {`,
    use `catch (_err) {` — never an empty block.)

### C. The approach loop (lines ~413–467) — rewrite to this shape; the post-adjacency block (lines ~469–505) stays BYTE-IDENTICAL
C1. Replace the two comments above the loop (lines ~413–419) with the new truth: close in until the wild stands adjacent
    on a FRESH own turn (Recruit needs the whole budget); a wild that steps away from adjacency is a kiter (`kitedAway`)
    and that battle is fled on the spot and the grass re-hunted; a battle that never reaches adjacency within
    `MAX_APPROACH_TURNS` is fled on the next own turn; both bounded by `MAX_ADJACENT_HUNTS`; every hunt leaves one
    line (`hunts`) that the re-hunt log and the final throw carry.
C2. State: `let adjacent: TacticsSnap | null = null; const hunts: string[] = [];` (the old `let hunts = 0` counter goes;
    use `hunts.length` where it was used).
C3. Per hunt (`for (let hunt = 0; hunt < MAX_ADJACENT_HUNTS && adjacent === null; hunt += 1)`):
    - `const started = await huntEncounter(page, \`CTL8J-2-A hunt ${hunt}\`);` then the UNCHANGED hunt-0 assertion
      `expect(started.battleId, 'this is the battle CTL8J-3 used').toBe(firstBattleId);` under its `if (hunt === 0)`
      guard with its existing comment.
    - `const wild = wildSpecies(started.battleId);` (right after the hunt — the rows exist from the start).
    - Per-hunt state: `const trace: string[] = []; let last: string | null = null; let stepped: Stepped | null = null;
      let kited = false; let ended = false; let outcome = \`bound@${MAX_APPROACH_TURNS}\`;`
    - Turn loop `for (let turn = 0; turn < MAX_APPROACH_TURNS; turn += 1)`, in THIS order:
      1. `const tt = await waitOwnTurnOrEnd(page, last, TURN_WAIT_MS);` — if `tt.phase !== 'Active'`: `ended = true;
         outcome = \`ended:${tt.phase}@${turn}\`; break;`
      2. `last = turnKey(tt); const { me, enemy } = sides(tt);`
      3. `trace.push(\`r${tt.round}:${tt.turnIdx} me(${me.x},${me.y}) wild#${enemy.unitId}(${enemy.x},${enemy.y})hp${enemy.curHp}/${enemy.maxHp} d${tileDistance(me, enemy)}\`);`
      4. THE MOVED ASSERTION (new teeth — a dead Move must not pass green now that an Aggressive wild walking up on its
         own has 8 chances): `if (stepped !== null) expect(tileDistance(me, stepped.from), \`the drafted Move executed:
         the unit left (${stepped.from.x},${stepped.from.y}) — ${trace.join(' | ')}\`).toBeGreaterThan(0);`
      5. Adjacency: `if (tileDistance(me, enemy) === 1) { adjacent = tt; outcome = \`adjacent@${turn + 1}\`; break; }`
      6. `await openMenu(page, me);` then the UNCHANGED assertion `await expect(recruitRow, 'not adjacent: the Recruit
         row is greyed').toHaveAttribute('aria-disabled', 'true');` (same locator, same message, same matcher).
      7. The kite judgement: `if (kitedAway(me, stepped, tt.units)) { kited = true; outcome = \`kited@${turn + 1}\`;
         break; }` — the menu stays OPEN on this fresh turn; the flee below uses it.
      8. `stepped = (await draftMoveToward(page, enemy)) ? { unitId: enemy.unitId, x: enemy.x, y: enemy.y, from: { x: me.x, y: me.y } } : null;`
         then `await endTurn(page);`
    - After the turn loop: `hunts.push(\`hunt ${hunt}: battle ${started.battleId} wild=${wild} ${outcome} — ${trace.join(' | ')}\`);`
    - `if (adjacent !== null) break;`
    - `console.log(\`[bt-16 CTL8J-2-A] ${hunts[hunts.length - 1]} — re-hunting\`);`
    - Give the battle up — THREE paths, explicit:
      `if (kited) { await fleeByButtons(page); } else if (!ended) { const next = await waitOwnTurnOrEnd(page, last, TURN_WAIT_MS); if (next.phase === 'Active') await fleeByButtons(page); }`
      (kited: we are ON a fresh own live turn with its menu open — `fleeByButtons` goes straight to the Flee row; a
      `waitOwnTurnOrEnd(page, last, …)` here would wait for a turn that never comes and throw after 15 s. bound: the
      shipped wait-then-flee. ended: nothing to flee.) Then, for all three: `await throughResults(page, \`CTL8J-2-A hunt ${hunt}\`);`
C4. The final throw keeps its first clause and gains the hunts:
    ```ts
    if (adjacent === null) {
      throw new Error(
        `CTL8J-2-A: the wild never stood adjacent on a fresh own turn within MAX_APPROACH_TURNS=${MAX_APPROACH_TURNS} ` +
          `own turns in any of ${hunts.length} of MAX_ADJACENT_HUNTS=${MAX_ADJACENT_HUNTS} hunts — hunts: ${hunts.join(' || ')}`,
      );
    }
    ```
C5. The WRONG IMPL KILLED / SURVIVING CHECK comment block at the top of the test (lines ~406–412): add one line to WRONG
    IMPL KILLED — "a Move that drafts but never executes (the unit stays on its tile)" — and update the bt-16 line to
    "up to MAX_ADJACENT_HUNTS battles; a kiting wild's battle is given up the turn it steps away".

### D. Header comment (lines ~33–60)
D1. The CTL8J-2-A bullet: add that a wild which steps away from adjacency (a kiting, Skittish wild) is recognised on the
    next fresh own turn and its battle fled and re-hunted (≤ MAX_ADJACENT_HUNTS), and that every approach turn asserts
    the drafted Move executed. Keep the rest of the header byte-identical.

### E. Nothing else
- CTL8J-3x-START-HELP-START and CTL8J-2-DPAD-BATTLE-B stay byte-identical. The post-adjacency block of A (Recruit → bait
  list → B → B → nothing spent → `fightToOutcome` → results → A → world) stays byte-identical.
- No new imports needed beyond what the file has (`TacticsSnap`, `tileDistance`, `sides`, `fleeByButtons`, `turnKey`,
  `waitOwnTurnOrEnd`, `openMenu`, `draftMoveToward`, `endTurn`, `throughResults`, `TACTICS` are already imported). No
  branching on `species_id` anywhere: the SQL text only goes into strings.
- Run `node --check` is NOT meaningful on TS; just re-read your edit. Report the exact line ranges you changed and list
  the runs you want from the orchestrator (the real spec against a live SpacetimeDB; the sandbox proofs are the
  orchestrator's).
