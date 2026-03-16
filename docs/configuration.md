# Configuration

repo2skill is configured entirely through CLI flags and environment variables. No config file is needed.

## Environment Variables

### `GITHUB_TOKEN` / `GH_TOKEN`

GitHub personal access token for API requests. Without this, you're limited to 60 requests/hour. With a token, 5,000/hour.

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
repo2skill sindresorhus/got
```

### `REPO2SKILL_VERBOSE`

Set to `1` to enable verbose analysis output (same as `--verbose`).

```bash
export REPO2SKILL_VERBOSE=1
repo2skill sindresorhus/got
```

## Output Directory Structure

```
<output-dir>/
└── <skill-name>/
    ├── SKILL.md          # The generated skill file
    └── references/
        ├── README.md     # Full README from the repo
        └── api.md        # Extracted API documentation (if available)
```

## Registry

The skill registry stores metadata about generated skills in:

- **Linux/macOS:** `~/.config/repo2skill/registry.json`
- **Windows:** `%APPDATA%/repo2skill/registry.json`

Each entry records:
- Repo URL
- Skill directory path
- Template used
- Generation timestamp

## Quality Scoring

Quality scores range from 0-100, based on:

| Criteria | Points |
|----------|--------|
| Has description | 15 |
| Has install instructions | 10 |
| Has usage examples | 15 |
| Has features list | 10 |
| Has CLI commands | 10 |
| Has API documentation | 10 |
| Has tests | 5 |
| Has license | 5 |
| Has configuration docs | 5 |
| README completeness | 15 |

Use `--min-quality <score>` to filter out low-quality results in batch mode.

## GitHub API Integration

By default, repo2skill fetches metadata from GitHub's API (stars, forks, topics, latest release). Disable with `--no-github`.

Data fetched:
- Stars, forks, open issues count
- Last commit date
- Latest release tag
- License
- Topics/tags
- Contributor count
- Default branch

## Batch File Format

One repo per line. Lines starting with `#` are comments. Blank lines are ignored.

```text
# Frontend frameworks
facebook/react
vuejs/core
sveltejs/svelte

# CLI tools
BurntSushi/ripgrep
sharkdp/fd
```

## Monorepo Support

For monorepos, use `--package` to target a specific package:

```bash
repo2skill vercel/turborepo --package packages/turbo
```

The analyzer scopes to that directory while still considering the root manifest for shared metadata.
