# Spec: M-modding — host-moddable private worlds (SKETCH)

**Status:** sketch, 2026-11-12 · `blocked:early-access-release` (operator, 2026-11-12: modding is
built after early access and is part of the official release) · **Project:** monster-realm ·
**Design SSOT:** `game-design.md` §14.

## Problem / intent

By the official release a private world is moddable to the degree modern Minecraft is: a host can
change content and behaviour, not only settings. The official server never runs mods. Nothing here
is built before early access; until then the game is written so that adding it is easy.

## What the code holds to until this milestone opens (the standing constraint)

- **Content is data the server loads.** Species, skills, items, maps, quests, dialogue and tuning are
  content files with one loader each. No rule, reducer or client view names a specific content id.
- **One seam per kind of extension.** Content loading, rule evaluation in `game-core`, and the
  client's asset and text lookup each have a single entry point a mod layer can sit behind. A second
  path to the same thing is a defect.
- **Ids are stable and namespaced-ready.** Content ids are not reused or renumbered, so a mod's ids
  can live beside the official ones later.
- **The client draws what the server's content says.** A new species or item that arrives as data
  needs no client code to appear.

## Scope (to be designed when unblocked)

- What a mod may change (content only, scripted rules, client assets and text) and in what order
  those arrive.
- How a server declares its mods and how a client obtains what it needs to render them.
- How a modded world is marked, so nobody mistakes it for official rules.
- Sandboxing: a mod is code or data from a stranger running on the host's and the players' machines.
- Save compatibility when a mod is added, updated or removed.

## Notes

- `validation-checklist.md` and the content gates assume one official content set; they stay
  authoritative for the official build and gain a per-world notion when this milestone is designed.
