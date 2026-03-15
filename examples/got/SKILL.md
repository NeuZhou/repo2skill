---
name: got
description: > Human-friendly and powerful HTTP request library for Node.js WHEN: make http requests. Triggers: use got, install got, how to use got, make http request.
---

# got

> Human-friendly and powerful HTTP request library for Node.js

## When to Use

- Make HTTP requests

## When NOT to Use

- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```sh
npm install got
```

### Basic Usage

By default, Got will retry on failure. To disable this option, set [`options.retry.limit`](documentation/7-retry.md#retry) to 0.

#### Main API

- [x] [Promise API](documentation/1-promise.md)
- [x] [Options](documentation/2-options.md)
- [x] [Stream API](documentation/3-streams.md)
- [x] [Pagination API](documentation/4-pagination.md)
- [x] [Advanced HTTPS API](documentation/5-https.md)
- [x] [HTTP/2 support](documentation/2-options.md#http2)
- [x] [`Response` class](documentation/3-streams.md#response-2)

#### Timeouts and retries

- [x] [Advanced timeout handling](documentation/6-timeout.md)
- [x] [Retries on failure](documentation/7-retry.md)
- [x] [Errors with metadata](documentation/8-errors.md)

#### Advanced creation

- [x] [Hooks](documentation/9-hooks.md)
- [x] [Instances](documentation/10-instances.md)
- [x] [Progress events & other events](documentation/3-streams.md#events)
- [x] [Plugins](documentation/lets-make-a-plugin.md)
- [x] [Compose](documentation/examples/advanced-creation.js)

#### Cache, Proxy and UNIX sockets

- [x] [RFC compliant caching](documentation/cache.md)
- [x] [Proxy support](documentation/tips.md#proxying)

## Key Features

- Used by 10K+ packages and 5M+ repos
- Actively maintained
- Trusted by many companies

## Project Info

- **Language:** TypeScript, JavaScript
- **License:** MIT
- **Tests:** Yes
- **Key dependencies:** @sindresorhus/is, byte-counter, cacheable-lookup, cacheable-request, chunk-data, decompress-response, http2-wrapper, keyv

## File Structure

```
├── benchmark/
│   ├── index.ts
│   └── server.ts
├── documentation/
│   ├── examples/
│   ├── migration-guides/
│   ├── 1-promise.md
│   ├── 10-instances.md
│   ├── 2-options.md
│   ├── 3-streams.md
│   ├── 4-pagination.md
│   ├── 5-https.md
│   ├── 6-timeout.md
│   ├── 7-retry.md
│   ├── 8-errors.md
│   ├── 9-hooks.md
│   ├── async-stack-traces.md
│   ├── cache.md
│   ├── diagnostics-channel.md
│   ├── lets-make-a-plugin.md
```