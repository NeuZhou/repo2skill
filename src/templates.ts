/**
 * Template System - different SKILL.md templates for different needs.
 * v3.4.0: Added scaffold generation from template types.
 */

import * as fs from "fs";
import * as path from "path";

export type TemplateName = "minimal" | "detailed" | "security" | "default";
export type SkillType = "cli-tool" | "api-service" | "library" | "framework";

export interface TemplateConfig {
  name: TemplateName;
  description: string;
  /** Which sections to include */
  sections: {
    whenToUse: boolean;
    whenNotToUse: boolean;
    quickStart: boolean;
    cliCommands: boolean;
    features: boolean;
    configuration: boolean;
    packages: boolean;
    examples: boolean;
    api: boolean;
    keyApi: boolean;
    docker: boolean;
    projectInfo: boolean;
    fileStructure: boolean;
    githubStats: boolean;
    securityConsiderations: boolean;
    threatModel: boolean;
  };
  /** Max code examples to include */
  maxExamples: number;
  /** Max features to list */
  maxFeatures: number;
  /** Include references dir */
  includeReferences: boolean;
}

const TEMPLATES: Record<TemplateName, TemplateConfig> = {
  minimal: {
    name: "minimal",
    description: "Just the basics - description, install, quick usage",
    sections: {
      whenToUse: true,
      whenNotToUse: false,
      quickStart: true,
      cliCommands: true,
      features: false,
      configuration: false,
      packages: false,
      examples: false,
      api: false,
      keyApi: false,
      docker: false,
      projectInfo: true,
      fileStructure: false,
      githubStats: false,
      securityConsiderations: false,
      threatModel: false,
    },
    maxExamples: 1,
    maxFeatures: 3,
    includeReferences: false,
  },
  detailed: {
    name: "detailed",
    description: "Full skill with API reference, examples, config, and stats",
    sections: {
      whenToUse: true,
      whenNotToUse: true,
      quickStart: true,
      cliCommands: true,
      features: true,
      configuration: true,
      packages: true,
      examples: true,
      api: true,
      keyApi: true,
      docker: true,
      projectInfo: true,
      fileStructure: true,
      githubStats: true,
      securityConsiderations: false,
      threatModel: false,
    },
    maxExamples: 5,
    maxFeatures: 10,
    includeReferences: true,
  },
  security: {
    name: "security",
    description: "Security-focused - includes threat model, auth patterns, known CVEs",
    sections: {
      whenToUse: true,
      whenNotToUse: true,
      quickStart: true,
      cliCommands: true,
      features: true,
      configuration: true,
      packages: false,
      examples: true,
      api: true,
      keyApi: true,
      docker: true,
      projectInfo: true,
      fileStructure: false,
      githubStats: true,
      securityConsiderations: true,
      threatModel: true,
    },
    maxExamples: 3,
    maxFeatures: 5,
    includeReferences: true,
  },
  default: {
    name: "default",
    description: "Balanced template (the original repo2skill output)",
    sections: {
      whenToUse: true,
      whenNotToUse: true,
      quickStart: true,
      cliCommands: true,
      features: true,
      configuration: true,
      packages: true,
      examples: true,
      api: true,
      keyApi: true,
      docker: true,
      projectInfo: true,
      fileStructure: true,
      githubStats: false,
      securityConsiderations: false,
      threatModel: false,
    },
    maxExamples: 3,
    maxFeatures: 5,
    includeReferences: true,
  },
};

export function getTemplate(name: string): TemplateConfig {
  const key = name.toLowerCase() as TemplateName;
  if (key in TEMPLATES) return TEMPLATES[key];
  throw new Error(`Unknown template: "${name}". Available: ${Object.keys(TEMPLATES).join(", ")}`);
}

export function listTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATES);
}

export function isValidTemplate(name: string): boolean {
  return name.toLowerCase() in TEMPLATES;
}

/** Valid skill types for scaffold generation. */
export const SKILL_TYPES: SkillType[] = ["cli-tool", "api-service", "library", "framework"];

export function isValidSkillType(type: string): boolean {
  return SKILL_TYPES.includes(type as SkillType);
}

/**
 * Generate a SKILL.md scaffold for a given skill type and name.
 */
export function generateFromTemplate(type: SkillType, name: string): string {
  const scaffolds: Record<SkillType, () => string> = {
    "cli-tool": () => cliToolTemplate(name),
    "api-service": () => apiServiceTemplate(name),
    "library": () => libraryTemplate(name),
    "framework": () => frameworkTemplate(name),
  };
  const fn = scaffolds[type];
  if (!fn) throw new Error(`Unknown skill type: "${type}". Available: ${SKILL_TYPES.join(", ")}`);
  return fn();
}

/**
 * Write a generated template to disk, creating the directory if needed.
 */
export function writeTemplate(outputDir: string, name: string, content: string): string {
  const dir = path.join(outputDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "SKILL.md");
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

// --- Template generators ---

function cliToolTemplate(name: string): string {
  return `---
description: "${name} — CLI tool skill"
---

# ${name}

> One-line description of what ${name} does.

## When to Use

- You need to run ${name} commands from the terminal
- Automating tasks with ${name}

## When NOT to Use

- GUI-only workflows
- When a simpler alternative exists

## Quick Start

\`\`\`bash
# Install
npm install -g ${name}

# Basic usage
${name} --help
${name} <command> [options]
\`\`\`

## Key Commands

| Command | Description |
|---------|------------|
| \`${name} init\` | Initialize a new project |
| \`${name} run\` | Run the main task |
| \`${name} --version\` | Show version |

## Configuration

\`\`\`bash
# Config file: .${name}rc or ${name}.config.json
${name} config set key value
\`\`\`

## Examples

\`\`\`bash
# Example 1: Basic usage
${name} run --input file.txt

# Example 2: With options
${name} run --verbose --output result.json
\`\`\`

## Project Info

- **Language:** TypeScript
- **License:** MIT
`;
}

function apiServiceTemplate(name: string): string {
  return `---
description: "${name} — API service skill"
---

# ${name}

> One-line description of the ${name} API service.

## When to Use

- You need to interact with the ${name} REST API
- Building integrations with ${name}

## When NOT to Use

- Offline-only environments
- When direct database access is available

## Quick Start

\`\`\`bash
# Install SDK
npm install ${name}
\`\`\`

\`\`\`typescript
import { ${pascalCase(name)} } from "${name}";

const client = new ${pascalCase(name)}({ apiKey: process.env.API_KEY });
const result = await client.get("/resource");
\`\`\`

## Key API

| Endpoint | Method | Description |
|----------|--------|------------|
| \`/api/resource\` | GET | List resources |
| \`/api/resource/:id\` | GET | Get resource by ID |
| \`/api/resource\` | POST | Create resource |

## Authentication

\`\`\`bash
export ${name.toUpperCase().replace(/-/g, "_")}_API_KEY="your-key"
\`\`\`

## Examples

\`\`\`typescript
// List all resources
const items = await client.list({ limit: 10 });

// Create a resource
const created = await client.create({ name: "example" });
\`\`\`

## Project Info

- **Language:** TypeScript
- **License:** MIT
`;
}

function libraryTemplate(name: string): string {
  return `---
description: "${name} — library skill"
---

# ${name}

> One-line description of the ${name} library.

## When to Use

- You need ${name} functionality in your project
- Building on top of ${name} APIs

## When NOT to Use

- The built-in standard library covers your needs
- You need a different paradigm

## Quick Start

\`\`\`bash
npm install ${name}
\`\`\`

\`\`\`typescript
import { mainFunction } from "${name}";

const result = mainFunction(input);
\`\`\`

## Key API

| Function | Description |
|----------|------------|
| \`mainFunction(input)\` | Primary entry point |
| \`configure(opts)\` | Set options |
| \`validate(data)\` | Validate input |

## Features

- Feature 1
- Feature 2
- Feature 3

## Examples

\`\`\`typescript
// Example: Basic usage
import { mainFunction } from "${name}";
const output = mainFunction({ key: "value" });
\`\`\`

## Project Info

- **Language:** TypeScript
- **License:** MIT
`;
}

function frameworkTemplate(name: string): string {
  return `---
description: "${name} — framework skill"
---

# ${name}

> One-line description of the ${name} framework.

## When to Use

- Building new projects with ${name}
- You need ${name}'s architecture patterns

## When NOT to Use

- Simple scripts that don't need a framework
- Incompatible tech stack

## Quick Start

\`\`\`bash
# Create new project
npx create-${name}-app my-project
cd my-project
npm run dev
\`\`\`

## Key Concepts

- **Concept 1:** Description
- **Concept 2:** Description
- **Concept 3:** Description

## Features

- Feature 1
- Feature 2
- Feature 3

## Configuration

\`\`\`typescript
// ${name}.config.ts
export default {
  // Configuration options
};
\`\`\`

## Examples

\`\`\`typescript
// Example: Creating a basic component/module
import { Component } from "${name}";

export default class MyComponent extends Component {
  render() {
    return "Hello from ${name}!";
  }
}
\`\`\`

## Project Info

- **Language:** TypeScript
- **License:** MIT
`;
}

function pascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
