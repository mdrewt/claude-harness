# polish-1 plan (M-pre-playtest-polish P1-P6)

Re-measure (2026-10-05, worktree @830bf6dc):
- P1 REPRODUCES: DialogueView.render replaceChildren()s choices + Shop on every batch.
- P2 REPRODUCES: BoxView.refresh -> #renderParty/#renderBox replaceChildren() every batch.
- P3 CLOSED (ctl-13): main.ts PvP batch listener has no anyVisible; refreshes pvpView(vm,true) while visible.
  Proof: main.dispatch.test.ts CTL8S-3-BOOT-NESTED-RENDERS (Menu > Social > Challenges + batch -> stays shown) passes.
- P4 REPRODUCES: claimStep('claim-succeeded') effect 'none' -> code never cleared.
- P5 REPRODUCES: frame feedback line is (by design, CTL4-6) not a live region and nothing announces it.
- P6 CLOSED: no runtime locale switch exists (setLocale once at main.ts boot, before consumers); SessionView
  re-resolves every label each render. Proof: sessionView.test.ts CTL8K-1-LOCALE (setLocale while open + render -> FR).

Fixes:
- P1 dialogueView.ts: #renderIfChanged-shaped key over [choices(idx,text), shopAction?.shopId, shop label]; skip rebuild when equal;
  #apply(paint) still runs every render.
- P2 boxView.ts: per-grid render key (JSON of slots / monsters incl. every field the card reads + locale strings) -> skip.
- P4 claimModel.ts: claim-succeeded effect -> 'delete-code-and-permit-join' (main.ts applyClaim already clears on it).
- P5 frame.ts: pure feedbackAnnouncement(prev,next): string|null; main.ts applyMenuStep announces via liveRegion.announce.
  Feedback line stays non-live (CTL4-6 / CTL5-4 pins; one live region).
