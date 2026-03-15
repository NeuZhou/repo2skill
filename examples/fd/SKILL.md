---
name: fd
description: [[中文](https://github.com/cha0ran/fd-zh)] [[한국어](https://github.com/spearkkk/fd-kor)] WHEN: run `fd-find` commands, make http requests, search through files or text. Triggers: use fd, install fd, how to use fd, run fd-find.
---

# fd

[[中文](https://github.com/cha0ran/fd-zh)] [[한국어](https://github.com/spearkkk/fd-kor)]

## When to Use

- Run `fd-find` commands
- Make HTTP requests
- Search through files or text

## When NOT to Use

- GUI or web-based workflows where CLI is not available
- Projects using Python or JavaScript (different ecosystem)

## Quick Start

### Install

cargo install --path .
```

### Basic Usage

First, to get an overview of all available command line options, you can either run
[`fd -h`](#command-line-options) for a concise help message or `fd --help` for a more detailed
version.

## CLI Commands

- `fd-find`

## Key Features

- Intuitive syntax: `fd PATTERN` instead of `find -iname '*PATTERN*'`.
- Regular expression (default) and glob-based patterns.
- Very fast due to parallelized directory traversal.
- Uses colors to highlight different file types (same as `ls`).
- Supports parallel command execution

## Project Info

- **Language:** Rust
- **License:** MIT OR Apache-2.0
- **Tests:** Yes

## File Structure

```
├── contrib/
│   └── completion/
├── doc/
│   ├── sponsors/
│   ├── fd.1
│   ├── logo.png
│   ├── logo.svg
│   ├── release-checklist.md
│   ├── screencast.sh
│   ├── screencast.svg
│   └── sponsors.md
├── scripts/
│   ├── create-deb.sh
│   └── version-bump.sh
├── src/
│   ├── exec/
│   ├── filter/
│   ├── fmt/
│   ├── cli.rs
│   ├── config.rs
```
```