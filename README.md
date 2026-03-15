# 🔄 repo2skill

> **Convert any GitHub repo into an OpenClaw skill. One command.**

[![npm version](https://img.shields.io/npm/v/repo2skill)](https://www.npmjs.com/package/repo2skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/NeuZhou/repo2skill)](https://github.com/NeuZhou/repo2skill)

---

**repo2skill** analyzes any GitHub repository — its README, package manifests, source files, and project structure — and generates a ready-to-use [OpenClaw](https://openclaw.com) skill with a properly formatted `SKILL.md` and reference files.

**No LLM required.** Pure heuristic analysis. Fast, deterministic, offline-capable.

## ⚡ Quick Demo

```bash
$ repo2skill sindresorhus/got

📦 Cloning https://github.com/sindresorhus/got...
🔍 Analyzing repository...
⚙️  Generating skill...

✅ Skill generated: ./skills/got
   SKILL.md: ./skills/got/SKILL.md
   References: 2 file(s)
```

That's it. Your skill is ready to drop into `~/.openclaw/workspace/skills/` or publish to [ClawHub](https://clawhub.com).

## 📦 Install

```bash
npm install -g repo2skill
```

## 🚀 Usage

```bash
# GitHub URL
repo2skill https://github.com/BurntSushi/ripgrep

# owner/repo shorthand
repo2skill sindresorhus/got

# Custom output directory
repo2skill sindresorhus/got -o ./my-skills

# Custom skill name
repo2skill sindresorhus/got -n http-client

# Batch mode — convert many repos at once
repo2skill --batch repos.txt --output ./skills/
```

### Batch Mode

Create a text file with one repo per line:

```text
# repos.txt
sindresorhus/got
BurntSushi/ripgrep
astral-sh/ruff
sharkdp/fd
```

Then run:

```bash
repo2skill --batch repos.txt -o ./skills/
```

All repos are cloned, analyzed, and converted sequentially. Lines starting with `#` are treated as comments.

## ✨ Features

- 🔍 **Smart README parsing** — extracts descriptions, usage examples, API docs, install instructions
- 📦 **Multi-language support** — detects project type from manifests and source files
- 🎯 **Trigger phrase generation** — auto-generates "when to use" and trigger phrases for skill matching
- 📋 **Batch conversion** — process dozens of repos from a file in one command
- 📁 **Reference extraction** — saves full README and API docs as reference files
- 🌳 **File tree generation** — includes project structure in the skill
- ⚡ **No LLM required** — pure heuristic analysis, fast and deterministic
- 🔒 **Offline-capable** — only needs network for `git clone`

## 🌐 Supported Languages & Manifests

| Language | Manifest | What's Extracted |
|----------|----------|-----------------|
| **Node.js / TypeScript** | `package.json` | name, description, bin commands, dependencies, license |
| **Python** | `pyproject.toml`, `setup.py` | name, description, CLI scripts, license |
| **Rust** | `Cargo.toml` | name, description, binary targets, license |
| **Go** | `go.mod` | module name, dependencies, CLI detection |
| **Java** | *(file detection)* | language detection via `.java` files |
| **Ruby** | *(file detection)* | language detection via `.rb` files |
| **C/C++** | *(file detection)* | language detection via `.c`, `.cpp` files |
| **Swift** | *(file detection)* | language detection via `.swift` files |
| **Kotlin** | *(file detection)* | language detection via `.kt` files |
| **+ more** | — | Lua, Zig, Dart, Elixir, Haskell, Scala, R, PHP, C# |

All languages benefit from README analysis regardless of manifest support.

## 📄 Example Output

Running `repo2skill BurntSushi/ripgrep` generates:

```
ripgrep/
├── SKILL.md
└── references/
    ├── README.md
    └── api.md
```

The generated `SKILL.md` looks like:

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
- Projects using Python or JavaScript (different ecosystem)

## Quick Start

### Install

\`\`\`bash
cargo install ripgrep
\`\`\`

### Basic Usage

\`\`\`bash
rg "pattern" /path/to/search
rg -i "case insensitive" .
rg -t py "import" src/
\`\`\`

## Project Info

- **Language:** Rust
- **License:** Unlicense/MIT
- **Tests:** Yes
```

## 🆚 Manual vs repo2skill

| | Manual Skill Writing | repo2skill |
|---|---|---|
| ⏱ **Time** | 15–30 min per skill | ~10 seconds |
| 📖 **README analysis** | Read & summarize yourself | Automatic extraction |
| 🎯 **Trigger phrases** | Write from scratch | Auto-generated |
| 📦 **Multi-language** | Know each manifest format | Built-in support |
| 📋 **Batch conversion** | One at a time | Process dozens at once |
| 🔄 **Consistency** | Varies by author | Uniform format |

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📚 Links

- [OpenClaw](https://openclaw.com) — The AI agent platform
- [ClawHub](https://clawhub.com) — Skill marketplace for OpenClaw
- [AgentSkills Spec](https://github.com/anthropics/agentskills) — The skill format standard

## 📄 License

MIT © [Kang Zhou](https://github.com/NeuZhou)
