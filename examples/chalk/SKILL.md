---
name: chalk
description: Terminal string styling done right WHEN: style terminal output. Triggers: use chalk, install chalk, how to use chalk.
---

# chalk

Terminal string styling done right

## When to Use

- Style terminal output

## When NOT to Use

- Projects using Python or Rust (different ecosystem)

## Quick Start

### Install

```sh
npm install chalk
```

### Basic Usage

```js
import chalk from 'chalk';

console.log(chalk.blue('Hello world!'));
```

```js
import chalk from 'chalk';

const log = console.log;

// Combine styled and normal strings
log(chalk.blue('Hello') + ' World' + chalk.red('!'));

// Compose multiple styles using the chainable API
log(chalk.blue.bgRed.bold('Hello world!'));

// Pass in multiple arguments
log(chalk.blue('Hello', 'World!', 'Foo', 'bar', 'biz', 'baz'));

// Nest styles
log(chalk.red('Hello', chalk.underline.bgBlue('world') + '!'));

// Nest styles of the same type even (color, underline, background)
log(chalk.green(
	'I am a green line ' +
	chalk.blue.underline.bold('with a blue substring') +
	' that becomes green again!'
));

// ES2015 template literal
log(`
CPU: ${chalk.red('90%')}
RAM: ${chalk.green('40%')}
DISK: ${chalk.yellow('70%')}
`);

// Use RGB colors in terminal emulators that support it.
log(chalk.rgb(123, 45, 67).underline('Underlined reddish color'));
log(chalk.hex('#DEADED').bold('Bold gray!'));
```

```js
import chalk from 'chalk';

const error = chalk.bold.red;
const warning = chalk.hex('#FFA500'); // Orange color

console.log(error('Error!'));
console.log(warning('Warning!'));
```

## Key Features

- Expressive API
- Highly performant
- No dependencies
- Ability to nest styles
- 256/Truecolor color support

## Project Info

- **Language:** JavaScript, TypeScript
- **License:** MIT
- **Tests:** Yes

## File Structure

```
├── examples/
│   ├── rainbow.js
│   └── screenshot.js
├── media/
│   ├── logo.png
│   ├── logo.svg
│   └── screenshot.png
├── source/
│   ├── index.d.ts
│   ├── index.js
│   ├── index.test-d.ts
│   └── utilities.js
├── test/
│   ├── _fixture.js
│   ├── chalk.js
│   ├── instance.js
│   ├── level.js
│   ├── no-color-support.js
│   └── visible.js
├── benchmark.js
```