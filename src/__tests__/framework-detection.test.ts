import { describe, it, expect } from "vitest";
import { detectFrameworkType, RepoAnalysis, FrameworkType } from "../analyzer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function makeTmpRepo(files: Record<string, string>): string {
  const dir = path.join(os.tmpdir(), `fw-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const fullPath = path.join(dir, name);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return dir;
}

function makeAnalysis(overrides: Partial<RepoAnalysis> = {}): RepoAnalysis {
  return {
    name: "test",
    description: "",
    richDescription: "",
    whenToUse: [],
    whenNotToUse: [],
    triggerPhrases: [],
    language: "TypeScript",
    languages: ["TypeScript"],
    cliCommands: [],
    installInstructions: "",
    usageSection: "",
    usageExamples: [],
    configSection: "",
    features: [],
    apiSection: "",
    examplesSection: "",
    readmeRaw: "",
    readmeFirstParagraph: "",
    dependencies: [],
    entryPoints: [],
    hasTests: false,
    license: "MIT",
    sections: {},
    fileTree: "",
    isMonorepo: false,
    monorepoPackages: [],
    keyApi: [],
    packageName: "",
    readmeInstallCommands: [],
    readmeApiExamples: [],
    badges: [],
    toc: [],
    frameworkType: "unknown",
    ...overrides,
  };
}

describe("detectFrameworkType", () => {
  it("detects MCP server from dependencies", () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      const analysis = makeAnalysis({ dependencies: ["@modelcontextprotocol/sdk", "express"] });
      expect(detectFrameworkType(dir, analysis, ["package.json"])).toBe("mcp-server");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects MCP server from source patterns", () => {
    const dir = makeTmpRepo({
      "src/index.ts": `import { McpServer } from "@modelcontextprotocol/sdk";\nconst server = new McpServer();\nserver.tool("test", async () => {});`,
    });
    try {
      const analysis = makeAnalysis({ dependencies: [] });
      expect(detectFrameworkType(dir, analysis, ["src/index.ts"])).toBe("mcp-server");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects MCP server from description", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({ description: "An MCP server for file operations" });
      expect(detectFrameworkType(dir, analysis, [])).toBe("mcp-server");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects AI agent framework", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({
        dependencies: ["langchain", "langgraph"],
        description: "Multi-agent orchestration system",
      });
      expect(detectFrameworkType(dir, analysis, [])).toBe("ai-agent");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects web framework (Next.js)", () => {
    const dir = makeTmpRepo({ "next.config.js": "module.exports = {}" });
    try {
      const analysis = makeAnalysis({ dependencies: ["next", "react"] });
      expect(detectFrameworkType(dir, analysis, ["next.config.js", "package.json"])).toBe("web-framework");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects web framework (FastAPI)", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({ dependencies: ["fastapi", "uvicorn"] });
      expect(detectFrameworkType(dir, analysis, [])).toBe("web-framework");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects serverless from config files", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({ dependencies: [] });
      expect(detectFrameworkType(dir, analysis, ["serverless.yml", "handler.ts"])).toBe("serverless");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects serverless from AWS Lambda deps", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({ dependencies: ["@aws-cdk/core", "aws-lambda"] });
      expect(detectFrameworkType(dir, analysis, [])).toBe("serverless");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects CLI tool", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({ cliCommands: [{ name: "mycli" }] });
      expect(detectFrameworkType(dir, analysis, [])).toBe("cli-tool");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects service from Docker", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({
        dockerInfo: { baseImage: "node:18", exposedPorts: ["3000"], entrypoint: "node server.js" },
      });
      expect(detectFrameworkType(dir, analysis, [])).toBe("service");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("defaults to library for packages with deps", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({ dependencies: ["lodash"], packageName: "my-lib" });
      expect(detectFrameworkType(dir, analysis, [])).toBe("library");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns unknown for empty repo", () => {
    const dir = makeTmpRepo({});
    try {
      const analysis = makeAnalysis({});
      expect(detectFrameworkType(dir, analysis, [])).toBe("unknown");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
