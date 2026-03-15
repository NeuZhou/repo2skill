---
name: fzf
description: fzf is a general-purpose command-line fuzzy finder. WHEN: run `fzf` commands, search through files or text. Triggers: use fzf, install fzf, how to use fzf, run fzf.
---

# fzf

fzf is a general-purpose command-line fuzzy finder.

## When to Use

- Run `fzf` commands
- Search through files or text

## When NOT to Use

- GUI or web-based workflows where CLI is not available
- Projects using Python or JavaScript (different ecosystem)

## Quick Start

### Install

```bash
go install github.com/junegunn/fzf@latest
```

## CLI Commands

- `fzf`

## Project Info

- **Language:** Go, Ruby
- **Tests:** Yes
- **Key dependencies:** github.com/charlievieth/fastwalk, github.com/gdamore/tcell/v2, github.com/junegunn/go-shellwords, github.com/mattn/go-isatty, github.com/rivo/uniseg, golang.org/x/sys, golang.org/x/term

## File Structure

```
├── bin/
│   ├── fzf-preview.sh
│   └── fzf-tmux
├── doc/
│   └── fzf.txt
├── man/
│   └── man1/
├── plugin/
│   └── fzf.vim
├── shell/
│   ├── common.fish
│   ├── common.sh
│   ├── completion.bash
│   ├── completion.fish
│   ├── completion.zsh
│   ├── key-bindings.bash
│   ├── key-bindings.fish
│   ├── key-bindings.zsh
│   └── update.sh
├── src/
```