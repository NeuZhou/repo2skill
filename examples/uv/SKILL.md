---
name: uv
description: An extremely fast Python package and project manager, written in Rust. WHEN: make http requests. Triggers: use uv, install uv, how to use uv, make http request.
---

# uv

An extremely fast Python package and project manager, written in Rust.

## When to Use

- Make HTTP requests

## When NOT to Use

- Projects using TypeScript or Go (different ecosystem)

## Quick Start

### Install

Install uv with our standalone installers:

```bash

### Basic Usage

uv's documentation is available at [docs.astral.sh/uv](https://docs.astral.sh/uv).

Additionally, the command line reference documentation can be viewed with `uv help`.

## Key Features

- A single tool to replace `pip`, `pip-tools`, `pipx`, `poetry`, `pyenv`, `twine`, `virtualenv`, and
- 10-100x faster than `pip`.
- Provides comprehensive project management, with a
- Runs scripts, with support for
- Installs and manages Python versions.

## Docker

- **Base image:** `--platform=$BUILDPLATFORM`
- **Entrypoint:** `["/uv"]`

## Project Info

- **Language:** Rust, Python, JavaScript
- **Tests:** Yes

## File Structure

```
├── assets/
│   ├── badge/
│   ├── png/
│   └── svg/
├── changelogs/
│   ├── 0.1.x.md
│   ├── 0.2.x.md
│   ├── 0.3.x.md
│   ├── 0.4.x.md
│   ├── 0.5.x.md
│   ├── 0.6.x.md
│   ├── 0.7.x.md
│   ├── 0.8.x.md
│   └── 0.9.x.md
├── crates/
│   ├── uv/
│   ├── uv-audit/
│   ├── uv-auth/
│   ├── uv-bench/
│   ├── uv-bin-install/
```
```