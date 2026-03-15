---
name: fastify
description: An efficient server implies a lower cost of the infrastructure, better responsiveness under load, and happy users. How can you efficiently handle the resources of your server, knowing that you are serving the highest number of requests possible, without sacrificing security validations and handy development? WHEN: build web servers or apis with fastify, build extensible server applications, run or write tests. Triggers: use fastify, install fastify, how to use fastify, make http request.
---

# fastify

An efficient server implies a lower cost of the infrastructure, better responsiveness under load, and happy users. How can you efficiently handle the resources of your server, knowing that you are serving the highest number of requests possible, without sacrificing security validations and handy development?

## When to Use

- Build web servers or APIs with fastify
- Build extensible server applications
- Run or write tests

## When NOT to Use

- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```sh
npm i fastify
```

### Basic Usage

```sh
mkdir my-app
cd my-app
```

```sh
npm init fastify
```

```sh
npm i
```

## Examples

```js
// Require the framework and instantiate it

// ESM
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})
// CommonJs
const fastify = require('fastify')({
  logger: true
})

// Declare a route
fastify.get('/', (request, reply) => {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
  // Server is now listening on ${address}
})
```

With async-await:

```js
// ESM
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})
// CommonJs
const fastify = require('fastify')({
  logger: true
})


## Project Info

- **Language:** JavaScript, TypeScript
- **License:** MIT
- **Tests:** Yes
- **Key dependencies:** @fastify/ajv-compiler, @fastify/error, @fastify/fast-json-stringify-compiler, @fastify/proxy-addr, abstract-logging, avvio, fast-json-stringify, find-my-way

## File Structure

```
├── build/
│   ├── build-error-serializer.js
│   ├── build-validation.js
│   └── sync-version.js
├── docs/
│   ├── Guides/
│   ├── Reference/
│   ├── resources/
│   └── index.md
├── examples/
│   ├── benchmark/
│   ├── asyncawait.js
│   ├── hooks.js
│   ├── http2.js
│   ├── https.js
│   ├── parser.js
│   ├── plugin.js
│   ├── route-prefix.js
│   ├── shared-schema.js
│   ├── simple-stream.js
```
```