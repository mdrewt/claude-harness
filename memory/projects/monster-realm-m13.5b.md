---
name: monster-realm-m13.5b
description: M13.5b reducer-rejection feedback + app-level reconnect (ADR-0085, PR #119) — SDK rejection surface facts, dropRejected contract, bfcache/pageshow trap, C4 prose-string eval trap
metadata:
  type: project
---

M13.5b (PR #119, branch `feat/m13.5b-reducer-rejection-feedback`, ADR-0085) closed the verified silent phantom-intent desync and shipped rejection feedback + app-level reconnect. Durable facts:

**SDK 2.6 ground truth (line-cited in ADR-0085 — reuse, don't re-derive):** reducer calls return a Promise that rejects with `SenderError(errorString)` on reducer `Err` (message = the reducer's Err string VERBATIM); there are NO per-reducer onX callbacks; in-flight promises NEVER settle on a connection drop; sends on a dead connection are silently queued forever (black hole); NO auto-reconnect on the raw builder path (`ConnectionManager` isn't root-exported); server seq is monotonic strict-`>` so dropping a rejected seq never strands movement; `on_disconnect` deletes player+character → reconnect must re-join (`"already joined"` benign, matched EXACTLY not by substring).

**Contracts future client slices must honor:** `Predictor.dropRejected(seq)` mutates ONLY `#pending`; on `true` the caller MUST immediately force `reconcileFromStore()` (a rejected burst-tail produces no further batch). Freeze is EVENT-driven (`linkFrozen ≡ link !== 'connected'`), never promise-driven. `conn.conn` is a getter for the CURRENT DbConnection — never cache across await points. `reconnectPolicy.attempt` counts consecutive FAILED builds (cold-start first retry = 2 s rung, drop-path = 1 s; intended asymmetry). Every non-movement send goes through `sendGuarded` (frozen short-circuit + `.catch` → status line); movement rejections stay silent (prediction repair, M2 §3). `healTargetLocationId` `undefined` = SKIP the send entirely.

**Traps hit:**
- `dialogue-client-integrity` C4 does a blunt `indexOf('healParty')` over healModel.ts — it flags the reducer name in COMMENT PROSE too. Never write a reducer name in a model file's comments.
- A `pagehide` teardown guard without a `pageshow(persisted)` inverse permanently freezes the client after Back-navigation (bfcache restores JS state incl. the guard, with a dead socket). Pair them (RT-PH-01).
- Any `#pending`-style in-flight UI lock awaiting a reducer promise can be stranded by a drop (never settles). shopView's lock is released on reconnect via its public `hide()` from main.ts — shopView.ts itself was outside the touch-set.
- TS cannot narrow a mutable module-scope `let conn` inside closures — the `conn?.` chains inside `sendGuarded` lambdas are REQUIRED, not vestigial.

**Follow-ups parked (PR #119 body):** `anyOverlayVisible` extraction (8-way OR triplicated in main.ts — every new overlay must today edit 3 sites); onBuy/onSell dedupe; reconnect e2e (two-window drop/rejoin); unused `type LinkState` import in reconnectPolicy.test.ts (tester artifact). Related: [[monster-realm-client-prediction-robustness]] (seedSeq re-seed reused), [[monster-realm-m13d]] (shop lock + wallet-private gap), [[monster-realm-m13.5a]] (sibling gate slice).
