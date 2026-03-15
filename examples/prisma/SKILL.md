---
name: prisma
description: Prisma ORM is a **next-generation ORM** that consists of these tools: WHEN: make http requests, build command-line interfaces. Triggers: use prisma, install prisma, how to use prisma, make http request.
---

# prisma

Prisma ORM is a **next-generation ORM** that consists of these tools:

## When to Use

- Make HTTP requests
- Build command-line interfaces

## When NOT to Use

- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```bash
npm install prisma
```

## Packages

This is a monorepo containing the following packages:

- `adapter-better-sqlite3`
- `adapter-d1`
- `adapter-libsql`
- `adapter-mariadb`
- `adapter-mssql`
- `adapter-neon`
- `adapter-pg`
- `adapter-planetscale`
- `adapter-ppg`
- `bundle-size`
- ... and 36 more

## Project Info

- **Language:** TypeScript, JavaScript
- **License:** Apache-2.0
- **Tests:** Yes

## File Structure

```
├── docker/
│   ├── mongodb_migrate_seed/
│   ├── mongodb_replica/
│   ├── planetscale_proxy/
│   ├── postgres_ext/
│   ├── docker-compose.yml
│   └── README.md
├── docs/
│   ├── plans/
│   └── benchmarking.md
├── eslint-local-rules/
│   ├── all-types-are-exported.ts
│   ├── imports-from-same-directory.ts
│   ├── index.js
│   ├── tsconfig.json
│   └── valid-exported-types-index.ts
├── examples/
│   └── README.md
├── graphs/
│   ├── dependencies.png
```