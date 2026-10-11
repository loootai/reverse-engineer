#!/usr/bin/env python3
"""Compare two snapshot files and print what changed. Standard library only.

Usage: diff_snapshots.py OLD NEW [--max-lines N]

Text or markdown files: prints added and removed lines (blank lines and
whitespace-only changes ignored).
JSON files: prints keys added, removed and changed, with old and new values.
Reads files. Never runs them, never touches the network.
"""
import difflib
import json
import sys


def load(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def flatten(value, prefix=""):
    out = {}
    if isinstance(value, dict):
        for k, v in value.items():
            out.update(flatten(v, f"{prefix}.{k}" if prefix else str(k)))
    elif isinstance(value, list):
        for i, v in enumerate(value):
            out.update(flatten(v, f"{prefix}[{i}]"))
    else:
        out[prefix] = value
    return out


def diff_json(old, new, limit):
    a, b = flatten(json.loads(old)), flatten(json.loads(new))
    added = sorted(set(b) - set(a))
    removed = sorted(set(a) - set(b))
    changed = sorted(k for k in set(a) & set(b) if a[k] != b[k])
    print(f"JSON diff: {len(added)} added, {len(removed)} removed, {len(changed)} changed")
    for k in added[:limit]:
        print(f"+ {k} = {b[k]!r}")
    for k in removed[:limit]:
        print(f"- {k} (was {a[k]!r})")
    for k in changed[:limit]:
        print(f"~ {k}: {a[k]!r} -> {b[k]!r}")
    return len(added) + len(removed) + len(changed)


def diff_text(old, new, limit):
    a = [ln.strip() for ln in old.splitlines() if ln.strip()]
    b = [ln.strip() for ln in new.splitlines() if ln.strip()]
    added, removed = [], []
    for ln in difflib.unified_diff(a, b, lineterm="", n=0):
        if ln.startswith(("+++", "---", "@@")):
            continue
        (added if ln.startswith("+") else removed).append(ln[1:])
    print(f"Text diff: {len(added)} lines added, {len(removed)} removed")
    for ln in added[:limit]:
        print(f"+ {ln}")
    for ln in removed[:limit]:
        print(f"- {ln}")
    return len(added) + len(removed)


def main(argv):
    limit = 60
    if "--max-lines" in argv:
        i = argv.index("--max-lines")
        limit = int(argv[i + 1])
        del argv[i : i + 2]
    if len(argv) != 2:
        print(__doc__)
        return 2
    old, new = load(argv[0]), load(argv[1])
    try:
        n = diff_json(old, new, limit)
    except ValueError:
        n = diff_text(old, new, limit)
    if n == 0:
        print("No change.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
