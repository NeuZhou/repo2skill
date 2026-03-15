---
name: ollama
description: Start building with open models. WHEN: run `ollama` commands, build or bundle projects, make http requests. Triggers: use ollama, install ollama, how to use ollama, run ollama.
---

# ollama

Start building with open models.

## When to Use

- Run `ollama` commands
- Build or bundle projects
- Make HTTP requests

## When NOT to Use

- GUI or web-based workflows where CLI is not available
- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```bash
mkdir build && cd build
cmake ..
make
make install
```

### Basic Usage

- [CLI reference](https://docs.ollama.com/cli)
- [REST API reference](https://docs.ollama.com/api)
- [Importing models](https://docs.ollama.com/import)
- [Modelfile reference](https://docs.ollama.com/modelfile)
- [Building from source](https://github.com/ollama/ollama/blob/main/docs/development.md)

## CLI Commands

- `ollama`

## Docker

- **Base image:** `scratch`
- **Exposed ports:** `11434`
- **Entrypoint:** `["/bin/ollama"]`

## Project Info

- **Language:** Go, C++, TypeScript, C, JavaScript
- **Tests:** Yes
- **Key dependencies:** github.com/TheTitanrain/w32, github.com/containerd/console, github.com/gin-gonic/gin, github.com/golang/protobuf, github.com/google/go-cmp, github.com/google/uuid, github.com/ledongthuc/pdf, github.com/mattn/go-sqlite3

## File Structure

```
├── anthropic/
│   ├── anthropic_test.go
│   ├── anthropic.go
│   └── trace.go
├── api/
│   ├── examples/
│   ├── client_test.go
│   ├── client.go
│   ├── types_test.go
│   ├── types_typescript_test.go
│   └── types.go
├── app/
│   ├── assets/
│   ├── auth/
│   ├── cmd/
│   ├── darwin/
│   ├── dialog/
│   ├── format/
│   ├── logrotate/
│   ├── server/
```