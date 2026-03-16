/**
 * API Documentation Extractor — parse source code for API surface.
 */

import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";

export interface ApiEntry {
  name: string;
  kind: "function" | "class" | "method" | "interface" | "type" | "constant";
  signature?: string;
  description?: string;
  file: string;
  exported: boolean;
}

/**
 * Extract API surface from a repository.
 */
export async function extractApi(repoDir: string): Promise<ApiEntry[]> {
  const entries: ApiEntry[] = [];

  const allFiles = await glob("**/*.{ts,tsx,js,jsx,py,go}", {
    cwd: repoDir,
    nodir: true,
    ignore: ["node_modules/**", ".git/**", "vendor/**", "__pycache__/**", "dist/**", "build/**", "**/*.test.*", "**/*.spec.*", "**/__tests__/**"],
  });

  for (const file of allFiles.slice(0, 50)) {
    const ext = path.extname(file);
    const fullPath = path.join(repoDir, file);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") {
        entries.push(...extractTypeScriptApi(content, file));
      } else if (ext === ".py") {
        entries.push(...extractPythonApi(content, file));
      } else if (ext === ".go") {
        entries.push(...extractGoApi(content, file));
      }
    } catch {}
  }

  return entries;
}

function extractTypeScriptApi(content: string, file: string): ApiEntry[] {
  const entries: ApiEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // export function
    const fnMatch = line.match(/^export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*(\([^)]*\))/);
    if (fnMatch) {
      const jsdoc = extractJSDoc(lines, i);
      entries.push({
        name: fnMatch[1],
        kind: "function",
        signature: `${fnMatch[1]}${fnMatch[2]}`,
        description: jsdoc,
        file,
        exported: true,
      });
      continue;
    }

    // export class
    const classMatch = line.match(/^export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (classMatch) {
      const jsdoc = extractJSDoc(lines, i);
      entries.push({
        name: classMatch[1],
        kind: "class",
        description: jsdoc,
        file,
        exported: true,
      });
      continue;
    }

    // export interface
    const ifaceMatch = line.match(/^export\s+(?:default\s+)?interface\s+(\w+)/);
    if (ifaceMatch) {
      const jsdoc = extractJSDoc(lines, i);
      entries.push({
        name: ifaceMatch[1],
        kind: "interface",
        description: jsdoc,
        file,
        exported: true,
      });
      continue;
    }

    // export type
    const typeMatch = line.match(/^export\s+type\s+(\w+)/);
    if (typeMatch) {
      entries.push({
        name: typeMatch[1],
        kind: "type",
        file,
        exported: true,
      });
      continue;
    }

    // export const
    const constMatch = line.match(/^export\s+const\s+(\w+)/);
    if (constMatch) {
      entries.push({
        name: constMatch[1],
        kind: "constant",
        file,
        exported: true,
      });
    }
  }

  return entries;
}

function extractJSDoc(lines: string[], targetLine: number): string | undefined {
  // Look backwards for JSDoc comment ending with */
  let i = targetLine - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i < 0 || !lines[i].trim().endsWith("*/")) return undefined;

  const endLine = i;
  while (i >= 0 && !lines[i].trim().startsWith("/**")) i--;
  if (i < 0) return undefined;

  const block = lines.slice(i, endLine + 1)
    .map(l => l.trim().replace(/^\/\*\*\s?/, "").replace(/^\*\/\s?$/, "").replace(/^\*\s?/, ""))
    .filter(l => !l.startsWith("@"))
    .join(" ")
    .trim();

  return block || undefined;
}

function extractPythonApi(content: string, file: string): ApiEntry[] {
  const entries: ApiEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Top-level def (no indentation)
    const fnMatch = line.match(/^def\s+(\w+)\s*(\([^)]*\))/);
    if (fnMatch && !fnMatch[1].startsWith("_")) {
      const docstring = extractPythonDocstring(lines, i);
      entries.push({
        name: fnMatch[1],
        kind: "function",
        signature: `${fnMatch[1]}${fnMatch[2]}`,
        description: docstring,
        file,
        exported: true,
      });
      continue;
    }

    // Top-level class
    const classMatch = line.match(/^class\s+(\w+)/);
    if (classMatch && !classMatch[1].startsWith("_")) {
      const docstring = extractPythonDocstring(lines, i);
      entries.push({
        name: classMatch[1],
        kind: "class",
        description: docstring,
        file,
        exported: true,
      });
    }
  }

  return entries;
}

function extractPythonDocstring(lines: string[], defLine: number): string | undefined {
  // Look for triple-quoted docstring in the line(s) after the def/class
  let i = defLine + 1;
  // Skip continuation of signature
  while (i < lines.length && lines[defLine].trimEnd().endsWith("\\")) {
    defLine = i;
    i++;
  }
  // Handle multi-line signatures ending with ):
  while (i < lines.length && !lines[i - 1].includes(":")) i++;

  if (i >= lines.length) return undefined;
  const nextLine = lines[i].trim();
  const tripleQuote = nextLine.startsWith('"""') ? '"""' : nextLine.startsWith("'''") ? "'''" : null;
  if (!tripleQuote) return undefined;

  // Single-line docstring
  if (nextLine.endsWith(tripleQuote) && nextLine.length > 6) {
    return nextLine.slice(3, -3).trim();
  }

  // Multi-line docstring
  const docLines: string[] = [nextLine.slice(3)];
  i++;
  while (i < lines.length) {
    const l = lines[i].trim();
    if (l.includes(tripleQuote)) {
      docLines.push(l.replace(tripleQuote, ""));
      break;
    }
    docLines.push(l);
    i++;
  }

  return docLines.join(" ").trim().split("\n")[0].trim() || undefined;
}

function extractGoApi(content: string, file: string): ApiEntry[] {
  const entries: ApiEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Exported function (starts with uppercase)
    const fnMatch = line.match(/^func\s+(\([^)]+\)\s+)?([A-Z]\w*)\s*(\([^)]*\))/);
    if (fnMatch) {
      const comment = extractGoComment(lines, i);
      const isMethod = !!fnMatch[1];
      entries.push({
        name: fnMatch[2],
        kind: isMethod ? "method" : "function",
        signature: `${fnMatch[2]}${fnMatch[3]}`,
        description: comment,
        file,
        exported: true,
      });
      continue;
    }

    // Exported type
    const typeMatch = line.match(/^type\s+([A-Z]\w+)\s+(struct|interface)/);
    if (typeMatch) {
      const comment = extractGoComment(lines, i);
      entries.push({
        name: typeMatch[1],
        kind: typeMatch[2] === "interface" ? "interface" : "class",
        description: comment,
        file,
        exported: true,
      });
    }
  }

  return entries;
}

function extractGoComment(lines: string[], targetLine: number): string | undefined {
  let i = targetLine - 1;
  const commentLines: string[] = [];
  while (i >= 0 && lines[i].trim().startsWith("//")) {
    commentLines.unshift(lines[i].trim().replace(/^\/\/\s?/, ""));
    i--;
  }
  return commentLines.length > 0 ? commentLines.join(" ").trim() : undefined;
}

/**
 * Generate API Reference markdown section.
 */
export function generateApiReferenceSection(entries: ApiEntry[]): string {
  if (entries.length === 0) return "";

  const lines: string[] = [];
  const byKind: Record<string, ApiEntry[]> = {};

  for (const entry of entries) {
    const k = entry.kind;
    if (!byKind[k]) byKind[k] = [];
    byKind[k].push(entry);
  }

  const order: ApiEntry["kind"][] = ["class", "interface", "function", "method", "type", "constant"];
  for (const kind of order) {
    const items = byKind[kind];
    if (!items || items.length === 0) continue;

    const label = kind === "class" ? "Classes" : kind === "interface" ? "Interfaces" :
      kind === "function" ? "Functions" : kind === "method" ? "Methods" :
      kind === "type" ? "Types" : "Constants";

    lines.push(`### ${label}`);
    lines.push("");
    for (const item of items.slice(0, 15)) {
      const sig = item.signature ? ` — \`${item.signature}\`` : "";
      const desc = item.description ? ` — ${item.description.slice(0, 100)}` : "";
      lines.push(`- **\`${item.name}\`**${sig}${desc}`);
    }
    if (items.length > 15) lines.push(`- ... and ${items.length - 15} more`);
    lines.push("");
  }

  return lines.join("\n");
}
