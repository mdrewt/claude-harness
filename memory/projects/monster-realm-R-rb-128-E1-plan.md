# R-rb-128-E1 plan — re-join after cancel_account_deletion; claim-flow join surfaces failures

Re-verified against 11bdcf9c (line refs in the residual drifted):
- my_account handlers: client/src/net/connection.ts:656-663 (onInsert + onUpdate → store.upsertAccount; no rejoin).
- attemptJoin: connection.ts:693-705 (catch; "already joined" exact-match benign; else onError('join', msg)).
- Claim-flow join: client/src/main.ts:813 `conn?.live()?.reducers.joinGame({ name: 'Player' })` — no .catch.
- main.ts onError (3692): reportError(`${where}: ${message}`) — the existing feedback core.
- Server: join_game refuses during PendingDeletion (movement.rs:45 require_not_deleting); "already joined" when
  player row exists. cancel_account_deletion flips status to Active.

## Functional core (pure, exported from connection.ts)
`shouldRejoinAfterAccountChange(prevStatus: string | undefined, nextStatus: string, claimCodeUnconsumed: boolean): boolean`
= prev === 'PendingDeletion' && next === 'Active' && !claimCodeUnconsumed.
- prev undefined (initial snapshot / post-reset) → false: onApplied already owns the join (no double join).
- claim-code veto mirrors onApplied's account-build veto (G18) — the rejoin is never a second veto bypass.
- Terminal / unknown tags → false.

## Imperative shell
1. wireTables: one `ingestAccount(row)` used by my_account onInsert + onUpdate: read
   `prev = store.ownAccount(identity)?.status` BEFORE upsert, upsert, schedule; if the decision is true,
   `attemptJoin(wrapReducerLogging(conn, opts.onSend), name, opts.onError)` (same wrapped-once path as onApplied).
2. Connection gains `join(): void` — no-op when no current connection or link frozen (a call on a dead conn never
   settles; the next onApplied joins anyway since the claim code is cleared); else attemptJoin(current, name, onError).
   `current` is already the wrapped connection.
3. main.ts:813 → `conn?.join()`. No other direct joinGame call remains in main.ts.

## Tests (tester; new client/src/net/connection.test.ts, mock harness modelled on connection.runtime.test.ts)
- E1-DECIDE: truth table of the pure decision.
- E1-REJOIN: real connect() + mocked builder: applied snapshot (joinGame #1), my_account insert PendingDeletion,
  then insert Active → joinGame called exactly once more with {name}; Active→Active, PendingDeletion→PendingDeletion,
  first-ever Active insert (prev undefined) → no extra call; unconsumed claim code → no extra call.
- E1-JOIN-SURFACE: connection.join() with joinGame rejecting 'boom' → onError('join','boom'); 'already joined' →
  no onError; empty message → onError('join','join failed'); frozen/no-conn → joinGame not called.
- E1-MAIN-WIRING: main.ts (comment-stripped) contains no `reducers.joinGame(` call and does call `conn?.join()`
  inside applyClaim's 'join' effect.

## Gate
E1 CHECK: `npm --prefix client run test -- src/net/connection.test.ts` whole file, EXPECT pins exact passed count.

## Out of scope (defer, not widen)
- Held-key snap-back during grace (R-rb-128-X1), reject-reason wording (R-rb-128-X2).
- Suppressing the benign "already joined" round-trip when the player stayed connected through cancel (one
  server log_reject line per cancel; harmless).
