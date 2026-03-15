---
name: commander.js
description: the complete solution for node.js command-line programs Language: JavaScript.
---

# commander.js

the complete solution for node.js command-line programs

## When to Use

Use when working with the commander.js JavaScript library.

## Quick Start

```sh
npm install commander
```

## Usage

This allows you to customise the usage description in the first line of the help. Given:

```js
program
  .name("my-command")
  .usage("[global options] command")
```

The help will start with:

```Text
Usage: my-command [global options] command
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