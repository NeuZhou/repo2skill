---
name: commander.js
description: The complete solution for [node.js](http://nodejs.org) command-line interfaces. WHEN: make http requests. Triggers: use commander.js, install commander.js, how to use commander.js, make http request.
---

# commander.js

The complete solution for [node.js](http://nodejs.org) command-line interfaces.

## When to Use

- Make HTTP requests

## When NOT to Use

- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```sh
npm install commander
```

### Basic Usage

```js
program
  .name("my-command")
  .usage("[global options] command")
```

```Text
Usage: my-command [global options] command
```

```js
program
  .option('-p, --port <number>', 'server port number')
  .option('--trace', 'add extra debugging output')
  .option('--ws, --workspace <name>', 'use a custom workspace')
```

## Configuration

```js
program
  .option('-p, --port <number>', 'server port number')
  .option('--trace', 'add extra debugging output')
  .option('--ws, --workspace <name>', 'use a custom workspace')
```
```sh
serve -p 80
serve -p80
serve --port 80
serve --port=80
```

## Project Info

- **Language:** JavaScript, TypeScript
- **License:** MIT
- **Tests:** Yes

## File Structure

```
├── docs/
│   ├── zh-CN/
│   ├── deprecated.md
│   ├── help-in-depth.md
│   ├── options-in-depth.md
│   ├── parsing-and-hooks.md
│   ├── release-policy.md
│   └── terminology.md
├── examples/
│   ├── action-this.js
│   ├── alias.js
│   ├── argument.js
│   ├── arguments-custom-processing.js
│   ├── arguments-extra.js
│   ├── color-help-replacement.mjs
│   ├── color-help.mjs
│   ├── configure-help.js
│   ├── configure-output.js
│   ├── custom-command-class.js
│   ├── custom-help
```