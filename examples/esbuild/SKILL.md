---
name: esbuild
description: Our current build tools for the web are 10-100x slower than they could be: WHEN: run `esbuild` commands. Triggers: use esbuild, install esbuild, how to use esbuild, run esbuild.
---

# esbuild

Our current build tools for the web are 10-100x slower than they could be:

## When to Use

- Run `esbuild` commands

## When NOT to Use

- GUI or web-based workflows where CLI is not available
- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```bash
make
make install
```

## CLI Commands

- `esbuild`

## Key Features

- Extreme speed without needing a cache
- JavaScript, CSS, TypeScript, and JSX built-in
- A straightforward API for CLI, JS, and Go
- Bundles ESM and CommonJS modules
- Bundles CSS including CSS modules

## Project Info

- **Language:** C, Go, JavaScript, TypeScript
- **Tests:** Yes

## File Structure

```
├── cmd/
│   └── esbuild/
├── compat-table/
│   ├── src/
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
├── docs/
│   ├── architecture.md
│   └── development.md
├── images/
│   ├── benchmark-dark.svg
│   ├── benchmark-light.svg
│   ├── build-pipeline.png
│   ├── code-splitting-1.png
│   ├── code-splitting-2.png
│   ├── logo.png
│   ├── logo.svg
│   ├── tree-shaking.png
```