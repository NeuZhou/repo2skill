/**
 * Skill Diff Viewer — compare two SKILL.md files and show meaningful changes.
 */

import * as fs from "fs";
import { parseSkillToData, SkillData } from "./formats";

export interface SkillDiffChange {
  type: "added" | "removed" | "changed";
  field: string;
  summary: string;
  oldValue?: string;
  newValue?: string;
}

export interface SkillDiffResult {
  changes: SkillDiffChange[];
  oldTitle: string;
  newTitle: string;
}

/**
 * Diff two SKILL.md files and return structured changes.
 */
export function diffSkillFiles(oldPath: string, newPath: string): SkillDiffResult {
  const oldContent = fs.readFileSync(oldPath, "utf-8");
  const newContent = fs.readFileSync(newPath, "utf-8");
  return diffSkillContent(oldContent, newContent);
}

/**
 * Diff two SKILL.md content strings.
 */
export function diffSkillContent(oldContent: string, newContent: string): SkillDiffResult {
  const oldData = parseSkillToData(oldContent);
  const newData = parseSkillToData(newContent);
  const changes: SkillDiffChange[] = [];

  // Title
  if (oldData.title !== newData.title) {
    changes.push({ type: "changed", field: "title", summary: `"${oldData.title}" → "${newData.title}"`, oldValue: oldData.title, newValue: newData.title });
  }

  // Description
  if (normalize(oldData.description) !== normalize(newData.description)) {
    changes.push({ type: "changed", field: "description", summary: "description updated" });
  }

  // Frontmatter
  const oldFm = oldData.frontmatter || {};
  const newFm = newData.frontmatter || {};
  const allFmKeys = new Set([...Object.keys(oldFm), ...Object.keys(newFm)]);
  for (const key of allFmKeys) {
    if (!(key in oldFm)) {
      changes.push({ type: "added", field: `frontmatter.${key}`, summary: `${key}: "${newFm[key]}"` });
    } else if (!(key in newFm)) {
      changes.push({ type: "removed", field: `frontmatter.${key}`, summary: `${key} removed` });
    } else if (oldFm[key] !== newFm[key]) {
      changes.push({ type: "changed", field: `frontmatter.${key}`, summary: `${key}: "${oldFm[key]}" → "${newFm[key]}"` });
    }
  }

  // Sections
  const oldSections = new Set(Object.keys(oldData.sections));
  const newSections = new Set(Object.keys(newData.sections));

  for (const section of newSections) {
    if (!oldSections.has(section)) {
      changes.push({ type: "added", field: `section`, summary: `new section "${section}"` });
    }
  }

  for (const section of oldSections) {
    if (!newSections.has(section)) {
      changes.push({ type: "removed", field: `section`, summary: `section "${section}" removed` });
    }
  }

  for (const section of oldSections) {
    if (newSections.has(section) && normalize(oldData.sections[section]) !== normalize(newData.sections[section])) {
      changes.push({ type: "changed", field: `section`, summary: `section "${section}" updated` });
    }
  }

  // CLI commands diff
  const oldCmds = extractCommands(oldContent);
  const newCmds = extractCommands(newContent);
  for (const cmd of newCmds) {
    if (!oldCmds.includes(cmd)) {
      changes.push({ type: "added", field: "cli_command", summary: `new CLI command "${cmd}"` });
    }
  }
  for (const cmd of oldCmds) {
    if (!newCmds.includes(cmd)) {
      changes.push({ type: "removed", field: "cli_command", summary: `CLI command "${cmd}" removed` });
    }
  }

  return { changes, oldTitle: oldData.title, newTitle: newData.title };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function extractCommands(content: string): string[] {
  const cmds: string[] = [];
  const codeBlocks = content.match(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g) || [];
  for (const block of codeBlocks) {
    const lines = block.replace(/```[^\n]*\n/, "").replace(/```$/, "").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const cmd = trimmed.replace(/^\$\s*/, "").split(/\s/)[0];
        if (cmd && !cmds.includes(cmd)) cmds.push(cmd);
      }
    }
  }
  return cmds;
}

/**
 * Format diff result for CLI output.
 */
export function formatSkillDiff(result: SkillDiffResult): string {
  const lines: string[] = [];
  lines.push(`🔍 Skill Diff: ${result.oldTitle || "(old)"} → ${result.newTitle || "(new)"}\n`);

  if (result.changes.length === 0) {
    lines.push("  No changes detected.");
    return lines.join("\n");
  }

  for (const change of result.changes) {
    const icon = change.type === "added" ? "+" : change.type === "removed" ? "-" : "~";
    const color = change.type === "added" ? "Added" : change.type === "removed" ? "Removed" : "Changed";
    lines.push(`  ${icon} ${color}: ${change.summary}`);
  }

  lines.push(`\n  Total: ${result.changes.length} change(s)`);
  return lines.join("\n");
}
