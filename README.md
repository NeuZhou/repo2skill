<p align="center">
  <img src="https://raw.githubusercontent.com/NeuZhou/repo2skill/main/assets/logo.png" alt="repo2skill" width="120" />
</p>

<h1 align="center">repo2skill</h1>

<p align="center">
  <strong>Convert any GitHub repo into an AI agent skill. One command. No LLM.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/repo2skill"><img src="https://img.shields.io/npm/v/repo2skill" alt="npm"></a>
  <a href="https://github.com/NeuZhou/repo2skill/actions/workflows/ci.yml"><img src="https://github.com/NeuZhou/repo2skill/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT"></a>
  <a href="https://github.com/NeuZhou/repo2skill"><img src="https://img.shields.io/github/stars/NeuZhou/repo2skill" alt="Stars"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-supported-languages">Languages</a> ·
  <a href="#-monorepo-support">Monorepo</a> ·
  <a href="#-cli-reference">CLI Reference</a> ·
  <a href="#-comparison">Comparison</a>
</p>

---

**repo2skill** analyzes any GitHub repository — README, manifests, source files, project structure — and generates a ready-to-use [OpenClaw](https://openclaw.com) `SKILL.md` with reference files. Pure heuristic analysis. Fast, deterministic, offline-capable. **No LLM required.**

> **v3.5.0** — Multi-language support (20+ languages), monorepo detection, README parser, quality reports, and 100+ tests.

## 🚀 Quick Start

```bash
# Install globally
npm install -g repo2skill

# Generate a skill from any GitHub repo
repo2skill facebook/react

# From a local directory
repo2skill --local ./my-project

# Dry run — preview without writing files
repo2skill --dry-run openai/openai-node
```

**Output:**
```
✅ Skill generated: ./skills/react/
   SKILL.md: ./skills/react/SKILL.md
   References: 3 file(s)
   Quality: 85/100 ██████████████████░░ Good
```

## ✨ Features

### Core
- 🔍 **Deep repository analysis** — README, manifests, source code, dependencies, Docker, CI/CD
- 📝 **AgentSkills spec output** — Generates valid SKILL.md with description, when-to-use, triggers, references
- 🌍 **20+ language support** — TypeScript, Python, Rust, Go, Java, C#, Swift, Kotlin, Ruby, PHP, Elixir, Dart, Scala, Haskell, Lua, Zig, C/C++, R, and more
- 📦 **Monorepo detection** — npm/yarn/pnpm workspaces, Lerna, Nx, Turborepo, directory-based
- 🧠 **Framework detection** — MCP servers, AI agents, web frameworks, CLI tools, serverless, libraries
- 📖 **Smart README parsing** — Extracts install commands, usage examples, badges, features, env vars

### Quality & Validation
- 📊 **Quality scoring** — 0-100 score with breakdown (description, examples, features, API docs)
- ✅ **Linting & validation** — AgentSkills spec compliance checking
- 🏥 **Health checks** — Detect stale, broken, or incomplete skills
- 🔄 **Upgrade mode** — Re-analyze repos and regenerate skills, preserving manual sections

### Workflow
- 📋 **Batch mode** — Process multiple repos from a file, with parallel workers
- 🎯 **Templates** — `minimal`, `detailed`, `security`, `default` — or scaffold by type (cli, mcp-server, web-api, library)
- 📈 **Diff & compare** — Compare two repos or track skill changes over time
- 🔗 **Dependency graphs** — Visualize skill relationships as interactive HTML
- 📜 **Changelog generation** — Skill-relevant changelog from git history
- 🏪 **Registry & publish** — Track skills locally, publish to ClawHub
- 🤖 **AI enhancement** — Optional LLM-powered description improvement (requires API key)
- 📤 **Multi-format output** — Markdown (default), JSON, YAML

## 🌍 Supported Languages

| Language | Package File | Entry Points | Install Template |
|----------|-------------|-------------|-----------------|
| TypeScript | `package.json` | `src/index.ts` | `npm install {name}` |
| JavaScript | `package.json` | `index.js` | `npm install {name}` |
| Python | `pyproject.toml`, `setup.py` | `main.py`, `app.py` | `pip install {name}` |
| Rust | `Cargo.toml` | `src/main.rs`, `src/lib.rs` | `cargo install {name}` |
| Go | `go.mod` | `main.go`, `cmd/` | `go install {name}@latest` |
| Java | `pom.xml`, `build.gradle` | `src/main/java/` | Maven/Gradle |
| C# | `*.csproj`, `*.sln` | `Program.cs` | `dotnet add package {name}` |
| Swift | `Package.swift` | `Sources/` | Swift PM |
| Kotlin | `build.gradle.kts` | `src/main/kotlin/` | Gradle |
| Ruby | `Gemfile`, `*.gemspec` | `lib/`, `bin/` | `gem install {name}` |
| PHP | `composer.json` | `src/`, `index.php` | `composer require {name}` |
| Elixir | `mix.exs` | `lib/` | `mix deps.get` |
| Dart | `pubspec.yaml` | `lib/`, `bin/` | `dart pub add {name}` |
| Scala | `build.sbt` | `src/main/scala/` | sbt |
| Haskell | `*.cabal`, `stack.yaml` | `app/Main.hs` | `stack install {name}` |
| Lua | `*.rockspec` | `init.lua` | `luarocks install {name}` |
| Zig | `build.zig` | `src/main.zig` | `zig build` |
| C/C++ | `CMakeLists.txt`, `Makefile` | `main.c`, `main.cpp` | `make` |
| R | `DESCRIPTION` | `R/` | `install.packages('{name}')` |

## 📦 Monorepo Support

repo2skill automatically detects monorepos and can generate skills per package:

```bash
# Detect monorepo structure
repo2skill monorepo ./my-monorepo
# Detected 5 packages (npm-workspaces):
#   packages/core → skill-core.md
#   packages/cli  → skill-cli.md
#   packages/web  → skill-web.md

# Target a specific package
repo2skill --local ./my-monorepo --package packages/core

# Generate from remote monorepo
repo2skill vercel/next.js --package packages/next
```

**Supported monorepo tools:** npm workspaces, yarn workspaces, pnpm workspaces, Lerna, Nx, Turborepo, directory-based detection.

## 📖 README Parser

The built-in README parser extracts structured information:

```typescript
import { parseReadme } from 'repo2skill/readme-parser';

const info = parseReadme(readmeContent);
// info.title         → "My Project"
// info.description   → "A fast, lightweight..."
// info.installCommands → [{ command: "npm install my-project", manager: "npm" }]
// info.usageExamples → [{ code: "...", language: "typescript", context: "Usage" }]
// info.badges        → [{ type: "npm", label: "version", ... }]
// info.features      → ["Fast processing", "Type-safe API", ...]
// info.envVars       → ["OPENAI_API_KEY", "DATABASE_URL"]
// info.prerequisites → ["Node.js >= 18", "npm >= 9"]
```

## 📋 CLI Reference

### Main Command

```bash
repo2skill [repo] [options]
```

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory (default: `./skills`) |
| `-n, --name <name>` | Override skill name |
| `-l, --local <path>` | Analyze local directory |
| `-b, --batch <file>` | Batch mode from file |
| `--parallel <n>` | Parallel workers for batch |
| `-f, --format <type>` | Output: `markdown`, `json`, `yaml` |
| `-j, --json` | JSON output shorthand |
| `-d, --dry-run` | Preview without writing |
| `-t, --template <name>` | Template: `minimal`, `detailed`, `security`, `default` |
| `--package <path>` | Target monorepo package |
| `--ai` | LLM enhancement (needs `OPENAI_API_KEY`) |
| `-i, --interactive` | Interactive guided mode |
| `--min-quality <n>` | Skip skills below quality score |
| `--no-github` | Skip GitHub API metadata |
| `-p, --publish` | Publish to ClawHub after generating |

### Subcommands

```bash
# Validate against AgentSkills spec
repo2skill validate ./skills/react/SKILL.md

# Quality testing
repo2skill test ./skills/react/SKILL.md
repo2skill lint ./skills/react/SKILL.md

# Health check
repo2skill health ./skills/react/SKILL.md

# Compare two repos
repo2skill compare facebook/react preactjs/preact

# Diff two SKILL.md files
repo2skill diff old-skill.md new-skill.md

# Check for upstream updates
repo2skill check-updates ./skills/react/SKILL.md

# Monorepo detection
repo2skill monorepo ./my-monorepo

# Git changelog
repo2skill changelog facebook/react --max 100

# Dependency graph visualization
repo2skill graph ./skills/ -o graph.html

# Quality report
repo2skill quality-report ./skills/ -o report.html

# Scaffold from template
repo2skill template --type cli --name my-tool

# Registry management
repo2skill registry list
repo2skill registry add facebook/react
repo2skill registry update-all

# Version info
repo2skill version-info ./skills/react/SKILL.md

# Merge multiple skills
repo2skill merge skill1.md skill2.md -o merged.md

# List available templates
repo2skill templates
```

## 🔄 Comparison with Alternatives

| Feature | repo2skill | Manual writing | LLM-generated |
|---------|-----------|---------------|--------------|
| Speed | ⚡ <2s per repo | 🐌 30-60 min | 🔄 10-30s |
| Deterministic | ✅ Same input = same output | ❌ Varies by author | ❌ Non-deterministic |
| Offline | ✅ No API needed | ✅ | ❌ Needs API |
| Cost | 🆓 Free | 🆓 Free | 💰 API costs |
| Quality | 📊 Scored & validated | ❓ No metrics | ❓ Unpredictable |
| 20+ Languages | ✅ | ❌ Manual per language | 🔄 Depends on model |
| Monorepo | ✅ Auto-detect | ❌ Manual | ❌ No awareness |
| Batch processing | ✅ Parallel | ❌ | ❌ |
| Upgrade/diff | ✅ Built-in | ❌ | ❌ |
| Spec compliance | ✅ Validated | ❓ | ❓ |

## 🧪 Examples

### Basic: Generate from GitHub

```bash
repo2skill langchain-ai/langchain
# ✅ Skill generated: ./skills/langchain/
#    Quality: 82/100 ████████████████░░░░ Good
```

### Batch: Process Multiple Repos

```bash
# repos.txt:
# facebook/react
# vuejs/vue
# sveltejs/svelte

repo2skill --batch repos.txt --parallel 3 --min-quality 60
# 📋 Batch mode: 3 repo(s) (parallel: 3)
# ✅ react: 87/100
# ✅ vue: 84/100
# ✅ svelte: 81/100
# 📊 Batch complete: 3 succeeded, 0 failed
```

### JSON Output for Automation

```bash
repo2skill --json openai/openai-node | jq '.features'
```

### Compare Repos

```bash
repo2skill compare expressjs/express fastify/fastify
# ┌─────────────┬───────────┬──────────┐
# │             │ express   │ fastify  │
# ├─────────────┼───────────┼──────────┤
# │ Language    │ JS        │ JS       │
# │ Quality     │ 78/100    │ 82/100   │
# │ Features    │ 6         │ 9        │
# │ Type        │ web-fmwk  │ web-fmwk │
# └─────────────┴───────────┴──────────┘
```

## 🏗️ Architecture

```
repo2skill
├── src/
│   ├── cli.ts           # CLI entry point (Commander.js)
│   ├── index.ts         # Main API
│   ├── analyzer.ts      # Repository analysis engine
│   ├── generator.ts     # SKILL.md generation + quality scoring
│   ├── languages.ts     # 20+ language configs & detection
│   ├── readme-parser.ts # Structured README extraction
│   ├── monorepo.ts      # Monorepo detection (6 tools)
│   ├── templates.ts     # Template system
│   ├── linter.ts        # AgentSkills spec linting
│   ├── validator.ts     # Validation engine
│   ├── health.ts        # Health checks
│   ├── compare.ts       # Repo comparison
│   ├── skill-diff.ts    # Diff engine
│   ├── skill-graph.ts   # Dependency visualization
│   ├── changelog.ts     # Git changelog
│   ├── ai-enhance.ts    # Optional LLM enhancement
│   ├── formats.ts       # JSON/YAML output
│   ├── plugin.ts        # Plugin system
│   └── __tests__/       # 100+ tests
└── docs/
    ├── cli-reference.md
    ├── templates.md
    └── configuration.md
```

## 📦 Installation

```bash
# npm
npm install -g repo2skill

# pnpm
pnpm add -g repo2skill

# yarn
yarn global add repo2skill

# Run without installing
npx repo2skill facebook/react
```

**Requirements:** Node.js >= 18

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Write tests (we have 100+!)
4. Run tests: `npm test`
5. Submit a PR

## 📄 License

MIT © [Kang Zhou](https://github.com/NeuZhou)

---

<p align="center">
  Made with 🦀 by <a href="https://github.com/NeuZhou">Kang Zhou</a>
</p>
