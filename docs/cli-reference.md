# CLI Reference

## Main Command

```
repo2skill [repo] [options]
```

`repo` accepts: GitHub URL (`https://github.com/owner/repo`), shorthand (`owner/repo`), or omit for batch/local modes.

## Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `-o, --output <dir>` | | `./skills` | Output directory for generated skills |
| `-n, --name <name>` | | repo name | Override the skill name |
| `-b, --batch <file>` | | | Batch mode: file with one repo URL per line |
| `--parallel <count>` | | `1` | Parallel workers for batch mode |
| `-f, --format <type>` | | `markdown` | Output format: `markdown`, `json`, `yaml` |
| `-j, --json` | | | Shorthand for `--format json` |
| `-d, --dry-run` | | | Preview analysis without writing files |
| `-v, --verbose` | | | Show detailed analysis during generation |
| `-s, --stats` | | | Show aggregate stats of skills in output dir |
| `-p, --publish` | | | Publish to ClawHub after generating |
| `-u, --upgrade <dir>` | | | Re-analyze and regenerate an existing skill |
| `-l, --local <path>` | | | Analyze a local directory (no clone) |
| `-t, --template <name>` | | `default` | Template: `minimal`, `detailed`, `security`, `default` |
| `--no-github` | | | Skip GitHub API metadata fetching |
| `--min-quality <score>` | | | Skip skills below this quality score (0-100) |
| `--package <path>` | | | Target a specific package in a monorepo |
| `--diff <skill-md>` | | | Compare with existing SKILL.md |
| `--show-deps` | | | Show dependency report for a repo |
| `--version-tag <tag>` | | | Pin skill to a specific git tag |
| `--check-updates` | | | Check for newer version of repo2skill |
| `-i, --interactive` | | | Interactive guided mode |

## Subcommands

### `repo2skill validate <file>`

Validate a SKILL.md file against the AgentSkills spec. Exits with code 1 on failure.

```bash
repo2skill validate ./skills/got/SKILL.md
```

### `repo2skill lint <file>`

Check SKILL.md quality and show a quality score with suggestions.

```bash
repo2skill lint ./skills/got/SKILL.md
```

### `repo2skill compare <repo1> <repo2>`

Side-by-side comparison of two repos (languages, features, quality, size). Accepts GitHub URLs, `owner/repo`, or local paths.

```bash
repo2skill compare sindresorhus/got axios/axios
```

### `repo2skill changelog <repo>`

Generate a skill-relevant changelog from git history.

```bash
repo2skill changelog sindresorhus/got -n 100
```

| Flag | Default | Description |
|------|---------|-------------|
| `-n, --max <count>` | `50` | Max commits to analyze |

### `repo2skill templates`

List all available SKILL.md templates with descriptions.

### `repo2skill registry <action>`

Manage the local skill registry.

| Action | Description |
|--------|-------------|
| `registry list` | List all registered skills |
| `registry add <repo>` | Generate and register a skill |
| `registry remove <repo>` | Remove from registry |
| `registry update-all` | Regenerate all registered skills |
| `registry clear` | Clear entire registry |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub API token for higher rate limits |
| `REPO2SKILL_VERBOSE` | Set to `1` for verbose output |

## Examples

```bash
# Quick convert
repo2skill sindresorhus/got

# Batch with quality filter
repo2skill --batch repos.txt --min-quality 60 --parallel 4

# Local project, security template
repo2skill --local ./my-app --template security

# JSON output piped to jq
repo2skill sindresorhus/got --json | jq '.features'

# Monorepo specific package
repo2skill vercel/turborepo --package packages/turbo

# Diff existing skill
repo2skill sindresorhus/got --diff ./skills/got/SKILL.md
```
