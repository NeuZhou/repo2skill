# repo2skill API Reference

## CLI Usage

```bash
repo2skill [repo] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `repo` | GitHub URL, `owner/repo` shorthand, or local path (with `--local`) |

### Options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--output <dir>` | `-o` | Output directory for generated skills | `./skills` |
| `--name <name>` | `-n` | Override the skill name | Auto-detected |
| `--batch <file>` | `-b` | Batch mode: file with one repo URL per line | — |
| `--parallel <n>` | — | Parallel workers for batch mode | `1` |
| `--format <type>` | `-f` | Output format: `markdown`, `json`, `yaml` | `markdown` |
| `--json` | `-j` | Shorthand for `--format json` | — |
| `--dry-run` | `-d` | Preview analysis without writing files | — |
| `--verbose` | `-v` | Show detailed analysis during generation | — |
| `--stats` | `-s` | Show aggregate stats of generated skills | — |
| `--publish` | `-p` | Publish to ClawHub after generating | — |
| `--upgrade <dir>` | `-u` | Re-analyze and regenerate an existing skill | — |
| `--local <path>` | `-l` | Analyze a local directory (no clone) | — |
| `--template <name>` | `-t` | Template: `minimal`, `detailed`, `security`, `default` | `default` |
| `--no-github` | — | Skip GitHub API metadata fetching | — |
| `--min-quality <n>` | — | Skip skills below this quality score (0-100) | — |
| `--package <path>` | — | Target a specific package in a monorepo | — |
| `--diff <skill-md>` | — | Compare with existing SKILL.md | — |
| `--show-deps` | — | Show dependency report for a repo | — |
| `--version-tag <tag>` | — | Pin skill to a specific git tag | — |
| `--check-updates` | — | Check for newer version of repo2skill | — |
| `--ai` | — | Use LLM to enhance descriptions (needs `OPENAI_API_KEY`) | — |
| `--interactive` | `-i` | Interactive guided mode | — |
| `--security` | — | Generate a security report alongside the skill | — |

### Subcommands

| Command | Description |
|---------|-------------|
| `validate <file>` | Validate SKILL.md against the AgentSkills spec |
| `test <file>` | Test a generated SKILL.md for quality and correctness |
| `lint <file>` | Lint a SKILL.md and show quality score |
| `publish <path>` | Publish a skill to ClawHub registry |
| `compare <repo1> <repo2>` | Compare two repos side by side |
| `changelog <repo>` | Generate skill-relevant changelog from git history |
| `health <skill-md>` | Run a health check on a SKILL.md file |
| `merge <files...>` | Merge multiple SKILL.md files into one |
| `version-info <skill-md>` | Show version history of a SKILL.md |
| `monorepo <path>` | Detect and list packages in a monorepo |
| `graph <dir>` | Visualize skill relationships as interactive HTML |
| `quality-report <dir>` | Generate HTML quality report for all skills |
| `diff <old> <new>` | Compare two SKILL.md files |
| `check-updates <skill-md>` | Check if source repo has been updated |
| `template` | Generate a SKILL.md scaffold (`--type`, `--name` required) |
| `templates` | List available SKILL.md templates |
| `registry list` | List registered skills |
| `registry add <repo>` | Generate and register a skill |
| `registry remove <repo>` | Remove from registry |
| `registry update-all` | Regenerate all registered skills |
| `registry clear` | Clear the registry |
| `security <path>` | Run standalone security scan on a directory |

---

## Programmatic API

### `repo2skill(repo, options)`

Generate a skill from a GitHub repo.

```typescript
import { repo2skill } from "repo2skill";

const result = await repo2skill("facebook/react", {
  outputDir: "./skills",
  template: "default",
});
// result: { skillDir: string, referencesCount: number, quality?: SkillQuality }
```

### `repo2skillLocal(localPath, options)`

Generate a skill from a local directory.

```typescript
import { repo2skillLocal } from "repo2skill";

const result = await repo2skillLocal("./my-project", {
  outputDir: "./skills",
});
```

### `repo2skillJson(repo)`

Get structured analysis as JSON (no files written).

```typescript
import { repo2skillJson } from "repo2skill";
const json = await repo2skillJson("facebook/react");
```

### `repo2skillDryRun(repo, name?)`

Preview analysis without writing any files.

```typescript
import { repo2skillDryRun } from "repo2skill";
const preview = await repo2skillDryRun("facebook/react");
// preview: { skillName, description, language, languages, category, ... }
```

### `repo2skillStructured(repo, options)`

Get full structured data (supports local or remote).

```typescript
import { repo2skillStructured } from "repo2skill";
const data = await repo2skillStructured("facebook/react", { local: false });
```

### `upgradeSkill(skillDir)`

Re-analyze and regenerate an existing skill while preserving `<!-- manual -->` sections.

```typescript
import { upgradeSkill } from "repo2skill";
const result = await upgradeSkill("./skills/react");
// result: { skillDir, manualSectionsPreserved }
```

### `generateSecurityReport(dir)`

Run a security scan on a directory.

```typescript
import { generateSecurityReport, formatSecurityReport } from "repo2skill";

const report = generateSecurityReport("./skills/react");
console.log(formatSecurityReport(report));
// report: { filesScanned, findings, riskLevel, timestamp }
```

### `analyzeRepo(dir, name)`

Low-level repo analysis returning structured data about languages, dependencies, features, etc.

```typescript
import { analyzeRepo } from "repo2skill";
const analysis = await analyzeRepo("./my-repo", "my-repo");
```

---

## Supported Languages

repo2skill detects and generates skills for 20 languages:

TypeScript, JavaScript, Python, Rust, Go, Java, Kotlin, Swift, Ruby, PHP, C#, Elixir, Dart, Scala, Haskell, Lua, Zig, C, C++, R

Detection is based on package manifest files, file extensions, and entry points.

---

## Templates

| Name | Description |
|------|-------------|
| `default` | Standard template with all sections |
| `minimal` | Lightweight template with essentials only |
| `detailed` | Verbose template with extended documentation |
| `security` | Security-focused template with threat model section |

Use `repo2skill templates` to list available templates or `repo2skill template --type <type> --name <name>` to scaffold.

---

## Skill Types (for `template` command)

Available types: `cli`, `library`, `api`, `framework`, `service`, `mcp-server`, `agent`

---

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for `--ai` flag (LLM-enhanced descriptions) |
| `GITHUB_TOKEN` | Optional: increases GitHub API rate limits |
| `REPO2SKILL_VERBOSE` | Set to `1` for verbose output (same as `--verbose`) |

### Plugin System

repo2skill supports plugins for custom analysis. See `src/plugin.ts` for the `RepoSkillPlugin` interface:

```typescript
interface RepoSkillPlugin {
  name: string;
  analyze(repoData: RepoData): SkillSection[];
}
```

Load plugins with `loadPlugin(path)` and inject sections with `injectPluginSections()`.

---

## Security Report

The `--security` flag (or `security` subcommand) performs lightweight static analysis checking for:

- **Hardcoded secrets** — API keys, tokens, passwords, private keys
- **Code execution** — `eval()`, `exec()`, `spawn()`, `subprocess` usage
- **Network calls** — External URLs, dynamic fetch/axios calls, socket connections
- **File system access** — Write/delete operations, sensitive path access, `.env` references

Risk levels: 🟢 Low | 🟡 Medium | 🟠 High | 🔴 Critical

This is a standalone heuristic check inspired by ClawGuard patterns — no external dependencies required.
