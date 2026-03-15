---
name: langchainjs
description: LangChain is a framework for building LLM-powered applications. It helps you chain together interoperable components and third-party integrations to simplify AI application development — all while future-proofing decisions as the underlying technology evolves. WHEN: build typescript applications with langchainjs, make http requests. Triggers: use langchainjs, install langchainjs, how to use langchainjs, make http request.
---

# langchainjs

LangChain is a framework for building LLM-powered applications. It helps you chain together interoperable components and third-party integrations to simplify AI application development — all while future-proofing decisions as the underlying technology evolves.

## When to Use

- Build TypeScript applications with langchainjs
- Make HTTP requests

## When NOT to Use

- Projects using Rust or Go (different ecosystem)

## Quick Start

### Install

```bash
npm install langchainjs
```

## Packages

This is a monorepo containing the following packages:

- `community`
- `create-langchain-integration`
- `langchain`
- `langchain-classic`
- `langchain-core`
- `langchain-mcp-adapters`
- `langchain-textsplitters`
- `providers`

## Project Info

- **Language:** TypeScript, JavaScript, Python
- **License:** MIT
- **Tests:** Yes

## File Structure

```
├── dependency_range_tests/
│   ├── scripts/
│   └── docker-compose.yml
├── docs/
│   └── core_docs/
├── environment_tests/
│   ├── scripts/
│   ├── test-exports-bun/
│   ├── test-exports-cf/
│   ├── test-exports-cjs/
│   ├── test-exports-esbuild/
│   ├── test-exports-esm/
│   ├── test-exports-node-classic/
│   ├── test-exports-tsc/
│   ├── test-exports-vercel/
│   ├── test-exports-vite/
│   ├── docker-compose.yml
│   └── README.md
├── examples/
│   ├── src/
```