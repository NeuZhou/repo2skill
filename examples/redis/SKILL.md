---
name: redis
description: This document serves as both a quick start guide to Redis and a detailed resource for building it from source. WHEN: make http requests. Triggers: use redis, install redis, how to use redis, make http request.
---

# redis

This document serves as both a quick start guide to Redis and a detailed resource for building it from source.

## When to Use

- Make HTTP requests

## When NOT to Use

- Projects using TypeScript or Rust (different ecosystem)

## Quick Start

### Install

```sh
  docker run -d -p 6379:6379 redis:latest
  ```

### Basic Usage

```sh
  docker run -d -p 6379:6379 redis:latest
  ```

## Packages

This is a monorepo containing the following packages:

- `redisbloom`
- `redisearch`
- `redisjson`
- `redistimeseries`
- `vector-sets`

## Project Info

- **Language:** C, Python, Lua, Ruby, C++, JavaScript
- **Tests:** Yes

## File Structure

```
├── deps/
│   ├── fast_float/
│   ├── fpconv/
│   ├── hdr_histogram/
│   ├── hiredis/
│   ├── jemalloc/
│   ├── linenoise/
│   ├── lua/
│   ├── xxhash/
│   ├── Makefile
│   └── README.md
├── modules/
│   ├── redisbloom/
│   ├── redisearch/
│   ├── redisjson/
│   ├── redistimeseries/
│   ├── vector-sets/
│   ├── common.mk
│   └── Makefile
├── src/
```