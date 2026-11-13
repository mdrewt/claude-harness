#!/usr/bin/python3
''''exec /usr/bin/python3 "$0" "$@" # '''
# ^ POLYGLOT INTERPRETER GUARD: a shell that runs this file re-execs it under python3 first.
"""mr-prune selftest battery (tp-1, criteria TP1-A1..TP1-A15).

    /usr/bin/python3 battery.py <absolute path of mr-prune> [ID ...]

Drives the tool only as a subprocess, over temporary git repositories built here, always with
--repo, --at <sha> and --mem <temp dir>. One fixture per criterion id. A failed check prints
"FAIL <ID> <check>: ..." and the run goes on. The last stdout line is
"PRUNE-SELFTEST-OK <checks>[ <ID>...]" (exit 0) or "PRUNE-SELFTEST-FAIL <failed>/<checks>" (exit 1).
TP1-A16 has no fixture here: it is proved by running mr-selfcheck itself.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = None      # the one temp root; removed at exit
NEUTRAL = None   # cwd for tool runs, outside every fixture repo
TOOL = None

# --------------------------------------------------------------------------------------------
# environment and git
# --------------------------------------------------------------------------------------------


def clean_env():
    return {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}


def git_env():
    env = clean_env()
    env.update({
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_AUTHOR_NAME": "Fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "1767225600 +0000",
        "GIT_COMMITTER_NAME": "Fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_DATE": "1767225600 +0000",
        "GIT_OPTIONAL_LOCKS": "0",
    })
    return env


def git(cwd, *args):
    p = subprocess.run(["git"] + list(args), cwd=cwd, env=git_env(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if p.returncode != 0:
        raise RuntimeError("fixture git %s failed (%d): %s"
                           % (" ".join(args), p.returncode, p.stderr.decode("utf-8", "replace")))
    return p.stdout.decode("utf-8", "replace")


def fixture_bytes(name):
    with open(os.path.join(HERE, name), "rb") as f:
        return f.read()


def lines_of(data):
    """wc -l: the number of newline bytes."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return data.count(b"\n")


class Repo:
    def __init__(self):
        self.path = tempfile.mkdtemp(prefix="repo-", dir=ROOT)
        git(self.path, "init", "-q", "-b", "main")

    def _full(self, rel):
        full = os.path.join(self.path, rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        if os.path.lexists(full):
            os.remove(full)
        return full

    def put(self, rel, data):
        if isinstance(data, str):
            data = data.encode("utf-8")
        with open(self._full(rel), "wb") as f:
            f.write(data)

    def fixture(self, rel, name):
        self.put(rel, fixture_bytes(name))

    def link(self, rel, target):
        os.symlink(target, self._full(rel))

    def commit(self, msg="fixture"):
        git(self.path, "add", "-A")
        git(self.path, "-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", msg)
        return git(self.path, "rev-parse", "HEAD").strip()


def new_mem():
    return tempfile.mkdtemp(prefix="mem-", dir=ROOT)


def snapshot(repo):
    """Index bytes, refs + HEAD, and every worktree file, hashed."""
    with open(os.path.join(repo.path, ".git", "index"), "rb") as f:
        index = hashlib.sha256(f.read()).hexdigest()
    refs = (git(repo.path, "for-each-ref", "--format=%(objectname) %(refname)")
            + "HEAD " + git(repo.path, "rev-parse", "HEAD")
            + "SYM " + git(repo.path, "symbolic-ref", "HEAD"))
    files = {}
    for dirpath, dirnames, filenames in os.walk(repo.path):
        if os.path.abspath(dirpath) == os.path.abspath(repo.path):
            dirnames[:] = [d for d in dirnames if d != ".git"]
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, repo.path)
            if os.path.islink(full):
                files[rel] = "link:" + os.readlink(full)
            else:
                with open(full, "rb") as f:
                    files[rel] = hashlib.sha256(f.read()).hexdigest()
    return {"index": index, "refs": refs, "files": files}


# --------------------------------------------------------------------------------------------
# running the tool and reading its output
# --------------------------------------------------------------------------------------------


class Result:
    def __init__(self, rc, out, err):
        self.rc, self.out, self.err = rc, out, err
        lines = out.splitlines()
        self.first = lines[0].rstrip("\r") if lines else ""
        self.commit = None
        self.totals = {}
        self.rows = []
        self.counts = None
        self.recorded = None


def run_tool(*args):
    cmd = ([TOOL] if os.access(TOOL, os.X_OK) else ["/usr/bin/python3", TOOL]) + list(args)
    p = subprocess.run(cmd, cwd=NEUTRAL, env=clean_env(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
    return Result(p.returncode, p.stdout.decode("utf-8", "replace"),
                  p.stderr.decode("utf-8", "replace"))


def kv(tokens):
    out = {}
    for t in tokens:
        if "=" not in t:
            out["<malformed>"] = t
            continue
        k, v = t.split("=", 1)
        out[k] = v
    return out


def parse_row(line):
    """'<section> <file> :: <JSON> -> <JSON>[ token=<t>]' -> (section, file, cand, surv, token)."""
    section, rest = line.split(" ", 1)
    dec = json.JSONDecoder()
    try:
        if rest.startswith('"'):
            path, i = dec.raw_decode(rest)
            rest = rest[i:]
        else:
            path, rest = rest.split(" ", 1)
            rest = " " + rest
        if not rest.startswith(" :: "):
            return None
        cand, i = dec.raw_decode(rest[4:])
        rest = rest[4 + i:]
        if not rest.startswith(" -> "):
            return None
        surv, i = dec.raw_decode(rest[4:])
        rest = rest[4 + i:]
    except ValueError:
        return None
    if not all(isinstance(x, str) for x in (path, cand, surv)):
        return None
    token = None
    if section == "protected-twins":
        if not rest.startswith(" token="):
            return None
        token = rest[len(" token="):]
    elif rest:
        return None
    return (section, path, cand, surv, token)


def census(repo, sha, mem, *extra):
    r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", mem, *extra)
    for line in r.out.splitlines():
        line = line.rstrip("\r")
        if line.startswith("PRUNE-CENSUS "):
            r.commit = line[len("PRUNE-CENSUS "):]
        elif line.startswith("totals "):
            parts = line.split(" ")
            if len(parts) >= 2:
                r.totals[parts[1]] = kv(parts[2:])
        elif line.startswith("duplicates ") or line.startswith("protected-twins "):
            row = parse_row(line)
            r.rows.append(row if row is not None else ("malformed", line, None, None, None))
        elif line.startswith("counts "):
            r.counts = kv(line.split(" ")[1:])
        elif line.startswith("recorded "):
            r.recorded = line[len("recorded "):]
    return r


def twin(repo, sha, mem, path, test, survivor):
    return run_tool("twin", "--repo", repo.path, "--at", sha, "--mem", mem,
                    "--file", path, "--test", test, "--survivor", survivor)


def keep(repo, sha, mem, path, test, reason):
    return run_tool("keep", "--repo", repo.path, "--at", sha, "--mem", mem,
                    "--file", path, "--test", test, "--reason", reason)


def D(path, cand, surv):
    return ("duplicates", path, cand, surv, None)


def P(path, cand, surv, token):
    return ("protected-twins", path, cand, surv, token)


def rkey(row):
    return tuple("" if x is None else str(x) for x in row)


def srt(rows):
    return sorted(rows, key=rkey)


def rows_of(res, path):
    return [r for r in res.rows if r[1] == path]


def naming(res, path, names):
    names = set(names)
    return [r for r in res.rows if r[1] == path and (r[2] in names or r[3] in names)]


def counts(dup, prot, ios, kept, unparsed):
    return {"duplicates": str(dup), "protected-twins": str(prot),
            "identical-other-scope": str(ios), "kept": str(kept), "unparsed": str(unparsed)}


def ratio(test_lines, product_lines):
    return "n/a" if product_lines == 0 else "%.2f" % (test_lines / product_lines)


def strs(d):
    return {k: str(v) for k, v in d.items()}


def read_json(path):
    with open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8"))


def read_bytes(path):
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as f:
        return f.read()


# --------------------------------------------------------------------------------------------
# checks
# --------------------------------------------------------------------------------------------


def show(x):
    s = repr(x)
    return s if len(s) <= 900 else s[:900] + "...(%d chars)" % len(s)


class Ctx:
    def __init__(self, cid):
        self.id = cid
        self.n = 0
        self.failed = 0

    def check(self, name, ok, expected, got, res=None):
        self.n += 1
        if ok:
            return True
        self.failed += 1
        msg = "FAIL %s %s: expected %s; got %s" % (self.id, name, show(expected), show(got))
        if res is not None:
            msg += " [exit %s]" % res.rc
            for line in res.out.splitlines()[-12:]:
                msg += "\n    stdout| " + line
            for line in res.err.splitlines()[-8:]:
                msg += "\n    stderr| " + line
        print(msg, flush=True)
        return False

    def crash(self):
        self.n += 1
        self.failed += 1
        tb = traceback.format_exc().rstrip().splitlines()
        print("FAIL %s fixture runs to its end: raised %s" % (self.id, tb[-1]), flush=True)
        for line in tb[-8:-1]:
            print("    trace| " + line, flush=True)


# --------------------------------------------------------------------------------------------
# shared paths and the positive control
# --------------------------------------------------------------------------------------------

CONTROL = "client/src/ui/control.test.ts"
CTRL_T = "stack > push then pop returns the item again"
CTRL_S = "stack > push then pop returns the item"
CTRL = D(CONTROL, CTRL_T, CTRL_S)

DMG = "game-core/src/battle/damage_tests.rs"
BRK = "client/src/ui/broken.test.ts"


def rs_lines(n):
    return "".join("pub fn f%d() {}\n" % i for i in range(n))


def ts_lines(n):
    return "".join("export const v%d = %d;\n" % (i, i) for i in range(n))


INLINE_MOD = """pub fn heal(x: u32) -> u32 {
    x + 1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heals() {
        assert_eq!(heal(1), 2);
    }
}
"""


# --------------------------------------------------------------------------------------------
# fixtures, one per criterion
# --------------------------------------------------------------------------------------------


def tp1_a1(ctx):
    q = "client/src/ui/queue.test.ts"
    repo = Repo()
    repo.fixture(q, "a1_queue.test.ts")
    repo.fixture(DMG, "a1_damage_tests.rs")
    res = census(repo, repo.commit(), new_mem())
    base = "queue > when empty > length is zero"
    exp_ts = [D(q, base + " after creation", base), D(q, base + " once more", base)]
    exp_rs = [D(DMG, "top_b", "top_a"), D(DMG, "outer::inner_a::second", "outer::inner_a::first")]
    ctx.check("TS twins in one nested describe (comments and spacing differ) print one row per later copy, earliest as survivor",
              rows_of(res, q) == exp_ts, exp_ts, rows_of(res, q), res)
    ctx.check("Rust twins at file level and in one nested mod (comments, spacing, doc comment differ) print one row each, later as candidate",
              rows_of(res, DMG) == exp_rs, exp_rs, rows_of(res, DMG), res)
    sib = naming(res, q, ["queue > second block > length is zero"]) + naming(res, DMG, ["outer::inner_b::first"])
    ctx.check("a copy in a sibling describe or sibling mod prints no row in either section",
              sib == [], [], sib, res)
    ctx.check("twin pairs print no other row",
              srt(res.rows) == srt(exp_ts + exp_rs), srt(exp_ts + exp_rs), res.rows, res)
    exp_c = counts(4, 0, 2, 0, 0)
    ctx.check("counts: 4 duplicates and the 2 sibling-block copies under identical-other-scope",
              res.counts == exp_c, exp_c, res.counts, res)


def tp1_a2(ctx):
    ren = "client/src/ui/renameModel.test.ts"
    lit = "client/src/ui/literals.test.ts"
    lrs = "game-core/src/text/literal_tests.rs"
    repo = Repo()
    repo.fixture(ren, "a2_renameModel.test.ts")
    repo.fixture(lit, "a2_literals.test.ts")
    repo.fixture(lrs, "a2_literal_tests.rs")
    res = census(repo, repo.commit(), new_mem())

    def f(*titles):
        return ["format > " + t for t in titles]

    ctx.check("whitespace inside a string literal ('   ' against '') keeps the renameModel bodies apart",
              rows_of(res, ren) == [], [], rows_of(res, ren), res)
    for name, path, names in (
        ("a TS string literal differing by inner whitespace, in either order, prints no row", lit,
         f("pads a spaced word", "pads a doubly spaced word", "pads c d doubly", "pads c d singly")),
        ("a template literal differing by inner whitespace, with and without ${}, prints no row", lit,
         f("labels with a template", "labels with a wider template", "labels a plain wide template",
           "labels a plain template")),
        ("a TS numeric literal differing in value or only in source text (1.50 vs 1.5) prints no row", lit,
         f("scales two", "scales three", "scales one and a half, long form", "scales one and a half")),
        ("a Rust string literal differing by inner whitespace, in either order, prints no row", lrs,
         ["spaced_a", "spaced_b", "spaced_c", "spaced_d"]),
        ("a Rust numeric literal differing in value or only in source text prints no row", lrs,
         ["scaled_a", "scaled_b", "scaled_c", "scaled_d"]),
        ("a Rust character literal difference prints no row", lrs, ["char_a", "char_b"]),
    ):
        got = naming(res, path, names)
        ctx.check(name, got == [], [], got, res)
    exp = srt([D(lit, "format > trims a word twice", "format > trims a word"), D(lrs, "same_b", "same_a")])
    ctx.check("identical literals in one block still print their row (TS and Rust), and nothing else prints",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("counts: only the two identical-literal pairs are duplicates",
              res.counts == exp_c, exp_c, res.counts, res)


def tp1_a3(ctx):
    box = "client/src/ui/boxView.test.ts"
    evo = "client/src/ui/evolutionView.test.ts"
    tog = "client/src/ui/toggleTwin.test.ts"
    repo = Repo()
    repo.fixture(box, "a3_boxView.test.ts")
    repo.fixture(evo, "a3_evolutionView.test.ts")
    repo.fixture(tog, "a3_toggleTwin.test.ts")
    res = census(repo, repo.commit(), new_mem())
    cross = rows_of(res, box) + rows_of(res, evo)
    ctx.check("one body in two files (boxView, evolutionView TOGGLE) prints no row for either file",
              cross == [], [], cross, res)
    exp = [D(tog, "PanelView toggle > toggle opens then closes, second copy",
             "PanelView toggle > toggle opens then closes")]
    ctx.check("the same body twice in one file prints its row, and nothing else prints",
              res.rows == exp, exp, res.rows, res)
    exp_c = counts(1, 0, 0, 0, 0)
    ctx.check("counts: copies in other files are not identical-other-scope",
              res.counts == exp_c, exp_c, res.counts, res)


def tp1_a4(ctx):
    cam = "client/src/render/camera.test.ts"
    repo = Repo()
    repo.fixture(cam, "a4_camera.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    res = census(repo, repo.commit(), new_mem())
    ctx.check("one camera body in two describes (differing only in comments) prints no row in either section",
              rows_of(res, cam) == [], [], rows_of(res, cam), res)
    ctx.check("the twin pair in another file of the commit still prints, and nothing else",
              res.rows == [CTRL], [CTRL], res.rows, res)
    exp_c = counts(1, 0, 1, 0, 0)
    ctx.check("the camera pair counts 1 under identical-other-scope",
              res.counts == exp_c, exp_c, res.counts, res)


def tp1_a5(ctx):
    reg = "client/src/render/art/registry.test.ts"
    each = "client/src/render/art/eachTwin.test.ts"
    att = "game-core/tests/attrs.rs"
    repo = Repo()
    repo.fixture(reg, "a5_registry.test.ts")
    repo.fixture(each, "a5_eachTwin.test.ts")
    repo.fixture(att, "a5_attrs.rs")
    res = census(repo, repo.commit(), new_mem())
    ctx.check("it.each tests with token-identical callbacks and different case tables print no row",
              rows_of(res, reg) == [], [], rows_of(res, reg), res)
    got = naming(res, each, ["sizes > halves four", "sizes > halves four with test()"])
    ctx.check("one body under it() and under test() prints no row", got == [], [], got, res)
    got = naming(res, att, ["plain", "panics_x", "panics_y"])
    ctx.check("Rust tests with one body and different attribute lists (incl. attribute arguments) print no row",
              got == [], [], got, res)
    exp_each = [D(each, "sizes > doubles %s again", "sizes > doubles %s")]
    ctx.check("it.each twins with one case table print their row",
              rows_of(res, each) == exp_each, exp_each, rows_of(res, each), res)
    exp_att = [D(att, "ignored_b", "ignored_a")]
    ctx.check("Rust twins with the same attribute list print their row (game-core/tests/*.rs is eligible)",
              rows_of(res, att) == exp_att, exp_att, rows_of(res, att), res)
    ctx.check("no other row prints", srt(res.rows) == srt(exp_each + exp_att),
              srt(exp_each + exp_att), res.rows, res)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("counts: 2 duplicates", res.counts == exp_c, exp_c, res.counts, res)


def tp1_a6(ctx):
    snap = "client/src/ui/snap.test.ts"
    srs = "game-core/src/ui/snap_tests.rs"
    repo = Repo()
    repo.fixture(snap, "a6_snap.test.ts")
    repo.fixture(srs, "a6_snap_tests.rs")
    res = census(repo, repo.commit(), new_mem())
    for marker, path, names in (
        ("toMatchSnapshot", snap, ["card > draws, snapshot", "card > draws, snapshot copy"]),
        ("currentTestName", snap, ["card > reads the current name", "card > reads the current name copy"]),
        ("expect.getState", snap, ["card > reads the state", "card > reads the state copy"]),
        ("function_name!", srs, ["named", "named_copy"]),
        ("insta::", srs, ["snapshotted", "snapshotted_copy"]),
    ):
        got = naming(res, path, names)
        ctx.check("a twin pair whose body uses %s prints no row in either section" % marker,
                  got == [], [], got, res)
    exp = srt([D(snap, "card > mentions markers only in a comment, copy",
                 "card > mentions markers only in a comment"),
               D(srs, "mention_copy", "mention")])
    ctx.check("a marker named only in a comment does not stop the row (TS and Rust), and nothing else prints",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("counts: name-dependent pairs are not duplicates", res.counts == exp_c, exp_c, res.counts, res)


def tp1_a7(ctx):
    own = "client/src/ui/OwnerCard.test.ts"
    pan = "client/src/ui/panelNames.test.ts"
    lif = "server-module/src/trade/lifecycle_tests.rs"
    repo = Repo()
    repo.fixture(own, "a7_ownerCard.test.ts")
    repo.fixture(pan, "a7_panelNames.test.ts")
    repo.fixture(lif, "a7_lifecycle_tests.rs")
    repo.fixture(CONTROL, "control.test.ts")
    res = census(repo, repo.commit(), new_mem())
    p_path = P(own, "card > shows the title, repeated", "card > shows the title", "owner")
    p_cand = P(pan, "panel > opens on click (Locale switch)", "panel > opens on click", "locale")
    p_surv = P(pan, "panel > keeps the panel shut", "panel > GUARD keeps the Auth panel shut", "auth")
    p_rust = P(lif, "opens_once_again", "opens_once", "lifecycle")
    for name, row in (
        ("a token in the path, matched case-insensitively (OwnerCard), moves the row to protected-twins with token=owner", p_path),
        ("a token only in the candidate's name moves the row to protected-twins with token=locale", p_cand),
        ("a token only in the survivor's name moves the row; token= is the first in list order (auth before guard)", p_surv),
        ("a token in a Rust test file's path moves the row to protected-twins with token=lifecycle", p_rust),
    ):
        ctx.check(name, row in res.rows, row, res.rows, res)
    dup = [r for r in res.rows if r[0] == "duplicates" and r[1] != CONTROL]
    ctx.check("a protected pair prints no duplicates row", dup == [], [], dup, res)
    exp = srt([p_path, p_cand, p_surv, p_rust, CTRL])
    ctx.check("the unprotected pair beside them stays in duplicates, and nothing else prints",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(1, 4, 0, 0, 0)
    ctx.check("counts: 1 duplicate, 4 protected-twins", res.counts == exp_c, exp_c, res.counts, res)


def tp1_a8(ctx):
    loop = "client/src/ui/loops.test.ts"
    prp = "game-core/src/battle/roll_tests.rs"
    repo = Repo()
    repo.fixture(loop, "a8_loops.test.ts")
    repo.fixture(BRK, "a8_broken.test.ts")
    repo.fixture(prp, "a8_proptest_tests.rs")
    repo.fixture(CONTROL, "control.test.ts")
    res = census(repo, repo.commit(), new_mem())
    cl = {k: res.totals.get("client", {}).get(k) for k in ("tests", "unparsed")}
    ctx.check("a loop-built test and the unlexable file's test lines are counted unparsed, not as tests (client)",
              cl == {"tests": "5", "unparsed": "4"}, {"tests": "5", "unparsed": "4"}, cl, res)
    gc = {k: res.totals.get("game-core", {}).get(k) for k in ("tests", "unparsed")}
    ctx.check("tests inside proptest! are counted unparsed, not as tests (game-core)",
              gc == {"tests": "2", "unparsed": "2"}, {"tests": "2", "unparsed": "2"}, gc, res)
    exp_loop = [D(loop, "grid > fills a row again", "grid > fills a row")]
    ctx.check("no row names the loop-built test; the lexed pair in its file still prints",
              rows_of(res, loop) == exp_loop, exp_loop, rows_of(res, loop), res)
    exp_prp = [D(prp, "fixed_roll_again", "fixed_roll")]
    ctx.check("no row names a proptest! test; the lexed pair in its file still prints",
              rows_of(res, prp) == exp_prp, exp_prp, rows_of(res, prp), res)
    ctx.check("an unlexable file prints no row, though it holds a twin pair",
              rows_of(res, BRK) == [], [], rows_of(res, BRK), res)
    warn = "PRUNE-WARN unlexable " + BRK
    ctx.check("an unlexable file is named on stderr",
              warn in [l.strip() for l in res.err.splitlines()], warn, res.err, res)
    exp = srt(exp_loop + exp_prp + [CTRL])
    ctx.check("a twin pair in another file of the same commit still prints, and nothing else",
              srt(res.rows) == exp, exp, res.rows, res)
    exp_c = counts(3, 0, 0, 0, 6)
    ctx.check("counts.unparsed is the packages' sum (4 + 2)", res.counts == exp_c, exp_c, res.counts, res)


KEPT = "client/src/ui/kept.test.ts"
KEPT_T = "stack > push then pop, run twice"
KEPT_S1 = "stack > push then pop returns the item"
KEPT_S2 = "stack > pop on empty gives undefined"
REASON = "a second run after the first, on purpose"


def tp1_a9(ctx):
    repo = Repo()
    repo.fixture(KEPT, "a9_kept_v1.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    mem = new_mem()
    r0 = census(repo, sha, mem)
    row = D(KEPT, KEPT_T, KEPT_S1)
    ctx.check("before keep the candidate prints its row and kept=0",
              row in r0.rows and (r0.counts or {}).get("kept") == "0", row, (r0.rows, r0.counts), r0)
    rk = keep(repo, sha, mem, KEPT, KEPT_T, REASON)
    m = re.fullmatch(r'PRUNE-KEEP-OK (\S+) :: (".*") hash=([0-9a-f]{16})', rk.first)
    name_ok = False
    if m:
        try:
            name_ok = json.loads(m.group(2)) == KEPT_T
        except ValueError:
            name_ok = False
    ctx.check("keep prints PRUNE-KEEP-OK with the file, the JSON name and a 16-hex hash, exit 0",
              rk.rc == 0 and bool(m) and m.group(1) == KEPT and name_ok,
              "PRUNE-KEEP-OK %s :: %s hash=<16 hex>" % (KEPT, json.dumps(KEPT_T)), rk.first, rk)
    h = m.group(3) if m else None
    kpath = os.path.join(mem, "mr-prune-keep.json")
    got = read_json(kpath) if os.path.isfile(kpath) else None
    exp = {KEPT: {KEPT_T: {"hash": h, "reason": REASON}}}
    ctx.check("the keep file holds the file, the name, the printed hash and the reason",
              h is not None and got == exp, exp, got, rk)
    r1 = census(repo, sha, mem)
    ctx.check("a kept candidate's row is omitted while the twin pair in another file still prints",
              r1.rows == [CTRL], [CTRL], r1.rows, r1)
    exp_c = counts(1, 0, 0, 1, 0)
    ctx.check("the kept candidate adds one to kept", r1.counts == exp_c, exp_c, r1.counts, r1)


def tp1_a10(ctx):
    repo = Repo()
    repo.fixture(KEPT, "a9_kept_v1.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    sha1 = repo.commit()
    mem = new_mem()
    rk = keep(repo, sha1, mem, KEPT, KEPT_T, REASON)
    repo.fixture(KEPT, "a9_kept_v2.test.ts")
    sha2 = repo.commit()
    r2 = census(repo, sha2, mem)
    exp = srt([D(KEPT, KEPT_T, KEPT_S2), CTRL])
    ctx.check("after the kept candidate's body changes its row prints again, against the twin it now matches",
              rk.rc == 0 and srt(r2.rows) == exp, exp, ("keep exit %s" % rk.rc, r2.rows), r2)
    exp_c = counts(2, 0, 0, 0, 0)
    ctx.check("a keep entry with a stale hash adds nothing to kept", r2.counts == exp_c, exp_c, r2.counts, r2)
    r1 = census(repo, sha1, mem)
    ctx.check("at the commit whose hash was recorded the row stays omitted (kept=1)",
              rk.rc == 0 and r1.rows == [CTRL] and (r1.counts or {}).get("kept") == "1",
              ([CTRL], "kept=1"), (r1.rows, r1.counts), r1)


def tp1_a11(ctx):
    auth = "client/src/ui/authBadge.test.ts"
    auth_t, auth_s = "card > shows the title, repeated", "card > shows the title"
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    repo.fixture(auth, "a7_ownerCard.test.ts")
    repo.fixture(DMG, "a1_damage_tests.rs")
    sha = repo.commit()
    mem = new_mem()
    r = twin(repo, sha, mem, CONTROL, CTRL_T, CTRL_S)
    ctx.check("a plain TS twin pair is confirmed: PRUNE-TWIN-OK, exit 0",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)
    r = twin(repo, sha, mem, DMG, "outer::inner_a::second", "outer::inner_a::first")
    ctx.check("a Rust twin pair in a nested mod is confirmed by its :: names",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)
    r = twin(repo, sha, mem, auth, auth_t, auth_s)
    ctx.check("a protected pair is still a twin: PRUNE-TWIN-OK protected=auth, exit 0",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK protected=auth", "PRUNE-TWIN-OK protected=auth", r.first, r)
    rk = keep(repo, sha, mem, CONTROL, CTRL_T, REASON)
    r = twin(repo, sha, mem, CONTROL, CTRL_T, CTRL_S)
    ctx.check("a kept pair is still a twin: PRUNE-TWIN-OK kept, exit 0",
              rk.rc == 0 and r.rc == 0 and r.first == "PRUNE-TWIN-OK kept",
              "keep exit 0, then PRUNE-TWIN-OK kept", ("keep exit %s" % rk.rc, r.first), r)
    rk = keep(repo, sha, mem, auth, auth_t, REASON)
    r = twin(repo, sha, mem, auth, auth_t, auth_s)
    ctx.check("a protected kept pair: PRUNE-TWIN-OK protected=auth kept, exit 0",
              rk.rc == 0 and r.rc == 0 and r.first == "PRUNE-TWIN-OK protected=auth kept",
              "keep exit 0, then PRUNE-TWIN-OK protected=auth kept", ("keep exit %s" % rk.rc, r.first), r)


def tp1_a12(ctx):
    rules = "client/src/ui/rules.test.ts"
    repo = Repo()
    repo.fixture(rules, "a12_rules.test.ts")
    repo.fixture(BRK, "a8_broken.test.ts")
    sha = repo.commit()
    mem = new_mem()
    f1, f2 = "rules > first > ", "rules > second > "
    for name, path, t, s, expect in (
        ("a file absent at the commit fails as missing", "client/src/ui/absent.test.ts",
         f1 + "base copy", f1 + "base", "missing"),
        ("a test name absent from the file fails as missing", rules, f1 + "no such test", f1 + "base", "missing"),
        ("a pair in an unlexable file fails as unparsed", BRK, "broken > two again", "broken > two", "unparsed"),
        ("one test given as both candidate and survivor fails as same-test", rules, f1 + "base", f1 + "base",
         "same-test"),
        ("a pair in different blocks fails on block", rules, f2 + "base", f1 + "base", "block"),
        ("a pair under it() and test() fails on form", rules, f1 + "other form", f1 + "base", "form"),
        ("a pair with different bodies fails on body", rules, f1 + "other body", f1 + "base", "body"),
        ("a pair reading its own name (toMatchSnapshot) fails on name-dependent", rules, f1 + "snap b",
         f1 + "snap a", "name-dependent"),
        ("a candidate defined before its survivor fails on order", rules, f1 + "base", f1 + "base copy",
         "order"),
        ("a pair breaking two rules names both, in rule order", rules, f2 + "other", f1 + "base",
         "block body"),
    ):
        r = twin(repo, sha, mem, path, t, s)
        want = "PRUNE-TWIN-FAIL " + expect
        ctx.check(name + " (exit 1)", r.rc == 1 and r.first == want, want + " / exit 1", r.first, r)


def tp1_a13(ctx):
    repo = Repo()
    control = fixture_bytes("control.test.ts")
    main_ts = ts_lines(120)
    repo.put("client/src/main.ts", main_ts)
    repo.put("client/src/ui/view.test.ts", control)
    sha1 = repo.commit("client only")

    gc_lib, gc_build, gc_t1, gc_t2 = rs_lines(150), rs_lines(10), fixture_bytes("a1_damage_tests.rs"), \
        fixture_bytes("a8_proptest_tests.rs")
    sm_lib = rs_lines(80) + "#[cfg(test)]\nmod trade_tests;\n"
    sm_t = fixture_bytes("a7_lifecycle_tests.rs")
    view_ts = ts_lines(60)[:-1]  # last line without a newline: 59 lines by wc -l
    files = {
        # game-core: product, tests, and files that are neither
        "game-core/src/lib.rs": gc_lib,
        "game-core/build.rs": gc_build,
        "game-core/src/combat/mod.rs": INLINE_MOD,
        "game-core/src/combat/combat_tests.rs": gc_t1,
        "game-core/tests/flow.rs": gc_t2,
        "game-core/tests/helpers/mod.rs": rs_lines(30),
        "game-core/benches/speed.rs": rs_lines(40),
        # server-module
        "server-module/src/lib.rs": sm_lib,
        "server-module/src/trade/trade_tests.rs": sm_t,
        "server-module/tests/it.rs": rs_lines(25),
        "server-module/benches/b.rs": rs_lines(5),
        # client
        "client/src/ui/view.ts": view_ts,
        "client/src/module_bindings/types.ts": ts_lines(500),
        "client/vite.config.ts": ts_lines(7),
        "client/e2e/a.spec.ts": ts_lines(3),
        "client/e2e/flows/b.spec.ts": ts_lines(3),
        "client/e2e/helper.ts": ts_lines(3),
        "client/test-util/fake.ts": ts_lines(4),
        "client/test-util/x/deep.ts": ts_lines(4),
        # repository-level out of scope
        "evals/a.eval.mjs": "export {};\n",
        "evals/sub/b.eval.mjs": "export {};\n",
        "evals/lib.mjs": "export {};\n",
        "sim-harness/src/main.rs": "fn main() {}\n",
        "sim-harness/x.rs": "fn x() {}\n",
        "sim-harness/Cargo.toml": "[package]\n",
        "client-wasm/src/lib.rs": "pub fn w() {}\n",
        "client-wasm/Cargo.toml": "[package]\n",
    }
    for rel, data in files.items():
        repo.put(rel, data)
    repo.link("client/src/ui/link.test.ts", "view.test.ts")  # a symlink blob is not a test file
    sha2 = repo.commit("all packages")
    res = census(repo, sha2, new_mem())

    ctx.check("census exits 0 and names the commit it read",
              res.rc == 0 and res.commit == sha2, ("exit 0", sha2), (res.rc, res.commit), res)
    gp, gt = lines_of(gc_lib) + lines_of(gc_build) + lines_of(INLINE_MOD), lines_of(gc_t1) + lines_of(gc_t2)
    exp_gc = strs({"product-lines": gp, "test-lines": gt, "ratio": ratio(gt, gp), "test-files": 2,
                   "tests": 8, "unparsed": 2, "inline-modules": 1})
    ctx.check("game-core totals: src and build.rs product (tests/, benches/ excluded), *_tests.rs and tests/*.rs, one inline test mod",
              res.totals.get("game-core") == exp_gc, exp_gc, res.totals.get("game-core"), res)
    sp, st = lines_of(sm_lib), lines_of(sm_t)
    exp_sm = strs({"product-lines": sp, "test-lines": st, "ratio": ratio(st, sp), "test-files": 1,
                   "tests": 2, "unparsed": 0, "inline-modules": 0})
    ctx.check("server-module totals: tests/ and benches/ excluded, a bodiless cfg(test) mod is not an inline module",
              res.totals.get("server-module") == exp_sm, exp_sm, res.totals.get("server-module"), res)
    cp, ct = lines_of(main_ts) + lines_of(view_ts), lines_of(control)
    exp_cl = strs({"product-lines": cp, "test-lines": ct, "ratio": ratio(ct, cp), "test-files": 1,
                   "tests": 2, "unparsed": 0, "e2e": 2, "test-util": 2})
    ctx.check("client totals: module_bindings excluded, wc -l line count, symlink not a test file, e2e and test-util counted",
              res.totals.get("client") == exp_cl, exp_cl, res.totals.get("client"), res)
    exp_oos = strs({"evals": 2, "sim-harness": 2, "client-wasm": 1})
    ctx.check("out-of-scope counts: *.eval.mjs under evals, .rs under sim-harness and client-wasm",
              res.totals.get("out-of-scope") == exp_oos, exp_oos, res.totals.get("out-of-scope"), res)
    got_u = (res.counts or {}).get("unparsed")
    ctx.check("counts.unparsed equals the packages' unparsed sum", got_u == "2", "2", got_u, res)

    r1 = census(repo, sha1, new_mem())
    zero_rs = strs({"product-lines": 0, "test-lines": 0, "ratio": "n/a", "test-files": 0, "tests": 0,
                    "unparsed": 0, "inline-modules": 0})
    cp1 = lines_of(main_ts)
    exp1 = {"game-core": zero_rs, "server-module": zero_rs,
            "client": strs({"product-lines": cp1, "test-lines": ct, "ratio": ratio(ct, cp1), "test-files": 1,
                            "tests": 2, "unparsed": 0, "e2e": 0, "test-util": 0})}
    got1 = {k: r1.totals.get(k) for k in exp1}
    ctx.check("at an earlier --at commit a missing package prints zeros with ratio n/a and the client row counts that commit",
              r1.rc == 0 and got1 == exp1, exp1, got1, r1)


def json_totals_match(text, js):
    if not isinstance(js, dict) or set(js) != set(text) or len(text) != 4:
        return False
    for pkg, row in text.items():
        jrow = js.get(pkg)
        if not isinstance(jrow, dict) or set(jrow) != set(row):
            return False
        for k, v in row.items():
            j = jrow[k]
            if k == "ratio":
                if v == "n/a":
                    if j is not None:
                        return False
                elif not isinstance(j, (int, float)) or isinstance(j, bool) or "%.2f" % j != v:
                    return False
            elif not isinstance(j, int) or isinstance(j, bool) or str(j) != v:
                return False
    return True


def tp1_a14(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    repo.fixture(DMG, "a1_damage_tests.rs")
    repo.put("client/src/main.ts", ts_lines(30))
    repo.put("game-core/src/lib.rs", rs_lines(20))
    sha = repo.commit()
    mem = new_mem()
    trend = os.path.join(mem, "prune", "trend.jsonl")

    r0 = census(repo, sha, mem)
    ctx.check("without --record census writes nothing under --mem",
              r0.rc == 0 and os.listdir(mem) == [], [], os.listdir(mem), r0)
    label = "close tp-1"
    r1 = census(repo, sha, mem, "--record", label)
    ctx.check("--record prints 'recorded <label>'", r1.recorded == label, label, r1.recorded, r1)
    d1 = read_bytes(trend)
    ctx.check("--record appends exactly one newline-terminated line to prune/trend.jsonl",
              d1 is not None and d1.count(b"\n") == 1 and d1.endswith(b"\n"), "one line", d1, r1)
    row = None
    if d1:
        try:
            row = json.loads(d1.decode("utf-8"))
        except ValueError:
            row = None
    got = (row.get("label"), row.get("commit")) if isinstance(row, dict) else row
    ctx.check("the row is a JSON object holding the label and the 40-hex commit",
              got == (label, sha), (label, sha), got, r1)
    jt = row.get("totals") if isinstance(row, dict) else None
    ctx.check("the row's totals equal the totals the text rows printed",
              json_totals_match(r1.totals, jt), r1.totals, jt, r1)
    jc = row.get("counts") if isinstance(row, dict) else None
    tc = None
    if r1.counts and "<malformed>" not in r1.counts:
        tc = {k: int(v) for k, v in r1.counts.items() if v.isdigit()}
    ctx.check("the row's counts equal the counts the text line printed",
              tc is not None and len(tc) == 5 and jc == tc, tc, jc, r1)
    r2 = census(repo, sha, mem, "--record", "second")
    d2 = read_bytes(trend)
    second = None
    if d1 and d2 and d2.startswith(d1):
        try:
            second = json.loads(d2[len(d1):].decode("utf-8")).get("label")
        except (ValueError, AttributeError):
            second = None
    ctx.check("a second --record appends a second line and leaves the first byte-identical",
              d1 is not None and d2 is not None and d2.startswith(d1) and d2.count(b"\n") == 2
              and second == "second", "first line unchanged + a 'second' row", d2, r2)
    r3 = census(repo, sha, mem, "--record", "a\nb")
    d3 = read_bytes(trend)
    ctx.check("a label holding a newline is a usage error (exit 2, PRUNE-ERROR) and appends nothing",
              r3.rc == 2 and any(l.startswith("PRUNE-ERROR") for l in r3.err.splitlines()) and d3 == d2,
              "exit 2, PRUNE-ERROR, file unchanged", (r3.rc, d3 == d2), r3)


def tp1_a15(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    # overwrite the worktree copy without committing: the candidate is gone from the worktree
    repo.put(CONTROL, "describe('stack', () => {\n  it('push then pop returns the item', () => {\n"
                      "    expect(1).toBe(1);\n  });\n});\n")
    mem = new_mem()
    before = snapshot(repo)

    r = census(repo, sha, mem)
    ctx.check("census reads the commit, not the worktree: the committed twin pair prints",
              CTRL in r.rows, CTRL, r.rows, r)
    after = snapshot(repo)
    ctx.check("census leaves the worktree, index and refs unchanged", after == before, before, after, r)

    r = twin(repo, sha, mem, CONTROL, CTRL_T, CTRL_S)
    ctx.check("twin reads the commit: the committed pair is confirmed (PRUNE-TWIN-OK, exit 0)",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)
    after = snapshot(repo)
    ctx.check("twin leaves the worktree, index and refs unchanged", after == before, before, after, r)

    r = keep(repo, sha, mem, CONTROL, CTRL_T, REASON)
    ctx.check("keep reads the commit: the committed candidate is recorded (PRUNE-KEEP-OK, exit 0)",
              r.rc == 0 and r.first.startswith("PRUNE-KEEP-OK "), "PRUNE-KEEP-OK ...", r.first, r)
    after = snapshot(repo)
    ctx.check("keep leaves the worktree, index and refs unchanged", after == before, before, after, r)


FIXTURES = [
    ("TP1-A1", tp1_a1), ("TP1-A2", tp1_a2), ("TP1-A3", tp1_a3), ("TP1-A4", tp1_a4),
    ("TP1-A5", tp1_a5), ("TP1-A6", tp1_a6), ("TP1-A7", tp1_a7), ("TP1-A8", tp1_a8),
    ("TP1-A9", tp1_a9), ("TP1-A10", tp1_a10), ("TP1-A11", tp1_a11), ("TP1-A12", tp1_a12),
    ("TP1-A13", tp1_a13), ("TP1-A14", tp1_a14), ("TP1-A15", tp1_a15),
]


def main(argv):
    global ROOT, NEUTRAL, TOOL
    if len(argv) < 2 or not os.path.isfile(argv[1]):
        sys.stderr.write("usage: battery.py <absolute path of mr-prune> [ID ...]\n")
        print("PRUNE-SELFTEST-FAIL 0/0")
        return 1
    TOOL = os.path.abspath(argv[1])
    ids = argv[2:]
    table = dict(FIXTURES)
    selected = ids if ids else [fid for fid, _ in FIXTURES]
    total = failed = 0
    ROOT = tempfile.mkdtemp(prefix="mr-prune-selftest-")
    try:
        NEUTRAL = tempfile.mkdtemp(prefix="cwd-", dir=ROOT)
        for fid in selected:
            ctx = Ctx(fid)
            fn = table.get(fid)
            if fn is None:
                ctx.check("the id names a fixture", False, "a fixture registered as " + fid, "none")
            else:
                try:
                    fn(ctx)
                except Exception:
                    ctx.crash()
            total += ctx.n
            failed += ctx.failed
    finally:
        shutil.rmtree(ROOT, ignore_errors=True)
    if failed or total == 0:
        print("PRUNE-SELFTEST-FAIL %d/%d" % (failed, total))
        return 1
    print("PRUNE-SELFTEST-OK %d%s" % (total, "".join(" " + i for i in ids)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
