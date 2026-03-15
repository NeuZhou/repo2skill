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
```