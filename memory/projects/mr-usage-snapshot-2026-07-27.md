claude-fable-5             main     calls= 319 in=     0.6k out=  619.2k cacheR=  99.61M cacheW=  6.67M ~$ 106.99
claude-opus-5              main     calls=  28 in=     0.1k out=   10.0k cacheR=   1.32M cacheW=  0.33M ~$   2.96
claude-fable-5             subagent calls=   4 in=     0.0k out=   30.5k cacheR=   0.00M cacheW=  0.09M ~$   1.31
COWORK-24H TOTAL (fable@opus prices = LOWER BOUND): ~$111.27
--- context (2026-07-27T05:45Z, 24h window from 07-26T05:33Z) ---
Native loop (usage ledger): $10.13 total — 4 decision runs (reconcile $0.68, disposition+specs $3.52, launch $1.37, triage $4.56); 2 rooted slices in flight (battle-0hp-fix, dev-observability, opus@high — costs land at reconcile, committed est $25-90 ea).
Cowork numbers above = internal API-value, fable priced AT OPUS RATES (real fable pricing likely higher => lower bound). Method: parse session .jsonl usage blocks under local-agent-mode-sessions (find, NOT glob — dot-dirs).
Calibration anchor (2026-07-25): $1002 internal = 36% of weekly plan => $121/24h ~= 4.3% weekly.
Utility linkage: native $10.13 -> 91 items dispositioned ($0.046/item), 5 specs, 5 decisions consumed, 2 slices launched.
