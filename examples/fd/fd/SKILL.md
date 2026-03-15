---
name: fd
description: fd is a simple, fast and user-friendly alternative to find. CLI tool with commands: fd-find. Language: Rust.
---

# fd

fd is a simple, fast and user-friendly alternative to find.

## When to Use

Use when you need to run `fd-find` commands.

## Quick Start

cargo install --path .
```

## CLI Commands

- `fd-find`

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