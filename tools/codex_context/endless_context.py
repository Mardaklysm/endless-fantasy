#!/usr/bin/env python3
"""Compact read-only orientation helpers for Endless Fantasy Codex work."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
EXCLUDED_DIR_NAMES = {
    ".git",
    ".vite",
    "coverage",
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
    "tmp",
}
OBVIOUS_GENERATED_PARTS = {
    "generated",
    "previews",
    "preview",
    "reports",
    "screenshots",
}
SEARCH_ROOTS = ("src", "tools", "agent_knowledge")


def main() -> int:
    parser = argparse.ArgumentParser(description="Compact read-only Codex context helpers for Endless Fantasy.")
    subcommands = parser.add_subparsers(dest="command", required=True)

    subcommands.add_parser("repo_summary", help="Print compact repo orientation.")

    large = subcommands.add_parser("large_file_detector", help="List large files while skipping generated/dependency outputs.")
    large.add_argument("--min-bytes", type=int, default=50000, help="Minimum file size to report.")
    large.add_argument("--limit", type=int, default=30, help="Maximum number of files to report.")

    subcommands.add_parser("knowledge_file_audit", help="Summarize agent_knowledge files without dumping contents.")

    extractor = subcommands.add_parser("relevant_function_extractor", help="Find compact snippets for symbols/terms.")
    extractor.add_argument("symbols", nargs="+", help="One or more symbols or search terms.")
    extractor.add_argument("--limit", type=int, default=12, help="Maximum matches per symbol.")

    log = subcommands.add_parser("compact_git_log", help="Print short git log.")
    log.add_argument("-n", "--limit", type=int, default=10, help="Number of commits to show.")

    args = parser.parse_args()
    if args.command == "repo_summary":
        return repo_summary()
    if args.command == "large_file_detector":
        return large_file_detector(args.min_bytes, args.limit)
    if args.command == "knowledge_file_audit":
        return knowledge_file_audit()
    if args.command == "relevant_function_extractor":
        return relevant_function_extractor(args.symbols, args.limit)
    if args.command == "compact_git_log":
        return compact_git_log(args.limit)
    parser.error(f"Unknown command: {args.command}")
    return 2


def repo_summary() -> int:
    package = read_package_json()
    project_name = package.get("name") or "Endless Fantasy / Crystal Oath"
    print(f"Project: {project_name}")
    print(f"Root: {REPO_ROOT}")

    roots = [
        "src/app",
        "src/scene",
        "src/data",
        "src/systems",
        "src/render",
        "src/world",
        "src/assets",
        "tools",
        "agent_knowledge",
    ]
    existing_roots = [root for root in roots if (REPO_ROOT / root).exists()]
    print("Key roots: " + ", ".join(existing_roots))

    scripts = package.get("scripts") if isinstance(package.get("scripts"), dict) else {}
    if scripts:
        compact_scripts = ", ".join(f"{name}={command}" for name, command in scripts.items())
        print(f"Package scripts: {compact_scripts}")
    else:
        print("Package scripts: none found")

    entries = ["index.html", "src/main.ts", "src/app/createGame.ts", "src/scene/CrystalOathScene.ts", "vite.config.ts"]
    print("Entry files: " + ", ".join(path for path in entries if (REPO_ROOT / path).exists()))

    knowledge_root = REPO_ROOT / "agent_knowledge"
    docs = sorted(path.name for path in knowledge_root.glob("*.md")) if knowledge_root.exists() else []
    profiles = sorted(path.name for path in (knowledge_root / "task-profiles").glob("*.md")) if (knowledge_root / "task-profiles").exists() else []
    print("Knowledge docs: " + summarize_names(docs))
    print("Task profiles: " + summarize_names(profiles))
    return 0


def large_file_detector(min_bytes: int, limit: int) -> int:
    if min_bytes < 0 or limit < 1:
        print("--min-bytes must be >= 0 and --limit must be >= 1", file=sys.stderr)
        return 2

    files: list[tuple[int, Path]] = []
    for path in REPO_ROOT.rglob("*"):
        if not path.is_file() or should_skip_path(path):
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size >= min_bytes:
            files.append((size, path))

    files.sort(key=lambda item: item[0], reverse=True)
    if not files:
        print(f"No files >= {min_bytes} bytes found outside excluded paths.")
        return 0

    print(f"Largest files >= {min_bytes} bytes (limit {limit}):")
    for size, path in files[:limit]:
        print(f"{format_bytes(size):>9}  {relative(path)}")
    return 0


def knowledge_file_audit() -> int:
    knowledge_root = REPO_ROOT / "agent_knowledge"
    if not knowledge_root.exists():
        print("agent_knowledge/ not found.", file=sys.stderr)
        return 1

    paths = sorted(knowledge_root.glob("*.md")) + sorted((knowledge_root / "task-profiles").glob("*.md"))
    for path in paths:
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError as error:
            print(f"{relative(path)}: unable to read ({error})")
            continue
        title = first_heading(lines) or "(no heading)"
        purpose = infer_purpose(lines, title)
        marker = "router" if is_router_file(path) else "doc"
        print(f"{relative(path)} | {len(lines)} lines | {marker} | {title} | {purpose}")
    return 0


def relevant_function_extractor(symbols: list[str], limit: int) -> int:
    if limit < 1:
        print("--limit must be >= 1", file=sys.stderr)
        return 2
    rg = shutil.which("rg")
    for symbol in symbols:
        print(f"== {symbol} ==")
        if rg:
            output = run_rg(rg, symbol)
            print_limited_rg_output(output, limit)
        else:
            print_python_search(symbol, limit)
    return 0


def compact_git_log(limit: int) -> int:
    if limit < 1:
        print("--limit must be >= 1", file=sys.stderr)
        return 2
    try:
        result = subprocess.run(
            ["git", "log", f"-n{limit}", "--pretty=format:%h %s"],
            cwd=REPO_ROOT,
            check=False,
            text=True,
            capture_output=True,
        )
    except OSError as error:
        print(f"git unavailable: {error}")
        return 0
    if result.returncode != 0:
        message = result.stderr.strip() or "git log failed"
        print(message)
        return 0
    print(result.stdout.strip() or "No git history found.")
    return 0


def read_package_json() -> dict:
    path = REPO_ROOT / "package.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def summarize_names(names: list[str], max_names: int = 12) -> str:
    if not names:
        return "none"
    if len(names) <= max_names:
        return ", ".join(names)
    visible = ", ".join(names[:max_names])
    return f"{visible}, ... (+{len(names) - max_names} more)"


def should_skip_path(path: Path) -> bool:
    rel_parts = [part.lower() for part in path.relative_to(REPO_ROOT).parts]
    if any(part in EXCLUDED_DIR_NAMES for part in rel_parts):
        return True
    return any(part in OBVIOUS_GENERATED_PARTS for part in rel_parts)


def format_bytes(size: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f}{unit}" if unit != "B" else f"{size}B"
        value /= 1024
    return f"{size}B"


def relative(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT)).replace(os.sep, "/")


def first_heading(lines: list[str]) -> str | None:
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return None


def infer_purpose(lines: list[str], title: str) -> str:
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("```"):
            continue
        if len(stripped) > 120:
            return stripped[:117] + "..."
        return stripped
    if title != "(no heading)":
        return title
    return "No purpose line found."


def is_router_file(path: Path) -> bool:
    rel = relative(path)
    return rel in {"agent_knowledge/README.md", "agent_knowledge/code-map.md", "agent_knowledge/project-workflows.md"} or rel.startswith("agent_knowledge/task-profiles/")


def run_rg(rg: str, symbol: str) -> str:
    roots = [root for root in SEARCH_ROOTS if (REPO_ROOT / root).exists()]
    try:
        result = subprocess.run(
            [rg, "-n", "-F", "-C", "2", "--glob", "!node_modules", "--glob", "!dist", "--glob", "!tmp", "--", symbol, *roots],
            cwd=REPO_ROOT,
            check=False,
            text=True,
            capture_output=True,
        )
    except OSError as error:
        return f"rg unavailable during search: {error}\n"
    if result.returncode not in (0, 1):
        return result.stderr.strip() + "\n"
    return result.stdout


def print_limited_rg_output(output: str, limit: int) -> None:
    if not output.strip():
        print("No matches.")
        return
    printed_matches = 0
    printed_lines = 0
    for line in output.splitlines():
        if line == "--":
            if printed_matches >= limit:
                break
            print(line)
            continue
        if ":" in line and not line.startswith(" "):
            printed_matches += 1
            if printed_matches > limit:
                break
        if printed_lines >= limit * 6:
            print("... truncated ...")
            break
        print(line)
        printed_lines += 1
    if printed_matches > limit:
        print("... truncated ...")


def print_python_search(symbol: str, limit: int) -> None:
    symbol_lower = symbol.lower()
    matches = 0
    for root in SEARCH_ROOTS:
        root_path = REPO_ROOT / root
        if not root_path.exists():
            continue
        for path in root_path.rglob("*"):
            if matches >= limit:
                print("... truncated ...")
                return
            if not path.is_file() or should_skip_path(path):
                continue
            try:
                lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
            except OSError:
                continue
            for index, line in enumerate(lines):
                if symbol_lower not in line.lower():
                    continue
                matches += 1
                start = max(0, index - 2)
                end = min(len(lines), index + 3)
                for number in range(start, end):
                    print(f"{relative(path)}:{number + 1}:{lines[number]}")
                print("--")
                if matches >= limit:
                    print("... truncated ...")
                    return
    if matches == 0:
        print("No matches.")


if __name__ == "__main__":
    raise SystemExit(main())
