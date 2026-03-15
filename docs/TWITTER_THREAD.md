# Twitter/X Thread: repo2skill Launch

## Tweet 1 (Hook)

AI agents can run shell commands but don't know your tools exist.

I built repo2skill — one command turns any GitHub repo into an AI agent skill.

```
$ repo2skill BurntSushi/ripgrep
✅ Skill generated in 10 seconds
```

🧵 Thread 👇

## Tweet 2 (The problem)

Writing a skill file manually means reading the README, extracting commands, writing trigger phrases, formatting it all.

15-30 min per tool. GitHub has 400M+ repos.

That doesn't scale.

## Tweet 3 (How it works)

repo2skill:
→ Clones the repo
→ Parses README + manifests
→ Detects language, CLI commands, API patterns
→ Generates a complete SKILL.md

No LLM needed. Pure heuristic. Fast, deterministic, offline-capable.

## Tweet 4 (Language support)

Supports 11+ languages:

🟨 JavaScript/TypeScript
🐍 Python
🦀 Rust
🐹 Go
☕ Java/Kotlin
💎 Ruby
🐘 PHP
⚗️ Elixir
🐦 Swift
🔧 C/C++

And it extracts from README regardless of language.

## Tweet 5 (Scale)

Batch mode: list your repos in a file, convert them all at once.

35 example skills already generated — React, FastAPI, ripgrep, fzf, Deno, Prisma, and more.

Check the examples/ directory.

## Tweet 6 (CTA)

repo2skill is open source (MIT).

```
npm install -g repo2skill
```

⭐ https://github.com/NeuZhou/repo2skill

Try it on your favorite repo. Issues & PRs welcome.
