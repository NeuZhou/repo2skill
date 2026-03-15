# repo2skill

> Convert any GitHub repo into an OpenClaw skill. One command.

[![npm version](https://img.shields.io/npm/v/repo2skill)](https://www.npmjs.com/package/repo2skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

`repo2skill` clones a GitHub repository, analyzes its structure (README, package manifests, source files), and generates an [OpenClaw](https://openclaw.com) skill directory with a properly formatted `SKILL.md` and reference files.

**No LLM required** — pure heuristic/template-based analysis.

## Install

```bash
npm install -g repo2skill
```

## Usage

```bash
# From a GitHub URL
repo2skill https://github.com/sindresorhus/got

# From owner/repo shorthand
repo2skill sindresorhus/got

# Custom output directory
repo2skill sindresorhus/got -o ./my-skills

# Custom skill name
repo2skill sindresorhus/got -n http-client
```

Output goes to `./skills/<repo-name>/` by default.

## What it analyzes

- **README.md** — description, usage, API docs, install instructions
- **package.json** — CLI commands (`bin`), dependencies, description
- **pyproject.toml** — Python CLI scripts, description
- **Cargo.toml** — Rust binary targets, description
- **File structure** — language detection, entry points, test presence

## What it generates

```
skill-name/
├── SKILL.md          # Frontmatter + concise instructions
└── references/
    ├── README.md     # Full original README
    └── api.md        # API reference (if found)
```

## Supported Languages

TypeScript, JavaScript, Python, Rust, Go, Java, Ruby, PHP, C#, C++, C, Swift, Kotlin

## License

MIT © [Kang Zhou](https://github.com/NeuZhou)
