<h1 align="center">🔧 repo2skill</h1>

<p align="center">
  <strong>Turn any GitHub repo into an AI agent skill</strong>
</p>

<p align="center">
  <a href="https://github.com/NeuZhou/repo2skill/actions/workflows/ci.yml"><img src="https://github.com/NeuZhou/repo2skill/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/languages-20%2B-blue" alt="20+ Languages"></a>
  <a href="#"><img src="https://img.shields.io/badge/tests-100%2B-brightgreen" alt="Tests"></a>
</p>

<p align="center">
  One command. Any repo. Ready-to-use SKILL.md.
</p>

---

## Quick Start

```bash
# Install globally
npm install -g repo2skill

# Run
repo2skill https://github.com/facebook/react
```

Or use without installing:

```bash
npx repo2skill https://github.com/facebook/react
```

```
✅ Skill generated: ./skills/react/
   SKILL.md: ./skills/react/SKILL.md
   References: 3 file(s)
   Quality: 85/100 ████████████████░░░░ Good
```

That's it. Your agent can now use React.

---

## What It Does

repo2skill reads a GitHub repo — README, package manifests, source code, project structure — and generates a complete [AgentSkills](https://openclaw.com) `SKILL.md` with description, triggers, usage examples, and reference files.

**No LLM required.** Pure heuristic analysis. Fast, deterministic, offline-capable.

---

## 20+ Languages Supported

| Language | Package File | Language | Package File |
|---|---|---|---|
| TypeScript | `package.json` | Ruby | `Gemfile` |
| Python | `pyproject.toml` | PHP | `composer.json` |
| Rust | `Cargo.toml` | Elixir | `mix.exs` |
| Go | `go.mod` | Dart | `pubspec.yaml` |
| Java | `pom.xml` | Scala | `build.sbt` |
| C# | `*.csproj` | Haskell | `*.cabal` |
| Swift | `Package.swift` | Lua | `*.rockspec` |
| Kotlin | `build.gradle.kts` | Zig | `build.zig` |
| C/C++ | `CMakeLists.txt` | R | `DESCRIPTION` |

---

## Features

### 🧠 AI-Enhanced (Optional)
```bash
repo2skill facebook/react --ai
# LLM-powered description improvement (needs OPENAI_API_KEY)
```

### 📦 ClawHub Publish
```bash
repo2skill facebook/react --publish
# Generate + publish to ClawHub in one step
```

### 🔍 Framework Detection
Automatically identifies: MCP servers, AI agents, web frameworks, CLI tools, serverless functions, libraries.

### 📊 Quality Reports
```bash
repo2skill quality-report ./skills/ -o report.html
# Quality: 85/100 — description ✅, examples ✅, features ✅, API docs ⚠️
```

### 🔒 Security Scanning
```bash
repo2skill facebook/react --security
# 🔒 Security Report — Risk Level: 🟢 LOW, 0 findings

repo2skill security ./my-project
# Standalone scan without generating a skill
```

### 📁 Monorepo Support
```bash
repo2skill monorepo ./my-monorepo
# Detected 5 packages (npm-workspaces)
# Generates per-package skills
```

### ⚡ Batch Processing
```bash
repo2skill --batch repos.txt --parallel 3 --min-quality 60
```

### 🔄 Diff & Compare
```bash
repo2skill compare expressjs/express fastify/fastify
repo2skill diff old-skill.md new-skill.md
```

---

## Use Cases

**🤖 Skill Library Building** — Bulk-convert popular repos into agent skills for your team.

**🔄 CI/CD Integration** — Auto-regenerate skills when upstream repos update.

**📋 Repo Auditing** — Quality-score any repo's documentation completeness.

**🏗️ Monorepo Management** — Generate per-package skills for large codebases.

**📊 Comparison** — Side-by-side analysis of competing libraries.

---

## CLI Reference

```bash
# From GitHub
repo2skill facebook/react

# From local directory
repo2skill --local ./my-project

# Dry run
repo2skill --dry-run openai/openai-node

# JSON output
repo2skill --json openai/openai-node

# Custom template
repo2skill facebook/react --template security

# Subcommands
repo2skill validate ./skills/react/SKILL.md
repo2skill lint ./skills/react/SKILL.md
repo2skill health ./skills/react/SKILL.md
repo2skill compare repo-a repo-b
repo2skill changelog facebook/react
repo2skill graph ./skills/ -o graph.html
repo2skill template --type cli --name my-tool
```

Full reference: see `repo2skill --help` and [`docs/API.md`](docs/API.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Kang Zhou](https://github.com/NeuZhou)

---

<p align="center">
  Made with 🦀 by <a href="https://github.com/NeuZhou">Kang Zhou</a>
</p>

## 🔗 NeuZhou Ecosystem

repo2skill is part of the NeuZhou open source toolkit for AI agents:

| Project | What it does | Link |
|---------|-------------|------|
| **repo2skill** | Convert any repo into an AI agent skill | *You are here* |
| **ClawGuard** | Security scanner for AI agents | [GitHub](https://github.com/NeuZhou/clawguard) |
| **AgentProbe** | Behavioral testing framework for agents | [GitHub](https://github.com/NeuZhou/agentprobe) |
| **FinClaw** | AI-powered financial intelligence engine | [GitHub](https://github.com/NeuZhou/finclaw) |

**The workflow:** Generate skills with repo2skill → Scan for vulnerabilities with ClawGuard → Test behavior with AgentProbe → See it in action with FinClaw.
