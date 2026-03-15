---
name: compose
description: - [Docker Compose](#docker-compose) - [Where to get Docker Compose](#where-to-get-docker-compose) + [Windows and macOS](#windows-and-macos) + [Linux](#linux) - [Quick Start](#quick-start) - [Contributing](#contributing) - [Legacy](#legacy) WHEN: run `v5` commands, make http requests, lint or format code, build command-line interfaces. Triggers: use compose, install compose, how to use compose, run v5.
---

# compose

- [Docker Compose](#docker-compose) - [Where to get Docker Compose](#where-to-get-docker-compose) + [Windows and macOS](#windows-and-macos) + [Linux](#linux) - [Quick Start](#quick-start) - [Contributing](#contributing) - [Legacy](#legacy)

## When to Use

- Run `v5` commands
- Make HTTP requests
- Lint or format code
- Build command-line interfaces

## When NOT to Use

- GUI or web-based workflows where CLI is not available
- Projects using Python or JavaScript (different ecosystem)

## Quick Start

### Install

```bash
go install github.com/docker/compose/v5@latest
```

## CLI Commands

- `v5`

## Project Info

- **Language:** Go
- **Tests:** Yes
- **Key dependencies:** github.com/AlecAivazis/survey/v2, github.com/DefangLabs/secret-detector, github.com/Microsoft/go-winio, github.com/acarl005/stripansi, github.com/buger/goterm, github.com/compose-spec/compose-go/v2, github.com/containerd/console, github.com/containerd/containerd/v2

## File Structure

```
├── cmd/
│   ├── cmdtrace/
│   ├── compatibility/
│   ├── compose/
│   ├── display/
│   ├── formatter/
│   ├── prompt/
│   └── main.go
├── docs/
│   ├── examples/
│   ├── reference/
│   ├── yaml/
│   ├── extension.md
│   └── sdk.md
├── internal/
│   ├── desktop/
│   ├── experimental/
│   ├── locker/
│   ├── memnet/
│   ├── oci/
```