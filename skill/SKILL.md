---
name: repo2skill
description: Convert any GitHub repo into an OpenClaw skill with one command. Supports 16 languages (Node.js, Python, Rust, Go, Ruby, Java, Kotlin, Swift, C/C++, PHP, Elixir, Dart, Zig, Scala, Haskell, Lua). Use when asked to create a skill from a repo, convert a GitHub project to a skill, or generate SKILL.md from source code. NOT for: manual skill authoring (use skill-creator instead).
---

# repo2skill

Convert any GitHub repository into an OpenClaw skill. No LLM required — pure heuristic analysis, fast and deterministic.

## Prerequisites

```bash
npm install -g repo2skill
```

## Quick Usage

```bash
repo2skill <owner/repo>
```

## Flags

| Flag | Description |
|------|-------------|
| `--output, -o <dir>` | Output directory (default: `./skills/`) |
| `--name, -n <name>` | Custom skill name (overrides auto-detected name) |
| `--batch <file>` | Batch mode — convert multiple repos from a text file (one per line) |
| `--json` | Output metadata as JSON instead of generating files |
| `--dry-run` | Analyze and preview without writing files |
| `--local <path>` | Analyze a local directory instead of cloning from GitHub |
| `--upgrade` | Re-generate an existing skill with latest repo content |
| `--publish` | Generate and publish to ClawHub in one command |
| `--stats` | Show analysis statistics (language detection, file counts, quality score) |
| `--min-quality <n>` | Minimum quality score threshold (0-100); skip repos below this score |
| `--version` | Show version |

## Examples

### Convert a single repo
```bash
repo2skill sindresorhus/got
```

### Convert with custom name and output directory
```bash
repo2skill sindresorhus/got -n http-client -o ./my-skills
```

### Batch convert from a file
```bash
# repos.txt: one owner/repo per line, # for comments
repo2skill --batch repos.txt -o ./skills/
```

### Preview without writing files
```bash
repo2skill astral-sh/ruff --dry-run
```

### Analyze a local project
```bash
repo2skill --local ./my-project -n my-tool
```

### Generate and publish to ClawHub
```bash
repo2skill BurntSushi/ripgrep --publish
```

### JSON output for scripting
```bash
repo2skill sindresorhus/got --json
```

### Filter by quality score
```bash
repo2skill --batch repos.txt --min-quality 60
```

## Output Format

repo2skill generates a skill directory:

```
<skill-name>/
├── SKILL.md          # Main skill file with frontmatter, description, triggers, usage
└── references/
    ├── README.md     # Full original README
    └── api.md        # Extracted API documentation (when available)
```

The `SKILL.md` includes:
- **Frontmatter** — `name` and `description` with auto-generated trigger phrases
- **When to Use / When NOT to Use** — context-aware activation guidance
- **Quick Start** — install + basic usage commands extracted from the README
- **Project Info** — language, license, test presence

Drop the generated directory into `~/.openclaw/workspace/skills/` or publish to ClawHub with `--publish`.
