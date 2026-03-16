import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractApi, generateApiReferenceSection, ApiEntry } from "../api-extractor";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDir = path.join(os.tmpdir(), `repo2skill-api-test-${Date.now()}`);

describe("extractApi", () => {
  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("extracts TypeScript exported functions", async () => {
    fs.writeFileSync(path.join(tmpDir, "index.ts"), `
/** Add two numbers together. */
export function add(a: number, b: number): number {
  return a + b;
}

export async function fetchData(url: string) {
  return fetch(url);
}

function privateHelper() {}
`);
    const entries = await extractApi(tmpDir);
    expect(entries.length).toBe(2);
    expect(entries[0].name).toBe("add");
    expect(entries[0].kind).toBe("function");
    expect(entries[0].description).toContain("Add two numbers");
    expect(entries[1].name).toBe("fetchData");
  });

  it("extracts TypeScript classes and interfaces", async () => {
    fs.writeFileSync(path.join(tmpDir, "models.ts"), `
/** A user in the system. */
export class User {
  name: string;
}

export interface Config {
  host: string;
  port: number;
}

export type ID = string | number;
`);
    const entries = await extractApi(tmpDir);
    const names = entries.map(e => e.name);
    expect(names).toContain("User");
    expect(names).toContain("Config");
    expect(names).toContain("ID");
    expect(entries.find(e => e.name === "User")?.kind).toBe("class");
    expect(entries.find(e => e.name === "Config")?.kind).toBe("interface");
    expect(entries.find(e => e.name === "ID")?.kind).toBe("type");
  });

  it("extracts Python functions and classes", async () => {
    fs.writeFileSync(path.join(tmpDir, "main.py"), `
def greet(name: str) -> str:
    """Say hello to someone."""
    return f"Hello, {name}!"

class Calculator:
    """A simple calculator."""
    def add(self, a, b):
        return a + b

def _private():
    pass
`);
    const entries = await extractApi(tmpDir);
    expect(entries.length).toBe(2);
    expect(entries[0].name).toBe("greet");
    expect(entries[0].description).toContain("Say hello");
    expect(entries[1].name).toBe("Calculator");
  });

  it("extracts Go exported functions", async () => {
    fs.writeFileSync(path.join(tmpDir, "main.go"), `package main

// NewServer creates a new HTTP server.
func NewServer(addr string) *Server {
    return &Server{addr: addr}
}

// Server represents an HTTP server.
type Server struct {
    addr string
}

func helper() {}
`);
    const entries = await extractApi(tmpDir);
    expect(entries.length).toBe(2);
    expect(entries.find(e => e.name === "NewServer")?.description).toContain("creates a new");
    expect(entries.find(e => e.name === "Server")?.kind).toBe("class");
  });

  it("returns empty for empty directory", async () => {
    const entries = await extractApi(tmpDir);
    expect(entries).toHaveLength(0);
  });
});

describe("generateApiReferenceSection", () => {
  it("generates grouped markdown", () => {
    const entries: ApiEntry[] = [
      { name: "User", kind: "class", description: "A user", file: "a.ts", exported: true },
      { name: "add", kind: "function", signature: "add(a, b)", description: "Add nums", file: "a.ts", exported: true },
      { name: "Config", kind: "interface", file: "a.ts", exported: true },
    ];
    const section = generateApiReferenceSection(entries);
    expect(section).toContain("### Classes");
    expect(section).toContain("### Functions");
    expect(section).toContain("### Interfaces");
    expect(section).toContain("`User`");
    expect(section).toContain("`add(a, b)`");
  });

  it("returns empty for no entries", () => {
    expect(generateApiReferenceSection([])).toBe("");
  });
});
