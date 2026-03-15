---
name: ripgrep
description: ripgrep is a line-oriented search tool that recursively searches the current directory for a regex pattern while respecting gitignore rules. ripgrep has first class support on Windows, macOS and Linux. CLI tool with commands: ripgrep. Language: Rust.
---

# ripgrep

ripgrep is a line-oriented search tool that recursively searches the current

## When to Use

Use when you need to run `ripgrep` commands.

## Quick Start

```
$ brew install ripgrep
```
```
$ sudo port install ripgrep
```
```
$ choco install ripgrep
```

## CLI Commands

- `ripgrep`

## Project Info

- **Language:** Rust, Ruby
- **License:** Unlicense OR MIT
- **Tests:** Yes

## File Structure

```
├── benchsuite/
│   ├── runs/
│   └── benchsuite
├── ci/
│   ├── sha256-releases
│   ├── test-complete
│   ├── ubuntu-install-packages
│   └── utils.sh
├── crates/
│   ├── cli/
│   ├── core/
│   ├── globset/
│   ├── grep/
│   ├── ignore/
│   ├── matcher/
│   ├── pcre2/
│   ├── printer/
│   ├── regex/
│   └── searcher/
├── fuzz/
```