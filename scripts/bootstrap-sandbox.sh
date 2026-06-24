#!/usr/bin/env bash
# Restore the harness toolchain inside an ephemeral Linux build sandbox.
#
# Why: host setup (SETUP.md) installs `just` et al. via winget on Windows. The
# Linux build sandbox is recreated per session, so `just` — which every recipe
# and the harness self-check depend on — is missing until this runs.
#
# Usage:   source scripts/bootstrap-sandbox.sh      # adds tools to PATH now
#   or:    bash   scripts/bootstrap-sandbox.sh      # install only; PATH hint printed
#
# Installs into a user-writable prefix (no root needed) and is idempotent.
set -euo pipefail

PREFIX="${HARNESS_TOOLS_PREFIX:-$HOME/.npm-global}"
BIN="$PREFIX/bin"

ensure_just() {
  if command -v just >/dev/null 2>&1; then
    echo "  ok   just already on PATH ($(just --version))"
    return
  fi
  if [ -x "$BIN/just" ]; then
    echo "  ok   just present at $BIN/just"
    return
  fi
  echo "  ... installing just via npm (rust-just) into $PREFIX"
  npm config set prefix "$PREFIX" >/dev/null 2>&1 || true
  npm install -g rust-just >/dev/null 2>&1
  echo "  ok   installed $("$BIN/just" --version)"
}

ensure_just

case ":$PATH:" in
  *":$BIN:"*) ;;
  *) export PATH="$BIN:$PATH" ;;
esac

echo ""
echo "Toolchain ready. If you ran this without 'source', add to PATH:"
echo "  export PATH=\"$BIN:\$PATH\""
echo ""
echo "Verify:  just --justfile justfile doctor && just test"
