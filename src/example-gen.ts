/**
 * Example Generator — auto-generate usage examples from various sources.
 */

import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";
import { ApiEntry } from "./api-extractor";

export interface GeneratedExample {
  source: "readme" | "test" | "example-dir" | "api-signature";
  label: string;
  code: string;
  language?: string;
}

/**
 * Generate usage examples from multiple sources in a repo.
 */
export async function generateExamples(repoDir: string, apiEntries?: ApiEntry[]): Promise<GeneratedExample[]> {
  const examples: GeneratedExample[] = [];

  // 1. README code blocks
  const readmePath = findReadme(repoDir);
  if (readmePath) {
    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    examples.push(...extractReadmeExamples(readmeContent));
  }

  // 2. Test files
  examples.push(...await extractTestExamples(repoDir));

  // 3. Example directories
  examples.push(...await extractExampleDirExamples(repoDir));

  // 4. API signature-based examples
  if (apiEntries && apiEntries.length > 0) {
    examples.push(...generateApiExamples(apiEntries));
  }

  return examples;
}

function findReadme(dir: string): string | null {
  for (const name of ["README.md", "readme.md", "Readme.md"]) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Extract code blocks from README that look like usage examples.
 */
export function extractReadmeExamples(readme: string): GeneratedExample[] {
  const examples: GeneratedExample[] = [];
  const codeBlockRegex = /```(\w*)\s*\n([\s\S]*?)```/g;
  let match;
  let idx = 0;

  while ((match = codeBlockRegex.exec(readme)) !== null) {
    const lang = match[1] || "";
    const code = match[2].trim();

    // Skip pure shell install commands
    if (/^(?:npm|pip|cargo|go|gem|composer|brew|apt)\s+(?:install|add|i)\s+/m.test(code) && code.split("\n").length <= 2) {
      continue;
    }

    // Must have meaningful code (imports, function calls, variable assignments)
    if (code.length >= 20 && (
      /(?:import|require|from|use|include|using)\s/.test(code) ||
      /\w+\s*\(/.test(code) ||
      /(?:const|let|var|val|def|fn)\s/.test(code)
    )) {
      idx++;
      examples.push({
        source: "readme",
        label: `README example ${idx}`,
        code: `\`\`\`${lang}\n${code}\n\`\`\``,
        language: lang || undefined,
      });
    }

    if (examples.length >= 5) break;
  }

  return examples;
}

/**
 * Extract patterns from test files.
 */
export async function extractTestExamples(repoDir: string): Promise<GeneratedExample[]> {
  const examples: GeneratedExample[] = [];

  const testFiles = await glob("**/*.{test,spec}.{ts,tsx,js,jsx}", {
    cwd: repoDir,
    nodir: true,
    ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
  });

  // Also look in __tests__ directories
  const testDirFiles = await glob("**/__tests__/*.{ts,tsx,js,jsx}", {
    cwd: repoDir,
    nodir: true,
    ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
  });

  const allTestFiles = [...new Set([...testFiles, ...testDirFiles])].slice(0, 5);

  for (const testFile of allTestFiles) {
    try {
      const content = fs.readFileSync(path.join(repoDir, testFile), "utf-8");
      const extracted = extractTestPatterns(content, testFile);
      examples.push(...extracted);
    } catch {}
  }

  // Also try pytest files
  const pyTestFiles = await glob("**/test_*.py", {
    cwd: repoDir,
    nodir: true,
    ignore: ["node_modules/**", ".git/**", "dist/**", "build/**", "venv/**"],
  });

  for (const testFile of pyTestFiles.slice(0, 3)) {
    try {
      const content = fs.readFileSync(path.join(repoDir, testFile), "utf-8");
      const extracted = extractPythonTestPatterns(content, testFile);
      examples.push(...extracted);
    } catch {}
  }

  return examples.slice(0, 5);
}

function extractTestPatterns(content: string, file: string): GeneratedExample[] {
  const examples: GeneratedExample[] = [];

  // Extract it/test blocks with meaningful body
  const testRegex = /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\)/g;
  let match;

  while ((match = testRegex.exec(content)) !== null) {
    const testName = match[1];
    const body = match[2].trim();

    // Only include if body has meaningful assertions / usage patterns
    if (body.length >= 30 && body.length <= 500 && /\w+\s*\(/.test(body)) {
      // Strip expect/assert lines to extract the setup/usage part
      const usageLines = body.split("\n")
        .filter(l => !l.trim().startsWith("expect(") && !l.trim().startsWith("assert"))
        .join("\n")
        .trim();

      if (usageLines.length >= 20) {
        const ext = path.extname(file);
        const lang = ext === ".ts" || ext === ".tsx" ? "typescript" : "javascript";
        examples.push({
          source: "test",
          label: `From test: "${testName}"`,
          code: `\`\`\`${lang}\n// ${testName}\n${usageLines}\n\`\`\``,
          language: lang,
        });
      }
    }

    if (examples.length >= 3) break;
  }

  return examples;
}

function extractPythonTestPatterns(content: string, file: string): GeneratedExample[] {
  const examples: GeneratedExample[] = [];

  // Extract def test_ functions
  const testRegex = /^def\s+(test_\w+)\s*\([^)]*\):\s*\n((?:[ \t]+.+\n)*)/gm;
  let match;

  while ((match = testRegex.exec(content)) !== null) {
    const testName = match[1];
    const body = match[2];

    // Strip assert lines
    const usageLines = body.split("\n")
      .filter(l => !l.trim().startsWith("assert ") && l.trim().length > 0)
      .map(l => l.replace(/^    /, ""))
      .join("\n")
      .trim();

    if (usageLines.length >= 20 && usageLines.length <= 400) {
      examples.push({
        source: "test",
        label: `From test: ${testName}`,
        code: `\`\`\`python\n# ${testName}\n${usageLines}\n\`\`\``,
        language: "python",
      });
    }

    if (examples.length >= 3) break;
  }

  return examples;
}

/**
 * Extract examples from example/examples directories.
 */
export async function extractExampleDirExamples(repoDir: string): Promise<GeneratedExample[]> {
  const examples: GeneratedExample[] = [];

  const exampleDirs = ["examples", "example", "demo", "demos"];
  for (const dir of exampleDirs) {
    const dirPath = path.join(repoDir, dir);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) continue;

    const files = await glob("**/*.{ts,js,py,go,rs,rb}", {
      cwd: dirPath,
      nodir: true,
      ignore: ["node_modules/**"],
    });

    for (const file of files.slice(0, 3)) {
      try {
        const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
        if (content.length >= 30 && content.length <= 2000) {
          const ext = path.extname(file);
          const langMap: Record<string, string> = {
            ".ts": "typescript", ".js": "javascript", ".py": "python",
            ".go": "go", ".rs": "rust", ".rb": "ruby",
          };
          const lang = langMap[ext] || "";
          examples.push({
            source: "example-dir",
            label: `${dir}/${file}`,
            code: `\`\`\`${lang}\n${content.slice(0, 1000)}\n\`\`\``,
            language: lang || undefined,
          });
        }
      } catch {}
    }
  }

  return examples.slice(0, 5);
}

/**
 * Generate minimal examples from API signatures.
 */
export function generateApiExamples(entries: ApiEntry[]): GeneratedExample[] {
  const examples: GeneratedExample[] = [];

  const fns = entries.filter(e => e.kind === "function" && e.exported && e.signature);
  for (const fn of fns.slice(0, 3)) {
    examples.push({
      source: "api-signature",
      label: `API: ${fn.name}`,
      code: `\`\`\`\n// ${fn.description || fn.name}\n${fn.signature}\n\`\`\``,
    });
  }

  return examples;
}
