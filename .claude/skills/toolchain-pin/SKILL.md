---
name: toolchain-pin
description: Pin, verify, or audit a project's toolchain versions (Rust, Node, spacetime, wasm-pack, and similar). Use when checking whether a tool is pinned and installed at the right version, adding a version pin, or reconciling version drift across the harness, projects, and templates.
---

# Toolchain pinning & audit

Each tool pins **differently** — there is no single mechanism. Reproducibility means: local == CI == documented. Bump deliberately.

## Per-tool pin mechanism

| Tool | Canonical pin | Notes / gotchas |
|---|---|---|
| **Rust** | `rust-toolchain.toml` per crate (`channel`, `components=[rustfmt,clippy]`, `targets=[wasm32-unknown-unknown]`) | rustup auto-selects it. Default is floating `stable` — without this file the project **drifts** off the intended version. `rustup show` prints the active toolchain + which file overrode it. Not asdf (the asdf rust plugin is usually empty; rustup wins PATH via `~/.cargo/bin`). |
| **Node** | asdf `.tool-versions` (workspace) **+** `package.json` `"engines"` **+** `.npmrc` `engine-strict=true` | `.tool-versions` pins the install; `engines` (`>=X <next-major`) documents intent; `engine-strict` makes npm **hard-fail** a wrong Node, not just warn. npm checks **its own `process.version`**, not the `node` symlink on `PATH`. `engine-strict` enforces the **root** project's engines and fires even on `npm install --dry-run`. |
| **spacetime** | global `spacetime version use <X>` — **no per-project file exists** | Can't be file-pinned. Document the version in the project `AGENTS.md` and verify with `spacetime --version`. Optionally a `just check-toolchain` guard. |
| **wasm-pack** | `cargo install wasm-pack --version <X> --locked` — **no pin file** | Single global binary shared across projects. Pin **CI** separately via `jetli/wasm-pack-action` `version:`. Use `--force` to overwrite an existing install. Document the version in `AGENTS.md`. |

## Audit workflow

1. **Detect installed** — run `<tool> --version` directly — DC's default shell is already a Ubuntu **login** shell, so asdf shims are on PATH; a non-login sub-shell drops the shims and reports the *system* version (see `[[wsl-harness-exec]]`).
2. **Identify the canonical mechanism** for that tool (table above).
3. **Check for drift** — grep the version across `standards/`, project `AGENTS.md`, and `templates/`; confirm CI pins match local.
4. **Record** in the project `AGENTS.md` `Toolchain (pinned)` line.
5. **Verify (proof-of-teeth)** — prove the guard *bites*: e.g. an impossible `engines` range under the current Node must fail `npm install` with `EBADENGINE`; `rustup show` must name the `rust-toolchain.toml`.

## Notes

- `projects/` are independent git repos (gitignored from the harness root) — version changes there live in *their* repos.
- Don't bump a frozen project's pins just to silence an update notice; pin deliberately, leave finished projects alone.

## Gotchas

_Living log — edge cases, bugs, quirks. Per entry: **symptom/quirk** → cause → **avoid:** action. Append new ones as you hit them._

- **`npm install` passes under a seemingly-wrong Node (`engine-strict` looks inert)** → npm checks **its own `process.version`**, not the `node` on `PATH`; a newer global npm runs on a compatible Node even when `node` resolves to an older one. **Avoid:** verify `engine-strict` with a controlled fixture (an impossible `engines` range must `EBADENGINE` — it fires even on `--dry-run`), not the ambient `node --version`.
- **`npm ci` errors "out of sync" right after adding `engines`** → the lockfile's root metadata lags `package.json`. **Avoid:** run `npm install` once to sync the lockfile, then `npm ci` is clean.
- **`cargo install wasm-pack` → "binary already exists"** → cargo won't overwrite. **Avoid:** add `--force`.
- **Rust silently builds on floating `stable`** → no `rust-toolchain.toml` ⇒ rustup floats and drifts. **Avoid:** add the file; confirm `rustup show` reports "overridden by …".
- **Expecting a per-project spacetime pin file** → none exists; it's a global `version use`. **Avoid:** document the version in `AGENTS.md`, verify with `spacetime --version`.
