---
name: express
description: **Fast, unopinionated, minimalist web framework for [Node.js](https://nodejs.org).** WHEN: build web servers or apis with express. Triggers: use express, install express, how to use express, make http request.
---

# express

**Fast, unopinionated, minimalist web framework for [Node.js](https://nodejs.org).**

## When to Use

- Build web servers or APIs with express

## When NOT to Use

- Projects using Python or TypeScript (different ecosystem)

## Quick Start

### Install

```bash
npm install express
```

### Basic Usage

```bash
npm install -g express-generator@4
```

```bash
express /tmp/foo && cd /tmp/foo
```

```bash
npm install
```

## Key Features

- Robust routing
- Focus on high performance
- Super-high test coverage
- HTTP helpers (redirection, caching, etc)
- View system supporting 14+ template engines

## Examples

To view the examples, clone the Express repository:

```bash
git clone https://github.com/expressjs/express.git --depth 1 && cd express
```

  Then install the dependencies:



  Then run whichever example you want:

```bash
node examples/content-negotiation
```

## Project Info

- **Language:** JavaScript
- **License:** MIT
- **Tests:** Yes
- **Key dependencies:** accepts, body-parser, content-disposition, content-type, cookie, cookie-signature, debug, depd

## File Structure

```
├── examples/
│   ├── auth/
│   ├── content-negotiation/
│   ├── cookie-sessions/
│   ├── cookies/
│   ├── downloads/
│   ├── ejs/
│   ├── error/
│   ├── error-pages/
│   ├── hello-world/
│   ├── markdown/
│   ├── multi-router/
│   ├── mvc/
│   ├── online/
│   ├── params/
│   ├── resource/
│   ├── route-map/
│   ├── route-middleware/
│   ├── route-separation/
│   ├── search/
```