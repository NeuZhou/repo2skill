# Changelog

All notable changes to repo2skill are documented here.

## [3.0.0] — 2026-03-16

### 🚀 Major

- **Performance**: GitHub API response caching (in-memory + disk) — eliminates redundant API calls
- **Performance**: Parallel analysis in batch mode — `--parallel` now truly concurrent with worker pool
- **Performance**: Lazy loading of expensive modules (`simple-git`, `glob`) — 40% faster cold start
- **Documentation**: Complete docs suite (`docs/cli-reference.md`, `docs/templates.md`, `docs/configuration.md`)
- **README**: Full rewrite with architecture diagram, output examples, alternatives comparison
- **Changelog**: Complete project history from v1.0 to v3.0

### ✅ Quality

- 256 tests passing, TypeScript strict mode clean
- All 19 test suites green

## [2.4.0] — 2025-12-15

### Added

- **Dependency resolution** — `--show-deps` flag to analyze and report project dependencies
- **API extractor** — automatically extract public API signatures from source code
- **Example generator** — generate usage examples from tests, README, and API patterns
- **Versioning** — `--version-tag` to pin skills to specific git tags
- **Output validator** — `repo2skill validate` subcommand for SKILL.md spec compliance

## [2.3.0] — 2025-11-20

### Added

- **Auto-update checker** — `--check-updates` flag to check for new repo2skill versions
- **Skill comparison** — `repo2skill compare repo1 repo2` side-by-side analysis
- **Changelog generator** — `repo2skill changelog <repo>` from git history
- **Interactive mode** — `--interactive` / `-i` guided step-by-step mode

## [2.2.0] — 2025-10-28

### Added

- **GitHub integration** — fetch stars, forks, topics, latest release via GitHub API
- **Skill linter** — `repo2skill lint <file>` quality checks for SKILL.md files
- **Registry** — `repo2skill registry` subcommand to track and update generated skills
- **Template system** — `--template minimal|detailed|security|default`
- 40 new tests (170+ total)

## [2.1.0] — 2025-09-15

### Added

- **Smart README parser** — improved section extraction with fallback headers
- **Monorepo `--package`** — target specific packages in monorepos
- **Diff mode** — `--diff <skill-md>` to compare existing vs regenerated skill
- 44 new tests

## [2.0.0] — 2025-08-01

### 🚀 Major

- **Quality score** — 100-point scale (was 1-5) with detailed breakdown
- **Parallel batch** — `--parallel <count>` for concurrent batch processing
- **Structured output** — `--format json|yaml` for programmatic use
- 60+ new tests

## [1.9.0] — 2025-07-15

### Changed

- Version bump with internal improvements

## [1.8.0] — 2025-06-20

### Fixed

- Improved feature detection from package metadata
- Reduced false-positive HTTP trigger phrases
- Read package name from manifest for install commands

### Added

- Comprehensive test suite (40+ tests)
- CI with GitHub Actions

## [1.7.0] — 2025-05-25

### Added

- **150 examples milestone** — covering 16 languages across CLI tools, frameworks, libraries, and infrastructure
- Cross-project documentation references

## [1.6.0] — 2025-05-01

### Added

- 100+ examples milestone
- Added Go ecosystem (lazygit, lazydocker, dive, k9s), Rust tools (age, glow), JS tooling (jest, vitest, prettier, eslint, webpack)
- Mermaid support

### 1.6.1

- 15 Python ecosystem examples (aiohttp, black, celery, click, django, DRF, httpx, isort, pandas, pip, poetry, pydantic, pytest, scrapy, typer)

### 1.6.2

- 15 Rust & misc examples (serde, rayon, clap, hyper, tower, mdBook, starship, zoxide, exa, navi, just, watchexec, lsd, difftastic, serde-json)

## [1.5.0] — 2025-04-10

### Added

- **Quality scoring** (1-5 scale)
- `--local` flag for analyzing local directories
- `--min-quality` filter
- Error recovery improvements
- 5 AI/ML examples (transformers, pytorch, mlflow, gradio, streamlit)

### 1.5.1–1.5.3

- Expanded to 89 examples (DevOps, infra, security, database, messaging, Go libs)
- ROADMAP.md added

## [1.4.0] — 2025-03-20

### Added

- `--upgrade` flag to re-analyze and regenerate existing skills (preserves `<!-- manual -->` sections)
- Haskell and Lua language support
- CI badge in README

## [1.3.0] — 2025-03-01

### Added

- Dart/Flutter, Zig, Scala language support
- Key API section in generated skills

## [1.2.0] — 2025-02-15

### Added

- `--stats` flag for aggregate skill statistics
- C/C++, PHP, Elixir language support
- Install defaults for new languages

## [1.1.0] — 2025-02-01

### Added

- `--dry-run` flag
- Features, configuration, and monorepo sections in generated skills
- Improved README parsing (alternative headers, features, config, monorepo detection)
- `--json` output flag
- Test suite with vitest
- `.npmignore` for clean npm publishes

### Fixed

- CLI/client categorization bug
- 5 bugs in skill generation

## [1.0.0] — 2025-01-15

### 🎉 Initial Release

- Core repo analysis engine (16 languages)
- SKILL.md generation with frontmatter
- `--batch` mode for bulk conversion
- When-to-use / when-not-to-use generation
- Go support with rich descriptions and trigger phrases
- 6 example skills (jq, ripgrep, fd, fzf, ruff, bun)
- MIT license
