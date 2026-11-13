#!/usr/bin/python3
''''exec /usr/bin/python3 "$0" "$@" # '''
# ^ POLYGLOT INTERPRETER GUARD: a shell that runs this file re-execs it under python3 first.
"""mr-prune selftest battery: one fixture per criterion id (TP1-A1..TP1-A15, TP2-A1..TP2-A14,
TP4-A1..TP4-A19).

    /usr/bin/python3 battery.py <absolute path of mr-prune> [ID ...]

Drives the tool only as a subprocess, over temporary git repositories built here, always with
--repo, --at <sha> and --mem <temp dir> (the CI fixtures also put a fake `gh` first on PATH, or
remove `gh` from PATH; the TP4 `close` fixtures also pass --spec <a spec in a temp directory>).
One fixture per criterion id. A failed check prints
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
from datetime import datetime, timedelta

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
        # TP2 sections; the TP1 `rows` list keeps only duplicates and protected-twins
        self.orph = []        # (file, symbol, test_only, tests-tuple)
        self.orph_prot = []   # (file, symbol, test_only, tests-tuple, token)
        self.lv = []          # (file, groups)
        self.sig = []         # (file, source_text, churn|None, widened|None)
        self.pchurn = []      # (file, churn, token)
        self.ci = None        # kv dict of the `ci` line
        self.slices = {}      # (section, file, name-or-"") -> [slice ids]
        self.bad = []         # new-section lines the parser could not read


def run_tool(*args, env=None):
    cmd = ([TOOL] if os.access(TOOL, os.X_OK) else ["/usr/bin/python3", TOOL]) + list(args)
    p = subprocess.run(cmd, cwd=NEUTRAL, env=clean_env() if env is None else env,
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


SLICES_RE = re.compile(r" slices=([^ ]+)$")


def split_slices(line):
    """'<row> slices=a,b' -> ('<row>', ['a', 'b']); no suffix -> (line, None)."""
    m = SLICES_RE.search(line)
    if not m:
        return line, None
    return line[:m.start()], m.group(1).split(",")


def split_path(rest):
    """A bare path or a JSON-string path at the start of rest -> (path, remainder)."""
    if rest.startswith('"'):
        path, i = json.JSONDecoder().raw_decode(rest)
        return path, rest[i:]
    if " " in rest:
        path, tail = rest.split(" ", 1)
        return path, " " + tail
    return rest, ""


def compact(x):
    return json.dumps(x, separators=(",", ":"))


def parse_orphan(section, rest):
    """'<file> :: <JSON sym>[ test-only] tests=<compact JSON array>[ token=<t>]' -> row tuple or None."""
    dec = json.JSONDecoder()
    try:
        path, rest = split_path(rest)
        if not rest.startswith(" :: "):
            return None
        sym, i = dec.raw_decode(rest[4:])
        rest = rest[4 + i:]
        test_only = rest.startswith(" test-only")
        if test_only:
            rest = rest[len(" test-only"):]
        if not rest.startswith(" tests="):
            return None
        raw = rest[len(" tests="):]
        tests, i = dec.raw_decode(raw)
        rest = raw[i:]
        if not isinstance(tests, list) or not all(isinstance(t, str) for t in tests):
            return None
        if raw[:i] != compact(tests) or tests != sorted(tests):
            return None
    except ValueError:
        return None
    if not isinstance(path, str) or not isinstance(sym, str):
        return None
    if section == "orphan-protected":
        m = re.fullmatch(r" token=(\S+)", rest)
        return (path, sym, test_only, tuple(tests), m.group(1)) if m else None
    return (path, sym, test_only, tuple(tests)) if rest == "" else None


def parse_other(section, rest):
    """literal-variants / signals / protected-churn lines (slices already stripped)."""
    try:
        path, rest = split_path(rest)
    except ValueError:
        return None
    if section == "literal-variants":
        m = re.fullmatch(r" groups=(\d+)", rest)
        return (path, int(m.group(1))) if m else None
    if section == "protected-churn":
        m = re.fullmatch(r" churn=(\d+) token=(\S+)", rest)
        return (path, int(m.group(1)), m.group(2)) if m else None
    m = re.fullmatch(r"( source-text)?(?: churn=(\d+))?(?: widened=(\d+))?", rest)
    if not m or rest == "":
        return None
    return (path, m.group(1) is not None,
            None if m.group(2) is None else int(m.group(2)),
            None if m.group(3) is None else int(m.group(3)))


def census(repo, sha, mem, *extra, env=None):
    r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", mem, *extra, env=env)
    for line in r.out.splitlines():
        line = line.rstrip("\r")
        if line.startswith("PRUNE-CENSUS "):
            r.commit = line[len("PRUNE-CENSUS "):]
        elif line.startswith("totals "):
            parts = line.split(" ")
            if len(parts) >= 2:
                r.totals[parts[1]] = kv(parts[2:])
        elif line.startswith("duplicates ") or line.startswith("protected-twins "):
            base, sl = split_slices(line)
            row = parse_row(base)
            r.rows.append(row if row is not None else ("malformed", line, None, None, None))
            if row is not None and sl is not None:
                r.slices[(row[0], row[1], row[2])] = sl
        elif line.startswith(("orphans ", "orphan-protected ")):
            section, rest = line.split(" ", 1)
            base, sl = split_slices(rest)
            row = parse_orphan(section, base)
            if row is None:
                r.bad.append(line)
            else:
                (r.orph if section == "orphans" else r.orph_prot).append(row)
                if sl is not None:
                    r.slices[(section, row[0], row[1])] = sl
        elif line.startswith(("literal-variants ", "signals ", "protected-churn ")):
            section, rest = line.split(" ", 1)
            base, sl = split_slices(rest)
            row = parse_other(section, base)
            if row is None:
                r.bad.append(line)
            else:
                {"literal-variants": r.lv, "signals": r.sig, "protected-churn": r.pchurn}[section].append(row)
                if sl is not None:
                    r.slices[(section, row[0], "")] = sl
        elif line.startswith("ci "):
            r.ci = kv(line.split(" ")[1:])
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


def warned(res, path):
    return ("PRUNE-WARN unlexable " + path) in [l.strip() for l in res.err.splitlines()]


def refused(res):
    """Exit 2 with a PRUNE-ERROR line on stderr and no census output."""
    return (res.rc == 2 and any(l.startswith("PRUNE-ERROR") for l in res.err.splitlines())
            and "PRUNE-CENSUS" not in res.out)


def pkg(res, name, keys=("tests", "unparsed")):
    return {k: res.totals.get(name, {}).get(k) for k in keys}


def census_of(*files):
    """A fresh repo holding (path, bytes) files, one commit, one census."""
    repo = Repo()
    for rel, data in files:
        repo.put(rel, data)
    return census(repo, repo.commit(), new_mem())


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
    a2_lexer_traps(ctx)


def a2_lexer_traps(ctx):
    rt = "client/src/ui/regexTrap.test.ts"
    tt = "client/src/ui/traps.test.ts"
    rr = "game-core/src/text/traps_tests.rs"
    repo = Repo()
    repo.fixture(rt, "a2_regex_trap.test.ts")
    repo.fixture(tt, "a2_ts_traps.test.ts")
    repo.fixture(rr, "a2_rs_traps_tests.rs")
    sha = repo.commit()
    mem = new_mem()
    res = census(repo, sha, mem)
    ctx.check("regex literals holding comment openers inside ${} do not hide a launch(1)/launch(2) difference: no row",
              rows_of(res, rt) == [], [], rows_of(res, rt), res)
    r = twin(repo, sha, mem, rt, "launch > b", "launch > a")
    ctx.check("twin does not confirm the launch(1)/launch(2) pair",
              r.rc == 1 and r.first.startswith("PRUNE-TWIN-FAIL "), "PRUNE-TWIN-FAIL ... / exit 1", r.first, r)
    exp_tt = [D(tt, "traps > control again", "traps > control")]
    ctx.check("TS bodies differing only inside a regex, after // in a string or inside a nested template print no row; the true pair prints",
              rows_of(res, tt) == exp_tt, exp_tt, rows_of(res, tt), res)
    exp_rr = [D(rr, "control_again", "control")]
    ctx.check("Rust bodies differing only in a raw string, a char literal, after a nested block comment or on a lifetime line print no row; the pair differing only inside nested comments prints",
              rows_of(res, rr) == exp_rr, exp_rr, rows_of(res, rr), res)
    ctx.check("the TS and Rust lexer-trap files stay lexable (no PRUNE-WARN unlexable)",
              not warned(res, tt) and not warned(res, rr), "no warning for either file", res.err, res)


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
    te = "client/src/ui/typedEach.test.ts"
    res = census_of((te, fixture_bytes("a5_typedEach.test.ts")))
    exp = [D(te, "pairs > joins %s again", "pairs > joins %s")]
    ctx.check("it.each<T> twins with one type argument list and table print one row; other type arguments or another table print none",
              res.rows == exp, exp, res.rows, res)
    got = pkg(res, "client")
    ctx.check("all four it.each<T> tests are counted as tests",
              got == {"tests": "4", "unparsed": "0"}, {"tests": "4", "unparsed": "0"}, got, res)


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
    gold = "client/src/ui/golden.test.ts"
    known = "game-core/src/text/known_tests.rs"
    res = census_of((gold, fixture_bytes("a6_golden.test.ts")), (known, fixture_bytes("a6_known_tests.rs")))
    exp = [D(gold, "golden > reads the table again", "golden > reads the table")]
    ctx.check("a twin pair reading task.name prints no row; the plain pair beside it does",
              rows_of(res, gold) == exp, exp, rows_of(res, gold), res)
    exp = [D(known, "table_b", "table_a")]
    ctx.check("a twin pair using line!() prints no row; the plain pair beside it does",
              rows_of(res, known) == exp, exp, rows_of(res, known), res)


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
    a8_lexer_counts(ctx)


NOT_UTF8 = (b"describe('bytes', () => {\n  it('one', () => {\n    expect(f('\xff')).toBe(1);\n  });\n\n"
            b"  it('one again', () => {\n    expect(f('\xff')).toBe(1);\n  });\n});\n")


def a8_lexer_counts(ctx):
    cm = "client/src/ui/commented.test.ts"
    res = census_of((cm, fixture_bytes("a8_commented.test.ts")))
    got = pkg(res, "client")
    exp = {"tests": "0", "unparsed": "3"}
    ctx.check("a test-shaped line inside a block comment makes the file unlexable: no row, unparsed = its 3 test-shaped lines",
              res.rows == [] and got == exp, ([], exp), (res.rows, got), res)
    ctx.check("that file is named on stderr as unlexable", warned(res, cm), "PRUNE-WARN unlexable " + cm,
              res.err, res)

    tg = "client/src/ui/tagged.test.ts"
    res = census_of((tg, fixture_bytes("a8_tagged.test.ts")))
    exp = ([D(tg, "sums > adds one and two again", "sums > adds one and two")], {"tests": "2", "unparsed": "1"}, False)
    got = (res.rows, pkg(res, "client"), warned(res, tg))
    ctx.check("a tagged-template it.each table counts 1 unparsed and its file stays lexed (the twin pair prints, no warning)",
              got == exp, exp, got, res)

    mc = "game-core/src/battle/macro_tests.rs"
    res = census_of((mc, fixture_bytes("a8_macro_tests.rs")))
    exp = ([D(mc, "real_b", "real_a")], {"tests": "2", "unparsed": "1"}, False)
    got = (res.rows, pkg(res, "game-core"), warned(res, mc))
    ctx.check("a #[test] fn inside macro_rules! counts 1 unparsed and its file stays lexed (the twin pair prints, no warning)",
              got == exp, exp, got, res)

    bad = "client/src/ui/bytes.test.ts"
    res = census_of((bad, NOT_UTF8), (CONTROL, fixture_bytes("control.test.ts")))
    ctx.check("a test file that is not valid UTF-8 prints no row; the pair in another file prints",
              res.rows == [CTRL], [CTRL], res.rows, res)
    exp = ({"tests": "2", "unparsed": "2"}, True)
    got = (pkg(res, "client"), warned(res, bad))
    ctx.check("the non-UTF-8 file is unlexable: its 2 test lines count unparsed and it is named on stderr",
              got == exp, exp, got, res)

    iv = "client/src/ui/itVar.test.ts"
    res = census_of((iv, fixture_bytes("a8_itVar.test.ts")))
    exp = ([D(iv, "helper > reads a key again", "helper > reads a key")], {"tests": "2", "unparsed": "0"})
    got = (res.rows, pkg(res, "client"))
    ctx.check("a file-level variable named it adds nothing to unparsed; the twin pair prints",
              got == exp, exp, got, res)


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
    a9_refusals(ctx)


def a9_refusals(ctx):
    repo = Repo()
    repo.fixture(KEPT, "a9_kept_v1.test.ts")
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    mem = new_mem()
    kpath = os.path.join(mem, "mr-prune-keep.json")
    r = keep(repo, sha, mem, KEPT, KEPT_S2, REASON)
    want = "PRUNE-KEEP-FAIL not-a-candidate"
    ctx.check("keep refuses a test with no earlier twin: not-a-candidate, exit 1, no keep file written",
              r.rc == 1 and r.first == want and not os.path.exists(kpath), want, (r.first, os.path.exists(kpath)), r)
    r = keep(repo, sha, mem, KEPT, "stack > no such test", REASON)
    want = "PRUNE-KEEP-FAIL missing"
    ctx.check("keep refuses an absent test name: missing, exit 1, no keep file written",
              r.rc == 1 and r.first == want and not os.path.exists(kpath), want, (r.first, os.path.exists(kpath)), r)
    corrupt = b"not json\n"
    with open(kpath, "wb") as f:
        f.write(corrupt)
    r = keep(repo, sha, mem, KEPT, KEPT_T, REASON)
    want = "PRUNE-KEEP-FAIL keep-file-unreadable"
    after = read_bytes(kpath)
    ctx.check("keep refuses an unreadable keep file: keep-file-unreadable, exit 1, the file byte-identical",
              r.rc == 1 and r.first == want and after == corrupt, (want, corrupt), (r.first, after), r)
    r = census(repo, sha, mem)
    ctx.check("census with an unreadable keep file exits 0, prints the candidate's row and kept=0",
              r.rc == 0 and D(KEPT, KEPT_T, KEPT_S1) in r.rows and (r.counts or {}).get("kept") == "0",
              (D(KEPT, KEPT_T, KEPT_S1), "kept=0"), (r.rows, r.counts), r)


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

    # keeping a second candidate keeps the first entry
    mem2 = new_mem()
    ka = keep(repo, sha1, mem2, KEPT, KEPT_T, REASON)
    kb = keep(repo, sha1, mem2, CONTROL, CTRL_T, REASON)
    kpath = os.path.join(mem2, "mr-prune-keep.json")
    got = read_json(kpath) if os.path.isfile(kpath) else None
    entries = None
    if isinstance(got, dict) and all(isinstance(v, dict) for v in got.values()):
        entries = sorted((f, n) for f, names in got.items() for n in names)
    exp = sorted([(KEPT, KEPT_T), (CONTROL, CTRL_T)])
    ctx.check("keeping a second candidate leaves the first entry: two entries in the keep file",
              ka.rc == 0 and kb.rc == 0 and entries == exp, exp, (ka.first, kb.first, got), kb)
    r = census(repo, sha1, mem2)
    exp_c = counts(0, 0, 0, 2, 0)
    ctx.check("both kept candidates are omitted and counted (kept=2)",
              r.rows == [] and r.counts == exp_c, ([], exp_c), (r.rows, r.counts), r)


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

    st = "client/src/ui/sameTitle.test.ts"
    repo = Repo()
    repo.fixture(st, "a11_sameTitle.test.ts")
    sha = repo.commit()
    mem = new_mem()
    res = census(repo, sha, mem)
    exp = [D(st, "menu > opens #2", "menu > opens")]
    ctx.check("a repeated title gets ' #2': the row names 'menu > opens #2' as candidate of 'menu > opens'",
              res.rows == exp, exp, res.rows, res)
    r = twin(repo, sha, mem, st, "menu > opens #2", "menu > opens")
    ctx.check("twin confirms the pair by its ' #2' name: PRUNE-TWIN-OK, exit 0",
              r.rc == 0 and r.first == "PRUNE-TWIN-OK", "PRUNE-TWIN-OK", r.first, r)


def tp1_a12(ctx):
    rules = "client/src/ui/rules.test.ts"
    repo = Repo()
    repo.fixture(rules, "a12_rules.test.ts")
    repo.fixture(BRK, "a8_broken.test.ts")
    repo.put("client/src/main.ts", ts_lines(3))
    sha = repo.commit()
    mem = new_mem()
    f1, f2 = "rules > first > ", "rules > second > "
    for name, path, t, s, expect in (
        ("a file absent at the commit fails as missing", "client/src/ui/absent.test.ts",
         f1 + "base copy", f1 + "base", "missing"),
        ("a file present at the commit but not an eligible test file fails as missing", "client/src/main.ts",
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

    r = run_tool("census", "--repo", os.path.join(repo.path, "client"), "--at", sha2, "--mem", new_mem())
    ctx.check("a --repo that is a subdirectory of the work tree is refused: exit 2, PRUNE-ERROR, no PRUNE-CENSUS",
              refused(r), "exit 2 + PRUNE-ERROR", r.first, r)
    r = run_tool("census", "--repo", repo.path, "--at", "no-such-ref", "--mem", new_mem())
    ctx.check("an --at that names no commit is refused: exit 2, PRUNE-ERROR, no PRUNE-CENSUS",
              refused(r), "exit 2 + PRUNE-ERROR", r.first, r)


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

    inside = os.path.join(repo.path, "memdir")
    os.makedirs(inside)
    before = snapshot(repo)
    r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", inside, "--record", "x")
    after = snapshot(repo)
    ctx.check("--record with a --mem inside --repo is refused: exit 2, PRUNE-ERROR, nothing written in the repo",
              refused(r) and os.listdir(inside) == [] and after == before,
              "exit 2 + PRUNE-ERROR, memdir empty, repo unchanged", (r.rc, os.listdir(inside), after == before), r)
    target = os.path.join(repo.path, "linked")
    os.makedirs(target)
    outside = new_mem()
    os.symlink(target, os.path.join(outside, "prune"))
    before = snapshot(repo)
    r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", outside, "--record", "x")
    after = snapshot(repo)
    ctx.check("--record whose prune/ is a symlink into --repo is refused: exit 2, PRUNE-ERROR, nothing created in the repo",
              refused(r) and os.listdir(target) == [] and after == before,
              "exit 2 + PRUNE-ERROR, linked dir empty, repo unchanged", (r.rc, os.listdir(target), after == before), r)


# --------------------------------------------------------------------------------------------
# TP2 helpers
# --------------------------------------------------------------------------------------------


def pad(s):
    """20 trailing comment lines: a test file added in one commit is then over the 12-line churn
    bound, so only the commits a fixture means to count are counted."""
    return s + "".join("// pad %d\n" % i for i in range(20))


def commit_files(repo, files, msg="fixture"):
    for rel, data in files.items():
        repo.put(rel, data)
    return repo.commit(msg)


def O(path, sym, tests, test_only=False):
    return (path, sym, test_only, tuple(sorted(tests)))


def OP(path, sym, tests, token, test_only=False):
    return O(path, sym, tests, test_only) + (token,)


def S(path, st=False, churn=None, widened=None):
    return (path, st, churn, widened)


def sset(rows):
    return sorted(rows, key=repr)


def order_ok(rows):
    keys = [(r[0], r[1]) for r in rows]
    return keys == sorted(keys)


def clean(ctx, res):
    ctx.check("every orphans/signals/literal-variants/protected-churn line is in the contract format",
              res.bad == [], [], res.bad, res)


def prefixes(res):
    out = []
    for line in res.out.splitlines():
        p = line.split(" ", 1)[0]
        if not out or out[-1] != p:
            out.append(p)
    return out


def ts_pair(tag, extra=""):
    return ("describe('%s', () => {\n  it('one', () => {\n    expect(run('%s')).toBe(1);\n  });\n\n"
            "  it('one again', () => {\n    expect(run('%s')).toBe(1);\n  });\n%s});\n") % (tag, tag, tag, extra)


def rs_pair(tag, extra=""):
    return ("#[test]\nfn %s_a() {\n    assert_eq!(run(\"%s\"), 1);\n}\n\n"
            "#[test]\nfn %s_b() {\n    assert_eq!(run(\"%s\"), 1);\n}\n%s") % (tag, tag, tag, tag, extra)


def ts_marked(marker, extra=()):
    lines = ["describe('m', () => {", "  it('one', () => {", "    expect(1).toBe(1);", "  });"]
    lines += ["  // filler %d" % i for i in range(20)]
    lines += ["  // marker " + marker, "});"] + list(extra)
    return "\n".join(lines) + "\n"


def rs_marked(marker, extra=()):
    lines = ["#[test]", "fn one() {", "    assert_eq!(1, 1);", "}"]
    lines += ["// filler %d" % i for i in range(20)]
    lines += ["// marker " + marker] + list(extra)
    return "\n".join(lines) + "\n"


def it_(name, body, kind="it"):
    return "  %s('%s', () => {\n    %s\n  });\n" % (kind, name, body)


LV_EXTRA = it_("lv1", "expect(calc(1)).toBe('a');") + it_("lv2", "expect(calc(2)).toBe('b');")
READ_EXTRA = ("  it('reads', () => {\n    const t = readFileSync('x', 'utf8');\n"
              "    expect(t).toBe('');\n  });\n")


# --------------------------------------------------------------------------------------------
# TP2 fixtures
# --------------------------------------------------------------------------------------------


def tp2_a1(ctx):
    OB, OT, OI = "game-core/src/battle/orph.rs", "game-core/src/battle/orph_tests.rs", "game-core/tests/orph_it.rs"
    TM, TT = "client/src/ui/orphModel.ts", "client/src/ui/orphModel.test.ts"
    repo = Repo()
    repo.put("game-core/src/battle/mod.rs", "pub mod orph;\npub mod user;\npub use orph::{rehomed};\n")
    repo.put(OB, "pub fn solo_orphan() -> u32 { 1 }\npub fn called_prod() -> u32 { 2 }\n"
                 "pub fn comment_only() -> u32 { 3 }\npub fn rehomed() -> u32 { 4 }\n"
                 "pub fn chain_b() -> u32 { 5 }\npub fn chain_a() -> u32 { chain_b() + 1 }\n"
                 "pub fn dead_b() -> u32 { 6 }\npub fn dead_a() -> u32 { dead_b() + 1 }\n"
                 "pub(crate) fn crate_orphan() -> u32 { 7 }\npub const ORPHAN_CONST: u32 = 8;\n"
                 "pub struct OrphanShape;\n")
    repo.put("game-core/src/battle/user.rs",
             "use super::orph::{called_prod, chain_a, rehomed};\n\n"
             "// comment_only is deliberately not called here\n/* comment_only, again, in a block comment */\n"
             "/// rehomed is named in a doc comment too\n#[spacetimedb::reducer]\n"
             "pub fn run_all() -> u32 {\n    called_prod() + chain_a()\n}\n")
    repo.put(OT, "use super::*;\n\n#[test]\nfn names_them() {\n    assert_eq!(solo_orphan(), 1);\n"
                 "    assert_eq!(comment_only(), 3);\n    assert_eq!(rehomed(), 4);\n    assert_eq!(chain_b(), 5);\n"
                 "    assert_eq!(dead_a() + dead_b(), 15);\n    assert_eq!(crate_orphan(), 7);\n"
                 "    assert_eq!(ORPHAN_CONST, 8);\n    let _ = OrphanShape;\n}\n")
    repo.put(OI, "#[test]\nfn it_names() {\n    assert_eq!(solo_orphan(), 1);\n}\n")
    repo.put(TM, "export function tsOrphan(): number { return 1; }\nexport function tsCalled(): number { return 2; }\n"
                 "export function tsReexp(): number { return 3; }\nexport function tsCommentOnly(): number { return 5; }\n"
                 "export const TS_CONST = 4;\nexport function tsChainB(): number { return 1; }\n"
                 "export function tsChainA(): number { return tsChainB(); }\n"
                 "export function tsDeadB(): number { return 1; }\n"
                 "export function tsDeadA(): number { return tsDeadB(); }\n")
    repo.put("client/src/ui/orphUser.ts",
             "import { tsCalled, tsReexp, tsOrphan, tsChainA } from './orphModel';\n"
             "export { tsReexp } from './orphModel';\n// tsCommentOnly is not called here\n"
             "/* tsCommentOnly either */\nconsole.log(tsCalled(), tsChainA());\n")
    repo.put(TT, "import { tsOrphan, tsReexp, tsCommentOnly, TS_CONST, tsDeadA, tsDeadB, tsChainB } from './orphModel';\n"
                 "describe('orphModel', () => {\n  it('names them', () => {\n    expect(tsOrphan()).toBe(1);\n"
                 "    expect(tsReexp()).toBe(3);\n    expect(tsCommentOnly()).toBe(5);\n    expect(TS_CONST).toBe(4);\n"
                 "    expect(tsDeadA() + tsDeadB() + tsChainB()).toBe(3);\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(OB, "solo_orphan", [OT, OI]), O(OB, "comment_only", [OT]), O(OB, "rehomed", [OT]),
           O(OB, "dead_a", [OT]), O(OB, "dead_b", [OT]), O(OB, "crate_orphan", [OT]),
           O(OB, "ORPHAN_CONST", [OT]), O(OB, "OrphanShape", [OT]),
           O(TM, "tsOrphan", [TT]), O(TM, "tsReexp", [TT]), O(TM, "tsCommentOnly", [TT]),
           O(TM, "TS_CONST", [TT]), O(TM, "tsDeadA", [TT]), O(TM, "tsDeadB", [TT])]
    ctx.check("orphans lists exactly: a pub fn / pub(crate) fn / const / struct and TS exports named by tests only, "
              "names only in comments, `use`/`pub use` and `import`/`export ... from`, and an in-file chain whose head is "
              "an orphan (each with the test files naming it)",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    live = {"called_prod", "chain_a", "chain_b", "run_all", "tsCalled", "tsChainA", "tsChainB"}
    leaked = [r for r in res.orph if r[1] in live]
    ctx.check("a symbol called by a production file, and an in-file chain whose head is called from another file, "
              "are not listed", leaked == [], [], leaked, res)
    both = [r[3] for r in res.orph if r[1] == "solo_orphan"]
    ctx.check("tests= holds every eligible test file naming the symbol, sorted",
              both == [tuple(sorted([OT, OI]))], [tuple(sorted([OT, OI]))], both, res)
    ctx.check("orphans rows are sorted by file, then symbol", order_ok(res.orph), "sorted", res.orph, res)
    ctx.check("no unprotected symbol lands under orphan-protected", res.orph_prot == [], [], res.orph_prot, res)
    clean(ctx, res)
    a1_regressions(ctx)


def a1_regressions(ctx):
    """False positives of the name match (each symbol below is named, one way or another, by
    production code) beside symbols that must stay listed."""
    R = "game-core/src/reg/"
    RT, TT = R + "reg_tests.rs", "client/src/reg/reg.test.ts"
    repo = Repo()
    # (l) look-alike that stays listed: only a `pub use` re-export names it
    repo.put(R + "mod.rs", "pub use resolve::{resolve_turn};\n")
    repo.put(R + "resolve.rs", "pub fn resolve_turn() -> u32 { 1 }\n")
    # (a) aliased imports, Rust and TS
    repo.put(R + "thing.rs", "pub fn thing_fn() -> u32 { 1 }\n")
    repo.put(R + "alias_user.rs", "use crate::reg::thing::thing_fn as renamed;\n\n#[spacetimedb::reducer]\n"
                                  "pub fn alias_entry() -> u32 {\n    renamed()\n}\n")
    repo.put("client/src/reg/a.ts", "export function foo(): number { return 1; }\n")
    repo.put("client/src/reg/aUser.ts", "import { foo as f2 } from './a';\nconsole.log(f2());\n")
    # (b) glob import of an enum's variants
    repo.put(R + "k.rs", "pub enum Kind {\n    Fire,\n    Water,\n}\n")
    repo.put(R + "k_user.rs", "use crate::reg::k::Kind::*;\n\n#[spacetimedb::reducer]\npub fn kind_entry() {\n"
                              "    let _x = Fire;\n}\n")
    # (c) raw identifier
    repo.put(R + "m.rs", "pub fn r#type() -> u32 { 1 }\n")
    repo.put(R + "m_user.rs", "#[spacetimedb::reducer]\npub fn raw_entry() -> u32 {\n    crate::reg::m::r#type()\n}\n")
    # (d) fn main is an entry point
    repo.put("server-module/src/main.rs", "pub fn main_helper() -> u32 { 1 }\n\nfn main() {\n    main_helper();\n}\n")
    # (e) a top-level initializer runs at load
    repo.put("client/src/reg/overlay.ts", "export function installOverlay(): number { return 1; }\n"
                                          "const installed = installOverlay();\n")
    # (f) a file without semicolons; `unused` is the control that stays listed
    repo.put("client/src/reg/handler.ts", "export class Handler {}\nexport const unused = 1\nregister(Handler)\n")
    # (g) a keyword-named property followed by division
    repo.put("client/src/reg/stats.ts", "export const total = 10;\n")
    repo.put("client/src/reg/statsUser.ts", "const stats = { of: 4 };\nconsole.log(stats.of / total / 2);\n")
    # (h) compile-time assert
    repo.put(R + "len.rs", "pub const LEN: usize = 4;\nconst _: () = assert!(LEN == 4);\n")
    # (i) extension trait on a primitive
    repo.put(R + "ext.rs", "pub trait Ext {\n    fn double(&self) -> String;\n}\n\nimpl Ext for str {\n"
                           "    fn double(&self) -> String {\n        format!(\"{}{}\", self, self)\n    }\n}\n")
    # (j) an entry point's callee in the same file
    repo.put(R + "entry.rs", "#[spacetimedb::reducer]\npub fn reducer_one() {\n    inner_g()\n}\n\npub fn inner_g() {}\n")
    # (k) impl liveness follows the self type
    repo.put(R + "s_live.rs", "pub struct SLive;\n\nimpl SLive {\n    pub fn m() -> u32 {\n        helper_live()\n"
                              "    }\n}\n\npub fn helper_live() -> u32 { 1 }\n")
    repo.put(R + "s_user.rs", "#[spacetimedb::reducer]\npub fn s_entry() {\n    let _s = SLive;\n}\n")
    repo.put(R + "s_dead.rs", "pub struct SDead;\n\nimpl SDead {\n    pub fn m() -> u32 {\n        helper_dead()\n"
                              "    }\n}\n\npub fn helper_dead() -> u32 { 1 }\n")
    # one row per symbol: a TS overload
    repo.put("client/src/reg/over.ts", "export function overloaded(a: string): void;\nexport function overloaded(a: any) {}\n")
    repo.put(RT, "#[test]\nfn names_reg() {\n    let _ = SDead;\n    helper_dead();\n    resolve_turn();\n}\n")
    repo.put(TT, "describe('reg', () => {\n  it('x', () => {\n    expect(unused).toBe(1);\n"
                 "    overloaded('a');\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(R + "s_dead.rs", "SDead", [RT]), O(R + "s_dead.rs", "helper_dead", [RT]),
           O(R + "resolve.rs", "resolve_turn", [RT]), O("client/src/reg/handler.ts", "unused", [TT]),
           O("client/src/reg/over.ts", "overloaded", [TT])]
    ctx.check("control: the re-exported symbol, the impl of a self type nothing names (with its callee), the semicolon-less "
              "`unused` and the TS overload are listed, and nothing else is",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    listed = [r[1] for r in res.orph]
    for label, names in (
        ("an aliased import (Rust `use X as Y`, TS `import { X as Y }`) names X", ["thing_fn", "foo"]),
        ("a glob import `use path::Kind::*;` names Kind", ["Kind"]),
        ("a raw identifier r#type called through a path counts as a reference, under either spelling", ["r#type", "type"]),
        ("fn main calls its same-file helper", ["main_helper"]),
        ("a top-level TS initializer runs at load and keeps installOverlay alive", ["installOverlay", "installed"]),
        ("an ASI file's `register(Handler)` statement keeps Handler alive", ["Handler"]),
        ("`stats.of / total / 2` is a division naming total, not a regex", ["total"]),
        ("`const _: () = assert!(LEN == 4)` keeps LEN alive", ["LEN"]),
        ("an impl for a primitive keeps its trait alive", ["Ext"]),
        ("a reducer's same-file callee is live", ["reducer_one", "inner_g"]),
        ("an impl is live when its self type is named elsewhere: its type and its method's callee are not listed",
         ["SLive", "helper_live"]),
    ):
        hit = [n for n in names if n in listed]
        ctx.check(label, hit == [], [], hit, res)
    n_over = [r for r in res.orph if r[1] == "overloaded"]
    ctx.check("a TS overload set gives exactly one orphans row", len(n_over) == 1, 1, n_over, res)
    clean(ctx, res)


def tp2_a2(ctx):
    CB = "game-core/src/calc/core.rs"
    CT, YT = "game-core/src/calc/core_tests.rs", "game-core/tests/y.rs"
    repo = Repo()
    repo.put(CB, "pub fn only_inline() -> u32 { 1 }\npub fn only_bench() -> u32 { 2 }\npub fn only_it() -> u32 { 3 }\n"
                 "pub fn only_unit() -> u32 { 4 }\npub fn real_used() -> u32 { 5 }\n\n#[cfg(test)]\nmod tests {\n"
                 "    use super::*;\n\n    #[test]\n    fn t() {\n        assert_eq!(only_inline(), 1);\n    }\n}\n")
    repo.put("game-core/src/calc/entry.rs", "#[spacetimedb::reducer]\npub fn entry() -> u32 {\n    real_used()\n}\n")
    repo.put("game-core/benches/x.rs", "fn bench() {\n    only_bench();\n}\n")
    repo.put(YT, "#[test]\nfn y() {\n    assert_eq!(only_it(), 3);\n}\n")
    repo.put(CT, "#[test]\nfn u() {\n    assert_eq!(only_unit(), 4);\n}\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(CB, "only_inline", []), O(CB, "only_bench", []), O(CB, "only_it", [YT]), O(CB, "only_unit", [CT])]
    ctx.check("a symbol named only in an inline cfg(test) mod, in benches/, in game-core/tests/*.rs or in a *_tests.rs "
              "is listed (benches and inline mods are not test files: tests=[]); the one a production file calls is not",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a3(ctx):
    SY, ST = "game-core/src/m/sym.rs", "game-core/src/m/sym_tests.rs"
    HK, HT = "client/src/ui/hooks.ts", "client/src/ui/hooks.test.ts"
    repo = Repo()
    repo.put(SY, "".join("pub fn %s() {}\n" % n for n in
                         ("in_e2e", "in_eval", "in_wasm", "in_sim", "in_html", "in_test_only", "in_notes_md")))
    repo.put(HK, "export function tsE2e() {}\nexport function tsEval() {}\nexport function tsTestOnly() {}\n")
    repo.put("client/e2e/hook.spec.ts", "test('x', async () => {\n  tsE2e();\n  in_e2e();\n});\n")
    repo.put("evals/b.eval.mjs", "tsEval();\nin_eval();\n")
    repo.put("client-wasm/src/lib.rs", "pub fn w() {\n    in_wasm();\n}\n")
    repo.put("sim-harness/src/main.rs", "fn main() {\n    in_sim();\n}\n")
    repo.put("client/index.html", "<script>in_html();</script>\n")
    repo.put("docs/notes.md", "in_notes_md is mentioned here\n")
    repo.put(ST, "#[test]\nfn s() {\n    in_test_only();\n    in_notes_md();\n}\n")
    repo.put(HT, "describe('h', () => {\n  it('x', () => {\n    expect(tsTestOnly()).toBe(undefined);\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(SY, "in_test_only", [ST]), O(SY, "in_notes_md", [ST]), O(HK, "tsTestOnly", [HT])]
    ctx.check("symbols named in client/e2e, evals, client-wasm, sim-harness or HTML are not listed; one named only by a "
              "test file, and one named only in a .md file, are",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a4(ctx):
    AB, AT = "game-core/src/attrs/a.rs", "game-core/src/attrs/a_tests.rs"
    names = ["reducer_fn", "wasm_fn", "tracked_fn", "TableRow", "doc_fn", "inline_fn", "must_fn", "allow_fn",
             "DeriveStruct", "CfgAttrStruct", "stacked_fn"]
    repo = Repo()
    repo.put(AB, "#[spacetimedb::reducer]\npub fn reducer_fn() {}\n\n#[wasm_bindgen]\npub fn wasm_fn() {}\n\n"
                 "#[track_caller]\npub fn tracked_fn() {}\n\n#[spacetimedb::table(name = t)]\npub struct TableRow {\n"
                 "    pub id: u32,\n}\n\n/// documented\npub fn doc_fn() {}\n\n#[inline]\npub fn inline_fn() {}\n\n"
                 "#[must_use]\npub fn must_fn() -> u32 { 1 }\n\n#[allow(dead_code)]\npub fn allow_fn() {}\n\n"
                 "#[derive(Debug, Clone)]\npub struct DeriveStruct;\n\n"
                 "#[cfg_attr(feature = \"x\", derive(Debug))]\npub struct CfgAttrStruct;\n\n"
                 "#[inline]\n#[must_use]\npub fn stacked_fn() -> u32 { 2 }\n")
    repo.put(AT, "#[test]\nfn names_all() {\n" + "".join("    let _ = %s;\n" % n for n in names) + "}\n")
    res = census(repo, repo.commit(), new_mem())
    listed = ["doc_fn", "inline_fn", "must_fn", "allow_fn", "DeriveStruct", "CfgAttrStruct", "stacked_fn"]
    exp = [O(AB, n, [AT]) for n in listed]
    ctx.check("items with only doc/inline/must_use/allow/derive/cfg_attr attributes are listed; reducer, table, "
              "wasm_bindgen and track_caller items are entry points and are not",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a5(ctx):
    PB, PT = "game-core/src/t/prod.rs", "game-core/src/t/prod_tests.rs"
    repo = Repo()
    repo.put(PB, "#[cfg(test)]\npub fn helper_only() -> u32 { 1 }\n\npub fn plain_orphan() -> u32 { 2 }\n\n"
                 "#[cfg(test)]\nfn inner_helper() {}\n\npub fn target_of_testonly() -> u32 { 3 }\n\n"
                 "#[cfg(test)]\npub fn caller_t() {\n    target_of_testonly();\n}\n\n"
                 "#[cfg(test)]\nmod inside {\n    pub fn in_mod_helper() {}\n}\n\n#[cfg(test)]\nmod x_tests;\n")
    repo.put(PT, "#[test]\nfn names() {\n    helper_only();\n    plain_orphan();\n    inner_helper();\n"
                 "    target_of_testonly();\n    caller_t();\n    in_mod_helper();\n}\n")
    res = census(repo, repo.commit(), new_mem())
    exp = [O(PB, "helper_only", [PT], True), O(PB, "inner_helper", [PT], True), O(PB, "caller_t", [PT], True),
           O(PB, "plain_orphan", [PT]), O(PB, "target_of_testonly", [PT])]
    ctx.check("a cfg(test) item outside a test mod (any visibility) carries test-only; a plain orphan does not; a symbol "
              "named only by a cfg(test) item is still an ordinary orphan; an item inside a cfg(test) mod is not listed",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    decl = [r for r in res.orph if r[1] == "x_tests"]
    ctx.check("a `#[cfg(test)] mod x_tests;` declaration is not an item to list (no row for x_tests), while the cfg(test) fns beside it are",
              decl == [] and len(res.orph) == 5, "no x_tests row", decl, res)
    clean(ctx, res)


def tp2_a6(ctx):
    OK_, OKT = "game-core/src/ok.rs", "game-core/src/ok_tests.rs"
    PV, PVT = "server-module/src/privacy.rs", "server-module/src/privacy_tests.rs"
    IH, IHT = "client/src/ui/i18nHelper.ts", "client/src/ui/i18nHelper.test.ts"
    PL, PLT = "client/src/ui/plainHelper.ts", "client/src/ui/plainHelper.test.ts"
    repo = Repo()
    repo.put(OK_, "pub fn plain_one() {}\npub fn guard_x() {}\npub fn auth_guard() {}\npub fn Hidden_stuff() {}\n")
    repo.put(OKT, "#[test]\nfn n() {\n    plain_one();\n    guard_x();\n    auth_guard();\n    Hidden_stuff();\n}\n")
    repo.put(PV, "pub fn plain_name_fn() {}\npub fn claim_it() {}\n")
    repo.put(PVT, "#[test]\nfn n() {\n    plain_name_fn();\n    claim_it();\n}\n")
    repo.put(IH, "export function fmt(): number { return 1; }\n")
    repo.put(IHT, "describe('i', () => {\n  it('x', () => {\n    expect(fmt()).toBe(1);\n  });\n});\n")
    repo.put(PL, "export function tsPlain(): number { return 1; }\n")
    repo.put(PLT, "describe('p', () => {\n  it('x', () => {\n    expect(tsPlain()).toBe(1);\n  });\n});\n")
    res = census(repo, repo.commit(), new_mem())
    exp_p = [OP(PV, "plain_name_fn", [PVT], "priv"), OP(PV, "claim_it", [PVT], "priv"),
             OP(OK_, "guard_x", [OKT], "guard"), OP(OK_, "auth_guard", [OKT], "auth"),
             OP(OK_, "Hidden_stuff", [OKT], "hidden"), OP(IH, "fmt", [IHT], "i18n")]
    ctx.check("a protected token in the defining path (priv, i18n) or in the symbol name (guard, hidden, case-insensitive) "
              "moves the orphan to orphan-protected; token= is the first of the tool's list that matches (priv before "
              "claim, auth before guard)",
              sset(res.orph_prot) == sset(exp_p), sset(exp_p), sset(res.orph_prot), res)
    exp = [O(OK_, "plain_one", [OKT]), O(PL, "tsPlain", [PLT])]
    ctx.check("unprotected orphans stay under orphans and a protected one is not repeated there",
              sset(res.orph) == sset(exp), sset(exp), sset(res.orph), res)
    clean(ctx, res)


def tp2_a7(ctx):
    pos = [("client/src/ui/s1.test.ts", pad("describe('s', () => {\n  it('x', () => {\n    const t = readFileSync('a.ts', 'utf8');\n"
                                            "    expect(t).toBe('');\n  });\n});\n")),
           ("client/src/ui/s2.test.ts", pad("describe('s', () => {\n  it('x', async () => {\n    const t = await readFile('a.ts');\n"
                                            "    expect(t).toBe('');\n  });\n});\n")),
           ("game-core/src/s3_tests.rs", pad("#[test]\nfn s3() {\n    let t = include_str!(\"lib.rs\");\n    assert!(t.len() > 0);\n}\n")),
           ("server-module/src/s4_tests.rs", pad("#[test]\nfn s4() {\n    let t = std::fs::read_to_string(\"a.rs\").unwrap();\n"
                                                 "    assert!(t.len() > 0);\n}\n"))]
    neg = [("client/src/ui/n1.test.ts", pad("// readFileSync is not called\n/* readFile neither */\n"
                                            "describe('n', () => {\n  it('x', () => {\n    expect('readFileSync').toBe(`readFile`);\n  });\n});\n")),
           ("game-core/src/n2_tests.rs", pad("// include_str!(\"x\") in a comment\n/// read_to_string in a doc comment\n#[test]\nfn n2() {\n"
                                             "    let s = \"read_to_string and include_str\";\n    assert!(s.len() > 0);\n}\n")),
           ("client/src/ui/n3.test.ts", pad("describe('n', () => {\n  it('x', () => {\n    expect(readFileSyncish()).toBe(1);\n"
                                            "    expect(myreadFile()).toBe(1);\n    expect(readFileAsync()).toBe(1);\n  });\n});\n")),
           ("game-core/src/n4_tests.rs", pad("#[test]\nfn n4() {\n    read_to_string_lossy();\n    include_str_x();\n}\n")),
           # not eligible test files
           ("client/e2e/x.spec.ts", pad("test('x', async () => {\n  readFileSync('a');\n});\n")),
           ("client/src/ui/loader.ts", pad("export const loaded = readFileSync('a');\n"))]
    repo = Repo()
    for rel, data in pos + neg:
        repo.put(rel, data)
    res = census(repo, repo.commit(), new_mem())
    exp = [S(rel, st=True) for rel, _ in pos]
    ctx.check("a test file calling include_str!, read_to_string, readFileSync or readFile is printed under signals as "
              "source-text (and no other signal); a word only in a comment or a string, a look-alike identifier, an e2e "
              "spec and a product file print nothing",
              sset(res.sig) == sset(exp), sset(exp), sset(res.sig), res)
    clean(ctx, res)
    a7_nonutf8_path(ctx)


def a7_nonutf8_path(ctx):
    LP, LT = "client/src/ui/lonely.ts", "client/src/ui/lonely.test.ts"
    body = "describe('l', () => {\n  it('x', () => {\n    expect(lonelyFn()).toBe(1);\n  });\n});\n"
    repo = Repo()
    repo.put(LP, "export function lonelyFn(): number { return 1; }\n")
    repo.put(LT, body)
    bad = os.path.join(os.fsencode(repo.path), b"client/src/ui", b"\xff.test.ts")
    with open(bad, "wb") as f:
        f.write(body.encode("utf-8"))
    res = census(repo, repo.commit(), new_mem())
    rows = [r for r in res.orph if r[1] == "lonelyFn"]
    ctx.check("a tracked test file whose path is not UTF-8 does not break the census: exit 0, the orphan row prints with a valid "
              "tests= JSON array naming both test files",
              res.rc == 0 and len(rows) == 1 and len(rows[0][3]) == 2 and LT in rows[0][3] and res.bad == [],
              "exit 0, one lonelyFn row, 2 tests, parseable", (res.rc, rows, res.bad), res)


def ts_hist_repo():
    """The A8 history; returns (repo, sha)."""
    HT, HS = "client/src/ui/hist.test.ts", "client/src/ui/hist.ts"
    RT, RS = "game-core/src/h/hist_tests.rs", "game-core/src/h/hist.rs"
    OTH, OTD = "client/src/ui/other.test.ts", "client/src/other.ts"
    QT = "client/src/ui/quiet.test.ts"
    repo = Repo()
    commit_files(repo, {HT: ts_marked("m0"), HS: "export const h = 0;\n", RT: rs_marked("r0"), RS: "pub fn h() {}\n",
                        OTH: ts_marked("o0"), OTD: "export const o = 0;\n", QT: ts_marked("q0")}, "base")
    for k in (1, 2, 3):
        commit_files(repo, {HT: ts_marked("m%d" % k)}, "small %d" % k)                      # counted x3
    commit_files(repo, {HT: ts_marked("m4"), HS: "export const h = 1;\n"}, "with subject")  # subject changed
    e13 = ["// x%d" % i for i in range(13)]
    commit_files(repo, {HT: ts_marked("m4", e13)}, "13 added")                              # not counted
    t12 = ["// y%d" % i for i in range(12)]
    commit_files(repo, {HT: ts_marked("m4", e13 + t12)}, "12 added")                        # counted
    commit_files(repo, {HT: ts_marked("m4", e13 + t12[:5] + ["// z%d" % i for i in range(6)])},
                 "7 deleted 6 added")                                                       # 13: not counted
    commit_files(repo, {HT: ts_marked("m4", e13 + t12[:5] + ["// w%d" % i for i in range(6)])},
                 "6 deleted 6 added")                                                       # 12: counted
    commit_files(repo, {RT: rs_marked("r1")}, "rs small 1")
    commit_files(repo, {RT: rs_marked("r2")}, "rs small 2")
    commit_files(repo, {RT: rs_marked("r3"), RS: "pub fn h() { }\n"}, "rs with subject")
    commit_files(repo, {OTH: ts_marked("o1")}, "other small 1")
    commit_files(repo, {OTH: ts_marked("o2"), OTD: "export const o = 1;\n"}, "other, subject elsewhere")
    commit_files(repo, {QT: ts_marked("q0", ["// q%d" % i for i in range(30)])}, "quiet, big")
    return repo, repo.commit("tip")


def fast_import(repo, commits):
    """Append (message, {path: bytes}) commits, oldest first, to main with one git fast-import."""
    parts = []
    for n, (msg, files) in enumerate(commits):
        m = msg.encode("utf-8")
        parts.append(b"commit refs/heads/main\ncommitter Fixture <fixture@example.invalid> 1767225600 +0000\n")
        parts.append(b"data %d\n%s\n" % (len(m), m))
        if n == 0:
            parts.append(b"from refs/heads/main^0\n")
        for path, data in files.items():
            parts.append(b"M 100644 inline %s\ndata %d\n%s\n" % (path.encode("utf-8"), len(data), data))
        parts.append(b"\n")
    p = subprocess.run(["git", "fast-import", "--quiet"], cwd=repo.path, env=git_env(), input=b"".join(parts),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if p.returncode != 0:
        raise RuntimeError("fixture git fast-import failed: " + p.stderr.decode("utf-8", "replace"))
    git(repo.path, "reset", "-q", "--hard", "HEAD")


def tp2_a8(ctx):
    HT = "client/src/ui/hist.test.ts"
    RT = "game-core/src/h/hist_tests.rs"
    OTH = "client/src/ui/other.test.ts"
    repo, sha = ts_hist_repo()
    mem = new_mem()
    before = snapshot(repo)
    res = census(repo, sha, mem)
    after = snapshot(repo)
    exp = [S(HT, churn=5), S(RT, churn=2), S(OTH, churn=2)]
    ctx.check("churn counts the commits that changed the test file by 12 lines or fewer without its subject: "
              "hist.test.ts 5 (3 small, one of exactly 12 added, one of 6 deleted + 6 added; not the commit that also "
              "changed hist.ts, not 13 added, not 7 deleted + 6 added); Rust hist_tests.rs 2 (subject hist.rs); "
              "other.test.ts 2 (a same-stem file in ANOTHER dir is not its subject); a file with only a big change prints nothing",
              sset(res.sig) == sset(exp), sset(exp), sset(res.sig), res)
    ctx.check("unprotected churned files print no protected-churn row", res.pchurn == [], [], res.pchurn, res)
    ctx.check("census leaves the worktree, index and refs unchanged (history is read, never altered)",
              after == before, before, after, res)
    clean(ctx, res)

    # paths that need quoting in git output
    QP, BP, NP = 'client/src/ui/q"uote.test.ts', "client/src/ui/b\\slash.test.ts", "client/src/ui/plainq.test.ts"
    qrepo = Repo()
    commit_files(qrepo, {QP: ts_marked("a"), BP: ts_marked("a"), NP: ts_marked("a")}, "base")
    for k in ("b", "c"):
        sha_q = commit_files(qrepo, {QP: ts_marked(k), BP: ts_marked(k)}, "quoted %s" % k)
        sha_q = commit_files(qrepo, {NP: ts_marked(k)}, "plain %s" % k)
    r = census(qrepo, sha_q, new_mem())
    exp_q = [S(QP, churn=2), S(BP, churn=2), S(NP, churn=2)]
    ctx.check("a test file whose path holds a double quote or a backslash gets churn counted like a plain one (2 each)",
              sset(r.sig) == sset(exp_q), sset(exp_q), sset(r.sig), r)

    # the 300-commit window: 303 commits, the 3 newest of 5 small commits are inside it
    WT = "client/src/ui/win.test.ts"
    wrepo = Repo()
    wrepo.put(WT, ts_marked("s0"))
    wrepo.commit("base")
    commits = [("small %d" % k, {WT: ts_marked("s%d" % k).encode("utf-8")}) for k in range(1, 6)]
    commits += [("filler %d" % i, {"notes.txt": ("n%d\n" % i).encode("utf-8")}) for i in range(297)]
    fast_import(wrepo, commits)
    head = git(wrepo.path, "rev-parse", "HEAD").strip()
    total = git(wrepo.path, "rev-list", "--count", "HEAD").strip()
    r = census(wrepo, head, new_mem())
    ctx.check("churn reads only the newest 300 commits of the ref (fixture history has %s): 3 of the 5 small commits" % total,
              total == "303" and sset(r.sig) == [S(WT, churn=3)], [S(WT, churn=3)], (total, r.sig), r)


def tp2_a9(ctx):
    CAT = "client/src/ui/i18n/catalog.test.ts"
    PLN = "client/src/ui/plain.test.ts"
    PRV = "server-module/src/privacy_tests.rs"
    SEC = "client/src/ui/security.test.ts"
    repo = Repo()
    commit_files(repo, {CAT: ts_marked("a"), PLN: ts_marked("a"), PRV: rs_marked("a"),
                        SEC: ts_marked("a", ["const t = readFileSync('x', 'utf8');"])}, "base")
    commit_files(repo, {CAT: ts_marked("b")}, "cat 1")
    commit_files(repo, {PLN: ts_marked("b")}, "plain 1")
    commit_files(repo, {CAT: ts_marked("c")}, "cat 2")
    commit_files(repo, {PLN: ts_marked("c")}, "plain 2")
    sha = commit_files(repo, {PRV: rs_marked("b")}, "privacy 1")
    res = census(repo, sha, new_mem())
    exp_s = [S(CAT, churn=2), S(PLN, churn=2), S(PRV, churn=1), S(SEC, st=True)]
    ctx.check("signals carries churn for the protected and the unprotected churned files, and source-text for a protected-path file with no churn",
              sset(res.sig) == sset(exp_s), sset(exp_s), sset(res.sig), res)
    exp_c = [(CAT, 2, "i18n"), (PRV, 1, "priv")]
    ctx.check("a churned file whose path holds a protected token is also printed under protected-churn with the "
              "churn count and the first matching token; the unprotected churned file and the protected file without churn are not",
              sset(res.pchurn) == sset(exp_c), sset(exp_c), sset(res.pchurn), res)
    clean(ctx, res)


def tp2_a10(ctx):
    LT = "client/src/ui/lit.test.ts"
    LR = "game-core/src/lit/lit_tests.rs"
    ts = ("describe('g1', () => {\n" + it_("a", "expect(f(1)).toBe('x');") + it_("b", "expect(f(2)).toBe('y');")
          + it_("c", "expect(f(3)).toBe('z');") + it_("d", "expect(g(1)).toBe(1);") + it_("e", "expect(g(2)).toBe(2);")
          + it_("t1", "expect(h(1)).toBe(1);") + it_("t2", "expect(h(1)).toBe(1);")
          + it_("i1", "expect(k(1)).toBe(1);") + it_("i2", "expect(m(1)).toBe(1);")
          + it_("q1", "expect(q(2)).toBe(1);") + it_("r1", "expect(r(1)).toBe(1);")
          + it_("r2", "expect(r(2)).toBe(1);", "test")
          + "});\n\ndescribe('g2', () => {\n" + it_("q2", "expect(q(3)).toBe(1);") + "});\n")
    rs = ("#[test]\nfn lit_a() {\n    assert_eq!(calc(1, \"x\"), 'a');\n}\n\n"
          "#[test]\nfn lit_b() {\n    assert_eq!(calc(2, \"y\"), 'b');\n}\n\n"
          "#[test]\n#[ignore]\nfn lit_c() {\n    assert_eq!(calc(3, \"z\"), 'c');\n}\n\n"
          "#[test]\nfn lone() {\n    assert_eq!(other(1), 1);\n}\n")
    repo = Repo()
    repo.put(LT, pad(ts))
    repo.put(LR, pad(rs))
    res = census(repo, repo.commit(), new_mem())
    exp = [(LT, 2), (LR, 1)]
    ctx.check("bodies equal once literals are masked are one group per file: TS a/b/c and d/e (2 groups; exact twins "
              "t1/t2, identifier differences, different declaration forms and different blocks form none); Rust lit_a/lit_b "
              "(1 group; an extra attribute breaks the group)",
              sset(res.lv) == sset(exp), sset(exp), sset(res.lv), res)
    names = ["g1 > a", "g1 > b", "g1 > c", "g1 > d", "g1 > e", "g1 > r1", "g1 > r2", "g1 > q1", "g2 > q2",
             "lit_a", "lit_b", "lit_c"]
    hits = [l for l in res.out.splitlines() if any(n in l for n in names)]
    ctx.check("no row names a literal-variant test, under any section", hits == [], [], hits, res)
    exp_d = [D(LT, "g1 > t2", "g1 > t1")]
    ctx.check("the exact twins stay an ordinary duplicates row, and nothing else prints as a twin",
              res.rows == exp_d, exp_d, res.rows, res)
    clean(ctx, res)


def tp2_a11(ctx):
    W, Z = "client/src/ui/w.test.ts", "client/src/ui/z.test.ts"
    repo = Repo()
    repo.put(W, ts_marked("a"))
    repo.put(Z, ts_marked("a"))
    repo.put("client/src/ui/notatest.ts", "export const n = 1;\n")
    sha = repo.commit()
    mem = new_mem()
    gates = os.path.join(mem, "gates")
    os.makedirs(gates)

    def row(slice_id, path, why="pin"):
        return json.dumps({"ts": "2026-11-01T00:00:00Z", "slice": slice_id, "path": path, "why": why})

    with open(os.path.join(gates, "a-1.widened.jsonl"), "w") as f:
        f.write("\n".join([row("a-1", W), row("a-1", W, "count"), row("a-1", Z), row("a-1", "client/src/ui/notatest.ts"),
                           "{not json", "", json.dumps({"ts": "t", "slice": "a-1", "why": "no path"})]) + "\n")
    with open(os.path.join(gates, "b-2.widened.jsonl"), "w") as f:
        f.write(row("b-2", W) + "\n")
    with open(os.path.join(gates, "c.jsonl"), "w") as f:
        f.write("\n".join(row("c", Z) for _ in range(5)) + "\n")
    res = census(repo, sha, mem)
    exp = [S(W, widened=3), S(Z, widened=1)]
    ctx.check("widened is the number of rows naming the test file across gates/*.widened.jsonl (3 and 1); a row naming a "
              "non-test path, a malformed line, a blank line, a row without a path and a file not named *.widened.jsonl add nothing",
              sset(res.sig) == sset(exp), sset(exp), sset(res.sig), res)
    clean(ctx, res)


def tp2_a12(ctx):
    AA, BB = "client/src/ui/aa.test.ts", "client/src/ui/sub/bb.test.ts"
    AU, CC = "client/src/ui/sub/auth.test.ts", "client/src/render/cc.test.ts"
    DD, EE = "client/src/other/dd.test.ts", "game-core/src/z/ee_tests.rs"
    YT = "game-core/tests/y_it.rs"
    repo = Repo()
    repo.put(AA, pad(ts_pair("aa", READ_EXTRA)))
    repo.put(BB, pad(ts_pair("bb", LV_EXTRA)))
    repo.put(AU, pad(ts_pair("auth")))
    repo.put(CC, pad(ts_pair("cc")))
    repo.put(DD, pad(ts_pair("dd", LV_EXTRA + READ_EXTRA + it_("ghosts", "expect(ghost()).toBe(1);"))))
    repo.put(EE, pad(rs_pair("ee", "#[test]\nfn names_z() {\n    assert_eq!(zorph(), 1);\n}\n")))
    repo.put(YT, pad("#[test]\nfn names_y() {\n    assert_eq!(yorph(), 2);\n}\n"))
    repo.put("game-core/src/z/zz.rs", "pub fn zorph() -> u32 { 1 }\n")
    repo.put("game-core/src/y/yy.rs", "pub fn yorph() -> u32 { 2 }\n")
    repo.put("client/src/other/prod.ts", "export function ghost(): number { return 1; }\n")
    sha = repo.commit()
    mem = new_mem()
    d = tempfile.mkdtemp(prefix="spec-", dir=ROOT)
    spec = os.path.join(d, "x.spec.md")
    em, dot = chr(0x2014), chr(0x00b7)
    with open(spec, "w", encoding="utf-8") as f:
        f.write(("# Test spec\n\n## Slices\n\n### zed-1 EM first slice\ntype: feature DOT tier: routine\n"
                 "touches: client/src/ui/aa.test.ts, client/src/ui/sub/**, `game-core/src/z/`\n\n"
                 "### alp-2 EM second slice\n"
                 "touches: `client/src/ui/*.test.ts`, client/src/render/**, game-core/tests/*.rs\n"
                 "touches: client/src/other/**\n\n"
                 "### nope-3 EM third slice\ntouches: client/src/nomatch/**\n").replace("EM", em).replace("DOT", dot))
    full = census(repo, sha, mem)
    sp = census(repo, sha, mem, "--spec", spec)
    all_dups = {r[1] for r in full.rows if r[0] == "duplicates"}
    ctx.check("control: without --spec every twin file, the orphans, the literal-variants and the signals print (and no slices=)",
              all_dups == {AA, BB, CC, DD, EE} and {r[1] for r in full.rows if r[0] == "protected-twins"} == {AU}
              and {r[0] for r in full.orph} == {"game-core/src/z/zz.rs", "game-core/src/y/yy.rs", "client/src/other/prod.ts"}
              and sorted(r[0] for r in full.lv) == sorted([BB, DD]) and sorted(r[0] for r in full.sig) == sorted([AA, DD])
              and "slices=" not in full.out,
              "all rows, no slices=", (full.rows, full.orph, full.lv, full.sig), full)
    matched_rows = [r for r in full.rows if r[1] != DD]
    ctx.check("--spec prints only the twin rows whose file matches a touches: entry (exact path, `**` across `/`, a backticked "
              "directory with a trailing `/`, `ui/*.test.ts` not crossing into sub/); the unmatched file prints none",
              srt(sp.rows) == srt(matched_rows), srt(matched_rows), srt(sp.rows), sp)
    prod_z, prod_y = "game-core/src/z/zz.rs", "game-core/src/y/yy.rs"
    exp_o = [O(prod_z, "zorph", [EE]), O(prod_y, "yorph", [YT])]
    ctx.check("an orphan row prints when its defining file OR one of its test files matches; one matching neither does not",
              sset(sp.orph) == sset(exp_o), sset(exp_o), sset(sp.orph), sp)
    ctx.check("literal-variants and signals rows follow the same filter",
              sp.lv == [(BB, 1)] and sp.sig == [S(AA, st=True)], ([(BB, 1)], [S(AA, st=True)]), (sp.lv, sp.sig), sp)
    cand = {AA: "aa > one again", BB: "bb > one again", CC: "cc > one again", EE: "ee_b"}
    exp_sl = {("duplicates", AA, cand[AA]): ["zed-1", "alp-2"], ("duplicates", BB, cand[BB]): ["zed-1"],
              ("duplicates", CC, cand[CC]): ["alp-2"], ("duplicates", EE, cand[EE]): ["zed-1"],
              ("protected-twins", AU, "auth > one again"): ["zed-1"],
              ("orphans", prod_z, "zorph"): ["zed-1"], ("orphans", prod_y, "yorph"): ["alp-2"],
              ("literal-variants", BB, ""): ["zed-1"], ("signals", AA, ""): ["zed-1", "alp-2"]}
    ctx.check("every printed row ends with slices= listing each slice id whose touches: matches, in spec order (zed-1 before "
              "alp-2, not alphabetical), using only the FIRST touches: line of a section",
              sp.slices == exp_sl, exp_sl, sp.slices, sp)
    ctx.check("totals, counts and the commit are identical to a run without --spec",
              sp.totals == full.totals and sp.counts == full.counts and sp.commit == full.commit and sp.rc == 0,
              (full.totals, full.counts), (sp.totals, sp.counts), sp)
    want = ["PRUNE-CENSUS", "totals", "duplicates", "protected-twins", "orphans", "literal-variants", "signals", "counts"]
    ctx.check("sections print in the contract order", prefixes(sp) == want, want, prefixes(sp), sp)
    clean(ctx, sp)
    for name, path in (("a --spec path that does not exist", os.path.join(d, "absent.md")), ("a --spec that is a directory", d)):
        r = run_tool("census", "--repo", repo.path, "--at", sha, "--mem", mem, "--spec", path)
        ctx.check(name + " is refused: exit 2, PRUNE-ERROR, no PRUNE-CENSUS", refused(r), "exit 2 + PRUNE-ERROR", r.first, r)

    # spec-parsing edge cases, over the same census
    spec2 = os.path.join(d, "y.spec.md")
    fence = "`" * 3
    with open(spec2, "w", encoding="utf-8") as f:
        f.write(("# Test spec\n\n## Slices\n\n### e-1 EM empty first line\ntouches:\ntouches: client/src/ui/aa.test.ts\n\n"
                 "### s2 EM fenced block first\n" + fence + "text\n# a comment line inside a fence\n" + fence + "\n"
                 "touches: client/src/render/**\n\n"
                 "### c-3 EM control\ntouches: client/src/ui/sub/**\n").replace("EM", chr(0x2014)))
    sp2 = census(repo, sha, mem, "--spec", spec2)
    exp2 = {("duplicates", BB, "bb > one again"): ["c-3"], ("protected-twins", AU, "auth > one again"): ["c-3"],
            ("duplicates", CC, "cc > one again"): ["s2"], ("literal-variants", BB, ""): ["c-3"]}
    ctx.check("a slice whose first touches: line is empty matches nothing (its second line is ignored: aa.test.ts prints no row, "
              "not even its signal); a `# comment` line inside a code fence does not end the slice, so s2 still matches render/**",
              sp2.slices == exp2 and sp2.sig == [] and {r[1] for r in sp2.rows} == {BB, AU, CC},
              (exp2, []), (sp2.slices, sp2.sig, sp2.rows), sp2)


GH_FIELDS = "databaseId,workflowName,headSha,status,conclusion,attempt,startedAt,updatedAt"
GH_BASE = datetime(2026, 11, 10, 12, 0, 0)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def gh_run(i, wf, sha, status, concl, attempt, start_min, secs):
    start = GH_BASE + timedelta(minutes=start_min)
    return {"databaseId": i, "workflowName": wf, "headSha": sha, "status": status, "conclusion": concl,
            "attempt": attempt, "startedAt": iso(start), "updatedAt": iso(start + timedelta(seconds=secs))}


class Gh:
    """A fake `gh`: logs its argv, prints a canned answer, exits with a canned code."""

    def __init__(self, text, rc=0):
        self.dir = tempfile.mkdtemp(prefix="gh-", dir=ROOT)
        self.log = os.path.join(self.dir, "calls.log")
        data = os.path.join(self.dir, "data.txt")
        with open(data, "w") as f:
            f.write(text)
        script = ("#!/usr/bin/python3\nimport json, sys\nwith open(%r, 'a') as f:\n"
                  "    f.write(json.dumps(sys.argv[1:]) + '\\n')\nwith open(%r) as f:\n"
                  "    sys.stdout.write(f.read())\nsys.exit(%d)\n") % (self.log, data, rc)
        path = os.path.join(self.dir, "gh")
        with open(path, "w") as f:
            f.write(script)
        os.chmod(path, 0o755)

    def env(self):
        env = clean_env()
        env["PATH"] = self.dir + os.pathsep + os.environ.get("PATH", "")
        return env

    def calls(self):
        if not os.path.exists(self.log):
            return []
        with open(self.log) as f:
            return [json.loads(l) for l in f.read().splitlines() if l]

    def reset(self):
        if os.path.exists(self.log):
            os.remove(self.log)


def ci_runs(head, old):
    other = "e" * 40
    rows = [
        gh_run(1, "CI", head, "in_progress", "", 1, 0, 0),             # newest for the commit, not completed
        gh_run(2, "Nightly", other, "in_progress", "", 1, -1, 0),      # newest Nightly, not completed
        gh_run(3, "CI", head, "completed", "success", 1, -10, 95),     # the answer: 95 s, success
        gh_run(4, "CI", head, "completed", "failure", 1, -20, 30),     # older run of the same commit
        gh_run(5, "Nightly", other, "completed", "failure", 1, -30, 3600),
        gh_run(6, "Nightly", other, "completed", "success", 1, -40, 3600),
        gh_run(7, "CI", other, "completed", "success", 2, -50, 100),   # rerun to green (1)
        gh_run(8, "CI", other, "completed", "success", 3, -60, 100),   # rerun to green (2)
        gh_run(9, "CI", other, "completed", "failure", 2, -70, 100),   # rerun, not green
        gh_run(10, "CI", other, "completed", "success", 1, -80, 100),  # green first time
        gh_run(11, "Nightly", other, "completed", "success", 2, -90, 100),  # not a CI run
        gh_run(12, "CI", old, "completed", "failure", 1, -100, 600),   # the older commit's run
    ]
    rows += [gh_run(100 + i, "CI", "f" * 40, "completed", "success", 1, -(200 + i), 60) for i in range(300)]
    rows.append(gh_run(999, "CI", other, "completed", "success", 2, -5000, 100))  # outside the newest 300
    rows.sort(key=lambda r: r["startedAt"], reverse=True)
    return rows


def tp2_a13(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    old = repo.commit("old")
    repo.put("client/src/main.ts", ts_lines(3))
    head = repo.commit("head")
    repo.put("client/src/later.ts", ts_lines(2))
    third = repo.commit("third, no CI run")
    gh = Gh(json.dumps(ci_runs(head, old)))
    env = gh.env()
    want = {"seconds": "95", "conclusion": "success", "nightly": "failure", "reruns-to-green": "2"}
    mem = new_mem()
    before = snapshot(repo)
    r = census(repo, head, mem, "--ci", env=env)
    after = snapshot(repo)
    calls = gh.calls()
    ctx.check("--ci prints the CI run's wall seconds and conclusion for the commit (newest COMPLETED run: 95 s, success), "
              "the newest completed Nightly's conclusion (failure), and the rerun-to-green count among the newest 300 CI runs "
              "(2: attempt>=2 and success; not attempt 2 failure, attempt 1 success, a Nightly, or a run past the 300th)",
              r.rc == 0 and r.ci == want, want, r.ci, r)
    ctx.check("--ci makes exactly one gh call, `gh run list ...`",
              len(calls) == 1 and calls[0][:2] == ["run", "list"], "one call starting run list", calls, r)
    ctx.check("--ci without --record writes nothing under --mem", os.listdir(mem) == [], [], os.listdir(mem), r)
    ctx.check("census --ci leaves the worktree, index and refs unchanged", after == before, before, after, r)
    ctx.check("the census rows still print with --ci", CTRL in r.rows, CTRL, r.rows, r)

    gh.reset()
    r = census(repo, head, mem, "--ci", "--record", "lbl", env=env)
    trend = os.path.join(mem, "prune", "trend.jsonl")
    d = read_bytes(trend)
    row = json.loads(d.decode("utf-8")) if d else None
    exp_ci = {"seconds": 95, "conclusion": "success", "nightly": "failure", "reruns_to_green": 2}
    got = row.get("ci") if isinstance(row, dict) else row
    ctx.check("the trend row carries a \"ci\" object with seconds, conclusion, nightly and reruns_to_green (ints, not strings)",
              got == exp_ci and type(got.get("seconds")) is int and type(got.get("reruns_to_green")) is int,
              exp_ci, got, r)
    ctx.check("the trend row keeps label, commit, totals and counts beside \"ci\"",
              isinstance(row, dict) and row.get("label") == "lbl" and row.get("commit") == head
              and "totals" in row and "counts" in row, "label/commit/totals/counts", row, r)
    ctx.check("the ci line sits after counts and before recorded; --ci --record is one gh call",
              prefixes(r)[-3:] == ["counts", "ci", "recorded"] and len(gh.calls()) == 1,
              (["counts", "ci", "recorded"], 1), (prefixes(r)[-3:], len(gh.calls())), r)

    gh.reset()
    r = census(repo, head, mem, "--record", "last", "--ci", env=env)
    lines = (read_bytes(trend) or b"").decode("utf-8").splitlines()
    last = json.loads(lines[-1]) if lines else None
    ctx.check("--ci takes no value: as the last flag it still parses, prints the ci line and records \"ci\"",
              r.rc == 0 and r.ci == want and isinstance(last, dict) and last.get("label") == "last"
              and last.get("ci") == exp_ci, (want, exp_ci), (r.ci, last), r)

    r = census(repo, old, mem, "--ci", env=env)
    w_old = {"seconds": "600", "conclusion": "failure", "nightly": "failure", "reruns-to-green": "2"}
    ctx.check("the run is matched by head sha: at the older commit the CI figures are that commit's run (600 s, failure)",
              r.ci == w_old, w_old, r.ci, r)
    r = census(repo, third, mem, "--ci", env=env)
    w_none = {"seconds": "null", "conclusion": "null", "nightly": "failure", "reruns-to-green": "2"}
    ctx.check("a commit with no CI run gets null seconds and conclusion; nightly and reruns still print",
              r.ci == w_none, w_none, r.ci, r)

    gh.reset()
    mem2 = new_mem()
    r = census(repo, head, mem2, "--record", "nociflag", env=env)
    d = read_bytes(os.path.join(mem2, "prune", "trend.jsonl"))
    row = json.loads(d.decode("utf-8")) if d else None
    ctx.check("without --ci there is no ci line, no \"ci\" key in the row, and gh is never run",
              r.ci is None and isinstance(row, dict) and "ci" not in row and gh.calls() == [],
              "no ci anywhere, zero gh calls", (r.ci, row, gh.calls()), r)


def tp2_a14(ctx):
    repo = Repo()
    repo.fixture(CONTROL, "control.test.ts")
    sha = repo.commit()
    good = json.dumps([gh_run(1, "CI", sha, "completed", "success", 1, -10, 95),
                       gh_run(2, "Nightly", sha, "completed", "success", 1, -20, 100),
                       gh_run(3, "CI", "e" * 40, "completed", "success", 2, -30, 100)])
    bindir = tempfile.mkdtemp(prefix="nogh-", dir=ROOT)
    os.symlink(shutil.which("git"), os.path.join(bindir, "git"))
    env_absent = clean_env()
    env_absent["PATH"] = bindir
    exits = Gh(good, rc=1)
    junk = Gh("this is not json\n")
    deep = Gh("[" * 100000 + "]" * 100000 + "\n")
    nulls = {"seconds": "null", "conclusion": "null", "nightly": "null", "reruns-to-green": "null"}
    jnulls = {"seconds": None, "conclusion": None, "nightly": None, "reruns_to_green": None}
    for name, env, gh in (("gh absent from PATH", env_absent, None),
                          ("gh exits 1 (with a valid-looking answer on stdout)", exits.env(), exits),
                          ("gh prints something that is not JSON", junk.env(), junk),
                          ("gh prints 100000 nested arrays (deeper than a JSON parser's recursion limit)",
                           deep.env(), deep)):
        mem = new_mem()
        r = census(repo, sha, mem, "--ci", "--record", "n", env=env)
        d = read_bytes(os.path.join(mem, "prune", "trend.jsonl"))
        row = json.loads(d.decode("utf-8")) if d else None
        ctx.check(name + ": exit 0, the ci line is all null, and the census rows still print",
                  r.rc == 0 and r.ci == nulls and CTRL in r.rows and r.commit == sha, (0, nulls, CTRL),
                  (r.rc, r.ci, r.rows), r)
        got = row.get("ci") if isinstance(row, dict) else row
        ctx.check(name + ": the row is still appended, with \"ci\" all null",
                  got == jnulls and isinstance(row, dict) and row.get("label") == "n", jnulls, row, r)
        if gh is not None:
            ctx.check(name + ": gh was actually run once (the null is a failure, not a skip)",
                      len(gh.calls()) == 1, 1, gh.calls(), r)


# --------------------------------------------------------------------------------------------
# TP4 helpers: `mr-prune close`
# --------------------------------------------------------------------------------------------

EM = chr(0x2014)        # the dash of a slice heading and of a naming subject
MIDDOT = chr(0x00b7)    # the middle dot of `type: ... <dot> tier: ...`
TOUCHED = "// touched\n"
CLOSE_FILE_KEYS = {"label", "commit", "spec", "experiment-closed", "section", "rows"}
CLOSE_OBJ_KEYS = {"slices", "unmatched", "added", "removed", "changed", "signals"}
TREND_KEYS = {"label", "commit", "totals", "counts", "close"}
CRITERION_RE = re.compile(r"^- \*\*ST<n>\.1:\*\* WHEN .+ SHALL pass\.$")
ITEM_RE = re.compile(r"^- `([^`]+)` :: (\".*\")$")
SUB_RE = re.compile(r"^\s+- (reason|surviving check|confirmed at merge): (.*)$")


def subject(sid, text="work", prefix="feat"):
    """A Conventional Commit subject naming slice `sid`."""
    return "%s: %s %s %s" % (prefix, sid, EM, text)


def reverting(first_line, sha):
    """A message whose body says it reverts `sha` (a full id or a prefix of one)."""
    return "%s\n\nThis reverts commit %s." % (first_line, sha)


def change(repo, msg, put=None, drop=()):
    """One commit writing `put` {path: text} and deleting `drop`; -> its sha."""
    for rel in drop:
        os.remove(os.path.join(repo.path, rel))
    for rel, data in (put or {}).items():
        repo.put(rel, data)
    return repo.commit(msg)


def touch(repo, msg, rels):
    """One commit appending a comment line to each of `rels`; -> its sha."""
    for rel in rels:
        with open(os.path.join(repo.path, rel), "ab") as f:
            f.write(TOUCHED.encode("utf-8"))
    return repo.commit(msg)


def filler(n, tag="line"):
    """n comment lines: lines that define and name nothing."""
    return "".join("// %s %d\n" % (tag, i) for i in range(n))


def tw_text(tag, uses=()):
    """A TS test file of one twin pair in describe(tag); both bodies name each of `uses`."""
    body = "expect(run('%s'%s)).toBe(1);" % (tag, "".join(", " + u for u in uses))
    return "describe('%s', () => {\n%s\n%s});\n" % (tag, it_("one", body), it_("one again", body))


def tw_names(tag):
    """(candidate, survivor) of tw_text(tag)."""
    return tag + " > one again", tag + " > one"


def ts_def(*names):
    return "".join("export function %s(): number { return 1; }\n" % n for n in names)


def ts_use(*names):
    """A TS test file of one test calling each of `names`."""
    return ("describe('u', () => {\n  it('x', () => {\n    expect(%s).toBe(1);\n  });\n});\n"
            % " + ".join("%s()" % n for n in names))


def slice_block(sid, touches=None, body="Body text.\n"):
    text = "### %s %s a slice\ntype: feature %s tier: routine\n" % (sid, EM, MIDDOT)
    if touches is not None:
        text += "touches: %s\n" % touches
    return text + "after: []\n\n" + body + "\n"


def spec_text(slices):
    """A milestone spec whose `## Slices` holds one section per (id, touches-or-None)."""
    return ("# A milestone\n\nIntro.\n\n## Slices\n\n"
            + "".join(slice_block(sid, touches) for sid, touches in slices) + "## Risks\n\nNone.\n")


def spec_dir():
    return tempfile.mkdtemp(prefix="specs-", dir=ROOT)


def put_spec(d, name, text):
    path = os.path.join(d, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(text if isinstance(text, bytes) else text.encode("utf-8"))
    return path


def closed_mem():
    """A --mem whose mr-tester-ab.jsonl holds a close row: the experiment has closed."""
    mem = new_mem()
    with open(os.path.join(mem, "mr-tester-ab.jsonl"), "w") as f:
        f.write('{"kind": "shadow", "slice": "x-1"}\n{"kind": "close", "ts": "2026-11-13T00:00:00Z"}\n')
    return mem


def close(repo, sha, mem, spec, *extra, env=None):
    r = run_tool("close", "--repo", repo.path, "--at", sha, "--mem", mem, "--spec", spec, *extra, env=env)
    r.cslices, r.cunmatched, r.crows, r.csection = {}, [], None, None
    for line in r.out.splitlines():
        line = line.rstrip("\r")
        parts = line.split(" ")
        if parts[0] == "slice" and len(parts) >= 3:
            r.cslices[parts[1]] = parts[2:]
        elif parts[0] == "unmatched" and len(parts) == 2:
            r.cunmatched.append(parts[1])
        elif parts[0] == "rows":
            r.crows = kv(parts[1:])
        elif parts[0] == "section" and len(parts) == 2:
            r.csection = parts[1]
        elif parts[0] == "ci":
            r.ci = kv(parts[1:])
        elif parts[0] == "recorded":
            r.recorded = line[len("recorded "):]
    return r


def close_refused(res):
    """Exit 2 with a PRUNE-ERROR line on stderr and no close output."""
    return (res.rc == 2 and any(l.startswith("PRUNE-ERROR") for l in res.err.splitlines())
            and "PRUNE-CLOSE" not in res.out)


def crows(listed_n, sl, st, rep, over):
    return {"listed": str(listed_n), "slice": str(sl), "structure": str(st), "report": str(rep),
            "over-cap": str(over)}


def close_path(mem, label, suffix=".json"):
    return os.path.join(mem, "prune", "close", label + suffix)


def trend_path(mem):
    return os.path.join(mem, "prune", "trend.jsonl")


def load(path):
    """Parsed JSON of a file; None when absent; "<not JSON>" when it does not parse."""
    data = read_bytes(path)
    if data is None:
        return None
    try:
        return json.loads(data.decode("utf-8"))
    except ValueError:
        return "<not JSON>"


def close_file(mem, label):
    return load(close_path(mem, label))


def listed(mem, label):
    """The close file's rows, or what stands there instead."""
    cf = close_file(mem, label)
    return cf.get("rows") if isinstance(cf, dict) else cf


def section_text(mem, label):
    data = read_bytes(close_path(mem, label, ".section.md"))
    return None if data is None else data.decode("utf-8", "replace")


def parse_line(data):
    try:
        return json.loads(data.decode("utf-8"))
    except (ValueError, AttributeError):
        return None


def trend_rows(mem):
    return [parse_line(l) for l in (read_bytes(trend_path(mem)) or b"").splitlines()]


def close_row(mem, label):
    """The last trend row that is the close of `label`."""
    rows = [r for r in trend_rows(mem)
            if isinstance(r, dict) and r.get("label") == label and isinstance(r.get("close"), dict)]
    return rows[-1] if rows else None


def close_obj(mem, label):
    row = close_row(mem, label)
    return row["close"] if row else None


def recorded_row(repo, sha, label, *extra, env=None):
    """`census --record <label>`'s row at sha, in a fresh --mem: the oracle for a close row's
    label, commit, totals and counts (and ci)."""
    mem = new_mem()
    census(repo, sha, mem, "--record", label, *extra, env=env)
    rows = trend_rows(mem)
    return rows[-1] if rows else None


def dig(x, *keys):
    for k in keys:
        if not isinstance(x, dict):
            return None
        x = x.get(k)
    return x


def items(x):
    return [[k, v] for k, v in x.items()] if isinstance(x, dict) else x


def _routed(row, route, token, slices, over):
    row["route"] = route
    if token is not None:
        row["token"] = token
    if route == "slice":
        row["slices"] = [{"spec": s, "slice": i} for s, i in slices]
    if route == "structure":
        row["over-cap"] = over
    return row


def jt(path, cand, surv, route, kind="duplicates", token=None, slices=(), over=False):
    """A twin row of the close file."""
    return _routed({"kind": kind, "file": path, "candidate": cand, "survivor": surv}, route, token, slices, over)


def jo(path, sym, tests, route, kind="orphans", test_only=False, token=None, slices=(), over=False):
    """An orphan row of the close file."""
    return _routed({"kind": kind, "file": path, "symbol": sym, "test-only": test_only, "tests": sorted(tests)},
                   route, token, slices, over)


def rid(row):
    """(file, candidate or symbol) of a close-file row."""
    if not isinstance(row, dict):
        return ("<not an object>", repr(row))
    return (row.get("file"), row.get("candidate", row.get("symbol")))


def by_id(rows):
    return {rid(r): r for r in rows} if isinstance(rows, list) else {}


def changed_exp(tf, pf, tl, pl):
    return {"test-files": tf, "product-files": pf, "test-lines": tl, "product-lines": pl,
            "ratio": None if pl == 0 else "%.2f" % (tl / pl)}


def changed_got(obj):
    """The close object's `changed`, a numeric ratio shown as "%.2f" for comparison."""
    c = dig(obj, "changed")
    if not isinstance(c, dict):
        return c
    c = dict(c)
    r = c.get("ratio")
    if isinstance(r, (int, float)) and not isinstance(r, bool):
        c["ratio"] = "%.2f" % r
    return c


def section_items(text):
    """[(file, raw JSON name, decoded name or None, {sub-item: text})] of a section file's rows."""
    out, cur = [], None
    for line in (text or "").splitlines():
        m = ITEM_RE.match(line)
        if m:
            try:
                name = json.loads(m.group(2))
            except ValueError:
                name = None
            cur = (m.group(1), m.group(2), name, {})
            out.append(cur)
            continue
        s = SUB_RE.match(line)
        if s and cur is not None:
            cur[3].setdefault(s.group(1), s.group(2))
        elif line.strip() and not line.startswith((" ", "\t")):
            cur = None
    return out


def tree_state(root, skip=None):
    """{relative path: sha256 | "dir" | "link:<target>"} of everything under root, `skip` aside."""
    out = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if os.path.join(dirpath, d) != skip]
        out[os.path.relpath(dirpath, root) + "/"] = "dir"
        for fn in filenames + [d for d in dirnames if os.path.islink(os.path.join(dirpath, d))]:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            if os.path.islink(full):
                out[rel] = "link:" + os.readlink(full)
            else:
                with open(full, "rb") as f:
                    out[rel] = hashlib.sha256(f.read()).hexdigest()
    return out


# --------------------------------------------------------------------------------------------
# TP4 fixtures
# --------------------------------------------------------------------------------------------


def tp4_a1(ctx):
    repo = Repo()
    paths = {}

    def tw(tag):
        paths[tag] = "client/src/%s/%s.test.ts" % (tag, tag)
        return {paths[tag]: tw_text(tag)}

    change(repo, "chore: base", {"client/src/base/b.ts": filler(5)})
    c_ts1 = change(repo, subject("ts-1", "first (#3)", "feat(loop)"), tw("alpha"))
    for msg, tag in (("fix: ts-10 %s an id that begins with ts-1" % EM, "bravo"),
                     ("chore: prepare ts-1 %s the id is not the first word" % EM, "charlie")):
        change(repo, msg, tw(tag))
    c_ts2a = change(repo, subject("ts-2", "second"), tw("delta"))
    for msg, tag in (("Feat: ts-2 %s an upper-case type" % EM, "echo"),
                     ("revert: ts-2 %s revert is not a naming type" % EM, "foxtrot"),
                     ("feat: ts-2 - an ascii hyphen", "golf"),
                     ("feat: ts-2 %sno space after the dash" % EM, "hotel"),
                     ("feat: ts-2  %s two spaces before the dash" % EM, "india"),
                     ("feat: ts-1%s no space before the dash" % EM, "juliet"),
                     ("feat: ts-2", "kilo"),
                     ("ts-1 %s no type" % EM, "lima"),
                     ("chore: misc\n\nfeat: ts-1 %s named only in the body" % EM, "mike"),
                     ("feat: zz-1 %s a heading after the Slices section" % EM, "november"),
                     ("feat: qq-1 %s a heading inside a code fence" % EM, "oscar"),
                     ("feat: pre-1 %s a heading before the Slices section" % EM, "papa")):
        change(repo, msg, tw(tag))
    c_ts2b = change(repo, subject("ts-2", "breaking", "feat(ui)!"), tw("quebec"))
    change(repo, subject("ts-1", "after the --at commit"), tw("romeo"))
    fence = "`" * 3
    text = ("# M-one\n\n## Design\n\n" + slice_block("pre-1") + "## Slices\n\n" + slice_block("ts-2")
            + slice_block("ab-3", body="%stext\n### qq-1 %s fenced\n%s\n" % (fence, EM, fence))
            + slice_block("ts-1") + "## Notes\n\n" + slice_block("zz-1"))
    label = "M-one"
    spec = put_spec(spec_dir(), label + ".spec.md", text)
    mem = new_mem()
    r = close(repo, c_ts2b, mem, spec)
    co = close_obj(mem, label)
    exp_sl = [["ts-2", [c_ts2a, c_ts2b]], ["ts-1", [c_ts1]]]
    got_sl = items(dig(co, "slices"))
    ctx.check("the milestone's commits are exactly the reachable ones whose subject is `<type>[(<scope>)][!]: <id> <em dash> ` for a "
              "slice under ## Slices, ids in the spec's order: ts-2 (bare, and with scope and !), ts-1 (with a (#N) tail); "
              "not ts-10, an id not first, an upper-case or `revert` type, a hyphen, a missing or doubled space at the dash, "
              "no type, an id only in the body, headings outside ## Slices or in a fence, nor a commit after --at",
              got_sl == exp_sl, exp_sl, got_sl, r)
    ctx.check("the slice with no commit is unmatched; pre-1, qq-1 and zz-1 are not slices of the spec",
              dig(co, "unmatched") == ["ab-3"], ["ab-3"], dig(co, "unmatched"), r)
    out = items(r.cslices)
    ctx.check("stdout says the same: `slice ts-2 <c> <c>`, `slice ts-1 <c>`, `unmatched ab-3`",
              out == exp_sl and r.cunmatched == ["ab-3"], (exp_sl, ["ab-3"]), (out, r.cunmatched), r)
    exp_files = sorted(paths[t] for t in ("alpha", "delta", "quebec"))
    rows = listed(mem, label)
    got_files = sorted(rid(x)[0] for x in rows) if isinstance(rows, list) else rows
    ctx.check("only the twin files those three commits added are listed, none of another commit's",
              got_files == exp_files, exp_files, got_files, r)
    exp_add = {"test-lines": 3 * lines_of(tw_text("alpha")), "product-lines": 0}
    ctx.check("lines added are the three commits' lines only", dig(co, "added") == exp_add, exp_add, dig(co, "added"), r)


def tp4_a2(ctx):
    repo = Repo()
    paths = {}

    def tw(tag):
        paths[tag] = "client/src/%s/%s.test.ts" % (tag, tag)
        return {paths[tag]: tw_text(tag)}

    change(repo, "chore: base", {"client/src/base/b.ts": filler(5)})
    s1 = subject("rv-1", "add alpha")
    r1 = change(repo, s1, tw("alpha"))
    change(repo, reverting('Revert "%s"' % s1, r1), drop=[paths["alpha"]])
    s2 = subject("rv-2", "add bravo")
    change(repo, s2 + " (#5)", tw("bravo"))
    change(repo, 'Revert "%s" (#6)' % s2, drop=[paths["bravo"]])
    s3 = subject("rv-3", "add charlie")
    r3 = change(repo, s3, tw("charlie"))
    r3r = change(repo, reverting('Revert "%s"' % s3, r3[:7]), drop=[paths["charlie"]])
    change(repo, reverting('Revert "Revert "%s""' % s3, r3r), tw("charlie"))
    s4 = subject("rv-4", "add delta")
    change(repo, s4, tw("delta"))
    change(repo, 'Revert "%s"' % s4, drop=[paths["delta"]])
    r4b = change(repo, s4, tw("delta"))
    s5 = subject("rv-5", "add echo")
    r5a = change(repo, s5, tw("echo"))
    change(repo, s5, tw("foxtrot"))
    change(repo, 'Revert "%s"' % s5, drop=[paths["foxtrot"]])
    r6a = change(repo, subject("rv-6", "add golf"), tw("golf"))
    s6 = subject("rv-6", "add hotel")
    r6b = change(repo, s6, tw("hotel"))
    change(repo, reverting('Revert "%s"' % s6, r6a), drop=[paths["golf"]])
    r8 = change(repo, subject("rv-8", "add india"), tw("india"))
    change(repo, reverting("chore: a note", r8[:6]))
    # the commits below change no file, so the line sums of the six commits above stand
    r9a = change(repo, subject("rv-9", "first"))
    r9b = change(repo, subject("rv-9", "second"))
    r9c = change(repo, subject("rv-9", "third"))
    change(repo, "chore: undo two\n\nThis reverts commit %s.\nThis reverts commit %s." % (r9a, r9b))
    s10 = subject("rv-10", "add")
    r10 = change(repo, s10)
    change(repo, 'Revert "%s"' % s10)
    change(repo, 'Revert "Revert "%s""' % s10)
    s11 = subject("rv-11", "add")
    r11a = change(repo, s11)
    change(repo, s11)
    change(repo, s11)
    change(repo, 'Revert "%s"' % s11)
    change(repo, 'Revert "%s"' % s11)
    r12a = change(repo, subject("rv-12", "stays"))
    s12 = subject("rv-12", "goes")
    change(repo, s12 + " (#7)")
    change(repo, 'Revert "%s (#7)" (#8)' % s12)
    s13 = subject("rv-13", "add")
    r13 = change(repo, s13)
    change(repo, reverting('Revert "%s"' % s13, "0123456789abcdef0123456789abcdef01234567"))
    s7 = subject("rv-7", "add juliet")
    r7 = change(repo, s7, tw("juliet"))
    change(repo, reverting('Revert "%s"' % s7, r7), drop=[paths["juliet"]])
    label = "M-rev"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("rv-%d" % k, None) for k in range(1, 14)]))
    mem = new_mem()
    r = close(repo, r7, mem, spec)
    co = close_obj(mem, label)
    sl = dig(co, "slices")
    for sid, exp, why in (
        ("rv-3", [r3], "a revert of a revert restores the original: rv-3 keeps its commit (the inner revert names it by a 7-hex prefix)"),
        ("rv-4", [r4b], "a re-landed commit with a reverted commit's subject is not undone: rv-4 is its re-landing only"),
        ("rv-5", [r5a], "a `Revert \"<subject>\"` with no reverts line undoes only the newest earlier commit of that subject: rv-5 keeps the first"),
        ("rv-6", [r6b], "a `This reverts commit` line decides over the subject: rv-6 loses the commit the line names and keeps the one the subject names"),
        ("rv-7", [r7], "a revert that is not reachable from --at undoes nothing: rv-7 keeps its commit"),
        ("rv-8", [r8], "a reverts line with only 6 hex digits undoes nothing: rv-8 keeps its commit"),
        ("rv-9", [r9c], "a message with two `This reverts commit` lines undoes both commits: rv-9 keeps only its third"),
        ("rv-10", [r10], "a revert of a revert by subject alone (`Revert \"Revert \"X\"\"`, no reverts line) restores X: "
                         "rv-10 keeps its commit"),
        ("rv-11", [r11a], "a second subject-only revert passes over the same-subject commit already undone and undoes the "
                          "next older one: of three rv-11 commits two reverts leave the oldest"),
        ("rv-12", [r12a], "`Revert \"X (#7)\" (#8)` undoes `X (#7)`, (#N) tails aside on both: rv-12 keeps only its other commit"),
        ("rv-13", [r13], "a reverts line whose sha matches no commit undoes nothing, and the subject is not read in its place: "
                         "rv-13 keeps its commit"),
    ):
        got = sl.get(sid) if isinstance(sl, dict) else sl
        ctx.check(why, got == exp, exp, got, r)
    exp_ids = ["rv-3", "rv-4", "rv-5", "rv-6", "rv-7", "rv-8", "rv-9", "rv-10", "rv-11", "rv-12", "rv-13"]
    got_ids = list(sl) if isinstance(sl, dict) else sl
    ctx.check("a commit reverted by a reverts line (full id) and one reverted by subject alone, (#N) tails aside, leave "
              "rv-1 and rv-2 unmatched and out of slices",
              got_ids == exp_ids and dig(co, "unmatched") == ["rv-1", "rv-2"], (exp_ids, ["rv-1", "rv-2"]),
              (got_ids, dig(co, "unmatched")), r)
    exp_add = {"test-lines": 6 * lines_of(tw_text("alpha")), "product-lines": 0}
    exp_rm = {"test-lines": 0, "product-lines": 0}
    ctx.check("lines added are those of the six commits that stand; reverted commits and reverts add and remove nothing",
              dig(co, "added") == exp_add and dig(co, "removed") == exp_rm, (exp_add, exp_rm),
              (dig(co, "added"), dig(co, "removed")), r)


def tp4_a3(ctx):
    T1, T2, P1 = "client/src/m1/m1.test.ts", "client/src/m2/m2.test.ts", "game-core/src/m1.rs"
    O1, O1P = "client/src/o1/o1.test.ts", "server-module/src/o1.rs"
    O2, O3 = "client/src/o2/o2.test.ts", "game-core/src/o3/o3_tests.rs"
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(4)})
    t1, mid, tail, t2 = tw_text("mone"), filler(6, "other"), filler(4, "finish"), tw_text("mtwo")
    c1 = change(repo, subject("mx-1", "start"), {T1: t1, P1: filler(9, "p")})
    change(repo, subject("ot-4", "another milestone"), {T1: t1 + mid, O1: tw_text("oone"), O1P: filler(30)})
    change(repo, "ci-fix-20261101T0000Z: green again", {O2: tw_text("otwo")})
    change(repo, "refactor(core): st-2 %s a structural share" % EM, {O3: rs_pair("othree")})
    c5 = change(repo, subject("mx-1", "finish"), {T1: t1 + mid + tail, T2: t2})
    label = "M-mix"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("mx-1", None)]))
    mem = new_mem()
    r = close(repo, c5, mem, spec)
    co = close_obj(mem, label)
    ctx.check("the set is the two mx-1 commits, not the range between them",
              items(dig(co, "slices")) == [["mx-1", [c1, c5]]], [["mx-1", [c1, c5]]], dig(co, "slices"), r)
    exp_add = {"test-lines": lines_of(t1) + lines_of(tail) + lines_of(t2), "product-lines": 9}
    ctx.check("lines added omit what the other milestone's, the ci-fix and the structural commits added, even to a file the set changed",
              dig(co, "added") == exp_add, exp_add, dig(co, "added"), r)
    exp_ch = changed_exp(2, 1, lines_of(t1 + mid + tail) + lines_of(t2), 9)
    ctx.check("changed files are the set's own (2 test files, 1 product file), not the in-between commits' files",
              changed_got(co) == exp_ch, exp_ch, changed_got(co), r)
    rows = listed(mem, label)
    got = sorted(rid(x) for x in rows) if isinstance(rows, list) else rows
    exp = sorted([(T1, "mone > one again"), (T2, "mtwo > one again")])
    ctx.check("the twin rows of files only the in-between commits added are not listed; the set's own are",
              got == exp, exp, got, r)


def tp4_a4(ctx):
    T, Pf = "client/src/k1/k1.test.ts", "client/src/k1/k1.ts"
    repo = Repo()
    change(repo, "chore: base", {"client/src/main.ts": filler(12)})
    sha = change(repo, subject("ka-1", "add"), {T: tw_text("kone"), Pf: filler(8)})
    d = spec_dir()
    label = "M-a.b_c-4"
    spec = put_spec(d, label + ".spec.md", spec_text([("ka-1", None), ("ka-2", None)]))
    mem = new_mem()
    census(repo, sha, mem, "--record", "baseline")
    pre = read_bytes(trend_path(mem)) or b""
    r = close(repo, sha, mem, spec)
    post = read_bytes(trend_path(mem)) or b""
    ctx.check("close exits 0, prints `PRUNE-CLOSE <label> <commit>` first (label: the file name less .spec.md) and "
              "`recorded <label>` last",
              r.rc == 0 and r.first == "PRUNE-CLOSE %s %s" % (label, sha) and r.out.splitlines()[-1:] == ["recorded " + label],
              ("PRUNE-CLOSE %s %s" % (label, sha), "recorded " + label), (r.first, r.out.splitlines()[-1:]), r)
    want = ["PRUNE-CLOSE", "slice", "unmatched", "rows", "section", "recorded"]
    ctx.check("stdout lines come in the contract's order", prefixes(r) == want, want, prefixes(r), r)
    new = post[len(pre):] if pre and post.startswith(pre) else None
    ctx.check("exactly one newline-terminated row is appended to prune/trend.jsonl; the earlier row is untouched",
              pre.count(b"\n") == 1 and new is not None and new.count(b"\n") == 1 and new.endswith(b"\n"),
              "the baseline line + one line", post, r)
    row = parse_line(new)
    ctx.check("the row is a JSON object of label, commit, totals, counts and close",
              isinstance(row, dict) and set(row) == TREND_KEYS and row.get("label") == label and row.get("commit") == sha,
              (sorted(TREND_KEYS), label, sha), row, r)
    oracle = recorded_row(repo, sha, label)

    def pick(x):
        return {k: x.get(k) for k in ("label", "commit", "totals", "counts")} if isinstance(x, dict) else x

    ctx.check("label, commit, totals and counts equal what `census --record <label>` records at the commit",
              isinstance(oracle, dict) and pick(row) == pick(oracle), pick(oracle), pick(row), r)
    got_keys = sorted(row["close"]) if isinstance(row, dict) and isinstance(row.get("close"), dict) else None
    ctx.check("the close object holds slices, unmatched, added, removed, changed and signals",
              got_keys == sorted(CLOSE_OBJ_KEYS), sorted(CLOSE_OBJ_KEYS), got_keys, r)
    cf = close_file(mem, label)
    exp_cf = {"label": label, "commit": sha, "spec": label + ".spec.md", "experiment-closed": False, "section": None}
    got_cf = {k: cf.get(k) for k in exp_cf} if isinstance(cf, dict) else cf
    ctx.check("prune/close/<label>.json holds label, commit, the spec's file name, experiment-closed false, section null and rows",
              isinstance(cf, dict) and set(cf) == CLOSE_FILE_KEYS and got_cf == exp_cf and isinstance(cf.get("rows"), list),
              exp_cf, cf, r)

    gh = Gh(json.dumps(ci_runs(sha, "0" * 40)))
    mem2 = new_mem()
    r2 = close(repo, sha, mem2, spec, "--ci", env=gh.env())
    row2 = close_row(mem2, label)
    exp_ci = {"seconds": 95, "conclusion": "success", "nightly": "failure", "reruns_to_green": 2}
    oracle2 = recorded_row(repo, sha, label, "--ci", env=gh.env())
    ctx.check("with --ci the row carries census's `ci` object (as `census --ci --record` records it) and stdout a `ci` line "
              "before `recorded`",
              dig(row2, "ci") == exp_ci and dig(oracle2, "ci") == exp_ci and prefixes(r2)[-3:] == ["section", "ci", "recorded"]
              and r2.ci == {"seconds": "95", "conclusion": "success", "nightly": "failure", "reruns-to-green": "2"},
              (exp_ci, ["section", "ci", "recorded"]), (dig(row2, "ci"), prefixes(r2)[-3:], r2.ci), r2)

    mem3 = new_mem()
    cut = b'{"label": "earlier", "commit": "ab'
    os.makedirs(os.path.join(mem3, "prune"))
    with open(trend_path(mem3), "wb") as f:
        f.write(cut)
    r3 = close(repo, sha, mem3, spec)
    post3 = read_bytes(trend_path(mem3)) or b""
    tail = post3[len(cut) + 1:] if post3.startswith(cut + b"\n") else None
    row3 = parse_line(tail) if tail is not None else None
    ctx.check("a trend.jsonl whose last line is cut off (no newline) keeps that line as it was, and the close row starts on a "
              "line of its own, newline-terminated, and parses as this label's close",
              r3.rc == 0 and tail is not None and tail.count(b"\n") == 1 and tail.endswith(b"\n") and isinstance(row3, dict)
              and row3.get("label") == label and isinstance(row3.get("close"), dict),
              "the cut line + newline + one close row", post3, r3)

    de = spec_dir()
    fence = "`" * 3
    nm = put_spec(de, "notes.md", spec_text([("ka-1", None)]))
    sp = put_spec(de, "M one.spec.md", spec_text([("ka-1", None)]))
    shl = put_spec(de, "M-SHALL.spec.md", spec_text([("ka-1", None)]))
    ns = put_spec(de, "M-noslice.spec.md", "# M\n\n## Slices\n\n%s\n### ka-1 %s fenced\n%s\n\n## Notes\n\n%s"
                  % (fence, EM, fence, slice_block("ka-1")))
    dirspec = os.path.join(de, "M-dir.spec.md")
    os.makedirs(dirspec)
    for name, path in (("no --spec", None),
                       ("a --spec path that does not exist", os.path.join(de, "M-absent.spec.md")),
                       ("a --spec not named <label>.spec.md", nm),
                       ("a --spec whose label holds a space", sp),
                       ("a --spec whose label holds the word SHALL", shl),
                       ("a --spec with no slice under ## Slices (one only in a fence, one only under another heading)", ns),
                       ("a --spec that is a directory", dirspec)):
        m = new_mem()
        args = ["close", "--repo", repo.path, "--at", sha, "--mem", m] + ([] if path is None else ["--spec", path])
        e = run_tool(*args)
        ctx.check(name + " is refused: exit 2, PRUNE-ERROR, no PRUNE-CLOSE, nothing written under --mem",
                  close_refused(e) and os.listdir(m) == [], "exit 2 + PRUNE-ERROR, empty --mem", (e.rc, e.first, os.listdir(m)), e)
    missing = os.path.join(ROOT, "no-such-mem")
    e = run_tool("close", "--repo", repo.path, "--at", sha, "--mem", missing, "--spec", spec)
    ctx.check("a --mem that does not exist is refused (exit 2, PRUNE-ERROR) and not created",
              close_refused(e) and not os.path.exists(missing), "exit 2 + PRUNE-ERROR, no directory",
              (e.rc, os.path.exists(missing)), e)


def tp4_a5(ctx):
    TB0, PB0 = "client/src/nb/base.test.ts", "game-core/src/nb.rs"
    T1, T1R, IT = "client/src/nt/t1.test.ts", "client/src/nt/t1r.test.ts", "game-core/tests/flow.rs"
    P1, BIN = "client/src/nt/p1.ts", "game-core/src/nb_blob.rs"
    repo = Repo()
    tb0, pb0 = pad(tw_text("nbase")), filler(40, "pb")
    change(repo, "chore: base", {TB0: tb0, PB0: pb0})
    t1, p1, it = pad(tw_text("nt")), filler(15, "p1"), rs_pair("flow")
    c1 = change(repo, subject("nm-1", "one"), {
        T1: t1, P1: p1, IT: it,
        # paths that are neither test nor product files: they add to no line count
        "docs/x.md": filler(7), "client/e2e/x.spec.ts": filler(5), "client/src/module_bindings/types.ts": filler(9),
        "game-core/benches/b.rs": filler(4), "client/test-util/u.ts": filler(3), "server-module/tests/it.rs": filler(6)})
    tb0, pb0 = tb0 + filler(50, "mid"), pb0 + filler(10, "pbm")
    change(repo, "chore: unrelated growth", {TB0: tb0, PB0: pb0})
    old3, old4 = "// pad 3\n// pad 4\n// pad 5\n", "// pb 10\n// pb 11\n// pb 12\n// pb 13\n"
    assert tb0.count(old3) == 1 and pb0.count(old4) == 1
    tb0, pb0 = tb0.replace(old3, filler(5, "two")), pb0.replace(old4, "// pb changed\n")
    c2 = change(repo, subject("nm-2", "two"), {TB0: tb0, PB0: pb0, BIN: b"\x00\x01binary\x00\x02"})
    c3 = change(repo, subject("nm-1", "three, a rename"), {T1R: t1}, drop=[T1])
    c4 = change(repo, subject("nm-2", "four", "feat(x)!"), drop=[P1])
    # a merge commit naming nm-2 brings in a side branch's twin file: it adds no path and no line
    SIDE = "client/src/side/side.test.ts"
    git(repo.path, "checkout", "-q", "-b", "side")
    change(repo, "chore: side work", {SIDE: tw_text("side")})
    git(repo.path, "checkout", "-q", "main")
    change(repo, "chore: main moves on", {"docs/main.md": filler(3)})
    git(repo.path, "-c", "commit.gpgsign=false", "merge", "-q", "--no-ff", "-m", subject("nm-2", "merge side"), "side")
    mg = git(repo.path, "rev-parse", "HEAD").strip()
    label = "M-num"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("nm-2", None), ("nm-3", None), ("nm-1", None)]))
    mem = new_mem()
    r = close(repo, mg, mem, spec)
    co = close_obj(mem, label)
    rows = listed(mem, label)
    got = sorted(rid(x) for x in rows) if isinstance(rows, list) else rows
    exp = sorted([(TB0, "nbase > one again"), (T1R, "nt > one again"), (IT, "flow_b")])
    ctx.check("a merge commit naming a slice adds no changed path: the side branch's twin file is not listed; the set's are",
              got == exp, exp, got, r)
    exp_sl = [["nm-2", [c2, c4, mg]], ["nm-1", [c1, c3]]]
    ctx.check("each matched id carries its commits, oldest first, ids in the spec's order (nm-2 before nm-1); nm-3 is unmatched",
              items(dig(co, "slices")) == exp_sl and dig(co, "unmatched") == ["nm-3"], (exp_sl, ["nm-3"]),
              (dig(co, "slices"), dig(co, "unmatched")), r)
    lt1 = lines_of(t1)
    exp_add = {"test-lines": lt1 + lines_of(it) + 5 + lt1, "product-lines": 15 + 1}
    exp_rm = {"test-lines": 3 + lt1, "product-lines": 4 + 15}
    ctx.check("added sums each commit's numstat over test and product files only: a new test, a game-core/tests file, 5 lines "
              "of a 3-for-5 edit, a rename's new side; a product file and 1 line of a 4-for-1 edit (not the lines at --at, "
              "not docs/e2e/module_bindings/benches/test-util/server tests, not a binary file)",
              dig(co, "added") == exp_add, exp_add, dig(co, "added"), r)
    ctx.check("removed sums the deleted side: 3 lines of the edit and a renamed file's old side; 4 product lines and a deleted "
              "product file",
              dig(co, "removed") == exp_rm, exp_rm, dig(co, "removed"), r)


def tp4_a6(ctx):
    TA, PA = "client/src/ra/ra.test.ts", "client/src/ra/ra.ts"
    TB, TP = "client/src/rb/rb.test.ts", "client/src/auth/ap.test.ts"
    TW, TD = "game-core/src/rw/rw_tests.rs", "client/src/rd/rd.test.ts"
    TU = "client/src/secure/ru.test.ts"
    PG, PX, PU = "game-core/src/rg.rs", "server-module/src/px.rs", "client/src/main.ts"
    repo = Repo()
    tb, tp = pad(tw_text("rb")), ts_marked("p")
    tu = ts_marked("u", ["const t = readFileSync('x', 'utf8');"])
    change(repo, "chore: base", {TB: tb, TP: tp, TU: tu, PU: filler(500)})
    ta, tw_, pa = pad(ts_pair("ra", READ_EXTRA)), rs_marked("w"), filler(30)
    change(repo, subject("rt-1", "a"), {TA: ta, TW: tw_, TD: pad(tw_text("rd")), PA: pa, PX: filler(10),
                                        "docs/notes.md": filler(40)})
    ta = ta + filler(30, "grow")
    tu = tu.replace("// filler 3\n", "// filler three\n")
    change(repo, "chore: grow ra, nudge ru", {TA: ta, TU: tu})
    tb = tb.replace("// pad 5\n", "// pad five\n")
    tp = tp.replace("// filler 5\n", "// filler five\n")
    change(repo, subject("rt-1", "b"), {TB: tb, TP: tp, PG: filler(20)})
    sha = change(repo, subject("rt-1", "c"), drop=[TD, PX])
    label = "M-ratio"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("rt-1", None)]))
    mem = new_mem()
    gates = os.path.join(mem, "gates")
    os.makedirs(gates)
    with open(os.path.join(gates, "s-1.widened.jsonl"), "w") as f:
        f.write("".join(json.dumps({"slice": "s-1", "path": p, "why": "pin"}) + "\n" for p in (TW, TW, TU)))
    r = close(repo, sha, mem, spec)
    co = close_obj(mem, label)
    tl = lines_of(ta) + lines_of(tb) + lines_of(tp) + lines_of(tw_)
    exp = changed_exp(4, 2, tl, 50)
    ctx.check("changed counts the set's paths that are test or product files at --at with their lines there (a later commit's "
              "growth included; a deleted file, docs and the files the set never touched aside): ratio test over product",
              changed_got(co) == exp, exp, changed_got(co), r)
    exp_s = {"source-text": 1, "churn": 2, "protected-churn": 1, "widened": 1}
    ctx.check("signals count the changed test files at --at carrying each: source-text 1, churn 2, protected-churn 1, widened 1 "
              "(the untouched test file carrying all four adds nothing; widened counts files, not rows)",
              dig(co, "signals") == exp_s, exp_s, dig(co, "signals"), r)

    label2 = "M-tonly"
    spec2 = put_spec(spec_dir(), label2 + ".spec.md", spec_text([("to-1", None)]))
    tb2 = tb.replace("// pad 6\n", "// pad six\n")
    sha2 = change(repo, subject("to-1", "tests only", "test"), {TB: tb2})
    mem2 = new_mem()
    r2 = close(repo, sha2, mem2, spec2)
    co2 = close_obj(mem2, label2)
    exp2 = changed_exp(1, 0, lines_of(tb2), 0)
    ctx.check("a set that changed no product file has ratio null over zero product lines",
              changed_got(co2) == exp2, exp2, changed_got(co2), r2)


def tp4_a7(ctx):
    TWX, PRT = "client/src/lx/lx.test.ts", "client/src/lx/ownerPanel.test.ts"
    DA, TA = "game-core/src/la/la.rs", "game-core/src/la/la_tests.rs"
    DB, TB = "client/src/lb/lb.ts", "client/src/lb/lb.test.ts"
    DC, TC1, TC2 = "client/src/lc/lc.ts", "client/src/lc/lc.test.ts", "client/src/lc2/more.test.ts"
    DP, TPV = "server-module/src/privacy.rs", "server-module/src/privacy_tests.rs"
    repo = Repo()
    change(repo, "chore: base", {
        TWX: tw_text("lx"), PRT: tw_text("op"),
        DA: "pub fn lonely_a() -> u32 { 1 }\n\n#[cfg(test)]\npub fn helper_only() -> u32 { 2 }\n",
        TA: "#[test]\nfn names() {\n    assert_eq!(lonely_a() + helper_only(), 3);\n}\n",
        DB: ts_def("lonelyB"), TB: ts_use("lonelyB"), DC: ts_def("lonelyC"), TC1: ts_use("lonelyC"), TC2: ts_use("lonelyC"),
        DP: "pub fn plain_p() -> u32 { 1 }\n", TPV: "#[test]\nfn names() {\n    assert_eq!(plain_p(), 1);\n}\n"})
    sha = touch(repo, subject("ls-1", "touch"), [TWX, PRT, DA, TB, TC2, TPV])
    label = "M-list"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("ls-1", None)]))
    mem = new_mem()
    r = close(repo, sha, mem, spec)
    exp = [jt(TWX, *tw_names("lx"), "structure"),
           jt(PRT, *tw_names("op"), "report", kind="protected-twins", token="owner"),
           jo(DB, "lonelyB", [TB], "structure"),
           jo(DC, "lonelyC", [TC1, TC2], "structure"),
           jo(DA, "helper_only", [TA], "structure", test_only=True),
           jo(DA, "lonely_a", [TA], "structure"),
           jo(DP, "plain_p", [TPV], "report", kind="orphan-protected", token="priv")]
    got = by_id(listed(mem, label))
    for name, row in (
        ("a duplicates row whose test file the set changed is listed", exp[0]),
        ("a protected-twins row whose test file the set changed is listed, with its token", exp[1]),
        ("an orphan whose only changed file is a test naming it is listed (its defining file untouched)", exp[2]),
        ("an orphan is listed when one of two tests naming it changed; tests holds both", exp[3]),
        ("a test-only orphan whose defining file changed is listed with test-only true", exp[4]),
        ("an orphan whose defining file changed is listed (its test untouched)", exp[5]),
        ("an orphan-protected row whose test file changed is listed, with its token", exp[6]),
    ):
        ctx.check(name, got.get(rid(row)) == row, row, got.get(rid(row)), r)
    rows = listed(mem, label)
    ctx.check("the close file lists exactly those rows, in census's order (duplicates, protected-twins, orphans by file then "
              "name, orphan-protected)", rows == exp, exp, rows, r)
    ctx.check("stdout counts them: `rows listed=7 slice=0 structure=5 report=2 over-cap=0`",
              r.crows == crows(7, 0, 5, 2, 0), crows(7, 0, 5, 2, 0), r.crows, r)


def tp4_a8(ctx):
    TWY, NY, SIB = "client/src/ny/ny.test.ts", "client/src/ny/ny.ts", "client/src/ny/sib.ts"
    TWZ, TWR = "client/src/nz/nz.test.ts", "client/src/nr/nr.test.ts"
    DQ, TQ, OQ = "client/src/nq/nq.ts", "client/src/nq/nq.test.ts", "client/src/nq/other.test.ts"
    DPP, DPT, ORIG = "game-core/src/np/np.rs", "game-core/src/np/np_tests.rs", "game-core/src/np/np.rs.orig"
    TWP, DO, DOT = "client/src/np2/pos.test.ts", "client/src/npo/npo.ts", "client/src/npo/npo.test.ts"
    repo = Repo()
    change(repo, "chore: base", {
        TWY: tw_text("ny"), NY: filler(3), SIB: filler(3), TWZ: tw_text("nz"), TWR: tw_text("nr"),
        DQ: ts_def("quietQ"), TQ: ts_use("quietQ"),
        OQ: "describe('o', () => {\n  it('x', () => {\n    expect(1).toBe(1);\n  });\n});\n",
        DPP: "pub fn quiet_p() -> u32 { 1 }\n", DPT: "#[test]\nfn names() {\n    assert_eq!(quiet_p(), 1);\n}\n",
        TWP: tw_text("pos"), DO: ts_def("posO"), DOT: ts_use("posO")})
    touch(repo, "chore: tidy nz", [TWZ])
    s1 = subject("nn-1", "touch nr")
    n1 = touch(repo, s1, [TWR])
    change(repo, reverting('Revert "%s"' % s1, n1), {TWR: tw_text("nr")})
    repo.put(ORIG, filler(2, "orig"))
    sha = touch(repo, subject("nn-2", "touch"), [NY, SIB, OQ, TWP, DOT])
    label = "M-not"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("nn-1", None), ("nn-2", None)]))
    mem = new_mem()
    r = close(repo, sha, mem, spec)
    full = census(repo, sha, new_mem())
    present = ({r_[1] for r_ in full.rows} >= {TWY, TWZ, TWR, TWP}
               and {(o[0], o[1]) for o in full.orph} >= {(DQ, "quietQ"), (DPP, "quiet_p"), (DO, "posO")})
    ctx.check("control: at --at the census has a row for every one of these files", present, "rows for all",
              (full.rows, full.orph), full)
    rows = listed(mem, label)
    got = sorted(rid(x) for x in rows) if isinstance(rows, list) else rows
    exp = sorted([(TWP, "pos > one again"), (DO, "posO")])
    ctx.check("only rows with a changed file are listed (a twin file and an orphan's test the set changed); not a twin file "
              "whose subject or a sibling changed, one only a non-milestone commit changed, one only a reverted milestone "
              "commit changed, an orphan beside a changed unrelated test, nor an orphan whose path is a prefix of a changed path",
              got == exp, exp, got, r)


def tp4_a9(ctx):
    TW = {k: "client/src/a%d/tw%d.test.ts" % (k, k) for k in range(1, 8)}
    OD, ODT = "game-core/src/od/od.rs", "game-core/src/od/od_tests.rs"
    OE, OET = "client/src/oe/oe.ts", "client/src/oe/oe.test.ts"
    base = {TW[k]: tw_text("tw%d" % k) for k in TW}
    base.update({OD: "pub fn od_lonely() -> u32 { 1 }\n",
                 ODT: "#[test]\nfn names() {\n    assert_eq!(od_lonely(), 1);\n}\n",
                 OE: ts_def("oeLonely"), OET: ts_use("oeLonely")})
    repo = Repo()
    change(repo, "chore: base", base)
    change(repo, subject("nx-2", "built in another milestone"))
    s3 = subject("nx-3", "built, then reverted")
    n3 = change(repo, s3)
    change(repo, reverting('Revert "%s"' % s3, n3))
    sha = touch(repo, subject("mm-1", "touch"), [TW[k] for k in sorted(TW)] + [ODT, OE])
    change(repo, subject("nx-6", "built after the --at commit"))
    d = spec_dir()
    label = "M-main"
    spec = put_spec(d, label + ".spec.md", spec_text([("mm-1", "docs/"), ("mm-2", TW[7])]))
    put_spec(d, "A-other.spec.md", spec_text([("ao-1", TW[1])]))
    put_spec(d, "M-next.spec.md", spec_text([
        ("nx-9", TW[1]), ("nx-1", "client/src/a1/**"), ("nx-2", "client/src/a2/"),
        ("nx-3", "`client/src/a3/*.test.ts`"), ("nx-4", OD), ("nx-5", "`%s`" % OET), ("nx-6", "client/src/a6/**"),
        ("nx-7", "docs/nothing.md\ntouches: " + TW[5])]))
    put_spec(d, "sub/M-deep.spec.md", spec_text([("dp-1", TW[4])]))
    put_spec(d, "notes.md", spec_text([("nn-1", TW[4])]))
    put_spec(d, "Z-bad.spec.md", b"# Bad\n\n## Slices\n\n### bd-1 \xe2\x80\x94 x\ntouches: " + TW[2].encode("utf-8")
             + b"\n\n\xff\xfe not UTF-8\n")
    mem = new_mem()
    r = close(repo, sha, mem, spec)
    A_, M = "A-other.spec.md", "M-next.spec.md"
    got = by_id(listed(mem, label))
    for name, row in (
        ("a twin file that unbuilt slices of two other specs list gets route slice with each: specs by file name, slices in "
         "file order (nx-9 before nx-1)", jt(TW[1], *tw_names("tw1"), "slice", slices=[(A_, "ao-1"), (M, "nx-9"), (M, "nx-1")])),
        ("a twin file listed only by a built slice (and by an unreadable spec) is not routed slice",
         jt(TW[2], *tw_names("tw2"), "structure")),
        ("a slice whose only commit is reverted is unbuilt: route slice",
         jt(TW[3], *tw_names("tw3"), "slice", slices=[(M, "nx-3")])),
        ("a slice in a subdirectory's spec, or in a file not named *.spec.md, does not route",
         jt(TW[4], *tw_names("tw4"), "structure")),
        ("only a slice's first touches: line is read", jt(TW[5], *tw_names("tw5"), "structure")),
        ("a slice built only after --at is unbuilt at --at: route slice",
         jt(TW[6], *tw_names("tw6"), "slice", slices=[(M, "nx-6")])),
        ("an unbuilt slice of the --spec file itself does not route", jt(TW[7], *tw_names("tw7"), "structure")),
        ("an orphan listed through its changed test is routed by a slice listing its defining file",
         jo(OD, "od_lonely", [ODT], "slice", slices=[(M, "nx-4")])),
        ("an orphan listed through its changed defining file is routed by a slice listing its test",
         jo(OE, "oeLonely", [OET], "slice", slices=[(M, "nx-5")])),
    ):
        ctx.check(name, got.get(rid(row)) == row, row, got.get(rid(row)), r)
    ctx.check("stdout: `rows listed=9 slice=5 structure=4 report=0 over-cap=0`",
              r.crows == crows(9, 5, 4, 0, 0), crows(9, 5, 4, 0, 0), r.crows, r)
    ctx.check("the unreadable spec beside --spec is skipped with PRUNE-WARN spec on stderr and the run exits 0",
              r.rc == 0 and any(l.startswith("PRUNE-WARN spec") for l in r.err.splitlines()), "PRUNE-WARN spec ...", r.err, r)

    # a second spec directory: a directory named *.spec.md, and a sibling whose fences hold a touches: line and a heading
    d2 = spec_dir()
    spec2 = put_spec(d2, label + ".spec.md", spec_text([("mm-1", "docs/")]))
    os.makedirs(os.path.join(d2, "B-dir.spec.md"))
    fence = "`" * 3
    put_spec(d2, "M-fence.spec.md", "# F\n\n## Slices\n\n"
             + slice_block("fz-1", None, body="%s\ntouches: %s\n%s\n" % (fence, TW[2], fence))
             + slice_block("fz-2", "docs/x.md", body="%s\n### fz-3 %s fenced\ntouches: %s\n%s\n" % (fence, EM, TW[3], fence))
             + slice_block("fz-4", TW[4]) + "## Risks\n\nNone.\n")
    mem2 = new_mem()
    r2 = close(repo, sha, mem2, spec2)
    got2 = by_id(listed(mem2, label))
    ctrl = jt(TW[4], *tw_names("tw4"), "slice", slices=[("M-fence.spec.md", "fz-4")])
    ctx.check("control: a slice after the fences of a sibling spec routes its file (fz-4), beside a directory named B-dir.spec.md",
              got2.get(rid(ctrl)) == ctrl, ctrl, got2.get(rid(ctrl)), r2)
    ctx.check("a directory named *.spec.md beside --spec is skipped with PRUNE-WARN spec on stderr and the run exits 0",
              r2.rc == 0 and any(l.startswith("PRUNE-WARN spec") for l in r2.err.splitlines()), "PRUNE-WARN spec ...",
              (r2.rc, r2.err), r2)
    for name, k in (("a `touches:` line inside a code fence of a sibling slice does not route its file", 2),
                    ("a `### id <em dash> ` heading inside a code fence of a sibling spec is not a slice: its touches: line "
                     "does not route", 3)):
        row = got2.get(rid(jt(TW[k], *tw_names("tw%d" % k), "structure")))
        ctx.check(name, dig(row, "route") == "structure" and "slices" not in (row or {}), "route structure",
                  row, r2)


def tp4_a10(ctx):
    TWA, TWB, TWS = "client/src/ta/twa.test.ts", "client/src/tb/twb.test.ts", "client/src/tsl/tws.test.ts"
    W12, W13 = "client/src/w12/w12.ts", "client/src/w13/w13.ts"
    W12T = ["client/src/w12/t%02d.test.ts" % i for i in range(11)]
    W13T = ["client/src/w13/t%02d.test.ts" % i for i in range(12)]
    base = {TWA: tw_text("twa"), TWB: tw_text("twb"), TWS: tw_text("tws"),
            W12: ts_def("wideTwelve"), W13: ts_def("wideThirteen")}
    base.update({p: ts_use("wideTwelve") for p in W12T})
    base.update({p: ts_use("wideThirteen") for p in W13T})
    repo = Repo()
    change(repo, "chore: base", base)
    change(repo, subject("ot-1", "built elsewhere"))
    sha = touch(repo, subject("te-1", "touch"), [TWA, TWB, TWS, W12, W13])
    d = spec_dir()
    label = "M-ten"
    spec = put_spec(d, label + ".spec.md", spec_text([("te-1", "client/src/ta/**")]))
    put_spec(d, "M-oth.spec.md", spec_text([("ot-1", "client/src/tb/twb.test.ts, client/src/w12/**"), ("ot-2", TWS)]))
    mem = new_mem()
    r = close(repo, sha, mem, spec)
    got = by_id(listed(mem, label))

    def bare(row):
        """A structure row without its over-cap mark (A15's subject), the mark checked to be a bool."""
        if not isinstance(row, dict) or type(row.get("over-cap")) is not bool:
            return row
        return {k: v for k, v in row.items() if k != "over-cap"}

    for name, row in (
        ("a duplicates row no slice lists gets route structure", jt(TWA, *tw_names("twa"), "structure")),
        ("a duplicates row only a built slice of another spec lists gets route structure",
         jt(TWB, *tw_names("twb"), "structure")),
        ("an orphans row of exactly 12 files (defining file + 11 tests), listed only by a built slice, gets route structure",
         jo(W12, "wideTwelve", W12T, "structure")),
    ):
        exp = bare(row)
        ctx.check(name + " (with an over-cap bool)", bare(got.get(rid(row))) == exp, row, got.get(rid(row)), r)
    for name, row in (
        ("control: a twin an unbuilt slice of another spec lists gets route slice",
         jt(TWS, *tw_names("tws"), "slice", slices=[("M-oth.spec.md", "ot-2")])),
        ("control: an orphans row of 13 files gets route report", jo(W13, "wideThirteen", W13T, "report")),
    ):
        ctx.check(name, got.get(rid(row)) == row, row, got.get(rid(row)), r)


def tp4_a11(ctx):
    PRT = "client/src/pr/ownerView.test.ts"
    PV, PVT = "server-module/src/privacy.rs", "server-module/src/privacy_tests.rs"
    WA, WB = "client/src/wa/wa.ts", "client/src/wb/wb.ts"
    WT = ["client/src/wt/t%02d.test.ts" % i for i in range(12)]
    SP, TWC = "client/src/sp/sp ace.test.ts", "client/src/tc/twc.test.ts"
    PO, POT = "client/src/po/po.ts", "client/src/po/ownerPo.test.ts"
    SH = "client/src/sh/SHALL-x.test.ts"
    base = {PRT: tw_text("view"), PV: "pub fn plain_q() -> u32 { 1 }\n",
            PVT: "#[test]\nfn names() {\n    assert_eq!(plain_q(), 1);\n}\n",
            WA: ts_def("wideA"), WB: ts_def("wideB"), SP: tw_text("spc"), TWC: tw_text("twc"),
            PO: ts_def("poLonely"), POT: ts_use("poLonely"), SH: tw_text("shx")}
    base.update({p: ts_use("wideA", "wideB") for p in WT})
    repo = Repo()
    change(repo, "chore: base", base)
    sha = touch(repo, subject("el-1", "touch"), [PRT, PVT, WA, WB, SP, TWC, PO, SH])
    d = spec_dir()
    label = "M-elv"
    spec = put_spec(d, label + ".spec.md", spec_text([("el-1", None)]))
    put_spec(d, "M-xx.spec.md", spec_text([("xx-1", "%s, %s, %s, %s" % (PRT, WB, PV, PO))]))
    mem = new_mem()
    r = close(repo, sha, mem, spec)
    got = by_id(listed(mem, label))
    for name, row in (
        ("a protected-twins row gets route report with its token, though an unbuilt slice lists its file",
         jt(PRT, *tw_names("view"), "report", kind="protected-twins", token="owner")),
        ("an orphan-protected row gets route report with its token, though an unbuilt slice lists its defining file",
         jo(PV, "plain_q", [PVT], "report", kind="orphan-protected", token="priv")),
        ("an orphans row of 13 files that no slice lists gets route report", jo(WA, "wideA", WT, "report")),
        ("an orphans row of 13 files that an unbuilt slice lists gets route slice (slice is decided first)",
         jo(WB, "wideB", WT, "slice", slices=[("M-xx.spec.md", "xx-1")])),
        ("a duplicates row no slice lists whose path holds a space gets route report", jt(SP, *tw_names("spc"), "report")),
        ("control: a plain duplicates row no slice lists gets route structure", jt(TWC, *tw_names("twc"), "structure")),
        ("an orphans row with a test file whose path holds a protected token stays kind orphans and gets route report with "
         "that token, though an unbuilt slice lists its defining file",
         jo(PO, "poLonely", [POT], "report", token="owner")),
        ("a duplicates row no slice lists whose path holds the word SHALL gets route report", jt(SH, *tw_names("shx"), "report")),
    ):
        ctx.check(name, got.get(rid(row)) == row, row, got.get(rid(row)), r)
    ctx.check("stdout: `rows listed=8 slice=1 structure=1 report=6 over-cap=0`",
              r.crows == crows(8, 1, 1, 6, 0), crows(8, 1, 1, 6, 0), r.crows, r)


def tp4_a12(ctx):
    T, DX, DXT = "client/src/x1/x1.test.ts", "game-core/src/x2/x2.rs", "game-core/src/x2/x2_tests.rs"
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(4)})
    sha = change(repo, subject("ex-1", "add"), {T: tw_text("xone"), DX: "pub fn lonely_x() -> u32 { 1 }\n",
                                                DXT: "#[test]\nfn names() {\n    assert_eq!(lonely_x(), 1);\n}\n"})
    label = "M-exp"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("ex-1", None)]))
    others = "".join(l + "\n" for l in (
        json.dumps({"kind": "shadow", "slice": "ex-1"}), json.dumps({"kind": "Close"}), json.dumps({"kind": ["close"]}),
        json.dumps({"row": {"kind": "close"}}), json.dumps(["close", {"kind": "close"}]), '{"kind": "close"',
        "kind: close", ""))

    def write_ab(text):
        def setup(mem):
            with open(os.path.join(mem, "mr-tester-ab.jsonl"), "w") as f:
                f.write(text)
        return setup

    def stale(mem):
        p = close_path(mem, label, ".section.md")
        os.makedirs(os.path.dirname(p))
        with open(p, "wb") as f:
            f.write(b"### st-<n> stale\n")

    for name, setup in (
        ("mr-tester-ab.jsonl absent", lambda mem: None),
        ("mr-tester-ab.jsonl holding other kinds, a mis-cased or nested kind, an array, a truncated and a non-JSON line",
         write_ab(others)),
        ("mr-tester-ab.jsonl a directory (unreadable)", lambda mem: os.makedirs(os.path.join(mem, "mr-tester-ab.jsonl"))),
        ("mr-tester-ab.jsonl absent and a stale section file present", stale),
    ):
        mem = new_mem()
        setup(mem)
        r = close(repo, sha, mem, spec)
        cf = close_file(mem, label)
        ctx.check(name + ": the trend row and the close file are written, experiment-closed false and section null",
                  r.rc == 0 and close_row(mem, label) is not None and isinstance(cf, dict)
                  and cf.get("experiment-closed") is False and "section" in cf and cf["section"] is None,
                  "row + close file (false, null)", (r.rc, close_row(mem, label), cf), r)
        ctx.check(name + ": no section file and `section none`, though 2 rows are routed structure",
                  not os.path.exists(close_path(mem, label, ".section.md")) and r.csection == "none"
                  and dig(r.crows, "structure") == "2",
                  ("no file", "none", "2"), (os.path.exists(close_path(mem, label, ".section.md")), r.csection, r.crows), r)
    mem = closed_mem()
    r = close(repo, sha, mem, spec)
    cf = close_file(mem, label)
    name = label + ".section.md"
    ctx.check("control: with a close row in mr-tester-ab.jsonl the same run writes the section file and says so",
              os.path.isfile(close_path(mem, label, ".section.md")) and r.csection == name
              and dig(cf, "experiment-closed") is True and dig(cf, "section") == name,
              (name, True), (os.path.isfile(close_path(mem, label, ".section.md")), r.csection, cf), r)


def tp4_a13(ctx):
    E = chr(0x00e9)
    TW = "client/src/s2/cafe.test.ts"
    MD, MT, UT = "client/src/s1/model.ts", "client/src/s1/model.test.ts", "client/src/s0/use.test.ts"
    PRT, TWS = "client/src/s3/guardBar.test.ts", "client/src/s4/tws.test.ts"
    title = "caf" + E
    body = "expect(run('c')).toBe(1);"
    tw = "describe('%s', () => {\n%s\n%s});\n" % (title, it_("it SHALL hold", body), it_("it SHALL hold again", body))
    use = "describe('m', () => {\n  it('x', () => {\n    expect(SHALL_CAP).toBe(1);\n  });\n});\n"
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(4)})
    SHP = "client/src/s5/SHALL-y.test.ts"
    sha = change(repo, subject("se-1", "add"), {TW: tw, MD: "export const SHALL_CAP = 1;\n", MT: use, UT: use,
                                                PRT: tw_text("bar"), TWS: tw_text("tws"), SHP: tw_text("shy")})
    d = spec_dir()
    label = "M-sect"
    spec = put_spec(d, label + ".spec.md", spec_text([("se-1", None)]))
    put_spec(d, "M-s4.spec.md", spec_text([("sl-1", TWS)]))
    mem = closed_mem()
    r = close(repo, sha, mem, spec)
    text = section_text(mem, label)
    name = label + ".section.md"
    ctx.check("with the experiment closed and structure rows, one section file is written and named in the close file and stdout",
              text is not None and r.csection == name and dig(close_file(mem, label), "section") == name,
              name, (text is not None, r.csection, dig(close_file(mem, label), "section")), r)
    lines = (text or "").splitlines()
    exp_head = ["### st-<n> %s %s: twin tests and unreached symbols from the close census" % (EM, label),
                "type: refactor %s tier: routine" % MIDDOT,
                "touches: " + ", ".join(sorted([TW, MD, MT, UT])),
                "after: []"]
    ctx.check("the section opens with the st-<n> heading, `type: refactor <middle dot> tier: routine`, touches = the structure rows' files "
              "sorted (a twin's test file, an orphan's defining file and both its tests; not the report or slice rows' files), "
              "and `after: []`", lines[:4] == exp_head, exp_head, lines[:4], r)
    its = section_items(text)
    got = sorted((f, n) for f, raw, n, sub in its)
    exp = sorted([(TW, title + " > it SHALL hold again"), (MD, "SHALL_CAP")])
    ctx.check("one list item per structure row, `- `<file>` :: <JSON name>`, the JSON decoding to the name",
              got == exp, exp, got, r)
    bad = [raw for f, raw, n, sub in its if not raw.isascii() or "SHALL" in raw]
    ctx.check("names are ASCII JSON strings, the H of SHALL escaped", its != [] and bad == [], [], bad, r)
    shall = [l for l in lines if "SHALL" in l]
    ctx.check("the only line holding SHALL is the one criterion `- **ST<n>.1:** WHEN ... SHALL pass.`",
              len(shall) == 1 and bool(CRITERION_RE.match(shall[0])), "one criterion line", shall, r)
    ctx.check("the section has a `Pins:` line", any(l.startswith("Pins:") for l in lines), "Pins: ...", lines, r)
    shp = jt(SHP, *tw_names("shy"), "report")
    got_shp = by_id(listed(mem, label)).get(rid(shp))
    ctx.check("control for the one-SHALL-line check: a twin row whose path holds SHALL is listed, routed report (so its "
              "path is in neither touches: nor an item)", got_shp == shp, shp, got_shp, r)

    if os.geteuid() == 0:
        print("NOTE TP4-A13 failed-write check skipped: running as root, a read-only mode does not bind", flush=True)
        return
    memf = closed_mem()
    census(repo, sha, memf, "--record", "earlier")
    tp = trend_path(memf)
    pre = read_bytes(tp)
    os.chmod(tp, 0o444)
    rf = close(repo, sha, memf, spec)
    left = [p for p in (close_path(memf, label), close_path(memf, label, ".section.md")) if os.path.lexists(p)]
    ctx.check("when the trend row cannot be written (trend.jsonl read-only) the run exits 2 with PRUNE-ERROR, leaves neither "
              "close file, and trend.jsonl is unchanged",
              pre is not None and rf.rc == 2 and any(l.startswith("PRUNE-ERROR") for l in rf.err.splitlines())
              and left == [] and read_bytes(tp) == pre,
              "exit 2 + PRUNE-ERROR, no close file, trend unchanged", (rf.rc, left, pre is not None and read_bytes(tp) == pre), rf)


def tp4_a14(ctx):
    TW = "client/src/r1/r1.test.ts"
    R2, R2T = "game-core/src/r2/r2.rs", "game-core/src/r2/r2_tests.rs"
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(4)})
    sha = change(repo, subject("rs-1", "add"), {
        TW: tw_text("rone"),
        R2: "pub fn plain_r() -> u32 { 1 }\n\n#[cfg(test)]\npub fn only_r() -> u32 { 2 }\n",
        R2T: "#[test]\nfn names() {\n    assert_eq!(plain_r() + only_r(), 3);\n}\n"})
    label = "M-reasons"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("rs-1", None)]))
    mem = closed_mem()
    r = close(repo, sha, mem, spec)
    its = {(f, n): sub for f, raw, n, sub in section_items(section_text(mem, label))}
    cand, surv = tw_names("rone")
    exp_keys = sorted([(TW, cand), (R2, "plain_r"), (R2, "only_r")])
    ctx.check("control: the section lists the twin and both orphans", sorted(its) == exp_keys, exp_keys, sorted(its), r)
    sub = its.get((TW, cand), {})
    m = re.fullmatch(r"`([^`]+)` :: (\".*\")", sub.get("surviving check", ""))
    surv_got = None
    if m:
        try:
            surv_got = (m.group(1), json.loads(m.group(2)))
        except ValueError:
            surv_got = None
    ctx.check("a twin's item: reason `a same-block twin`, surviving check the survivor by path and JSON name, and a "
              "confirmation naming `mr-prune twin`",
              sub.get("reason") == "a same-block twin" and surv_got == (TW, surv)
              and "mr-prune twin" in sub.get("confirmed at merge", ""),
              ("a same-block twin", (TW, surv), "mr-prune twin"), sub, r)
    for sym, reason in (("plain_r", "a symbol no production file names"), ("only_r", "a symbol compiled only under test")):
        sub = its.get((R2, sym), {})
        ctx.check("an orphan's item (%s): reason `%s`, surviving check `the compiler, and the suites that still run`, and a "
                  "confirmed-at-merge sub-item" % (sym, reason),
                  sub.get("reason") == reason and sub.get("surviving check") == "the compiler, and the suites that still run"
                  and sub.get("confirmed at merge", "").strip() != "",
                  (reason, "the compiler, and the suites that still run", "non-empty"), sub, r)


def tp4_a15(ctx):
    C = "client/src/cap/"
    A, B, Cc = C + "a.test.ts", C + "b.test.ts", C + "c.test.ts"
    O1, O2, O3, O4 = C + "o1.ts", C + "o2.ts", C + "o3.ts", C + "o4.ts"
    T3 = C + "t3.test.ts"
    BIG = [C + "big/g%d.test.ts" % i for i in range(9)]
    MID = [C + "mid/m%d.test.ts" % i for i in range(6)]
    one, two = "expect(run('b1', capMid)).toBe(1);", "expect(run('b2', capMid)).toBe(1);"
    b_text = ("describe('b', () => {\n" + it_("one", one) + "\n" + it_("one again", one) + "\n"
              + it_("two", two) + "\n" + it_("two again", two) + "});\n")
    files = {A: tw_text("a", ["capMid", "capTiny"]), B: b_text, Cc: tw_text("c", ["capMid"]),
             O1: ts_def("capBig"), O2: ts_def("capMid"), O3: ts_def("capSmall", "capZed"), O4: ts_def("capTiny"),
             T3: ts_use("capSmall", "capZed")}
    files.update({p: ts_use("capBig") for p in BIG})
    files.update({p: ts_use("capMid") for p in MID})
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(4)})
    sha = change(repo, subject("cp-1", "add"), files)
    label = "M-cap"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("cp-1", None)]))
    # walk: 4 twins (3 files) taken; capBig (10 files: 13) over; capMid (10 files, 3 shared: 10) taken; capSmall (12 files,
    # 6 rows) taken; capZed (no new file, 7th row) over; capTiny (13 files) over
    exp_over = {(A, "a > one again"): False, (B, "b > one again"): False, (B, "b > two again"): False,
                (Cc, "c > one again"): False, (O1, "capBig"): True, (O2, "capMid"): False, (O3, "capSmall"): False,
                (O3, "capZed"): True, (O4, "capTiny"): True}
    exp_items = sorted(k for k, v in exp_over.items() if not v)
    exp_touch = "touches: " + ", ".join(sorted({A, B, Cc, O2, O3, T3} | set(MID)))

    def overs(mem):
        rows = listed(mem, label)
        if not isinstance(rows, list):
            return rows
        return {rid(x): x.get("over-cap") if x.get("route") == "structure" else "route " + str(x.get("route"))
                for x in rows}

    mem = closed_mem()
    r = close(repo, sha, mem, spec)
    got = overs(mem)
    ctx.check("twins are walked before orphans, each by file then name; a row is taken while the section holds <= 6 rows and "
              "<= 12 distinct files (a file shared with taken rows counted once), and the walk goes on past a row that does not "
              "fit: capBig, capZed (7th row) and capTiny (13th file) are over-cap, the rest are not",
              got == exp_over, exp_over, got, r)
    text = section_text(mem, label)
    its = sorted((f, n) for f, raw, n, sub in section_items(text))
    ctx.check("the section holds exactly the 6 rows taken", its == exp_items, exp_items, its, r)
    head = (text or "").splitlines()[2:3]
    ctx.check("its touches: are the 12 distinct files of the rows taken, sorted", head == [exp_touch], [exp_touch], head, r)
    ctx.check("stdout: `rows listed=9 slice=0 structure=9 report=0 over-cap=3`",
              r.crows == crows(9, 0, 9, 0, 3), crows(9, 0, 9, 0, 3), r.crows, r)
    mem2 = new_mem()
    r2 = close(repo, sha, mem2, spec)
    got2 = overs(mem2)
    ctx.check("with the experiment open the same over-cap marks are made in the close file, and no section is written",
              got2 == exp_over and not os.path.exists(close_path(mem2, label, ".section.md")), exp_over, got2, r2)

    # 7 twin rows in 6 files, where file-then-name, name-then-file and file-then-source-order each cut a different 7th row:
    # q1..q5 hold one pair each (names e5..e1, reversed against the files); q6 holds pair `ab` above pair `aa`
    Q = ["client/src/ord/q%d.test.ts" % i for i in range(1, 7)]
    qfiles = {Q[i]: tw_text("e%d" % (5 - i)) for i in range(5)}
    qfiles[Q[5]] = tw_text("ab") + tw_text("aa")
    repo2 = Repo()
    change(repo2, "chore: base", {"client/src/base.ts": filler(4)})
    sha2 = change(repo2, subject("od-1", "add"), qfiles)
    label3 = "M-ord"
    spec3 = put_spec(spec_dir(), label3 + ".spec.md", spec_text([("od-1", None)]))
    mem3 = new_mem()
    r3 = close(repo2, sha2, mem3, spec3)
    exp3 = {(Q[i], "e%d > one again" % (5 - i)): False for i in range(5)}
    exp3[(Q[5], "aa > one again")] = False
    exp3[(Q[5], "ab > one again")] = True
    rows3 = listed(mem3, label3)
    got3 = ({rid(x): x.get("over-cap") if x.get("route") == "structure" else "route " + str(x.get("route")) for x in rows3}
            if isinstance(rows3, list) else rows3)
    ctx.check("the walk orders by file first, then by name within a file: q1..q5 and q6's `aa` are taken, q6's `ab` (defined "
              "above `aa`) is the 7th row and over-cap; not q1's `e5` (last by name) nor q6's `aa` (last by source order)",
              got3 == exp3 and r3.crows == crows(7, 0, 7, 0, 1), (exp3, crows(7, 0, 7, 0, 1)), (got3, r3.crows), r3)


def tp4_a16(ctx):
    PRT, TWS, TWP = "client/src/g1/guardRail.test.ts", "client/src/g2/gs.test.ts", "client/src/g3/gp.test.ts"
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(4)})
    change(repo, subject("nn-1", "add"), {PRT: tw_text("rail"), TWS: tw_text("gs")})
    sha = change(repo, subject("sm-1", "add"), {TWP: tw_text("gp")})
    d = spec_dir()
    label = "M-none"
    spec = put_spec(d, label + ".spec.md", spec_text([("nn-1", None)]))
    put_spec(d, "M-later.spec.md", spec_text([("lt-1", TWS)]))
    spec2 = put_spec(spec_dir(), "M-some.spec.md", spec_text([("sm-1", None)]))
    mem = closed_mem()
    stale = close_path(mem, label, ".section.md")
    os.makedirs(os.path.dirname(stale))
    with open(stale, "wb") as f:
        f.write(b"### st-<n> stale\n")
    r = close(repo, sha, mem, spec)
    exp = [jt(TWS, *tw_names("gs"), "slice", slices=[("M-later.spec.md", "lt-1")]),
           jt(PRT, *tw_names("rail"), "report", kind="protected-twins", token="guard")]
    rows = listed(mem, label)
    ctx.check("control: the listed rows are a protected pair (report) and a twin an unbuilt slice lists (slice)",
              rows == exp, exp, rows, r)
    cf = close_file(mem, label)
    ctx.check("with no row routed structure and the experiment closed, no section file is written (a stale one is removed); "
              "the close file says section null, stdout `section none` and structure=0",
              r.rc == 0 and not os.path.exists(stale) and dig(cf, "experiment-closed") is True and isinstance(cf, dict)
              and "section" in cf and cf["section"] is None and r.csection == "none" and dig(r.crows, "structure") == "0",
              ("no file", "section null", "none"), (os.path.exists(stale), cf, r.csection, r.crows), r)
    r2 = close(repo, sha, mem, spec2)
    ctx.check("control: in the same --mem a milestone with a structure row gets its section file",
              os.path.isfile(close_path(mem, "M-some", ".section.md")) and r2.csection == "M-some.section.md",
              "M-some.section.md", (os.path.isfile(close_path(mem, "M-some", ".section.md")), r2.csection), r2)


def tp4_a17(ctx):
    T, T2 = "client/src/once/once.test.ts", "client/src/once/twice.test.ts"
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(3)})
    sha = change(repo, subject("on-1", "add"), {T: tw_text("once")})
    d = spec_dir()
    label = "M-once"
    spec_body = spec_text([("on-1", None)])
    spec = put_spec(d, label + ".spec.md", spec_body)
    mem = closed_mem()
    census(repo, sha, mem, "--record", label)
    with open(trend_path(mem), "a") as f:
        for line in (json.dumps({"label": label, "close": None}), json.dumps({"label": label, "close": "done"}),
                     "not json at all", json.dumps([label, {"close": {}}]),
                     json.dumps({"label": label + "-other", "close": {}})):
            f.write(line + "\n")
    pre = read_bytes(trend_path(mem))
    r1 = close(repo, sha, mem, spec)
    post = read_bytes(trend_path(mem)) or b""
    ctx.check("a census --record row under the label, a null or string close, a non-JSON line, an array and another label's "
              "close are not this label's close: the first run closes and appends one row",
              r1.rc == 0 and r1.first == "PRUNE-CLOSE %s %s" % (label, sha) and post.startswith(pre)
              and post[len(pre):].count(b"\n") == 1 and close_row(mem, label) is not None,
              "PRUNE-CLOSE + one appended row", (r1.first, post[len(pre):]), r1)
    cj, cs = close_path(mem, label), close_path(mem, label, ".section.md")
    first_ok = os.path.isfile(cj) and os.path.isfile(cs)
    for p in (cj, cs):
        if os.path.isfile(p):
            with open(p, "wb") as f:
                f.write(b"sentinel\n")
    t1 = read_bytes(trend_path(mem))
    listing = sorted(os.listdir(os.path.join(mem, "prune", "close"))) if first_ok else None
    sha2 = change(repo, subject("on-1", "more"), {T2: tw_text("twice")})
    r2 = close(repo, sha2, mem, spec)
    ctx.check("a second close for the label, at a later commit, prints `PRUNE-CLOSE-SKIP <label>` alone and exits 0",
              first_ok and r2.rc == 0 and r2.out.splitlines() == ["PRUNE-CLOSE-SKIP " + label],
              ["PRUNE-CLOSE-SKIP " + label], (first_ok, r2.rc, r2.out.splitlines()), r2)
    unchanged = (read_bytes(trend_path(mem)) == t1 and read_bytes(cj) == b"sentinel\n" and read_bytes(cs) == b"sentinel\n"
                 and first_ok and sorted(os.listdir(os.path.join(mem, "prune", "close"))) == listing)
    ctx.check("the skip writes nothing: no second trend row, the close and section files not rewritten, no new file",
              unchanged, "all byte-identical", (read_bytes(cj), read_bytes(cs)), r2)
    put_spec(d, label + ".spec.md", "# M\n\n## Slices\n\nNo slice yet.\n")
    r3 = close(repo, sha2, mem, spec)
    ctx.check("a FILE error comes before the skip: the label's spec with no slice is refused (exit 2, PRUNE-ERROR), nothing written",
              close_refused(r3) and read_bytes(trend_path(mem)) == t1 and read_bytes(cj) == b"sentinel\n",
              "exit 2 + PRUNE-ERROR", (r3.rc, r3.first), r3)
    put_spec(d, label + ".spec.md", spec_body)
    mem3 = new_mem()
    os.makedirs(trend_path(mem3))
    r4 = close(repo, sha, mem3, spec)
    ctx.check("a trend.jsonl that cannot be read is a PRUNE-ERROR (the once check cannot be made) and no close file is written",
              close_refused(r4) and not os.path.exists(os.path.join(mem3, "prune", "close")),
              "exit 2 + PRUNE-ERROR, no close/", (r4.rc, r4.first, os.listdir(os.path.join(mem3, "prune"))), r4)


def tp4_a18(ctx):
    T1, P1 = "client/src/z1/z1.test.ts", "client/src/z1/z1.ts"
    repo = Repo()
    change(repo, "chore: base", {T1: tw_text("zone"), P1: ts_def("zLonely")})
    change(repo, "chore: prepare zr-1 %s mentioned, not named" % EM, {"client/src/z2/z2.test.ts": tw_text("ztwo")})
    sha = change(repo, subject("ot-7", "another milestone"), {"client/src/z3/z3.test.ts": tw_text("zthree")})
    label = "M-zero"
    spec = put_spec(spec_dir(), label + ".spec.md", spec_text([("zr-2", None), ("zr-1", None)]))
    mem = closed_mem()
    r = close(repo, sha, mem, spec)
    co = close_obj(mem, label)
    full = census(repo, sha, new_mem())
    ctx.check("control: the census at the commit has 3 twin rows and an orphan", len(full.rows) == 3 and len(full.orph) == 1,
              (3, 1), (full.rows, full.orph), full)
    ctx.check("exit 0 and every id is recorded unmatched, in the spec's order, with no slice (stdout too)",
              r.rc == 0 and dig(co, "slices") == {} and dig(co, "unmatched") == ["zr-2", "zr-1"]
              and r.cunmatched == ["zr-2", "zr-1"] and r.cslices == {},
              ({}, ["zr-2", "zr-1"]), (r.rc, dig(co, "slices"), dig(co, "unmatched"), r.cunmatched), r)
    zero = {"test-lines": 0, "product-lines": 0}
    ctx.check("lines added and removed are zero", dig(co, "added") == zero and dig(co, "removed") == zero,
              (zero, zero), (dig(co, "added"), dig(co, "removed")), r)
    ctx.check("changed is zero files and lines with ratio null; signals are all zero",
              changed_got(co) == changed_exp(0, 0, 0, 0)
              and dig(co, "signals") == {"source-text": 0, "churn": 0, "protected-churn": 0, "widened": 0},
              changed_exp(0, 0, 0, 0), (changed_got(co), dig(co, "signals")), r)
    ctx.check("the candidate list is empty: rows [] in the close file, `rows listed=0 ...`, and no section file though the "
              "experiment is closed",
              listed(mem, label) == [] and r.crows == crows(0, 0, 0, 0, 0) and r.csection == "none"
              and not os.path.exists(close_path(mem, label, ".section.md")),
              ([], crows(0, 0, 0, 0, 0), "none"), (listed(mem, label), r.crows, r.csection), r)
    oracle = recorded_row(repo, sha, label)
    row = close_row(mem, label)
    ctx.check("the row still carries the census's totals and counts at the commit",
              isinstance(oracle, dict) and dig(row, "totals") == oracle.get("totals") and dig(row, "counts") == oracle.get("counts"),
              oracle, row, r)


def tp4_a19(ctx):
    T, DV, DVT = "client/src/v1/v1.test.ts", "client/src/v2/v2.ts", "client/src/v2/v2.test.ts"
    repo = Repo()
    change(repo, "chore: base", {"client/src/base.ts": filler(4)})
    sha = change(repo, subject("vw-1", "add"), {T: tw_text("vone"), DV: ts_def("vLonely"), DVT: ts_use("vLonely")})
    repo.put(T, "describe('changed in the worktree only', () => {});\n")
    repo.put("client/src/untracked.ts", filler(2))
    d = spec_dir()
    label = "M-view"
    spec = put_spec(d, label + ".spec.md", spec_text([("vw-1", T)]))
    put_spec(d, "M-else.spec.md", spec_text([("el-1", "client/src/elsewhere/**")]))
    put_spec(d, "notes.md", "# notes\n")
    mem = closed_mem()
    os.makedirs(os.path.join(mem, "gates"))
    for rel, text in (("gates/v.widened.jsonl", json.dumps({"slice": "v", "path": T, "why": "pin"}) + "\n"),
                      ("mr-prune-keep.json", "{}\n"), ("notes.txt", "a note\n")):
        with open(os.path.join(mem, rel), "w") as f:
            f.write(text)
    prune = os.path.join(mem, "prune")
    before = (snapshot(repo), tree_state(mem, prune), tree_state(d))
    r = close(repo, sha, mem, spec)
    after = (snapshot(repo), tree_state(mem, prune), tree_state(d))
    ids = [rid(x) for x in listed(mem, label) or []] if isinstance(listed(mem, label), list) else []
    ctx.check("control: close ran from the commit (its twin row listed, not the worktree's edit) and wrote the close file, the "
              "section file and the trend row",
              r.rc == 0 and (T, "vone > one again") in ids and os.path.isfile(close_path(mem, label, ".section.md"))
              and close_row(mem, label) is not None, "all written", (r.rc, ids), r)
    ctx.check("the inspected repository's worktree (an uncommitted edit, an untracked file), index and refs are unchanged",
              after[0] == before[0], before[0], after[0], r)
    ctx.check("every file under --mem outside prune/ (tester-ab, gates, keep file, a note) is unchanged, none added",
              after[1] == before[1], before[1], after[1], r)
    ctx.check("the spec directory is unchanged: nothing written beside the spec", after[2] == before[2], before[2], after[2], r)
    in_prune = (sorted(os.listdir(prune)) if os.path.isdir(prune) else None,
                sorted(os.listdir(os.path.join(prune, "close"))) if os.path.isdir(os.path.join(prune, "close")) else None)
    exp_prune = (["close", "trend.jsonl"], [label + ".json", label + ".section.md"])
    ctx.check("prune/ holds only trend.jsonl and close/, and close/ only <label>.json and <label>.section.md",
              in_prune == exp_prune, exp_prune, in_prune, r)

    inside = os.path.join(repo.path, "memdir")
    os.makedirs(inside)
    with open(os.path.join(inside, "mr-tester-ab.jsonl"), "w") as f:
        f.write('{"kind": "close"}\n')
    before = snapshot(repo)
    r = close(repo, sha, inside, spec)
    ctx.check("a --mem inside --repo is refused (exit 2, PRUNE-ERROR) and nothing is written in the repository",
              close_refused(r) and snapshot(repo) == before and os.listdir(inside) == ["mr-tester-ab.jsonl"],
              "exit 2 + PRUNE-ERROR, repo unchanged", (r.rc, os.listdir(inside)), r)
    target = os.path.join(repo.path, "linked")
    os.makedirs(target)
    outside = closed_mem()
    os.symlink(target, os.path.join(outside, "prune"))
    before = snapshot(repo)
    r = close(repo, sha, outside, spec)
    ctx.check("a --mem whose prune/ is a symlink into --repo gets nothing written into the repository",
              os.listdir(target) == [] and snapshot(repo) == before, "linked dir empty, repo unchanged",
              (os.listdir(target), snapshot(repo) == before), r)

    away = tempfile.mkdtemp(prefix="away-", dir=ROOT)
    mem_ok = closed_mem()
    os.symlink(away, os.path.join(mem_ok, "prune"))
    r = close(repo, sha, mem_ok, spec)
    ctx.check("control: a prune/ that is a symlink to a directory outside the repository is allowed: exit 0, the close file "
              "and the trend row written there",
              r.rc == 0 and os.path.isfile(os.path.join(away, "close", label + ".json")) and close_row(mem_ok, label) is not None,
              "exit 0, files under the linked directory", (r.rc, sorted(os.listdir(away))), r)
    elsewhere = tempfile.mkdtemp(prefix="elsewhere-", dir=ROOT)
    tgt = os.path.join(elsewhere, "t.jsonl")
    with open(tgt, "wb") as f:
        f.write(b'{"label": "elsewhere"}\n')
    mem_ln = closed_mem()
    os.makedirs(os.path.join(mem_ln, "prune"))
    os.symlink(tgt, trend_path(mem_ln))
    r = close(repo, sha, mem_ln, spec)
    ctx.check("a prune/trend.jsonl that is a symlink to a file outside prune/ is a PRUNE-ERROR (exit 2), the link's target "
              "is not written, and no close file is left",
              r.rc == 2 and any(l.startswith("PRUNE-ERROR") for l in r.err.splitlines())
              and read_bytes(tgt) == b'{"label": "elsewhere"}\n' and not os.path.lexists(close_path(mem_ln, label))
              and not os.path.lexists(close_path(mem_ln, label, ".section.md")),
              "exit 2 + PRUNE-ERROR, target unchanged", (r.rc, read_bytes(tgt), os.listdir(os.path.join(mem_ln, "prune"))), r)


FIXTURES = [
    ("TP1-A1", tp1_a1), ("TP1-A2", tp1_a2), ("TP1-A3", tp1_a3), ("TP1-A4", tp1_a4),
    ("TP1-A5", tp1_a5), ("TP1-A6", tp1_a6), ("TP1-A7", tp1_a7), ("TP1-A8", tp1_a8),
    ("TP1-A9", tp1_a9), ("TP1-A10", tp1_a10), ("TP1-A11", tp1_a11), ("TP1-A12", tp1_a12),
    ("TP1-A13", tp1_a13), ("TP1-A14", tp1_a14), ("TP1-A15", tp1_a15),
    ("TP2-A1", tp2_a1), ("TP2-A2", tp2_a2), ("TP2-A3", tp2_a3), ("TP2-A4", tp2_a4),
    ("TP2-A5", tp2_a5), ("TP2-A6", tp2_a6), ("TP2-A7", tp2_a7), ("TP2-A8", tp2_a8),
    ("TP2-A9", tp2_a9), ("TP2-A10", tp2_a10), ("TP2-A11", tp2_a11), ("TP2-A12", tp2_a12),
    ("TP2-A13", tp2_a13), ("TP2-A14", tp2_a14),
    ("TP4-A1", tp4_a1), ("TP4-A2", tp4_a2), ("TP4-A3", tp4_a3), ("TP4-A4", tp4_a4),
    ("TP4-A5", tp4_a5), ("TP4-A6", tp4_a6), ("TP4-A7", tp4_a7), ("TP4-A8", tp4_a8),
    ("TP4-A9", tp4_a9), ("TP4-A10", tp4_a10), ("TP4-A11", tp4_a11), ("TP4-A12", tp4_a12),
    ("TP4-A13", tp4_a13), ("TP4-A14", tp4_a14), ("TP4-A15", tp4_a15), ("TP4-A16", tp4_a16),
    ("TP4-A17", tp4_a17), ("TP4-A18", tp4_a18), ("TP4-A19", tp4_a19),
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
