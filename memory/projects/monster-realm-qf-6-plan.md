# qf-6 plan v2 — advance_dialogue: persistent dismissal, clear copy, visible quests

(v1 reviewed by reviewer + red-team 2026-10-26; v2 folds in: T6 distance check scoped to the elder's
entity, QF6.4 ack gated on the own conversation row (deletion-cascade false ack), delta-pinning ack
tests, a status-notice reducer that survives the live region's 500 ms coalescer, dismiss-in-flight and
stale-conversation guards, broadened negative fixtures, vitest gates that keep the runner's exit code.)

Worktree `.claude/worktrees/qf-6`, branch `slice/qf-6` from origin/master f039c1a6 (qf-5 merged).
Spec: M-pt3-quickfix.spec.md §qf-6 (QF6.1–QF6.4). Promotes R-ci-fix-20261002T0501Z-WALKEDAWAYROLLBACK.
Touches (declared): server-module/src/npc.rs, npc_tests.rs, client/src/ui/statusModel.ts,
statusModel.test.ts, client/src/main.ts, client/src/ui/i18n/{catalog.en,catalog.fr,messageIds}.ts,
client/e2e/dialogue.spec.ts. Sibling tests (touches-delta, qf-3/qf-4 precedent):
client/src/ui/i18n/catalog.test.ts (exact 373-key roster → 378), client/src/ui/i18n/catalogParity.test.ts
(PARITY-02 pins main.ts's literal i18n key list → +5), client/src/main.dialogueEnded.test.ts (NEW sibling
of main.ts; harness copied from main.dialogueDismiss.test.ts). No schema change, no connection.ts/store.ts,
no new frames, no openFrame/mirror edits, no edit to wallet-balance.spec.ts (its "rejected advance leaves
the overlay open" comments go stale — flagged in the PR; its retry loop already handles a hidden overlay).

## The defect (facts)
- `advance_dialogue` has four refusal branches (npc not found / npc character not found / no longer in
  same zone / walked too far away) that `delete(me)` the conversation row and then `return Err`. In
  production an `Err` aborts the transaction: the delete never persists, the overlay stays open, the
  `advance_dialogue_dismissed` log lies, and statusModel's `${where}: ${message}` shows the raw
  "advance: walked too far away" (feedback -069/-072/-073/-074).
- The native test host models NO rollback (native_host_tests.rs ~692), so the existing
  `nh_range::nh_advance_dialogue_rechecks_zone_and_range_and_dismisses_on_refusal` encodes the lie
  (asserts the row deleted). A "row kept on refusal" assertion is RED today.
- `talk` is the ONLY reducer that completes a quest (Talk trigger): it deletes the player_quest row,
  `grant_currency(reward.currency)` (lazy wallet insert; 0 is a no-op) and upserts the conversation
  row in ONE transaction. `account_deletion_reaper` (accounts.rs ~1034-1041) runs `erase_npc_state`
  (deletes player_quest AND player_conversation), `erase_wallet` (the client ignores wallet deletes) and
  `erase_character_rows` in one transaction while the client may still be connected.
- Client: no quest content; `player_quest` streams as a PUBLIC table (onInsert/onUpdate/onDelete →
  store; `ownQuests(identity)` filters); the wallet via the owner-scoped `my_wallet` view (insert-only).
  One `flushBatch` per synchronous burst of SDK callbacks (MicrotaskBatcher) — a burst can carry several
  server transactions (one WS frame, or two frames whose gzip decompression lands together).
- `__game().characters` is zone-less (the zone-1 shopkeeper at (8,1) is Manhattan 2 from (6,1)).

## Design (mechanism = explicit dismissal path; no signal channel exists inside touches)
### Server (npc.rs) — truth, no production behaviour change
- Delete the four dead `ctx.db.player_conversation().owner_identity().delete(me);` lines.
- Log evt `advance_dialogue_dismissed` → `advance_dialogue_refused` (same reasons). No consumer exists.
- Doc comments: a refusal writes nothing (`Err` is the whole story); at each of the four `Err`s:
  "the client maps this exact string to catalogued copy and ends the conversation with dismiss_dialogue
  (pinned by client statusModel.test.ts + the dialogue e2e)". At `apply_quest_trigger`'s QuestComplete
  delete and at `erase_npc_state`: "the client reads 'a player_quest row left while my conversation row is
  present in the same batch' as quest completion (talk is the only completion path and always upserts the
  conversation row in the same transaction; the deletion cascade removes both). A future path that removes
  quest rows inside a talk for another reason needs a real ack channel."
- Strings, TALK_RANGE, schema unchanged.

### Client — statusModel.ts (pure; no DOM/SDK/i18n import — connection.ts imports it; all total)
```ts
export type ConversationEndReason = 'walkedAway' | 'leftZone' | 'npcGone';
/** SenderError (name EQUALITY via classifyReducerError) whose message EXACTLY equals one of the four
 *  npc.rs refusal strings: 'walked too far away' → walkedAway; 'no longer in same zone' → leftZone;
 *  'npc not found' | 'npc character not found' → npcGone. Anything else (InternalError with the same
 *  text, plain Error, near-miss spelling, the `advance: ` output) → undefined. try/catch total. */
export function conversationEndReason(err: unknown): ConversationEndReason | undefined;

/** Quest-completion acknowledgement over two consecutive batch snapshots. */
export interface QuestAckSnapshot {
  readonly identity: string;
  /** own player_quest rows keyed by pqId (a step advance keeps its pqId; a completion removes it) */
  readonly quests: readonly { readonly pqId: bigint; readonly questId: string }[];
  /** my_wallet balance; an ABSENT wallet is 0n (the server's meaning — grant_currency inserts lazily) */
  readonly balance: bigint;
  /** the own player_conversation row is present in this batch */
  readonly conversationOpen: boolean;
}
/** undefined unless `ready` and `wallet.balance` (when a wallet exists) is a bigint. */
export function questAckSnapshot(i: {
  readonly ready: boolean; readonly identity: string;
  readonly quests: readonly { readonly pqId: bigint; readonly questId: string }[];
  readonly wallet: { readonly balance: unknown } | undefined;
  readonly conversationOpen: boolean;
}): QuestAckSnapshot | undefined;
export interface QuestAck { readonly name: string; readonly reward: bigint | null }
/** undefined if either snapshot is undefined, identities differ, `now.conversationOpen` is false, or no
 *  pqId of prev is missing from now. name = the questIds of the missing rows, sorted, ', '-joined.
 *  reward = (now.balance - prev.balance) when > 0n, else null. */
export function questCompletionAck(prev: QuestAckSnapshot | undefined, now: QuestAckSnapshot | undefined): QuestAck | undefined;

/** Status-line notices spoken through the live region WITHOUT being lost to its trailing-edge
 *  coalescer (A11Y-9: only the newest message inside a 500 ms window is emitted). */
export interface StatusNoticeState {
  readonly queued: { readonly text: string; readonly queuedAtMs: number } | null;
  readonly spoken: { readonly text: string; readonly atMs: number } | null;
  readonly lastTransitionAtMs: number | null;
}
export const STATUS_NOTICE_INITIAL: StatusNoticeState;
export type StatusNoticeEvent =
  | { readonly kind: 'queue'; readonly text: string; readonly nowMs: number }
  | { readonly kind: 'frame'; readonly nowMs: number; readonly transitionAnnounced: boolean };
/** queue: replaces any queued text (newest wins), speaks nothing.
 *  frame(transitionAnnounced=true): records lastTransitionAtMs = nowMs; if a notice was spoken less than
 *    windowMs ago it was clobbered by this transition → re-queue it at nowMs; speaks nothing.
 *  frame(transitionAnnounced=false): speaks the queued text iff nowMs - queuedAtMs >= windowMs AND
 *    (lastTransitionAtMs === null || nowMs - lastTransitionAtMs >= windowMs); then spoken = {text, nowMs},
 *    queued = null. Otherwise speaks nothing. Pure, total; clock is an argument (never Date.now). */
export function statusNoticeStep(state: StatusNoticeState, event: StatusNoticeEvent, windowMs: number): { readonly state: StatusNoticeState; readonly speak: string | null };
```
Why the reducer: an immediately-announced notice is replaced by the overlay close label (one dismiss
round trip later) or open label (next frame); a fixed hold still loses one of the two when the round trip
lands 0.5–1.5 s after the queue (red-team timeline). Speaking only ≥ window after the last transition,
and re-queueing a notice a transition clobbered, guarantees both are eventually spoken.

### Client — main.ts (imperative shell)
- Imports: the new statusModel exports; `COALESCE_WINDOW_MS` from './ui/liveRegion' (a constant import;
  the region node is still named only by liveRegion.ts).
- Module state: `let statusNotice: StatusNoticeState = STATUS_NOTICE_INITIAL;`
  `let questAckBaseline: QuestAckSnapshot | undefined;`
- `showNotice(text)` beside `refusedInBattle`: `statusEl.textContent = text;
  statusNotice = statusNoticeStep(statusNotice, { kind: 'queue', text, nowMs: performance.now() }, COALESCE_WINDOW_MS).state;`
  NOT the error ring, NOT console.error.
- `endedLine(reason)`: literal `switch` → `i18nT('dialogue.ended.walkedAway'|'dialogue.ended.leftZone'|'dialogue.ended.npcGone')`
  (PARITY-02 bans dynamic keys; the switch is exhaustive with `satisfies never`).
- `case 'advanceDialogue'`: capture `const sent = store.ownConversation(identity);` then
  `sendGuarded('advance', () => conn?.live()?.reducers.advanceDialogue({ choiceIdx })?.catch((err: unknown) => {
     const reason = conversationEndReason(err);
     if (reason === undefined) throw err;                      // today's report (battle/deletion/no-conversation/choice/InternalError never dismiss)
     const cur = store.ownConversation(identity);
     if (sent === undefined || cur === undefined || cur.npcEntityId !== sent.npcEntityId || cur.currentNodeId !== sent.currentNodeId) return; // gone or changed (another tab): silent, never the raw string
     showNotice(endedLine(reason));
     if (!shopOpen.dismissPending) void dispatch({ kind: 'dismissDialogue' }); // a dismiss already in flight closes it; never cancel a pending shop pick
   }))`.
  The dismiss goes through the existing shopOpen machine (`dismissRequested` → sendDismiss); the server's
  delete closes the overlay on the no-conversation batch exactly like Escape. The client never hides it.
- New `store.onBatchApplied` listener in the M12d block (after the questLog one, try/catch):
  `const now = questAckSnapshot({ ready: hydratedSinceReconnect && identity !== '', identity,
   quests: store.ownQuests(identity), wallet: store.ownWallet(identity),
   conversationOpen: store.ownConversation(identity) !== undefined });
   const ack = questCompletionAck(questAckBaseline, now); questAckBaseline = now;
   if (ack !== undefined) showNotice(ack.reward === null ? tf('quest.complete.done', { name: ack.name })
     : tf('quest.complete.reward', { name: ack.name, amount: ack.reward }));`
- Frame loop (the announcement block): `const edges = announcementsFor(lastA11ySnapshot, nextSnapshot);
  for (const m of edges) liveRegion.announce(m, now); const worldEdge = lastA11ySnapshot.topOverlay !== null && top === null;
  if (worldEdge) { …existing… } lastA11ySnapshot = nextSnapshot;
  const stepped = statusNoticeStep(statusNotice, { kind: 'frame', nowMs: now, transitionAnnounced: edges.length > 0 || worldEdge }, COALESCE_WINDOW_MS);
  statusNotice = stepped.state; if (stepped.speak !== null) liveRegion.announce(stepped.speak, now);
  liveRegion.flush(now);` — `performance.now()` only (monotonic-clock contract).
- `onReconnect`: `statusNotice = STATUS_NOTICE_INITIAL; questAckBaseline = undefined;`.

### Catalog (373 → 378; each with an adjacent `// @desc:` ≥10 chars + a `// main.ts (…)` location line;
### fr copies the existing fr " : " and ’ bytes from a neighbouring entry)
| id | en | fr |
|---|---|---|
| dialogue.ended.walkedAway | Conversation ended: you moved too far away. | Conversation terminée : vous êtes trop loin. |
| dialogue.ended.leftZone | Conversation ended: you left the area. | Conversation terminée : vous avez quitté la zone. |
| dialogue.ended.npcGone | Conversation ended: they are no longer here. | Conversation terminée : il n’y a plus personne ici. |
| quest.complete.reward (p) | `Quest complete: ${p.name}. You received ${p.amount} gold.` | `Quête terminée : ${p.name}. Vous avez reçu ${p.amount} or.` |
| quest.complete.done (p) | `Quest complete: ${p.name}.` | `Quête terminée : ${p.name}.` |
MessageParams: `'quest.complete.reward': { readonly name: string; readonly amount: bigint }`,
`'quest.complete.done': { readonly name: string }`. messageIds.ts: append after `'journal.empty'` (qf-4
precedent) under two comment headings. No `oneOther` (gold/or uncountable, as trade.side.currency).
catalog.test.ts: EXPECTED_PLAIN +3; SAMPLE_PARAMS +2 (A `{name:'quest_001', amount:50n}` →
`Quest complete: quest_001. You received 50 gold.`, B `{name:'quest_002', amount:7n}`; done: A/B names);
EXPECTED_PARAM_OUTPUTS +2 (qf-3 `box.sheet.careCooldown` precedent); 373→378 in the header comment, both
`it` titles and `toHaveLength`. catalogParity.test.ts PARITY-02: +5 keys in main.ts's sorted literal list.

## Tests (tester; behaviour-first names; the criterion tag ONLY as the trailing token of `it` titles /
## Rust fn names where a ledger CHECK selects on it; e2e titles carry NO tag or prefix)
Server npc_tests.rs `nh_range`:
- N1 `nh_advance_dialogue_refusal_keeps_the_conversation_row_qf6_1` REPLACES
  `nh_advance_dialogue_rechecks_zone_and_range_and_dismisses_on_refusal` (from the spec: the dismissal must
  persist, so a refusal may not half-write): over the 11 CASES the exact Err strings hold AND afterwards the
  table holds exactly the seeded row, field-for-field (owner, npc_entity_id, current_node_id). RED today.
  Kills: delete-then-Err kept, any write on refusal, commit-then-Ok.
- N2 `nh_advance_dialogue_npc_gone_refusal_then_dismiss_ends_the_conversation_qf6_1`: conv → entity 999 →
  `npc not found`, row kept; an Npc row whose character is absent → `npc character not found`, row kept;
  then `dismiss_dialogue` as me → Ok, my row gone, a stranger's seeded row untouched. RED today.
statusModel.test.ts (node; fast-check where logic-heavy; block-body arrows):
- C1 (QF6.2) each of the four strings → its reason. C2 (QF6.2) undefined for: the battle string, the
  deletion-gate string, 'no active conversation', 'not joined', 'character not found', 'dialogue tree not
  found', 'node not found', a `{e:?}` choice error, near-miss spellings (trailing `!`, leading/trailing
  space, case), the `advance: walked too far away` output, InternalError with the exact text, plain
  `new Error('walked too far away')`, non-objects, hostile `name`/`message` getters, plus a fast-check
  property over arbitrary strings not in the set.
- C5–C8 (QF6.4): absent wallet → 50n; fixed 30n→80n ⇒ 50n and 0n→7n ⇒ 7n; property with prev.balance>0n:
  `reward === (delta > 0n ? delta : null)`; not-ready → undefined; non-bigint balance → undefined;
  identity change / step advance (same pqId, new step) / a new quest / wallet-only change /
  `conversationOpen:false` (the deletion cascade) / another player's rows (caller filters — the model
  only sees own rows, so test via equal sets) → no ack; property: never names a still-present pqId's
  questId, never a non-positive reward; two rows leaving → both names sorted.
- C9 (QF6.2) statusNoticeStep: queue then frames: speaks at ≥window with no transition; a transition
  frame speaks nothing and blocks speaking for a window; a transition inside the window after a spoken
  notice re-queues it and it is spoken again later; never spoken twice otherwise; queue replaces queued.
catalog.test.ts: K1 (QF6.2) / K2 (QF6.4) exact en+fr bytes for the five keys (fr with U+00A0 before ":",
’ not ') + the roster update. catalogParity.test.ts: the +5 literal keys.
main.dialogueEnded.test.ts (booted main.ts; harness copied from main.dialogueDismiss.test.ts — the
reducer Proxy rejects `advanceDialogue` with a configurable error object and can leave `dismissDialogue`
unsettled; rAF stubbed and pumped; `[data-choice-idx="0"]` click inside `#dialogue-overlay`; the store
seeded through the real AuthoritativeStore like main.feedbackI18n.test.ts / main.partyFull.test.ts;
`H.connectOpts.onHydrated()` / `.onReconnect(id)` callable):
- M1 (QF6.1 QF6.2) walked-away SenderError → `#status` is the literal English ended line (typed in the
  test, not via i18nT), contains neither `advance:` nor `walked too far away`; exactly one
  `dismissDialogue` call; no `console.error('[status]', …)`; the overlay is STILL visible after the
  rejection and before the no-conversation batch (no local hide); after that batch + frames past the
  window, `#a11y-live` carries the ended line (record writes with a MutationObserver: the world label is
  written, and the ended line is written and is the last write).
- M2 (QF6.1 QF6.2) the zone / npc-not-found / npc-character-not-found strings → their own lines, one dismiss each.
- M3 (QF6.1) each other rejection — battle string, deletion-gate string, 'no active conversation',
  'not joined', 'character not found', 'dialogue tree not found', 'node not found', InternalError with the
  walked-away text, plain Error — → today's `advance: …` report (or the generic lines) and ZERO dismiss.
- M4 (QF6.1) a recognised refusal landing after the conversation row is gone, or after it changed to
  another NPC → nothing on `#status`, zero dismiss.
- M7 (QF6.1) the own character moves 3+ tiles from the NPC in a batch with no advance sent → zero dismiss,
  overlay still visible (kills a client-side range check).
- M8 (QF6.1) a dismiss already in flight (Shop pick unsettled) when the recognised refusal lands → the
  ended line shows, no second dismiss, and the pending shop still opens on the no-conversation batch.
- M5 (QF6.4) baseline batch (wallet 30, quest_001 at step 0) acks nothing; a batch that removes that row,
  sets the wallet to 80 and inserts my conversation → `#status` reads exactly
  `Quest complete: quest_001. You received 50 gold.`; after frames past the window the live region carries
  it (after the dialogue label).
- M6 (QF6.4) no ack: before hydration; for a step advance (same pqId, new step); for a wallet-only change;
  for the cascade (quest + conversation removed together, wallet unchanged); for another player's
  quest_001 row leaving while my wallet gains 50; after `onReconnect` + re-hydration when the quest is
  simply absent from the fresh snapshot.
e2e dialogue.spec.ts (serial; final order: setup, talk, Escape, advance, T5, T6, isolation = 7 passed):
- T5 `re-talking the elder completes quest_001 and the status line acknowledges its 50 gold`:
  talkUntilOpen → `#status` toHaveText(exact en ack, 20 s); overlay left open.
- T6 `choosing a reply after walking out of talk range ends the conversation with its reason and closes
  the overlay`: if the overlay is hidden, talkUntilOpen first; assert visible; record the entity id of the
  non-player character on the faced tile (6,4); `stepOne` North twice → (6,1); assert Manhattan ≥3 to THAT
  entity (never to all characters — the list is zone-less); assert the overlay is STILL visible; click
  "I seek a quest." WITHOUT a `.catch`; `#status` toHaveText(exact ended line), not.toContainText('advance:');
  overlay hidden ≤20 s (the client never hides it ⇒ the server delete persisted). RED today.
- Comment truth: header "advance_dialogue RE-CHECKS … rejects", MAX_ADVANCE_ATTEMPTS and test-4 comments
  now say a refused advance keeps the row server-side and the client's dismiss closes it. Test-4
  assertions unchanged (they are the QF6.3 proof: `quest_001 (step 0)` in the Journal after StartQuest).

## Ledger: gates/qf-6.gates.md — nextest (N1,N2); vitest with `--reporter=json --outputFile` chained by
## `&&` (keeps vitest's exit code — a leaked rejection exits 1 while the JSON still says success) then a
## node count pin (passed === N, failed === 0); the Playwright line reporter `7 passed` (live spacetime).

## Anti-patterns avoided / risks / residuals
- No client-side range pre-check; no local hide; exact-equality mapping; no dynamic keys; no resolver
  import in statusModel.ts; no error-ring notices; no Date.now; one dismiss path; no source-text pins.
- Risks (PR): T6 relies on `__game().step` bypassing the context-stack gate; a merged flush carrying a
  foreign wallet write (a partner's trade payout) misstates the ack amount, and a link drop between the
  completing talk and its batch loses the ack — an exact server-side ack channel needs schema.rs +
  connection.ts + store.ts (outside touches): residual R-qf-6-ACKCHANNEL at close. Other raw reducer
  strings (`talk: too far away`, `dismiss: …`) still reach the player — outside QF6.2's wording; noted.
- Decisions: none meet standards/decisions.md — the completion inference is documented at both ends in
  code (npc.rs + statusModel.ts) and constrains nothing a maintainer could not read there.
