# DECISION ANSWER — issue 618 (CLOSED)

## Question (issue title)
DECISION(bt-2): Surge floor cannot terminate by r14; First-Stand clear-on-save vs no-pre-activation-KO 

## Operator response(s)
(closed without comment — treat the Recommendation in the issue body as accepted)

## Issue body (for the recommendation)
## Root issue
Two clauses of M-battle-tactics bt-2 (spec `M-battle-tactics.spec.md` §bt-2; design §2.4/§6.4) contradict their own arithmetic. bt-2 ships the EARS-literal reading as the default and flags both here. Neither blocks the slice; a later ruling is a one-line formula/wording change.

## Question
**Q1 — Surge termination (BT2.8 / design §6.4).** The spec pins Surge at `max_hp × 5 × (r − 8) / 100` (floor, min 1) AND claims "every PvP match terminates by round 14" (105 % cumulative). With floor, the six rounds r9–r14 each lose up to 1 HP: max_hp 19 (a level-5 base-HP-45 monster) takes 1+1+2+3+4+5 = 16 < 19; 39 → 36; 79 → 78. The true guarantee under the spec's formula is **by round 15** (exhaustive over max_hp 1..=65535). Which do you want?
  (a) keep floor, amend the claim to "by round 15" (what bt-2 proves by default), or
  (b) switch Surge to ceil (`⌈max_hp × 5 × (r − 8) / 100⌉`), which restores "by round 14" exactly.

**Q2 — First-Stand (BT2.6 / design §2.4 vs §2.1.3).** §2.4 and BT2.6 say the flag CLEARS when it saves the unit; §2.1.3 says round-1 deletion is "prevented by construction" and BT2.6 asks for a max-burst sim with "no pre-activation attack KO". With clear-on-save, three faster attackers on one slow unit can KO it before it acts (hit 2 saves at 1 HP and clears, hit 3 kills). bt-2's default: EARS literal (clear-on-save) with the sim scoped to the single-unit nova bound of §2.1.3 (one Heavy, or Light+Light — provably never a KO from full HP for any roster pair at any level). Alternative: the flag persists until the unit's first TurnStart (every lethal hit clamps to 1 HP, StoodGround each time), which makes the §2.1.3 claim true by construction but also makes an un-activated unit unkillable for a round.

## Recommendation
Q1: (b) ceil — it preserves the pacing budget §10 was computed against; one-line change in `tactics::upkeep::surge_damage` + spec/design wording. Q2: keep clear-on-save (the literal EARS; also the reviewed design's anti-"strip the pips" stance) and amend §2.1.3's wording to "single-unit nova".

## Alternatives
Q1 (a) as above. Q2 persist-until-TurnStart as above. Either answer is a small follow-up slice; bt-2's tests pin the default and would be retargeted by the tester from the ruled spec.

## Additional context
Found by the bt-2 plan review (reviewer lens, 2026-10-31). Plan: `memory/projects/monster-realm-bt-2-plan.md` A1/A2. Tests in bt-2 document the r14 counterexamples and the clear-on-save second-hit KO explicitly so the behaviour is visible, not hidden.

---
_Answer by commenting (or closing) this issue. A watcher polls every 5 min; your first comment (or close) resumes the loop. Slice/topic: `bt-2`._

