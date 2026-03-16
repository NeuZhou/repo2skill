/**
 * README Parser — Extract structured information from README.md files.
 * Provides clean, typed extraction of common README sections.
 */

export interface ReadmeInfo {
  /** Document title (from first H1) */
  title: string;
  /** Short description (first paragraph after title) */
  description: string;
  /** Install commands extracted from code blocks */
  installCommands: InstallCommand[];
  /** Usage examples extracted from code blocks */
  usageExamples: UsageExample[];
  /** Badge metadata */
  badges: BadgeMeta[];
  /** External links found in the README */
  links: ReadmeLink[];
  /** Section headers and their content */
  sections: ReadmeSection[];
  /** Whether the README has a table of contents */
  hasTOC: boolean;
  /** Detected features from bullet lists */
  features: string[];
  /** Prerequisites / requirements */
  prerequisites: string[];
  /** Environment variables mentioned */
  envVars: string[];
}

export interface InstallCommand {
  /** The command string */
  command: string;
  /** Package manager (npm, pip, cargo, etc.) */
  manager: string;
  /** OS/platform if specified */
  platform?: string;
}

export interface UsageExample {
  /** Code block content */
  code: string;
  /** Language hint from code fence */
  language: string;
  /** Context: section title where it was found */
  context: string;
}

export interface BadgeMeta {
  /** Badge type: npm, ci, coverage, license, downloads, stars, other */
  type: string;
  /** Alt text / label */
  label: string;
  /** Badge image URL */
  imageUrl: string;
  /** Link URL */
  linkUrl: string;
}

export interface ReadmeLink {
  /** Display text */
  text: string;
  /** URL */
  url: string;
  /** Whether it's an external link */
  external: boolean;
}

export interface ReadmeSection {
  /** Heading level (1-6) */
  level: number;
  /** Section title */
  title: string;
  /** Raw content (without sub-headings) */
  content: string;
}

const INSTALL_PATTERNS = [
  { regex: /^(?:\$\s*)?npm\s+(?:install|i|add)\s+(.+)/i, manager: "npm" },
  { regex: /^(?:\$\s*)?yarn\s+add\s+(.+)/i, manager: "yarn" },
  { regex: /^(?:\$\s*)?pnpm\s+(?:add|install)\s+(.+)/i, manager: "pnpm" },
  { regex: /^(?:\$\s*)?bun\s+(?:add|install)\s+(.+)/i, manager: "bun" },
  { regex: /^(?:\$\s*)?pip3?\s+install\s+(.+)/i, manager: "pip" },
  { regex: /^(?:\$\s*)?cargo\s+(?:install|add)\s+(.+)/i, manager: "cargo" },
  { regex: /^(?:\$\s*)?go\s+(?:install|get)\s+(.+)/i, manager: "go" },
  { regex: /^(?:\$\s*)?gem\s+install\s+(.+)/i, manager: "gem" },
  { regex: /^(?:\$\s*)?composer\s+require\s+(.+)/i, manager: "composer" },
  { regex: /^(?:\$\s*)?brew\s+install\s+(.+)/i, manager: "brew" },
  { regex: /^(?:\$\s*)?dotnet\s+add\s+package\s+(.+)/i, manager: "nuget" },
  { regex: /^(?:\$\s*)?luarocks\s+install\s+(.+)/i, manager: "luarocks" },
  { regex: /^(?:\$\s*)?mix\s+(?:deps\.get|archive\.install)/i, manager: "hex" },
  { regex: /^(?:\$\s*)?cabal\s+install\s+(.+)/i, manager: "cabal" },
  { regex: /^(?:\$\s*)?stack\s+install\s+(.+)/i, manager: "stack" },
  { regex: /^(?:\$\s*)?dart\s+pub\s+add\s+(.+)/i, manager: "pub" },
  { regex: /^(?:\$\s*)?flutter\s+pub\s+add\s+(.+)/i, manager: "pub" },
  { regex: /^(?:\$\s*)?apt(?:-get)?\s+install\s+(.+)/i, manager: "apt" },
  { regex: /^(?:\$\s*)?pacman\s+-S\s+(.+)/i, manager: "pacman" },
];

const BADGE_TYPE_PATTERNS: [RegExp, string][] = [
  [/npm|version/i, "npm"],
  [/ci|build|action|travis|circleci|github.*workflow/i, "ci"],
  [/coverage|codecov|coveralls/i, "coverage"],
  [/license/i, "license"],
  [/download/i, "downloads"],
  [/star/i, "stars"],
  [/size|bundle/i, "size"],
];

/**
 * Parse a README string and extract structured information.
 */
export function parseReadme(content: string): ReadmeInfo {
  const info: ReadmeInfo = {
    title: "",
    description: "",
    installCommands: [],
    usageExamples: [],
    badges: [],
    links: [],
    sections: [],
    hasTOC: false,
    features: [],
    prerequisites: [],
    envVars: [],
  };

  if (!content || !content.trim()) return info;

  const lines = content.split("\n");

  // Extract title
  info.title = extractTitle(lines, content);

  // Extract description
  info.description = extractDescription(lines);

  // Extract sections
  info.sections = extractSections(lines);

  // Extract badges
  info.badges = extractBadges(content);

  // Extract install commands from code blocks
  info.installCommands = extractInstallCommands(content);

  // Extract usage examples
  info.usageExamples = extractUsageExamples(content, info.sections);

  // Extract links
  info.links = extractLinks(content);

  // Check for TOC
  info.hasTOC = hasTOC(content);

  // Extract features
  info.features = extractFeatures(info.sections);

  // Extract prerequisites
  info.prerequisites = extractPrerequisites(info.sections);

  // Extract environment variables
  info.envVars = extractEnvVars(content);

  return info;
}

function extractTitle(lines: string[], content: string): string {
  // Try markdown heading
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1].replace(/[^\w\s\-./]/g, "").trim();
  }
  // Try HTML h1
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  return "";
}

function extractDescription(lines: string[]): string {
  let started = false;
  let inHtmlBlock = false;
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inHtmlBlock && /^<[a-zA-Z]/.test(trimmed)) inHtmlBlock = true;
    if (inHtmlBlock) {
      if (/<\/[a-zA-Z]+>/.test(trimmed) || /\/>/.test(trimmed)) inHtmlBlock = false;
      continue;
    }
    if (!started) {
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[") ||
          trimmed.startsWith("!") || trimmed.startsWith("<") || trimmed.startsWith("---")) continue;
      started = true;
    }
    if (started) {
      if (!trimmed && result.length > 0) break;
      result.push(trimmed);
    }
  }
  return result.join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function extractSections(lines: string[]): ReadmeSection[] {
  const sections: ReadmeSection[] = [];
  let current: ReadmeSection | null = null;
  const contentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      if (current) {
        current.content = contentLines.join("\n").trim();
        sections.push(current);
        contentLines.length = 0;
      }
      current = {
        level: match[1].length,
        title: match[2].replace(/[^\w\s\-./]/g, "").trim(),
        content: "",
      };
    } else if (current) {
      contentLines.push(line);
    }
  }
  if (current) {
    current.content = contentLines.join("\n").trim();
    sections.push(current);
  }
  return sections;
}

function extractBadges(content: string): BadgeMeta[] {
  const badges: BadgeMeta[] = [];
  const badgeRegex = /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g;
  let match;
  while ((match = badgeRegex.exec(content)) !== null) {
    const [, alt, imgUrl, linkUrl] = match;
    if (!imgUrl.match(/shield|badge|badgen|codecov|coveralls|travis|github\.com.*badge/i)) continue;

    let type = "other";
    const combined = `${alt} ${imgUrl} ${linkUrl}`.toLowerCase();
    for (const [pattern, t] of BADGE_TYPE_PATTERNS) {
      if (pattern.test(combined)) { type = t; break; }
    }
    badges.push({ type, label: alt, imageUrl: imgUrl, linkUrl });
  }
  return badges;
}

function extractInstallCommands(content: string): InstallCommand[] {
  const commands: InstallCommand[] = [];
  const codeBlockRegex = /```(?:bash|sh|shell|console|zsh|powershell|cmd)?\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    for (const line of match[1].split("\n")) {
      const trimmed = line.replace(/^\$\s*/, "").trim();
      if (!trimmed) continue;
      for (const pattern of INSTALL_PATTERNS) {
        if (pattern.regex.test(trimmed)) {
          if (!commands.some(c => c.command === trimmed)) {
            commands.push({ command: trimmed, manager: pattern.manager });
          }
          break;
        }
      }
    }
  }
  return commands;
}

function extractUsageExamples(content: string, sections: ReadmeSection[]): UsageExample[] {
  const examples: UsageExample[] = [];
  const usageSections = sections.filter(s =>
    /usage|getting started|quickstart|quick start|tutorial|example|how to/i.test(s.title)
  );

  const codeBlockRegex = /```(\w*)\s*\n([\s\S]*?)```/g;

  for (const section of usageSections) {
    let match;
    while ((match = codeBlockRegex.exec(section.content)) !== null) {
      const code = match[2].trim();
      if (code.length > 10 && !isInstallCommand(code)) {
        examples.push({
          code,
          language: match[1] || "text",
          context: section.title,
        });
      }
    }
  }

  // If no usage sections, try to find code examples in the full content
  if (examples.length === 0) {
    let match;
    const fullRegex = /```(\w+)\s*\n([\s\S]*?)```/g;
    while ((match = fullRegex.exec(content)) !== null) {
      const code = match[2].trim();
      const lang = match[1].toLowerCase();
      // Skip shell-only blocks and short blocks
      if (code.length > 30 && !["bash", "sh", "shell", "console"].includes(lang) && !isInstallCommand(code)) {
        examples.push({ code, language: lang, context: "README" });
        if (examples.length >= 5) break;
      }
    }
  }

  return examples.slice(0, 10);
}

function isInstallCommand(code: string): boolean {
  const firstLine = code.split("\n")[0].replace(/^\$\s*/, "").trim();
  return INSTALL_PATTERNS.some(p => p.regex.test(firstLine));
}

function extractLinks(content: string): ReadmeLink[] {
  const links: ReadmeLink[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const [, text, url] = match;
    // Skip badge links and image links
    if (text.startsWith("!") || url.includes("shield") || url.includes("badge")) continue;
    if (!links.some(l => l.url === url)) {
      links.push({ text: text.trim(), url, external: true });
    }
  }
  return links.slice(0, 20);
}

function hasTOC(content: string): boolean {
  // Check for explicit TOC section or many internal links
  if (/## (?:table of contents|contents|toc)/i.test(content)) return true;
  const internalLinks = content.match(/\[([^\]]+)\]\(#[^)]+\)/g);
  return (internalLinks?.length ?? 0) >= 4;
}

function extractFeatures(sections: ReadmeSection[]): string[] {
  const featureSection = sections.find(s =>
    /features|highlights|what it does|key capabilities|why/i.test(s.title)
  );
  if (!featureSection) return [];

  const features: string[] = [];
  for (const line of featureSection.content.split("\n")) {
    const match = line.trim().match(/^[-*•]\s+(.+)/) || line.trim().match(/^\d+[.)]\s+(.+)/);
    if (match) {
      const text = match[1].replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      if (text.length > 5 && text.length < 200) features.push(text);
    }
  }
  return features;
}

function extractPrerequisites(sections: ReadmeSection[]): string[] {
  const preqSection = sections.find(s =>
    /prerequisites?|requirements?|before you begin/i.test(s.title)
  );
  if (!preqSection) return [];

  const prereqs: string[] = [];
  for (const line of preqSection.content.split("\n")) {
    const match = line.trim().match(/^[-*•]\s+(.+)/);
    if (match) prereqs.push(match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim());
  }
  return prereqs;
}

function extractEnvVars(content: string): string[] {
  const vars = new Set<string>();
  // Match common patterns: $ENV_VAR, ${ENV_VAR}, process.env.VAR, os.environ["VAR"]
  const patterns = [
    /\b([A-Z][A-Z0-9_]{2,})\b/g,  // Only in code blocks
  ];

  // Extract from code blocks only to reduce false positives
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const block = match[0];
    // Look for env var patterns
    const envPatterns = [
      /(?:process\.env\.|os\.environ\[["']|getenv\(["']|ENV\[["'])([A-Z][A-Z0-9_]{2,})/g,
      /\$\{?([A-Z][A-Z0-9_]{2,})\}?/g,
    ];
    for (const pattern of envPatterns) {
      let m;
      while ((m = pattern.exec(block)) !== null) {
        const v = m[1];
        // Filter out common non-env-var patterns
        if (!["HOME", "PATH", "USER", "PWD", "TRUE", "FALSE", "NULL", "NONE"].includes(v)) {
          vars.add(v);
        }
      }
    }
  }
  return [...vars].slice(0, 20);
}
