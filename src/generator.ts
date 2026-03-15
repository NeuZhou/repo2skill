import * as path from "path";
import * as fs from "fs";
import { RepoAnalysis } from "./analyzer";
import { Repo2SkillResult } from "./index";

export function generateSkill(
  analysis: RepoAnalysis,
  skillDir: string,
  skillName: string
): Repo2SkillResult {
  fs.mkdirSync(skillDir, { recursive: true });

  const isCLI = analysis.cliCommands.length > 0;
  const description = buildDescription(analysis, isCLI);
  const body = buildBody(analysis, skillName, isCLI);

  const skillMd = `---
name: ${skillName}
description: ${description}
---

${body}`;

  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd);

  // References
  let referencesCount = 0;
  const refsDir = path.join(skillDir, "references");

  // API reference
  if (analysis.apiSection && analysis.apiSection.length > 200) {
    fs.mkdirSync(refsDir, { recursive: true });
    fs.writeFileSync(path.join(refsDir, "api.md"), `# API Reference — ${skillName}\n\n${analysis.apiSection}`);
    referencesCount++;
  }

  // Full README as reference
  if (analysis.readmeRaw.length > 1000) {
    fs.mkdirSync(refsDir, { recursive: true });
    fs.writeFileSync(path.join(refsDir, "README.md"), analysis.readmeRaw);
    referencesCount++;
  }

  return { skillDir, referencesCount };
}

function buildDescription(analysis: RepoAnalysis, isCLI: boolean): string {
  const parts: string[] = [];

  // Core description
  const desc = analysis.description || `${analysis.name} — a ${analysis.language} project.`;
  parts.push(desc.replace(/\n/g, " ").trim());

  // When to use
  if (isCLI) {
    const cmds = analysis.cliCommands.map(c => c.name).join(", ");
    parts.push(`CLI tool with commands: ${cmds}.`);
  }

  parts.push(`Language: ${analysis.language}.`);

  // Trim to reasonable length
  return parts.join(" ").slice(0, 500).replace(/"/g, '\\"');
}

function buildBody(analysis: RepoAnalysis, skillName: string, isCLI: boolean): string {
  const lines: string[] = [];

  lines.push(`# ${skillName}`);
  lines.push("");
  if (analysis.description) {
    lines.push(analysis.description.split("\n")[0]);
    lines.push("");
  }

  // When to Use
  lines.push("## When to Use");
  lines.push("");
  if (isCLI) {
    lines.push(`Use when you need to run \`${analysis.cliCommands[0]?.name || skillName}\` commands.`);
  } else {
    lines.push(`Use when working with the ${skillName} ${analysis.language} library.`);
  }
  lines.push("");

  // Quick Start
  lines.push("## Quick Start");
  lines.push("");
  if (analysis.installInstructions) {
    // Extract code blocks from install section
    const codeBlocks = extractCodeBlocks(analysis.installInstructions);
    if (codeBlocks.length > 0) {
      lines.push(...codeBlocks.slice(0, 3).map(b => b));
    } else {
      lines.push(trimSection(analysis.installInstructions, 15));
    }
  } else {
    // Generate install based on language
    if (analysis.language === "JavaScript" || analysis.language === "TypeScript") {
      lines.push("```bash");
      lines.push(`npm install ${analysis.name}`);
      lines.push("```");
    } else if (analysis.language === "Python") {
      lines.push("```bash");
      lines.push(`pip install ${analysis.name}`);
      lines.push("```");
    } else if (analysis.language === "Rust") {
      lines.push("```bash");
      lines.push(`cargo install ${analysis.name}`);
      lines.push("```");
    }
  }
  lines.push("");

  // CLI Commands
  if (isCLI && analysis.cliCommands.length > 0) {
    lines.push("## CLI Commands");
    lines.push("");
    for (const cmd of analysis.cliCommands) {
      lines.push(`- \`${cmd.name}\`${cmd.description ? ` — ${cmd.description}` : ""}`);
    }
    lines.push("");
  }

  // Usage
  if (analysis.usageSection) {
    lines.push("## Usage");
    lines.push("");
    lines.push(trimSection(analysis.usageSection, 50));
    lines.push("");
  }

  // API (brief, point to references)
  if (analysis.apiSection) {
    lines.push("## API");
    lines.push("");
    if (analysis.apiSection.length > 500) {
      // Just show first part, reference the full doc
      lines.push(trimSection(analysis.apiSection, 30));
      lines.push("");
      lines.push("> Full API reference: see `references/api.md`");
    } else {
      lines.push(trimSection(analysis.apiSection, 40));
    }
    lines.push("");
  }

  // Project Info
  lines.push("## Project Info");
  lines.push("");
  lines.push(`- **Language:** ${analysis.languages.join(", ") || "Unknown"}`);
  if (analysis.license) lines.push(`- **License:** ${analysis.license}`);
  if (analysis.hasTests) lines.push("- **Tests:** Yes");
  lines.push("");

  // File Structure
  if (analysis.fileTree) {
    lines.push("## File Structure");
    lines.push("");
    lines.push("```");
    lines.push(analysis.fileTree.split("\n").slice(0, 20).join("\n"));
    lines.push("```");
  }

  return lines.join("\n");
}

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const regex = /```[\s\S]*?```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function trimSection(text: string, maxLines: number): string {
  const lines = text.split("\n").slice(0, maxLines);
  return lines.join("\n");
}
