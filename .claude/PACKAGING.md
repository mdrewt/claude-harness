# Packaging the coding-harness plugin

The live config in `.claude/` (agents, commands, skills) plus
`.claude-plugin/plugin.json` IS the `coding-harness` plugin and is active for any
Claude Code session started in this workspace.

To make it installable on another machine:
1. Keep `.claude/` + `.claude-plugin/plugin.json` together (they're versioned in
   the harness repo).
2. Publish via a plugin marketplace, or copy the folder and run the Cowork
   "create plugin" flow to produce a `.plugin` bundle.
Updating files here updates every project's available agents/commands at once.
