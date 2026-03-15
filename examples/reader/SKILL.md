---
name: reader
description: Your LLMs deserve better input. WHEN: make http requests, run or write tests, search through files or text. Triggers: use reader, install reader, how to use reader, make http request.
---

# reader

Your LLMs deserve better input.

## When to Use

- Make HTTP requests
- Run or write tests
- Search through files or text

## When NOT to Use

- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```bash
npm install reader
```

## Docker

- **Base image:** `lwthiker/curl-impersonate:0.6-chrome-slim-bullseye`
- **Exposed ports:** `3000`, `3001`, `8080`, `8081`
- **Entrypoint:** `["node"]`

## Project Info

- **Language:** TypeScript, JavaScript
- **Key dependencies:** @esm2cjs/normalize-url, @google-cloud/translate, @koa/bodyparser, @mozilla/readability, @napi-rs/canvas, @types/turndown, @xmldom/xmldom, archiver

## File Structure

```
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── api/
│   ├── cloud-functions/
│   ├── db/
│   ├── dto/
│   ├── lib/
│   ├── services/
│   ├── stand-alone/
│   ├── utils/
│   ├── fetch.d.ts
│   ├── shared
│   └── types.d.ts
├── thinapps-shared/
├── Dockerfile
├── integrity-check.cjs
├── LICENSE
├── package-lock.json
```