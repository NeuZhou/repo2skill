import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateExamples, extractReadmeExamples, generateApiExamples } from "../example-gen";
import { ApiEntry } from "../api-extractor";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDir = path.join(os.tmpdir(), `repo2skill-exgen-test-${Date.now()}`);

beforeEach(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("extractReadmeExamples", () => {
  it("extracts code blocks with imports", () => {
    const readme = `# My Lib

## Usage

\`\`\`typescript
import { add } from "my-lib";
const result = add(1, 2);
console.log(result);
\`\`\`

## Install

\`\`\`bash
npm install my-lib
\`\`\`
`;
    const examples = extractReadmeExamples(readme);
    expect(examples.length).toBe(1);
    expect(examples[0].source).toBe("readme");
    expect(examples[0].code).toContain("import { add }");
    expect(examples[0].language).toBe("typescript");
  });

  it("skips short install-only blocks", () => {
    const readme = `\`\`\`bash\nnpm install foo\n\`\`\``;
    const examples = extractReadmeExamples(readme);
    expect(examples).toHaveLength(0);
  });

  it("extracts multiple examples", () => {
    const readme = `
\`\`\`javascript
const { Client } = require("sdk");
const client = new Client();
client.connect("localhost");
\`\`\`

\`\`\`python
from sdk import Client
client = Client()
client.connect("localhost")
\`\`\`
`;
    const examples = extractReadmeExamples(readme);
    expect(examples.length).toBe(2);
  });
});

describe("generateApiExamples", () => {
  it("generates examples from API entries", () => {
    const entries: ApiEntry[] = [
      { name: "createApp", kind: "function", signature: "createApp(config)", description: "Create a new app", file: "a.ts", exported: true },
    ];
    const examples = generateApiExamples(entries);
    expect(examples.length).toBe(1);
    expect(examples[0].source).toBe("api-signature");
    expect(examples[0].code).toContain("createApp(config)");
  });

  it("limits to 3 examples", () => {
    const entries: ApiEntry[] = Array.from({ length: 5 }, (_, i) => ({
      name: `fn${i}`, kind: "function" as const, signature: `fn${i}()`, file: "a.ts", exported: true,
    }));
    const examples = generateApiExamples(entries);
    expect(examples.length).toBe(3);
  });
});

describe("generateExamples", () => {
  it("combines README and example-dir sources", async () => {
    fs.writeFileSync(path.join(tmpDir, "README.md"), `
\`\`\`javascript
const { thing } = require("pkg");
const result = thing.doStuff();
console.log(result);
\`\`\`
`);
    fs.mkdirSync(path.join(tmpDir, "examples"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "examples", "basic.js"), `
const { thing } = require("../src");
const result = thing.doStuff({ verbose: true });
console.log("Example output:", result);
`);
    const examples = await generateExamples(tmpDir);
    expect(examples.length).toBeGreaterThanOrEqual(1);
    const sources = examples.map(e => e.source);
    expect(sources).toContain("readme");
  });

  it("returns empty for empty directory", async () => {
    const examples = await generateExamples(tmpDir);
    expect(examples).toHaveLength(0);
  });
});
