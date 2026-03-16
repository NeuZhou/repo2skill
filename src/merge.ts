/**
 * Skill Merging - merge multiple SKILL.md files into one combined skill.
 */

import * as fs from "fs";
import * as path from "path";

export interface MergeOptions {
  outputPath?: string;
  /** Strategy for combining descriptions */
  strategy?: "concat" | "smart";
}

export interface MergeResult {
  content: string;
  sourceCount: number;
  sectionsmerged: number;
  duplicatesRemoved: number;
}

interface ParsedSkill {
  title: string;
  description: string;
  sections: Map<string, string>;
  frontmatter?: string;
  source: string;
}

/**
 * Merge multiple SKILL.md files into a combined skill.
 */
export function mergeSkills(skillPaths: string[], options: MergeOptions = {}): MergeResult {
  if (skillPaths.length === 0) {
    throw new Error("No skill files provided for merging.");
  }
  if (skillPaths.length === 1) {
    const content = fs.readFileSync(skillPaths[0], "utf-8");
    if (options.outputPath) {
      fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
      fs.writeFileSync(options.outputPath, content, "utf-8");
    }
    return { content, sourceCount: 1, sectionsmerged: 0, duplicatesRemoved: 0 };
  }

  const skills = skillPaths.map((p) => parseSkillMd(p));
  const merged = combineSkills(skills, options.strategy || "smart");

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, merged.content, "utf-8");
  }

  return merged;
}

function parseSkillMd(filePath: string): ParsedSkill {
  const content = fs.readFileSync(filePath, "utf-8");
  const sections = new Map<string, string>();
  let title = "";
  let description = "";
  let frontmatter: string | undefined;

  let body = content;

  // Extract frontmatter
  const fmMatch = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    frontmatter = fmMatch[1];
    body = body.slice(fmMatch[0].length);
  }

  // Extract title
  const titleMatch = body.match(/^#\s+(.+)/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Extract description (text between title and first ## heading)
  const descMatch = body.match(/^#\s+.+\n+([\s\S]*?)(?=\n##\s|\n$|$)/);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // Extract sections by ## headings
  const parts = body.split(/^(?=##\s)/m);
  for (const part of parts) {
    const m = part.match(/^##\s+(.+)\n([\s\S]*)$/);
    if (m) {
      sections.set(m[1].trim(), m[2].trim());
    }
  }

  return { title, description, sections, frontmatter, source: filePath };
}

function combineSkills(skills: ParsedSkill[], strategy: "concat" | "smart"): MergeResult {
  let duplicatesRemoved = 0;

  // Combine title
  const titles = skills.map((s) => s.title).filter(Boolean);
  const combinedTitle = titles.length > 0 ? `${titles[0]} (Combined)` : "Combined Skill";

  // Combine descriptions - deduplicate sentences
  const allDescriptions = skills.map((s) => s.description).filter(Boolean);
  let combinedDesc: string;
  if (strategy === "smart") {
    const sentences = new Set<string>();
    const uniqueSentences: string[] = [];
    for (const desc of allDescriptions) {
      for (const sentence of splitSentences(desc)) {
        const normalized = sentence.toLowerCase().trim();
        if (normalized && !sentences.has(normalized)) {
          sentences.add(normalized);
          uniqueSentences.push(sentence.trim());
        } else if (normalized) {
          duplicatesRemoved++;
        }
      }
    }
    combinedDesc = uniqueSentences.join(" ");
  } else {
    combinedDesc = allDescriptions.join("\n\n");
  }

  // Combine sections - merge by heading name, deduplicate content
  const allSections = new Map<string, string[]>();
  for (const skill of skills) {
    for (const [heading, content] of skill.sections) {
      const normalizedHeading = normalizeHeading(heading);
      if (!allSections.has(normalizedHeading)) {
        allSections.set(normalizedHeading, []);
      }
      allSections.get(normalizedHeading)!.push(content);
    }
  }

  const mergedSections = new Map<string, string>();
  for (const [heading, contents] of allSections) {
    if (strategy === "smart") {
      const lines = new Set<string>();
      const unique: string[] = [];
      for (const content of contents) {
        for (const line of content.split("\n")) {
          const normalized = line.trim().toLowerCase();
          if (normalized && !lines.has(normalized)) {
            lines.add(normalized);
            unique.push(line);
          } else if (normalized) {
            duplicatesRemoved++;
          }
        }
      }
      mergedSections.set(heading, unique.join("\n"));
    } else {
      mergedSections.set(heading, contents.join("\n\n"));
    }
  }

  // Build output
  const parts: string[] = [];
  parts.push(`# ${combinedTitle}\n`);
  if (combinedDesc) {
    parts.push(combinedDesc + "\n");
  }
  for (const [heading, content] of mergedSections) {
    parts.push(`## ${heading}\n\n${content}\n`);
  }

  // Add sources section
  parts.push(`## Sources\n`);
  for (const skill of skills) {
    parts.push(`- ${path.basename(skill.source)}${skill.title ? ` (${skill.title})` : ""}`);
  }
  parts.push("");

  return {
    content: parts.join("\n"),
    sourceCount: skills.length,
    sectionsmerged: mergedSections.size,
    duplicatesRemoved,
  };
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function normalizeHeading(heading: string): string {
  // Normalize common heading variations
  const lower = heading.toLowerCase().trim();
  const aliases: Record<string, string> = {
    "installation": "Installation",
    "install": "Installation",
    "setup": "Installation",
    "getting started": "Getting Started",
    "quick start": "Getting Started",
    "quickstart": "Getting Started",
    "usage": "Usage",
    "examples": "Examples",
    "example": "Examples",
    "api": "API Reference",
    "api reference": "API Reference",
    "when to use": "When to Use",
    "when not to use": "When NOT to Use",
    "limitations": "When NOT to Use",
  };
  return aliases[lower] || heading;
}
