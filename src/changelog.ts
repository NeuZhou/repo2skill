/**
 * Changelog Generator — generate skill-relevant changelog from git history.
 */

import simpleGit, { LogResult } from "simple-git";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

export interface ChangelogEntry {
  hash: string;
  date: string;
  message: string;
  category: "feature" | "fix" | "docs" | "refactor" | "test" | "chore" | "other";
}

export interface Changelog {
  repo: string;
  entries: ChangelogEntry[];
  summary: string;
}

const CATEGORY_PATTERNS: [RegExp, ChangelogEntry["category"]][] = [
  [/^feat(\(|:|\!)/i, "feature"],
  [/^fix(\(|:|\!)/i, "fix"],
  [/^docs?(\(|:)/i, "docs"],
  [/^refactor(\(|:)/i, "refactor"],
  [/^test(\(|:)/i, "test"],
  [/^chore(\(|:)/i, "chore"],
  [/add(ed|s|ing)?\s/i, "feature"],
  [/fix(ed|es|ing)?\s/i, "fix"],
  [/updat(e|ed|ing)\s/i, "feature"],
  [/remov(e|ed|es|ing)\s/i, "feature"],
  [/improv(e|ed|ing)\s/i, "feature"],
];

export function categorizeCommit(message: string): ChangelogEntry["category"] {
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(message)) return category;
  }
  return "other";
}

export async function generateChangelog(repoDir: string, maxCommits = 50): Promise<Changelog> {
  const git = simpleGit(repoDir);
  const log: LogResult = await git.log({ maxCount: maxCommits });

  const entries: ChangelogEntry[] = log.all.map((commit) => ({
    hash: commit.hash.slice(0, 7),
    date: commit.date.split("T")[0] || commit.date.split(" ")[0],
    message: commit.message.split("\n")[0].trim(),
    category: categorizeCommit(commit.message),
  }));

  // Filter out uninteresting commits for skill context
  const skillRelevant = entries.filter(
    (e) => e.category !== "chore" && e.category !== "other"
  );

  const featureCount = entries.filter((e) => e.category === "feature").length;
  const fixCount = entries.filter((e) => e.category === "fix").length;
  const repoName = path.basename(repoDir);

  const summary = `${repoName}: ${entries.length} commits (${featureCount} features, ${fixCount} fixes)`;

  return {
    repo: repoName,
    entries: skillRelevant.length > 0 ? skillRelevant : entries.slice(0, 20),
    summary,
  };
}

export function formatChangelog(changelog: Changelog): string {
  const lines: string[] = [];
  lines.push(`\n📋 Changelog — ${changelog.repo}\n`);
  lines.push(`  ${changelog.summary}\n`);

  const grouped: Record<string, ChangelogEntry[]> = {};
  for (const entry of changelog.entries) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }

  const order: ChangelogEntry["category"][] = ["feature", "fix", "docs", "refactor", "test", "other"];
  const icons: Record<string, string> = {
    feature: "✨",
    fix: "🐛",
    docs: "📝",
    refactor: "♻️",
    test: "🧪",
    chore: "🔧",
    other: "📦",
  };

  for (const cat of order) {
    const entries = grouped[cat];
    if (!entries || entries.length === 0) continue;
    lines.push(`  ${icons[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${entries.length}):`);
    for (const e of entries.slice(0, 10)) {
      lines.push(`    ${e.hash} ${e.message.slice(0, 80)}`);
    }
    if (entries.length > 10) {
      lines.push(`    ... and ${entries.length - 10} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
