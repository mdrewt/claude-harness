#!/usr/bin/env node
// Preflight: verify the host tools the harness and generated projects need.
// Run: just doctor   (or: node scripts/doctor.mjs)
// Exits non-zero if a REQUIRED tool is missing; optional tools only matter per-stack.
import { execSync } from 'node:child_process';

const TOOLS = [
  { name: 'git', cmd: 'git --version', required: true, hint: 'https://git-scm.com' },
  { name: 'node', cmd: 'node --version', required: true, hint: 'https://nodejs.org (LTS)' },
  { name: 'just', cmd: 'just --version', required: true, hint: 'winget install Casey.Just' },
  {
    name: 'docker',
    cmd: 'docker --version',
    required: false,
    hint: 'Docker Desktop — Compose service stacks',
  },
  {
    name: 'cargo',
    cmd: 'cargo --version',
    required: false,
    hint: 'rustup — rust-lib / spacetimedb stacks',
  },
  {
    name: 'uv',
    cmd: 'uv --version',
    required: false,
    hint: 'winget install astral-sh.uv — python stack',
  },
  {
    name: 'spacetime',
    cmd: 'spacetime --version',
    required: false,
    hint: 'SpacetimeDB CLI — spacetimedb stack',
  },
  {
    name: 'gitleaks',
    cmd: 'gitleaks version',
    required: false,
    hint: 'winget install Gitleaks.Gitleaks — local secret scan (CI uses the action)',
  },
  {
    name: 'semgrep',
    cmd: 'semgrep --version',
    required: false,
    hint: 'pipx install semgrep — local SAST (CI runs it via pipx)',
  },
];

let missingRequired = 0;
let missingOptional = 0;
for (const t of TOOLS) {
  let ver = '';
  try {
    ver = execSync(t.cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('\n')[0];
    console.log(`  ok   ${t.name.padEnd(10)} ${ver}`);
  } catch {
    console.log(`  ${t.required ? 'MISS' : 'opt '} ${t.name.padEnd(10)} missing — ${t.hint}`);
    if (t.required) missingRequired++;
    else missingOptional++;
  }
}

console.log('');
if (missingRequired) {
  console.error(
    `doctor: ${missingRequired} REQUIRED tool(s) missing — install before scaffolding (see SETUP.md).`,
  );
  process.exit(1);
}
const opt = missingOptional
  ? ` ${missingOptional} optional tool(s) missing (only needed for some stacks).`
  : ' all optional tools present too.';
console.log(`doctor: required tools present.${opt}`);
