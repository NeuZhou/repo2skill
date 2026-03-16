# Template System

repo2skill includes four built-in templates that control which sections appear in the generated SKILL.md and how much detail is included.

## Usage

```bash
repo2skill sindresorhus/got --template minimal
repo2skill sindresorhus/got --template detailed
repo2skill sindresorhus/got --template security
repo2skill sindresorhus/got --template default
```

## Available Templates

### `default` (Balanced)

The standard repo2skill output. Includes all common sections with moderate detail.

**Sections included:** When to Use, When NOT to Use, Quick Start, CLI Commands, Features (up to 5), Configuration, Packages, Examples (up to 3), API, Key API, Docker, Project Info, File Structure

**References:** Yes

### `minimal` (Just the Basics)

Stripped-down output for quick reference. Only description, install, and basic usage.

**Sections included:** When to Use, Quick Start, CLI Commands, Project Info

**References:** No  
**Max examples:** 1  
**Max features:** 3

### `detailed` (Full Documentation)

Maximum detail. Includes GitHub stats, all examples, and extended API reference.

**Sections included:** All sections from `default` + GitHub Stats

**References:** Yes  
**Max examples:** 5  
**Max features:** 10

### `security` (Security-Focused)

Adds security-specific sections: threat model, security considerations, auth patterns.

**Sections included:** Core sections + Security Considerations, Threat Model, GitHub Stats

**References:** Yes  
**Max examples:** 3  
**Max features:** 5

## Section Reference

| Section | minimal | default | detailed | security |
|---------|:-------:|:-------:|:--------:|:--------:|
| When to Use | ✅ | ✅ | ✅ | ✅ |
| When NOT to Use | ❌ | ✅ | ✅ | ✅ |
| Quick Start | ✅ | ✅ | ✅ | ✅ |
| CLI Commands | ✅ | ✅ | ✅ | ✅ |
| Features | ❌ | ✅ | ✅ | ✅ |
| Configuration | ❌ | ✅ | ✅ | ✅ |
| Packages | ❌ | ✅ | ✅ | ❌ |
| Examples | ❌ | ✅ | ✅ | ✅ |
| API Reference | ❌ | ✅ | ✅ | ✅ |
| Key API | ❌ | ✅ | ✅ | ✅ |
| Docker | ❌ | ✅ | ✅ | ✅ |
| Project Info | ✅ | ✅ | ✅ | ✅ |
| File Structure | ❌ | ✅ | ✅ | ❌ |
| GitHub Stats | ❌ | ❌ | ✅ | ✅ |
| Security | ❌ | ❌ | ❌ | ✅ |
| Threat Model | ❌ | ❌ | ❌ | ✅ |

## Preserving Manual Edits

When using `--upgrade` to regenerate a skill, sections wrapped in `<!-- manual -->` ... `<!-- /manual -->` are preserved across regenerations regardless of template.

```markdown
## Custom Notes

<!-- manual -->
This section won't be overwritten by --upgrade.
<!-- /manual -->
```
