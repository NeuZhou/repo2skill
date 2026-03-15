# Contributing to repo2skill

Thanks for your interest in contributing! 🎉

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/repo2skill.git`
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Test locally: `node dist/cli.js sindresorhus/got`

## Development

```bash
# Build
npm run build

# Run in development
npm run dev -- sindresorhus/got

# Test with a local repo
node dist/cli.js /path/to/local/repo
```

## What to Contribute

- **New language support** — add manifest parsing in `src/analyzer.ts` (e.g., `Gemfile` for Ruby, `pom.xml` for Java)
- **Better heuristics** — improve description extraction, trigger phrase generation, or "when to use" inference
- **Bug fixes** — if a repo produces bad output, file an issue with the repo URL
- **Tests** — we need them! Any test coverage is welcome
- **Documentation** — improve README, add examples

## Commit Style

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `refactor:` code changes that neither fix bugs nor add features
- `chore:` maintenance tasks

## Pull Requests

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Build and test: `npm run build`
4. Commit with a descriptive message
5. Push and open a PR

## Code Style

- TypeScript strict mode
- Prefer explicit types over `any`
- Keep functions focused and small
- Comment non-obvious logic

## Questions?

Open an issue — we're happy to help!
