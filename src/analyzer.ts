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
  language: string;
  languages: string[];
  cliCommands: CLICommand[];
  installInstructions: string;
  usageSection: string;
  apiSection: string;
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
    language: "unknown",
    languages: [],
    cliCommands: [],
    installInstructions: "",
    usageSection: "",
    apiSection: "",
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
    analysis.installInstructions = analysis.sections["install"] || analysis.sections["installation"] || analysis.sections["getting started"] || "";
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
      // If it has [[bin]] or src/main.rs, it's a CLI
      if (parsed.bin || fs.existsSync(path.join(repoDir, "src", "main.rs"))) {
        analysis.cliCommands.push({ name: pkg.name || repoName });
      }
    } catch {}
  }

  // Fallback description from README
  if (!analysis.description) {
    analysis.description = analysis.readmeFirstParagraph;
  }

  return analysis;
}

function findFile(dir: string, names: string[]): string | null {
  for (const name of names) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function extractFirstParagraph(readme: string): string {
  const lines = readme.split("\n");
  let started = false;
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      // Skip headings, badges, blank lines
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[") || trimmed.startsWith("!") || trimmed.startsWith("<")) continue;
      started = true;
    }
    if (started) {
      if (!trimmed && result.length > 0) break;
      result.push(trimmed);
    }
  }
  return result.join(" ").slice(0, 300);
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
