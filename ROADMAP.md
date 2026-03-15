# 🗺️ Roadmap

## v2.0 — LLM-Enhanced Mode
- Optional GPT/Claude integration for richer skill descriptions
- Smarter "When to Use" / "When NOT to Use" generation
- Better API surface extraction from source code
- Flag: `--llm` or `--enhance` to opt-in (pure heuristic remains the default)

## v2.1 — Auto-Publish to ClawHub
- `repo2skill owner/repo --publish` in a single pipeline
- Auth via `clawhub login` token
- Version conflict detection and auto-bump

## v2.2 — Skill Diff/Merge for Upgrades
- Re-run repo2skill on updated repos and get a diff
- Merge upstream changes while preserving user customizations
- `repo2skill upgrade ./skills/got` workflow

## v2.3 — GitHub App
- Auto-generate skills when a repo creates a new release
- PR-based workflow: bot opens a PR with the updated skill
- Webhook-driven, zero manual intervention

## v3.0 — Multi-Skill Generation for Monorepos
- Detect monorepo structures (workspaces, packages/*)
- Generate one skill per sub-package
- Cross-reference skills with shared dependencies
- Examples: supabase, trpc, remix (already in examples/)

---

Have ideas? [Open an issue](https://github.com/NeuZhou/repo2skill/issues) or contribute directly!
