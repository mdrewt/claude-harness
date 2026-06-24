---
description: Scaffold a new project repo from a stack template under projects/.
argument-hint: <name> <stack>
---
Run the generator to scaffold a new project: `node scripts/new-project.mjs $ARGUMENTS`.
Stacks: rust-lib, python-service, node-ts-app, react-web, electron-desktop,
pixijs-game, spacetimedb-game. After scaffolding, confirm the project's `just ci`
runs, then summarize what was created and suggest running `/spec` next.
