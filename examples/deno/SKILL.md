---
name: deno
description: deno — a TypeScript project. WHEN: work with the deno typescript project. Triggers: use deno, install deno, how to use deno.
---

# deno

## When to Use

- Work with the deno TypeScript project

## When NOT to Use

- Projects using Python or Go (different ecosystem)

## Quick Start

### Install

```sh
curl -fsSL https://deno.land/install.sh | sh
```
```powershell
irm https://deno.land/install.ps1 | iex
```

## Packages

This is a monorepo containing the following packages:

- `cache_dir`
- `config`
- `core`
- `core_testing`
- `crypto`
- `dcore`
- `dotenv`
- `eszip`
- `inspector_server`
- `lockfile`
- ... and 12 more

## Project Info

- **Language:** TypeScript, JavaScript, Rust, C, C++, C#
- **Tests:** Yes

## File Structure

```
├── cli/
│   ├── args/
│   ├── cache/
│   ├── js/
│   ├── lib/
│   ├── lsp/
│   ├── ops/
│   ├── rt/
│   ├── schemas/
│   ├── snapshot/
│   ├── standalone/
│   ├── tools/
│   ├── tsc/
│   ├── util/
│   ├── build.rs
│   ├── Cargo.toml
│   ├── cdp.rs
│   ├── clippy.toml
│   ├── deno.ico
│   ├── entitlements.plist
```