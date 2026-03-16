import { describe, it, expect } from "vitest";
import { testSkill, formatTestResult } from "../skill-test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function tmpSkill(content: string): string {
  const p = path.join(os.tmpdir(), `skill-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, "SKILL.md");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

const goodSkill = `---
description: Parse and validate YAML files with schema support
---

# yaml-tool

> Parse and validate YAML files with schema support

## When to Use
- Parse YAML configuration files
- Validate YAML against a schema
- Convert YAML to JSON

## Install

\`\`\`bash
npm install yaml-tool
\`\`\`

## Features
- Fast YAML parsing
- Schema validation
- JSON conversion

## Usage

\`\`\`typescript
import { parse } from "yaml-tool";
const data = parse("key: value");
\`\`\`
`;

describe("testSkill", () => {
  it("passes a good skill", () => {
    const p = tmpSkill(goodSkill);
    try {
      const result = testSkill(p);
      expect(result.failed).toBe(0);
      expect(result.passed).toBeGreaterThanOrEqual(5);
    } finally {
      fs.rmSync(path.dirname(p), { recursive: true, force: true });
    }
  });

  it("fails on nonexistent file", () => {
    const result = testSkill("/nonexistent/SKILL.md");
    expect(result.failed).toBe(1);
  });

  it("fails on too-short content", () => {
    const p = tmpSkill("hi");
    try {
      const result = testSkill(p);
      expect(result.failed).toBeGreaterThan(0);
    } finally {
      fs.rmSync(path.dirname(p), { recursive: true, force: true });
    }
  });

  it("warns on missing when-to-use section", () => {
    const p = tmpSkill(`---
description: A decent tool for something useful
---

# some-tool

\`\`\`bash
npm install some-tool
\`\`\`

## Features
- Does things well
- Fast and reliable

Some more content here to make it long enough.
And more lines.
And more.
`);
    try {
      const result = testSkill(p);
      const whenCheck = result.checks.find(c => c.name === "When to Use");
      expect(whenCheck?.status).toBe("warn");
    } finally {
      fs.rmSync(path.dirname(p), { recursive: true, force: true });
    }
  });
});

describe("formatTestResult", () => {
  it("formats results as string", () => {
    const p = tmpSkill(goodSkill);
    try {
      const result = testSkill(p);
      const formatted = formatTestResult(result);
      expect(formatted).toContain("Skill Test Results");
      expect(formatted).toContain("passed");
    } finally {
      fs.rmSync(path.dirname(p), { recursive: true, force: true });
    }
  });
});
