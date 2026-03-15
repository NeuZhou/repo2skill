---
name: ruff
description: [**Docs**](https://docs.astral.sh/ruff/) | [**Playground**](https://play.ruff.rs/) WHEN: make http requests, lint or format code. Triggers: use ruff, install ruff, how to use ruff, make http request.
---

# ruff

[**Docs**](https://docs.astral.sh/ruff/) | [**Playground**](https://play.ruff.rs/)

## When to Use

- Make HTTP requests
- Lint or format code

## When NOT to Use

- Projects using Go or Java (different ecosystem)

## Quick Start

### Install

```shell
uvx ruff check   # Lint all files in the current directory.
uvx ruff format  # Format all files in the current directory.
```

### Basic Usage

```shell
ruff check                          # Lint all files in the current directory (and any subdirectories).
ruff check path/to/code/            # Lint all files in `/path/to/code` (and any subdirectories).
ruff check path/to/code/*.py        # Lint all `.py` files in `/path/to/code`.
ruff check path/to/code/to/file.py  # Lint `file.py`.
ruff check @arguments.txt           # Lint using an input file, treating its contents as newline-delimited command-line arguments.
```

```shell
ruff format                          # Format all files in the current directory (and any subdirectories).
ruff format path/to/code/            # Format all files in `/path/to/code` (and any subdirectories).
ruff format path/to/code/*.py        # Format all `.py` files in `/path/to/code`.
ruff format path/to/code/to/file.py  # Format `file.py`.
ruff format @arguments.txt           # Format using an input file, treating its contents as newline-delimited command-line arguments.
```

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