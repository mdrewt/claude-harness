# 0031. Privacy & data lifecycle (deletion, export, retention)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the holistic review (launch-readiness gap). Load-bearing for M22; builds on ADR-0030 (accounts).

## Context and problem statement
The game stores personal data (names, chat, social graph, profiles, account records). A launch needs
right-to-be-forgotten, data export/portability, and retention — defensibly and **mechanically** (so a new
table can't silently retain PII).

## Considered alternatives
- **Registry-driven cascade + erase-or-anonymize + scheduled retention + a deletion-completeness eval
  (chosen).** A registry of owner-keyed tables is the SSOT; `delete_account` cascades over it (erasing
  purely-personal rows, anonymizing shared records to a tombstone); an eval fails the build if a new
  owner-keyed table isn't covered; chat/logs age out on a retention reaper; logs carry no PII (ADR-0029).
- **Ad-hoc per-table deletion (remembered).** A missed table retains PII silently. Rejected — make coverage
  mechanical.
- **Hard-delete everything (incl. shared records).** Breaks others' views/integrity (a deleted user's past
  trades/chat). Rejected — anonymize shared records.
- **No retention policy (keep everything).** Growing PII liability. Rejected.

## Decision outcome
- Chosen: **a registry-driven, eval-gated deletion cascade (erase-or-anonymize), owner-scoped export, and a
  scheduled retention policy, with no-PII logs.**
- Consequences: deletion completeness is mechanically enforced (proof-of-teeth); deletion/export key on the
  account identity (ADR-0030) and `ctx.sender`; shared records survive as tombstones; the privacy surface is
  part of the M25 threat model/audit. Jurisdiction-specific legal text is out of engineering scope — this
  provides the mechanisms.
