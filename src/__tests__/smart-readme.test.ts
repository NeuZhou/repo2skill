import { describe, it, expect } from "vitest";
import { extractInstallCommands, extractApiExamples, extractBadges, extractTOC } from "../analyzer";
import type { BadgeInfo, TOCEntry } from "../analyzer";

// ============================================================
// extractInstallCommands
// ============================================================
describe("extractInstallCommands", () => {
  it("extracts npm install from bash block", () => {
    const readme = "# Foo\n\n```bash\nnpm install my-package\n```\n";
    const cmds = extractInstallCommands(readme);
    expect(cmds).toContain("npm install my-package");
  });

  it("extracts pip install", () => {
    const readme = "```sh\npip install my-lib\n```";
    expect(extractInstallCommands(readme)).toContain("pip install my-lib");
  });

  it("extracts cargo install", () => {
    const readme = "```bash\ncargo install my-tool\n```";
    expect(extractInstallCommands(readme)).toContain("cargo install my-tool");
  });

  it("extracts yarn add", () => {
    const readme = "```bash\nyarn add my-package\n```";
    expect(extractInstallCommands(readme)).toContain("yarn add my-package");
  });

  it("extracts pnpm add", () => {
    const readme = "```shell\npnpm add my-package\n```";
    expect(extractInstallCommands(readme)).toContain("pnpm add my-package");
  });

  it("strips $ prefix", () => {
    const readme = "```bash\n$ npm install foo\n```";
    expect(extractInstallCommands(readme)).toContain("npm install foo");
  });

  it("extracts go install", () => {
    const readme = "```bash\ngo install github.com/foo/bar@latest\n```";
    expect(extractInstallCommands(readme)).toContain("go install github.com/foo/bar@latest");
  });

  it("extracts gem install", () => {
    const readme = "```bash\ngem install my_gem\n```";
    expect(extractInstallCommands(readme)).toContain("gem install my_gem");
  });

  it("extracts brew install", () => {
    const readme = "```bash\nbrew install mytool\n```";
    expect(extractInstallCommands(readme)).toContain("brew install mytool");
  });

  it("extracts dotnet add package", () => {
    const readme = "```bash\ndotnet add package MyLib\n```";
    expect(extractInstallCommands(readme)).toContain("dotnet add package MyLib");
  });

  it("deduplicates identical commands", () => {
    const readme = "```bash\nnpm install foo\n```\n\n```bash\nnpm install foo\n```";
    expect(extractInstallCommands(readme)).toEqual(["npm install foo"]);
  });

  it("ignores non-install commands in code blocks", () => {
    const readme = "```bash\necho hello\nls -la\n```";
    expect(extractInstallCommands(readme)).toHaveLength(0);
  });

  it("handles multiple install commands in one block", () => {
    const readme = "```bash\nnpm install foo\npip install bar\n```";
    const cmds = extractInstallCommands(readme);
    expect(cmds).toContain("npm install foo");
    expect(cmds).toContain("pip install bar");
  });

  it("returns empty for readme without code blocks", () => {
    expect(extractInstallCommands("# Title\n\nJust text.")).toHaveLength(0);
  });
});

// ============================================================
// extractApiExamples
// ============================================================
describe("extractApiExamples", () => {
  it("extracts JS import example", () => {
    const readme = "```js\nimport { foo } from 'bar';\nfoo();\n```";
    const examples = extractApiExamples(readme);
    expect(examples.length).toBe(1);
    expect(examples[0]).toContain("import { foo }");
  });

  it("extracts Python import example", () => {
    const readme = "```python\nfrom mylib import helper\nhelper.run()\n```";
    expect(extractApiExamples(readme).length).toBe(1);
  });

  it("extracts require-based example", () => {
    const readme = "```js\nconst x = require('foo');\nx.doStuff();\n```";
    expect(extractApiExamples(readme).length).toBe(1);
  });

  it("skips pure shell command blocks", () => {
    const readme = "```bash\nnpm install foo\n```";
    // bash blocks are not matched by the API example regex (language filter)
    expect(extractApiExamples(readme)).toHaveLength(0);
  });

  it("extracts function call examples", () => {
    const readme = "```ts\nconst result = createApp({ port: 3000 });\nresult.listen();\n```";
    expect(extractApiExamples(readme).length).toBe(1);
  });

  it("limits to 10 examples", () => {
    let readme = "";
    for (let i = 0; i < 15; i++) {
      readme += `\`\`\`js\nimport { fn${i} } from 'lib';\nfn${i}();\n\`\`\`\n\n`;
    }
    expect(extractApiExamples(readme).length).toBe(10);
  });

  it("returns empty for non-code readme", () => {
    expect(extractApiExamples("# Title\nJust words.")).toHaveLength(0);
  });
});

// ============================================================
// extractBadges
// ============================================================
describe("extractBadges", () => {
  it("extracts npm badge", () => {
    const readme = "[![npm version](https://img.shields.io/npm/v/foo.svg)](https://npmjs.com/package/foo)";
    const badges = extractBadges(readme);
    expect(badges.length).toBe(1);
    expect(badges[0].type).toBe("npm");
  });

  it("extracts CI badge", () => {
    const readme = "[![Build Status](https://img.shields.io/github/actions/workflow/status/foo/bar/ci.yml)](https://github.com/foo/bar/actions)";
    const badges = extractBadges(readme);
    expect(badges.length).toBe(1);
    expect(badges[0].type).toBe("ci");
  });

  it("extracts coverage badge", () => {
    const readme = "[![Coverage](https://codecov.io/gh/foo/bar/badge.svg)](https://codecov.io/gh/foo/bar)";
    const badges = extractBadges(readme);
    expect(badges.length).toBe(1);
    expect(badges[0].type).toBe("coverage");
  });

  it("extracts license badge", () => {
    const readme = "[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)";
    const badges = extractBadges(readme);
    expect(badges.length).toBe(1);
    expect(badges[0].type).toBe("license");
    expect(badges[0].label).toContain("MIT");
  });

  it("extracts downloads badge", () => {
    const readme = "[![Downloads](https://img.shields.io/downloads/total/foo.svg)](https://example.com/foo)";
    const badges = extractBadges(readme);
    expect(badges[0].type).toBe("downloads");
  });

  it("handles multiple badges", () => {
    const readme = "[![npm](https://img.shields.io/npm/v/foo)](https://npm) [![CI](https://img.shields.io/github/actions/workflow/status/x/y/ci.yml)](https://gh)";
    expect(extractBadges(readme).length).toBe(2);
  });

  it("ignores non-badge images", () => {
    const readme = "![screenshot](https://example.com/screenshot.png)";
    expect(extractBadges(readme)).toHaveLength(0);
  });

  it("returns empty for badgeless readme", () => {
    expect(extractBadges("# Title\n\nNo badges here.")).toHaveLength(0);
  });
});

// ============================================================
// extractTOC
// ============================================================
describe("extractTOC", () => {
  it("extracts heading structure", () => {
    const readme = "# Title\n\n## Install\n\n## Usage\n\n### Advanced\n\n## API\n";
    const toc = extractTOC(readme);
    expect(toc).toHaveLength(5);
    expect(toc[0]).toEqual({ level: 1, title: "Title" });
    expect(toc[1]).toEqual({ level: 2, title: "Install" });
    expect(toc[3]).toEqual({ level: 3, title: "Advanced" });
  });

  it("skips headings inside code blocks", () => {
    const readme = "# Title\n\n```\n# Not a heading\n## Also not\n```\n\n## Real\n";
    const toc = extractTOC(readme);
    expect(toc).toHaveLength(2);
    expect(toc[1].title).toBe("Real");
  });

  it("handles empty readme", () => {
    expect(extractTOC("")).toHaveLength(0);
  });

  it("handles readme with no headings", () => {
    expect(extractTOC("Just plain text.\nMore text.")).toHaveLength(0);
  });

  it("strips special chars from titles", () => {
    const readme = "## 🚀 Getting Started!\n";
    const toc = extractTOC(readme);
    expect(toc[0].title).toBe("Getting Started");
  });

  it("handles deeply nested headings", () => {
    const readme = "###### Level 6\n";
    const toc = extractTOC(readme);
    expect(toc[0].level).toBe(6);
  });
});
