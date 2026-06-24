#!/usr/bin/env python3
"""Eval: architecture invariant — the domain (app.money) imports no IO/network."""

import pathlib
import sys

src = pathlib.Path("src/app/money.py").read_text()
forbidden = ["import requests", "import socket", "import httpx", "urllib", "open("]
leaks = [f for f in forbidden if f in src]
if leaks:
    print(f"eval FAIL: domain leaked IO: {leaks}")
    sys.exit(1)
print("eval PASS: domain has no IO dependencies")
