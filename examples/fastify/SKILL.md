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

fastify.get('/', async (request, reply) => {
  reply.type('application/json').code(200)
  return { hello: 'world' }
})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
  // Server is now listening on ${address}
})
```

## Examples

With async-await:

Do you want to know more? Head to the <a
href="./docs/Guides/Getting-Started.md"><code><b>Getting Started</b></code></a>.
If you learn best by reading code, explore the official [demo](https://github.com/fastify/demo).

> ## Note
> `.listen` binds to the local host, `localhost`, interface by default
> (`127.0.0.1` or `::1`, depending on the operating system configuration). If
> you are running Fastify in a container (Docker,
> [GCP](https://cloud.google.com/), etc.), you may need to bind to `0.0.0.0`. Be
> careful when listening on all interfaces; it comes with inherent
> [security
> risks](https://web.archive.org/web/20170711105010/https://snyk.io/blog/mongodb-hack-and-secure-defaults/).
> See [the documentation](./docs/Reference/Server.md#listen) for more
> information.

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