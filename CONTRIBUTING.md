# Contributing to repo2skill

Thanks for your interest! Here's how to contribute.

## Getting Started

```bash
git clone https://github.com/NeuZhou/repo2skill.git
cd repo2skill
npm install
npm run build
npm test
```

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Dev mode
npm run dev -- facebook/react
```

## Adding Language Support

Language configs live in `src/languages.ts`. Each language definition includes:

- Package file patterns (e.g., `package.json`, `Cargo.toml`)
- Entry point patterns
- Install command templates
- Framework detection rules

## Pull Request Process

1. Fork the repo and create a feature branch: `git checkout -b feat/my-feature`
2. Write tests for new functionality (we have 100+!)
3. Ensure all tests pass: `npm test`
4. Submit a PR with a clear description

## Code Style

- TypeScript strict mode
- Use descriptive commit messages: `feat:`, `fix:`, `test:`, `docs:`
- New features need tests

## License

By contributing, you agree that your contributions will be licensed under MIT.
