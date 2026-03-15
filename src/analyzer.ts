import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";

export interface CLICommand {
  name: string;
  description?: string;
}

export interface RepoAnalysis {
  name: string;
  description: string;
  richDescription: string;
  whenToUse: string[];
  whenNotToUse: string[];
  triggerPhrases: string[];
  language: string;
  languages: string[];
  cliCommands: CLICommand[];
  installInstructions: string;
  usageSection: string;
  usageExamples: string[];
  apiSection: string;
  examplesSection: string;
  readmeRaw: string;
  readmeFirstParagraph: string;
  dependencies: string[];
  entryPoints: string[];
  hasTests: boolean;
  license: string;
  sections: Record<string, string>;
  fileTree: string;
}

export async function analyzeRepo(repoDir: string, repoName: string): Promise<RepoAnalysis> {
  const analysis: RepoAnalysis = {
    name: repoName,
    description: "",
    richDescription: "",
    whenToUse: [],
    whenNotToUse: [],
    triggerPhrases: [],
    language: "unknown",
    languages: [],
    cliCommands: [],
    installInstructions: "",
    usageSection: "",
    usageExamples: [],
    apiSection: "",
    examplesSection: "",
    readmeRaw: "",
    readmeFirstParagraph: "",
    dependencies: [],
    entryPoints: [],
    hasTests: false,
    license: "",
    sections: {},
    fileTree: "",
  };

  // File tree (top 2 levels)
  analysis.fileTree = buildFileTree(repoDir, 2);

  // Detect languages
  const allFiles = await glob("**/*", { cwd: repoDir, nodir: true, ignore: ["node_modules/**", ".git/**", "vendor/**", "__pycache__/**"] });
  analysis.languages = detectLanguages(allFiles);
  analysis.language = analysis.languages[0] || "unknown";
  analysis.hasTests = allFiles.some(f => /test|spec|__tests__/i.test(f));

  // README
  const readmePath = findFile(repoDir, ["README.md", "readme.md", "Readme.md"]);
  if (readmePath) {
    analysis.readmeRaw = fs.readFileSync(readmePath, "utf-8");
    analysis.readmeFirstParagraph = extractFirstParagraph(analysis.readmeRaw);
    analysis.sections = extractSections(analysis.readmeRaw);
    analysis.usageSection = analysis.sections["usage"] || analysis.sections["getting started"] || "";
    analysis.apiSection = analysis.sections["api"] || analysis.sections["api reference"] || "";
    analysis.examplesSection = analysis.sections["examples"] || analysis.sections["example"] || "";
    analysis.installInstructions = analysis.sections["install"] || analysis.sections["installation"] || analysis.sections["setup"] || analysis.sections["getting started"] || "";

    // Extract all code examples from usage/examples/API sections
    analysis.usageExamples = [
      ...extractCodeBlocks(analysis.usageSection),
      ...extractCodeBlocks(analysis.examplesSection),
      ...extractCodeBlocks(analysis.apiSection),
    ];

    // Rich description: prefer first meaningful README paragraph over package.json one-liner
    analysis.richDescription = extractRichDescription(analysis.readmeRaw);
  }

  // package.json (Node.js)
  const pkgPath = path.join(repoDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    analysis.description = analysis.description || pkg.description || "";
    if (pkg.bin) {
      const bins = typeof pkg.bin === "string" ? { [pkg.name || repoName]: pkg.bin } : pkg.bin;
      for (const [name] of Object.entries(bins)) {
        analysis.cliCommands.push({ name });
      }
    }
    if (pkg.dependencies) analysis.dependencies = Object.keys(pkg.dependencies);
    if (pkg.main) analysis.entryPoints.push(pkg.main);
    analysis.license = pkg.license || "";
  }

  // pyproject.toml (Python)
  const pyprojectPath = path.join(repoDir, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, "utf-8");
    const toml = require("toml");
    try {
      const parsed = toml.parse(content);
      const proj = parsed.project || parsed.tool?.poetry || {};
      analysis.description = analysis.description || proj.description || "";
      const scripts = proj.scripts || parsed.tool?.poetry?.scripts || {};
      for (const [name] of Object.entries(scripts)) {
        analysis.cliCommands.push({ name });
      }
      analysis.license = typeof proj.license === "string" ? proj.license : proj.license?.text || "";
    } catch {}
  }

  // setup.py (Python fallback)
  const setupPyPath = path.join(repoDir, "setup.py");
  if (fs.existsSync(setupPyPath) && !analysis.description) {
    const content = fs.readFileSync(setupPyPath, "utf-8");
    const descMatch = content.match(/description\s*=\s*["']([^"']+)["']/);
    if (descMatch) analysis.description = descMatch[1];
  }

  // Cargo.toml (Rust)
  const cargoPath = path.join(repoDir, "Cargo.toml");
  if (fs.existsSync(cargoPath)) {
    const content = fs.readFileSync(cargoPath, "utf-8");
    const toml = require("toml");
    try {
      const parsed = toml.parse(content);
      const pkg = parsed.package || {};
      analysis.description = analysis.description || pkg.description || "";
      analysis.license = pkg.license || "";
      if (parsed.bin || fs.existsSync(path.join(repoDir, "src", "main.rs"))) {
        analysis.cliCommands.push({ name: pkg.name || repoName });
      }
    } catch {}
  }

  // go.mod (Go)
  const goModPath = path.join(repoDir, "go.mod");
  if (fs.existsSync(goModPath)) {
    const content = fs.readFileSync(goModPath, "utf-8");
    const moduleMatch = content.match(/^module\s+(.+)$/m);
    if (moduleMatch) {
      const moduleName = moduleMatch[1].trim();
      if (!analysis.entryPoints.includes(moduleName)) {
        analysis.entryPoints.push(moduleName);
      }
    }
    // Extract dependencies
    const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireBlock) {
      const deps = requireBlock[1].match(/^\s*(\S+)\s+/gm);
      if (deps) {
        analysis.dependencies.push(...deps.map(d => d.trim().split(/\s+/)[0]));
      }
    }
    // Check for main.go -> CLI tool
    if (fs.existsSync(path.join(repoDir, "main.go")) || fs.existsSync(path.join(repoDir, "cmd"))) {
      const name = moduleMatch ? moduleMatch[1].trim().split("/").pop()! : repoName;
      if (!analysis.cliCommands.some(c => c.name === name)) {
        analysis.cliCommands.push({ name });
      }
    }
    if (!analysis.languages.includes("Go")) analysis.languages.unshift("Go");
    if (analysis.language === "unknown") analysis.language = "Go";
  }

  // Fallback description from README
  if (!analysis.description) {
    analysis.description = analysis.readmeFirstParagraph;
  }

  // Use rich description if available, otherwise fall back to description
  if (!analysis.richDescription) {
    analysis.richDescription = analysis.description;
  }

  // Generate "when to use" / "when not to use" / trigger phrases
  analysis.whenToUse = generateWhenToUse(analysis);
  analysis.whenNotToUse = generateWhenNotToUse(analysis);
  analysis.triggerPhrases = generateTriggerPhrases(analysis);

  return analysis;
}

function findFile(dir: string, names: string[]): string | null {
  for (const name of names) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")   // Remove HTML tags
    .replace(/&[a-z]+;/gi, "") // Remove HTML entities
    .replace(/\s+/g, " ")      // Collapse whitespace
    .trim();
}

export function extractFirstParagraph(readme: string): string {
  const lines = readme.split("\n");
  let started = false;
  let inHtmlBlock = false;
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Track multi-line HTML blocks
    if (!inHtmlBlock && /^<[a-zA-Z]/.test(trimmed)) {
      inHtmlBlock = true;
    }
    if (inHtmlBlock) {
      if (/<\/[a-zA-Z]+>/.test(trimmed) || /\/>/.test(trimmed)) {
        inHtmlBlock = false;
      }
      continue;
    }
    if (!started) {
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[") || trimmed.startsWith("!") || trimmed.startsWith("<") || trimmed.startsWith("---")) continue;
      started = true;
    }
    if (started) {
      if (!trimmed && result.length > 0) break;
      result.push(trimmed);
    }
  }
  return stripHtmlTags(result.join(" ")).slice(0, 300);
}

/**
 * Extract a rich description: first 1-3 meaningful paragraphs from README,
 * skipping badges, headings, HTML blocks, and images.
 */
function extractRichDescription(readme: string): string {
  const lines = readme.split("\n");
  const paragraphs: string[] = [];
  let current: string[] = [];
  let inCodeBlock = false;
  let inHtmlBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;

    // Track multi-line HTML blocks (div, img, a, picture, table, etc.)
    if (!inHtmlBlock && /^<[a-zA-Z]/.test(trimmed)) {
      inHtmlBlock = true;
    }
    if (inHtmlBlock) {
      // Check if the HTML block closes on this line
      if (/<\/[a-zA-Z]+>/.test(trimmed) || /\/>/.test(trimmed)) {
        inHtmlBlock = false;
      }
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }

    // Skip headings, badges, images, HTML
    if (trimmed.startsWith("#") || trimmed.startsWith("[!") || trimmed.startsWith("![") || trimmed.startsWith("---")) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }

    // Skip badge-only lines
    if (/^\[!\[.*\]\(.*\)\]\(.*\)$/.test(trimmed) || /^!\[.*\]\(.*\)$/.test(trimmed)) continue;

    if (!trimmed) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }

    current.push(trimmed);
  }
  if (current.length > 0) paragraphs.push(current.join(" "));

  // Take first 2 meaningful paragraphs (min 20 chars each), strip HTML
  const meaningful = paragraphs.map(p => stripHtmlTags(p)).filter(p => p.length >= 20);
  return meaningful.slice(0, 2).join("\n\n").slice(0, 600);
}

function extractSections(readme: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = readme.split("\n");
  let currentSection = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) {
      if (currentSection) {
        sections[currentSection.toLowerCase()] = currentContent.join("\n").trim();
      }
      currentSection = match[1].replace(/[^\w\s]/g, "").trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentSection) {
    sections[currentSection.toLowerCase()] = currentContent.join("\n").trim();
  }
  return sections;
}

function extractCodeBlocks(text: string): string[] {
  if (!text) return [];
  const blocks: string[] = [];
  const regex = /```[\s\S]*?```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function detectLanguages(files: string[]): string[] {
  const counts: Record<string, number> = {};
  const extMap: Record<string, string> = {
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
    ".py": "Python",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++", ".cc": "C++", ".cxx": "C++",
    ".c": "C",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".lua": "Lua",
    ".zig": "Zig",
    ".dart": "Dart",
    ".ex": "Elixir", ".exs": "Elixir",
    ".hs": "Haskell",
    ".scala": "Scala",
    ".r": "R", ".R": "R",
  };
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const lang = extMap[ext];
    if (lang) counts[lang] = (counts[lang] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

export function categorizeProject(analysis: RepoAnalysis): string {
  const desc = (analysis.richDescription + " " + analysis.description + " " + analysis.readmeFirstParagraph).toLowerCase();
  if (desc.includes("server") || desc.includes("web framework") || desc.includes("web server") || desc.includes("http server") || desc.includes("api framework")) return "server-framework";
  if (/\bcli\b/.test(desc) || desc.includes("command-line") || desc.includes("command line")) return "cli-tool";
  if (desc.includes("client") || desc.includes("http client") || desc.includes("fetch") || desc.includes("request library")) return "http-client";
  if (desc.includes("framework")) return "framework";
  if (desc.includes("library") || desc.includes("utility") || desc.includes("utilities")) return "library";
  if (desc.includes("tool") || desc.includes("toolkit")) return "tool";
  if (analysis.cliCommands.length > 0) return "cli-tool";
  return "library";
}

function generateWhenToUse(analysis: RepoAnalysis): string[] {
  const items: string[] = [];
  const isCLI = analysis.cliCommands.length > 0;
  const category = categorizeProject(analysis);
  const desc = (analysis.richDescription + " " + analysis.description).toLowerCase();

  if (isCLI) {
    for (const cmd of analysis.cliCommands) {
      items.push(`Run \`${cmd.name}\` commands`);
    }
  }

  // Category-aware suggestions
  switch (category) {
    case "server-framework":
      items.push(`Build web servers or APIs with ${analysis.name}`);
      if (desc.includes("rest")) items.push("Create RESTful API endpoints");
      if (desc.includes("plugin") || desc.includes("extensib")) items.push("Build extensible server applications");
      break;
    case "http-client":
      items.push("Make HTTP requests");
      if (desc.includes("api")) items.push("Interact with REST APIs");
      break;
    case "cli-tool":
      if (desc.includes("build") || desc.includes("bundl")) items.push("Build or bundle projects");
      break;
    case "framework":
      items.push(`Build ${analysis.language} applications with ${analysis.name}`);
      break;
  }

  // General keyword-based, but filtered by category to avoid mismatches
  if (category !== "server-framework") {
    if (desc.includes("http") || desc.includes("request")) items.push("Make HTTP requests");
  }
  if (desc.includes("test")) items.push("Run or write tests");
  if (desc.includes("lint") || desc.includes("format")) items.push("Lint or format code");
  if (desc.includes("parse") || desc.includes("pars")) items.push("Parse data or files");
  if (desc.includes("search") || desc.includes("find") || desc.includes("grep")) items.push("Search through files or text");
  if (desc.includes("color") || desc.includes("terminal") || desc.includes("ansi")) items.push("Style terminal output");
  if (category !== "cli-tool" && (desc.includes("cli") || desc.includes("command"))) items.push("Build command-line interfaces");

  if (items.length === 0) {
    items.push(`Work with the ${analysis.name} ${analysis.language} project`);
  }

  return [...new Set(items)].slice(0, 6);
}

function generateWhenNotToUse(analysis: RepoAnalysis): string[] {
  const items: string[] = [];
  const isCLI = analysis.cliCommands.length > 0;

  if (isCLI) items.push("GUI or web-based workflows where CLI is not available");
  if (analysis.language !== "unknown") {
    const others = ["Python", "JavaScript", "TypeScript", "Rust", "Go", "Java"]
      .filter(l => !analysis.languages.includes(l))
      .slice(0, 2);
    if (others.length > 0) items.push(`Projects using ${others.join(" or ")} (different ecosystem)`);
  }

  return items.slice(0, 3);
}

function generateTriggerPhrases(analysis: RepoAnalysis): string[] {
  const phrases: string[] = [];
  const name = analysis.name.toLowerCase();

  phrases.push(`use ${name}`);
  phrases.push(`install ${name}`);
  phrases.push(`how to use ${name}`);

  for (const cmd of analysis.cliCommands) {
    phrases.push(`run ${cmd.name}`);
    phrases.push(`${cmd.name} command`);
  }

  const desc = (analysis.richDescription + " " + analysis.description).toLowerCase();
  if (desc.includes("http") || desc.includes("request")) phrases.push("make http request", "fetch url");
  if (desc.includes("search") || desc.includes("grep")) phrases.push("search files", "find in code");
  if (desc.includes("lint") || desc.includes("format")) phrases.push("lint code", "format code");
  if (desc.includes("json")) phrases.push("parse json", "process json");

  return [...new Set(phrases)].slice(0, 8);
}

function buildFileTree(dir: string, maxDepth: number, prefix = "", depth = 0): string {
  if (depth >= maxDepth) return "";
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "__pycache__" && e.name !== "vendor")
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  const lines: string[] = [];
  for (let i = 0; i < entries.length && i < 30; i++) {
    const e = entries[i];
    const isLast = i === entries.length - 1 || i === 29;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    lines.push(`${prefix}${connector}${e.name}${e.isDirectory() ? "/" : ""}`);
    if (e.isDirectory()) {
      const sub = buildFileTree(path.join(dir, e.name), maxDepth, prefix + childPrefix, depth + 1);
      if (sub) lines.push(sub);
    }
  }
  if (entries.length > 30) lines.push(`${prefix}... (${entries.length - 30} more)`);
  return lines.join("\n");
}
