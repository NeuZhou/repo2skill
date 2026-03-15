---
name: openai-node
description: This library provides convenient access to the OpenAI REST API from TypeScript or JavaScript. WHEN: run `openai` commands, make http requests. Triggers: use openai-node, install openai-node, how to use openai-node, run openai.
---

# openai-node

This library provides convenient access to the OpenAI REST API from TypeScript or JavaScript.

## When to Use

- Run `openai` commands
- Make HTTP requests

## When NOT to Use

- GUI or web-based workflows where CLI is not available
- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```sh
npm install openai
```

### Basic Usage

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

const response = await client.responses.create({
  model: 'gpt-5.2',
  instructions: 'You are a coding assistant that talks like a pirate',
  input: 'Are semicolons optional in JavaScript?',
});

console.log(response.output_text);
```

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

const completion = await client.chat.completions.create({
  model: 'gpt-5.2',
  messages: [
    { role: 'developer', content: 'Talk like a pirate.' },
    { role: 'user', content: 'Are semicolons optional in JavaScript?' },
  ],
});

console.log(completion.choices[0].message.content);
```

## CLI Commands

- `openai`

## Key API

- `default`
- `type Uploadable`
- `toFile`
- `APIPromise`
- `OpenAI`
- `type ClientOptions`
- `PagePromise`
- `OpenAIError`
- `APIError`
- `APIConnectionError`

## Project Info

- **Language:** TypeScript, JavaScript
- **License:** Apache-2.0
- **Tests:** Yes

## File Structure

```
├── bin/
│   ├── check-release-environment
│   ├── cli
│   ├── migration-config.json
│   ├── publish-jsr
│   └── publish-npm
├── ecosystem-tests/
│   ├── browser-direct-import/
│   ├── bun/
│   ├── cloudflare-worker/
│   ├── deno/
│   ├── node-js/
│   ├── node-ts-cjs/
│   ├── node-ts-cjs-auto/
│   ├── node-ts-cjs-web/
│   ├── node-ts-esm/
│   ├── node-ts-esm-auto/
│   ├── node-ts-esm-web/
│   ├── node-ts4.5-jest28/
│   ├── ts-browser-webpack/
```