/**
 * Multi-format Output - export skills in JSON, YAML, HTML, and Markdown.
 */

import * as fs from "fs";
import * as path from "path";

export type OutputFormat = "md" | "json" | "yaml" | "html";

export interface SkillData {
  title: string;
  description: string;
  sections: Record<string, string>;
  frontmatter?: Record<string, string>;
  generatedAt?: string;
}

/**
 * Parse SKILL.md content into structured SkillData.
 */
export function parseSkillToData(content: string): SkillData {
  let body = content;
  let frontmatter: Record<string, string> | undefined;

  // Extract frontmatter
  const fmMatch = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    frontmatter = {};
    for (const line of fmMatch[1].split("\n")) {
      const kv = line.match(/^(\w[\w_-]*)\s*:\s*"?([^"]*)"?$/);
      if (kv) frontmatter[kv[1]] = kv[2];
    }
    body = body.slice(fmMatch[0].length);
  }

  // Extract title
  let title = "";
  const titleMatch = body.match(/^#\s+(.+)/m);
  if (titleMatch) title = titleMatch[1].trim();

  // Extract description
  let description = "";
  const descMatch = body.match(/^#\s+.+\n+([\s\S]*?)(?=\n##\s|\n$|$)/);
  if (descMatch) description = descMatch[1].trim();

  // Extract sections
  const sections: Record<string, string> = {};
  const parts = body.split(/^(?=##\s)/m);
  for (const part of parts) {
    const m = part.match(/^##\s+(.+)\n([\s\S]*)$/);
    if (m) {
      sections[m[1].trim()] = m[2].trim();
    }
  }

  return { title, description, sections, frontmatter };
}

/**
 * Convert skill data to JSON format.
 */
export function toJson(data: SkillData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Convert skill data to YAML format (simple implementation, no dependency).
 */
export function toYaml(data: SkillData): string {
  const lines: string[] = [];
  lines.push(`title: "${escapeYaml(data.title)}"`);
  lines.push(`description: "${escapeYaml(data.description)}"`);
  if (data.frontmatter) {
    lines.push("frontmatter:");
    for (const [k, v] of Object.entries(data.frontmatter)) {
      lines.push(`  ${k}: "${escapeYaml(v)}"`);
    }
  }
  if (data.generatedAt) {
    lines.push(`generatedAt: "${data.generatedAt}"`);
  }
  lines.push("sections:");
  for (const [heading, content] of Object.entries(data.sections)) {
    lines.push(`  "${escapeYaml(heading)}":`);
    lines.push(`    content: |`);
    for (const line of content.split("\n")) {
      lines.push(`      ${line}`);
    }
  }
  return lines.join("\n") + "\n";
}

function escapeYaml(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * Convert skill data to HTML preview.
 */
export function toHtml(data: SkillData): string {
  const sections = Object.entries(data.sections)
    .map(([heading, content]) => {
      const escapedContent = escapeHtml(content).replace(/\n/g, "<br>");
      return `<section><h2>${escapeHtml(heading)}</h2><p>${escapedContent}</p></section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.title)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 2em auto; padding: 0 1em; color: #333; }
h1 { border-bottom: 2px solid #0066cc; padding-bottom: 0.3em; }
h2 { color: #0066cc; margin-top: 1.5em; }
code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
pre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }
section { margin-bottom: 1.5em; }
</style>
</head>
<body>
<h1>${escapeHtml(data.title)}</h1>
<p>${escapeHtml(data.description)}</p>
${sections}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Convert SKILL.md content to the specified format.
 */
export function convertFormat(skillMdContent: string, format: OutputFormat): string {
  if (format === "md") return skillMdContent;
  const data = parseSkillToData(skillMdContent);
  data.generatedAt = new Date().toISOString();
  switch (format) {
    case "json": return toJson(data);
    case "yaml": return toYaml(data);
    case "html": return toHtml(data);
    default: return skillMdContent;
  }
}

/**
 * Get file extension for a format.
 */
export function formatExtension(format: OutputFormat): string {
  const map: Record<OutputFormat, string> = { md: ".md", json: ".json", yaml: ".yaml", html: ".html" };
  return map[format] || ".md";
}

/**
 * Write skill in specified format.
 */
export function writeFormatted(skillMdContent: string, outputPath: string, format: OutputFormat): string {
  const converted = convertFormat(skillMdContent, format);
  const ext = formatExtension(format);
  const finalPath = outputPath.replace(/\.[^.]+$/, ext);
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(finalPath, converted, "utf-8");
  return finalPath;
}
