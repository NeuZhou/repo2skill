---
name: ruff
description: An extremely fast Python linter and code formatter, written in Rust. Language: Python.
---

# ruff

An extremely fast Python linter and code formatter, written in Rust.

## When to Use

Use when working with the ruff Python library.

## Quick Start

```shell
uvx ruff check   # Lint all files in the current directory.
uvx ruff format  # Format all files in the current directory.
```

## Usage

To run Ruff as a linter, try any of the following:

```shell
ruff check                          # Lint all files in the current directory (and any subdirectories).
ruff check path/to/code/            # Lint all files in `/path/to/code` (and any subdirectories).
ruff check path/to/code/*.py        # Lint all `.py` files in `/path/to/code`.
ruff check path/to/code/to/file.py  # Lint `file.py`.
ruff check @arguments.txt           # Lint using an input file, treating its contents as newline-delimited command-line arguments.
```

Or, to run Ruff as a formatter:

```shell
ruff format                          # Format all files in the current directory (and any subdirectories).
ruff format path/to/code/            # Format all files in `/path/to/code` (and any subdirectories).
ruff format path/to/code/*.py        # Format all `.py` files in `/path/to/code`.
ruff format path/to/code/to/file.py  # Format `file.py`.
ruff format @arguments.txt           # Format using an input file, treating its contents as newline-delimited command-line arguments.
```

Ruff can also be used as a [pre-commit](https://pre-commit.com/) hook via [`ruff-pre-commit`](https://github.com/astral-sh/ruff-pre-commit):

```yaml
- repo: https://github.com/astral-sh/ruff-pre-commit
  # Ruff version.
  rev: v0.15.6
  hooks:
    # Run the linter.
    - id: ruff-check
      args: [ --fix ]
    # Run the formatter.
    - id: ruff-format
```

Ruff can also be used as a [VS Code extension](https://github.com/astral-sh/ruff-vscode) or with [various other editors](https://docs.astral.sh/ruff/editors/setup).

Ruff can also be used as a [GitHub Action](https://github.com/features/actions) via
[`ruff-action`](https://github.com/astral-sh/ruff-action):

```yaml
name: Ruff
on: [ push, pull_request ]
jobs:
  ruff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/ruff-action@v3
```

## Project Info

- **Language:** Python, Rust, TypeScript, JavaScript
- **Tests:** Yes

## File Structure

```
├── assets/
│   ├── badge/
│   ├── png/
│   └── svg/
├── changelogs/
│   ├── 0.1.x.md
│   ├── 0.10.x.md
│   ├── 0.11.x.md
│   ├── 0.12.x.md
│   ├── 0.13.x.md
│   ├── 0.14.x.md
│   ├── 0.2.x.md
│   ├── 0.3.x.md
│   ├── 0.4.x.md
│   ├── 0.5.x.md
│   ├── 0.6.x.md
│   ├── 0.7.x.md
│   ├── 0.8.x.md
│   └── 0.9.x.md
├── crates/
```