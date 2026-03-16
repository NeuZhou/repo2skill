# Examples

Practical examples for using repo2skill in different scenarios.

| Example | Description |
|---------|-------------|
| [basic.sh](basic.sh) | Simplest usage — convert a single repo |
| [batch.sh](batch.sh) | Batch convert multiple repos in parallel |
| [monorepo.sh](monorepo.sh) | Handle monorepo packages |
| [publish.sh](publish.sh) | Publish generated skills to ClawHub |
| [custom-template.sh](custom-template.sh) | Use different output templates |
| [ci-integration.yml](ci-integration.yml) | GitHub Actions workflow for CI/CD |

## Quick Start

```bash
# Install
npm install -g repo2skill

# Convert any repo
repo2skill https://github.com/expressjs/express

# Interactive mode
repo2skill --interactive
```
