---
name: react
description: React is a JavaScript library for building user interfaces. WHEN: work with the react javascript project. Triggers: use react, install react, how to use react.
---

# react

React is a JavaScript library for building user interfaces.

## When to Use

- Work with the react JavaScript project

## When NOT to Use

- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

React has been designed for gradual adoption from the start, and **you can use as little or as much React as you need**:

* Use [Quick Start](https://react.dev/learn) to get a taste of React.
* [Add React to an Existing Project](https://react.dev/learn/add-react-to-an-existing-project) to use as little or as much React as you need.
* [Create a New React App](https://react.dev/learn/start-a-new-react-project) if you're looking for a powerful JavaScript toolchain.

### Basic Usage

```jsx
import { createRoot } from 'react-dom/client';

function HelloMessage({ name }) {
  return <div>Hello {name}</div>;
}

const root = createRoot(document.getElementById('container'));
root.render(<HelloMessage name="Taylor" />);
```

## Packages

This is a monorepo containing the following packages:

- `dom-event-testing-library`
- `eslint-plugin-react-hooks`
- `internal-test-utils`
- `jest-react`
- `react`
- `react-art`
- `react-cache`
- `react-client`
- `react-debug-tools`
- `react-devtools`
- ... and 28 more

## Examples

We have several examples [on the website](https://react.dev/). Here is the first one to get you started:



This example will render "Hello Taylor" into a container on the page.

You'll notice that we used an HTML-like syntax; [we call it JSX](https://react.dev/learn#writing-markup-with-jsx). JSX is not required to use React, but it makes code more readable, and writing it feels like writing HTML.

## Project Info

- **Language:** JavaScript, TypeScript
- **Tests:** Yes

## File Structure

```
├── compiler/
│   ├── apps/
│   ├── docs/
│   ├── fixtures/
│   ├── packages/
│   ├── scripts/
│   ├── CHANGELOG.md
│   ├── CLAUDE.md
│   ├── package.json
│   ├── README.md
│   └── yarn.lock
├── fixtures/
│   ├── art/
│   ├── attribute-behavior/
│   ├── concurrent/
│   ├── devtools/
│   ├── dom/
│   ├── eslint-v10/
│   ├── eslint-v6/
│   ├── eslint-v7/
```