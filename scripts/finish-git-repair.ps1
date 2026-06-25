#requires -Version 5
# finish-git-repair.ps1
# Completes the git repairs that CANNOT run inside the Cowork Linux sandbox.
# The sandbox mounts this Windows folder with unlink/rename disabled, which git
# needs in order to replace its index/refs and to delete branches. Attempting
# those operations from the sandbox is what left stale *.lock files and the
# half-initialized project repos in the first place. Run this ONCE from a normal
# Windows PowerShell at the workspace root, then commit the harness changes on a
# feature branch (main is protected — see standards/git.md).
#
# Safe: no commit history is lost. tc-check/smoke-test have no commits yet (their
# .git was never completed) and the stray `master` has zero commits not on `main`.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "== Workspace: $root ==" -ForegroundColor Cyan

# 1) Harness repo: clear the stale lock, the sandbox backup, and scratch files,
#    then drop the stray `master` branch.
Write-Host "`n[1/3] Harness repo cleanup"
foreach ($f in '.git/index.lock','.git/index.corrupt.bak',
               '.probe_b.txt','.probe_c.txt','.probe_target.txt','.probe_test.txt') {
  if (Test-Path $f) { Remove-Item -Force $f; Write-Host "  removed $f" }
}
git branch -D master 2>$null
Write-Host "  branches now:"; git branch

# 2) tc-check: replace the half-initialized repo and commit the scaffold on main.
Write-Host "`n[2/3] Re-init projects/tc-check"
if (Test-Path 'projects/tc-check/.git') { Remove-Item -Recurse -Force 'projects/tc-check/.git' }
git -C 'projects/tc-check' init -q -b master
git -C 'projects/tc-check' add -A
git -C 'projects/tc-check' commit -qm 'chore: scaffold from template'
git -C 'projects/tc-check' log --oneline -1

# 3) smoke-test: same. (It is a throwaway example — if you prefer, delete it
#    instead with:  Remove-Item -Recurse -Force projects/smoke-test )
Write-Host "`n[3/3] Init projects/smoke-test"
if (Test-Path 'projects/smoke-test/.git') { Remove-Item -Recurse -Force 'projects/smoke-test/.git' }
git -C 'projects/smoke-test' init -q -b master
git -C 'projects/smoke-test' add -A
git -C 'projects/smoke-test' commit -qm 'chore: scaffold from template (initial commit)'
git -C 'projects/smoke-test' log --oneline -1

Write-Host "`nDone. Verify:" -ForegroundColor Green
Write-Host "  git status                          # harness readable, master gone"
Write-Host "  node scripts/workspace-review.mjs   # expect: no drift detected"
