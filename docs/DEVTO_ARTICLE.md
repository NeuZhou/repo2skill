---
title: I Built a Tool That Converts Any GitHub Repo Into an AI Agent Skill
published: false
tags: ai, opensource, cli, productivity
---

# I Built a Tool That Converts Any GitHub Repo Into an AI Agent Skill

## The Problem

AI agents are getting powerful. They can write code, run shell commands, browse the web. But they're surprisingly blind to most developer tools.

Want your agent to use `ripgrep` instead of `grep`? It needs a structured skill file that describes what the tool does, when to use it, how to install it, and what the common commands are. Writing that by hand takes 15-30 minutes per tool — read the README, extract the important parts, write trigger phrases, format everything properly.

GitHub has 400M+ repos. Nobody's writing skill files for all of them.

## The Solution: repo2skill

```bash
npm install -g repo2skill
repo2skill sindresorhus/got
```

That's it. One command, and you get a complete skill with `SKILL.md`, reference files, and proper formatting.

## How It Works

The pipeline is straightforward:

1. **Clone** — `git clone` the repo (shallow, just what's needed)
2. **Analyze** — Parse README, detect language from manifests (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.), extract CLI commands, API examples, and install instructions
3. **Generate** — Produce a structured `SKILL.md` with description, trigger phrases, usage examples, and "when to use / when not to use" sections

No LLM in the loop. Pure heuristic analysis — fast, deterministic, and works offline after the clone.

## Before & After

### Before: Writing a skill manually

You open the ripgrep README (it's long), scan through it, and write something like:

```markdown
---
name: ripgrep
description: Fast recursive grep tool
---

# ripgrep

A fast search tool.

## Usage

rg "pattern" path
```

Took 20 minutes. It's incomplete. You forgot trigger phrases, install instructions, and the "when not to use" section.

### After: repo2skill

```bash
$ repo2skill BurntSushi/ripgrep
```

Generated output:

```markdown
---
name: ripgrep
description: ripgrep recursively searches directories for a regex pattern
  while respecting your gitignore. WHEN: search files, find in code, run rg
  commands. Triggers: use ripgrep, run rg, search files.
---

# ripgrep

ripgrep recursively searches directories for a regex pattern while
respecting your gitignore.

## When to Use

- Run `rg` commands
- Search through files or text
- Fast recursive grep with gitignore support

## When NOT to Use

- GUI or web-based workflows where CLI is not available

## Quick Start

### Install

cargo install ripgrep

### Basic Usage

rg "pattern" /path/to/search
rg -i "case insensitive" .
rg -t py "import" src/

## Project Info

- **Language:** Rust
- **License:** Unlicense/MIT
```

Plus reference files with the full README and API docs. ~10 seconds, not 20 minutes.

## Batch Mode

Got a list of tools you use? Create a text file:

```text
# repos.txt
sindresorhus/got
BurntSushi/ripgrep
astral-sh/ruff
sharkdp/fd
junegunn/fzf
```

Then:

```bash
repo2skill --batch repos.txt -o ./skills/
```

All five skills, generated sequentially. Done.

## Language Support

repo2skill understands 11+ languages and their manifest formats:

- **Node.js/TypeScript** — `package.json`
- **Python** — `pyproject.toml`, `setup.py`
- **Rust** — `Cargo.toml`
- **Go** — `go.mod`
- **Java/Kotlin** — `pom.xml`, `build.gradle`
- **Ruby** — `Gemfile`, `*.gemspec`
- **C/C++** — `CMakeLists.txt`, `Makefile`
- **PHP** — `composer.json`
- **Elixir** — `mix.exs`
- **Swift** — `Package.swift`

Every language also gets README-based analysis regardless of manifest support.

## 35 Example Skills Included

The repo includes pre-generated skills for popular projects: React, Express, FastAPI, Flask, Deno, Bun, ripgrep, fzf, jq, Prisma, Drizzle ORM, Tailwind CSS, and many more. Check the [`examples/`](https://github.com/NeuZhou/repo2skill/tree/main/examples) directory.

## What's Next

- Smarter API extraction from source code (not just README)
- Support for monorepo sub-packages
- Incremental updates when repos change
- Community-contributed language analyzers

## Try It

```bash
npm install -g repo2skill
repo2skill <your-favorite-repo>
```

⭐ Star the repo: [github.com/NeuZhou/repo2skill](https://github.com/NeuZhou/repo2skill)

Found a repo that doesn't convert well? [Open an issue](https://github.com/NeuZhou/repo2skill/issues). PRs for new language support are very welcome.
