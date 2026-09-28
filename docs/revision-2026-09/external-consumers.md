# External consumers of harness artifacts (pre-revision inventory, 2026-09-28)

Consumers that live OUTSIDE this repo (or outside git) — a PR alone cannot update them.
Each carries an owner action or a path-stability constraint.

| Consumer | Reads / calls | Constraint or operator action |
|---|---|---|
| User crontab (`0 * * * *`, `@reboot`, daily `mr-usage-snap`) | `memory/projects/mr-native-tick.sh`, `memory/projects/mr-usage-snap` | **Paths must not move.** No crontab change needed. |
| `~/.local/bin/mr-supervisor-{enable,run,status,chat}` (real scripts, not in git) | `$MEM/mr-native-tick.sh`, `$MEM/.native-supervisor-disabled`, `$MEM` logs/state | **Paths must not move.** |
| `~/.local/bin/mr-supervisor-disable` (symlink) | → `memory/projects/mr-supervisor-disable` | Keep the file at that path. |
| `~/.claude/settings.json:47-52` Stop hook | `.claude/hooks/gates-stop.mjs` | **Operator action (Checkpoint 2): remove the hook entry BEFORE the file is deleted** in Phase 2a. |
| Cowork/DC fallback task (Windows, daily 09:00) | `memory/projects/mr-supervisor-prompt-native.md` (executes it via DC bridge when heartbeat >2h stale) | **Retired per user decision — operator deletes the Cowork task (Checkpoint 2 checklist).** Prompt rewrite drops dual-caller adaptations. |
| Cowork weekly-review stub | `memory/projects/mr-weekly-review-prompt.md` | Stays weekly (user decision); operator repoints/re-pastes the stub after the Phase-4 rewrite if the stub embeds text. |
| `just setup-claude` global links | `standards/`, `.claude/agents`, skills → linked into `~/.claude` for ALL projects | Doctrine changes propagate everywhere; sibling projects (gate-node-ts, gate-python, gate-react, gate-rust, pokemon-mmo, realm-generator{,-tauri}, virtual-table-top, hg-engine, monster-scraper, roms) pick up template changes at next `just sync`. |
| guard-bash hook (`.claude/hooks/guard-bash.mjs`) | protects the kill-switch flag; blocks `mr-supervisor-enable` from agents | Keep behavior intact through every phase. |

Baseline environment facts:
- Supervisor hold: OPERATOR, set 2026-09-28T07:08Z — stays until user runs `mr-supervisor-enable`.
- `mr-state.json`: `inflight=[] awaiting_merge=[] parked=[]`, `queue=[rb-133..136]`, `adr_next_free=275`, `park_counters={14r-e:1}`.
- Tick gate 3 (human-activity probe, `mr-native-tick.sh:319-351`) stands down on ANY resident IDE
  claude session, with **no MR_FORCE bypass** — so `mr-supervisor-run` while the operator's IDE is
  open silently stands down. Phase 2a makes gate 3 warn-and-proceed for `src=manual && MR_FORCE=1`
  (explicit operator intent); this is also what lets the Phase-7 attended rehearsal run.
- Baseline verification state: harness `just ci` green (runs research-lint + adr-lint over 12 ADRs);
  14 tool selftests pass; `mr-record`/`mr-cost-watch` have no selftest today; `mr-selfcheck` exits 0
  but reports residual-aging FAILs (6 unpromoted >3d, 24 stale >14d, 60 open vs cap 12) — artifacts
  of the paused loop + the aging doctrine that Phase 2 redesigns.
- Assembled tick prompt: 52,959 bytes (doctrine file alone 51,278).
- `memory/projects`: 1,376 files (480 git-tracked); 206 slice memos; 512 files under `gates/`;
  369 archived events; the 7 biggest tools total 14,909 lines.
