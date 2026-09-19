# DECISION ANSWER — issue 469 (CLOSED — retroactive, action already shipped)

## Question (issue title)
DECISION(rb-83-cancel-sweep): rb-83 DECISION (non-blocking): close R-rb-47-CANCELLAUNDER with a cancel-time sweep of gated trade offers, or disposition wontfix like its sibling R-rb-47-PREDATING?

## Operator response(s)

### 2026-09-19T08:xx (comment timestamp per gh, see issue)
"When an account is deleted, all the data related to that account should also be gracefully removed.
That way there should be no orphaned data left over. This is a general rule. I would apply the rule to
this scenario (deleting an account with active trade offers) by canceling all active trade offers for
the account that is going to be deleted and cleaning up any data depending on the account prior to
deletion."

## Resolution
Matches the recommendation ("SHIP the cancel-time sweep"), not the wontfix alternative. Verified against
live ground truth: rb-83 already shipped this exact fix — PR#470 (merged 2026-09-13T00:33:15Z),
`fix(rb-83): cancel_account_deletion declines the incoming trade offers its own deletion gate refused …
(ADR-0252, closes R-rb-47-CANCELLAUNDER)`. No further action required; this decision confirms retained
work already on master. Closing the loop only — Drew's answer arrived after the fix had already merged.
