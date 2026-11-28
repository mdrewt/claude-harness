# Fable vs Opus main thread on hard-tier slices — natural experiment (recorded 2026-11-28)

**Question (operator, 2026-11-27).** With the brief held fixed, does a hard-tier slice cost or deliver differently when its main thread runs on Opus at xhigh instead of Fable at xhigh? This week's Opus runs are not used, because they follow #292 and #300, which changed build behaviour.

**Where the Opus arm came from.** When Fable's own window was out, `model_fallback` moved each refused hard-tier session to Opus at the same effort:
- the refusal text puts the windows at about 2026-11-15T15Z to 11-20T00Z and about 11-22T12Z to 11-27T00Z;
- the refusal was the session's first call ($0, `is_error`), so those slices ran entirely on Opus.

Arm is set by when a slice RAN, not when it merged; lpw-1, for example, ran on 11-16 and merged on 11-21.

**How the model was determined.** The ledger's `model` field records the launch model, so it says `fable` for these runs. (This is fixed for new rows by `model_used`, in the same PR as this report.) The model each slice actually ran on came from:
- its main-thread messages, in the pass logs (`/tmp/mr_pass_<slice>.log*`, from 11-15);
- before that, the CLI transcripts (found by session id or git branch).

The Fable runs here are fable-5-2. wap-1 ran on fable-5-1 and is excluded.

**Sample.** Hard-tier feature slices in the game repo merged 2026-11-13..28, ci-fix excluded: 39 Fable and 17 Opus in the base fit; 62 with the recovered transcript-era slices. Every main thread ran at xhigh. **Subagents (tester, lenses) ran on Opus or Sonnet in BOTH arms, so only the main thread differs.** In a typical Fable slice the Fable main thread is about 65% of the cost.

## Cost (CLI-reported list-price dollars, summed over each slice's sessions)

| | Fable | Opus |
|---|---|---|
| ledger cost, median [IQR] | $44.8 [33–58] | $37.5 [33–45] |
| files changed, median | 18 | 12 |
| added lines, median | 2.35k | 1.44k |
| main-thread turns, median | 125 | 154 |

**The raw gap is size: the Opus slices were smaller.** Size-adjusted model, `log(cost) ~ log(files) + log(added lines) + opus`:

| Check | Opus effect (95% CI) | n |
|---|---|---|
| Base fit | ×1.01 (0.87–1.17) | 56 |
| With the transcript-era slices | ×1.01 (0.87–1.16) | 62 |
| Huber robust fit | ×1.02 | |
| Size = files + lines + criteria | ×0.99 | |
| Size = files only | ×0.92 | |
| Size = criteria only | ×0.89 (0.74–1.07) | |
| Adding a time trend | ×1.02 | |
| Without the phased lpw-43 and lpw-36 | ×1.02 | |
| Without lpw-34 | ×0.98 | |
| Leave-one-out range | ×0.98–1.03 | |
| Largest session only (no resume costs) | ×1.00 | |
| Permutation test on median residuals | ×1.05, p = 0.51 | |
| lpw only, the one area with both arms | ×1.03 (0.80–1.32) | 20 |
| **Slices merged 11-21..23 only (concurrent)** | **×1.14 (0.94–1.37)** | 21 |

Two caveats on these figures:
- **Do not quote per-unit ratios.** Cost per 1k added lines comes out ×1.45 and cost per criterion ×1.29, but only because cost grows more slowly than size and the Opus slices are smaller. The size model is the comparison.
- **Opus was never tried on the largest slices.** No Opus slice exceeds 3.6k added lines, while about a quarter of the Fable slices do. There the fit extrapolates.

Mechanically, an Opus main thread takes more turns: slice cost per main turn was $0.22 against $0.32.

## Quality: not measurable with these records

| Signal | Fable | Opus |
|---|---|---|
| Resumed after a red CI | 4 of 39 (np-c2, acs-7: e2e; lpw-15: gitleaks false positive; lpw-32: red eval) | 0 of 17 |
| Parks | 0 | 2 of 17 (lpw-34, twice, on spec gaps) |
| Tester tasks started, mean | 4.78 | 2.65 |
| Subagent messages, median | 213 | 307 |

- **The red-CI and park differences are not significant** (Fisher one-sided p ≈ 0.22).
- **The tester and subagent differences have not been checked further.** Opus main threads started fewer tester tasks but ran longer subagent work.
- **Residual counts are self-reports.** A higher count can mean more thorough filing, not more defects.
- **Rework found after merge:**
  - The M-gamepad close (all gp slices ran on Opus) filed MED residuals against gp-5 and gp-6, which became rework slices rb-138, rb-141 and probably rb-140.
  - On the Fable side, the identity-handles close filed one MED residual against ih-3.
  - The Fable-heavy milestones (local-play, account-service) have not closed, so exposure is unequal, and area is confounded with model anyway.
- `remote_red_fix_cycles` is 0 on every row: the field is never filled in.

## Bias and limits

1. **Arm follows the calendar.** Which model ran depends on when Fable's limit was hit. That confounds arm with time and area: every sr/gp hard slice ran on Opus, every ts/np/ih/eo/acs slice on Fable. The lpw stratum and the concurrent subset are the cleanest comparisons, and the concurrent subset's interval reaches +37%.
2. **List price is not plan quota.** Fable has its own usage window. Whether the two models draw on the shared weekly window at the same rate per list dollar is unknown.
3. **Small sample, noisy size model.** R² is about 0.4.

## Reading

For hard-tier feature slices with the brief held fixed, we found **no detectable size-adjusted cost difference** between an Opus-xhigh and a Fable-xhigh main thread:
- the estimate is ×1.01, 95% CI 0.87–1.16;
- it holds under robust, leave-one-out and alternative-size checks;
- when slices merged on the same days are compared, the interval reaches ×1.37.

Arm is confounded with time and area, and Opus was never tried on the largest slices. The loop's quality records cannot tell the arms apart.

So falling back to Opus mid-week did not visibly raise list-price cost per unit of work. On these records we cannot say whether it changed quality. Nothing here bears on the correctness reasons for routing security, netcode and schema work to Fable.
