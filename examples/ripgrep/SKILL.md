---
name: ripgrep
description: ripgrep is a line-oriented search tool that recursively searches the current directory for a regex pattern. By default, ripgrep will respect gitignore rules and automatically skip hidden files/directories and binary files. (To disable all automatic filtering by default, use `rg -uuu`.) ripgrep has first class support on Windows, macOS and Linux, with binary downloads available for [every release](https://github.com/BurntSushi/ripgrep/releases). ripgrep is similar to other popular search tools li
---

# ripgrep

ripgrep is a line-oriented search tool that recursively searches the current directory for a regex pattern. By default, ripgrep will respect gitignore rules and automatically skip hidden files/directories and binary files. (To disable all automatic filtering by default, use `rg -uuu`.) ripgrep has first class support on Windows, macOS and Linux, with binary downloads available for [every release](https://github.com/BurntSushi/ripgrep/releases). ripgrep is similar to other popular search tools like The Silver Searcher, ack and grep.

## When to Use

- Run `ripgrep` commands
- Make HTTP requests
- Search through files or text

## When NOT to Use

- GUI or web-based workflows where CLI is not available
- Projects using Python or JavaScript (different ecosystem)

## Quick Start

### Install

```
$ brew install ripgrep
```
```
$ sudo port install ripgrep
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