/**
 * Skill Comparison — compare two repos side by side.
 */

import { analyzeRepo, categorizeProject, RepoAnalysis } from "./analyzer";
import { scoreSkillQuality, SkillQuality } from "./generator";

export interface SkillComparisonEntry {
  name: string;
  language: string;
  languages: string[];
  category: string;
  features: number;
  cliCommands: number;
  hasTests: boolean;
  license: string;
  quality: SkillQuality;
  dependencies: number;
  examples: number;
  isMonorepo: boolean;
}

export interface SkillComparison {
  left: SkillComparisonEntry;
  right: SkillComparisonEntry;
}

export function buildComparisonEntry(analysis: RepoAnalysis): SkillComparisonEntry {
  return {
    name: analysis.name,
    language: analysis.language,
    languages: analysis.languages,
    category: categorizeProject(analysis),
    features: analysis.features.length,
    cliCommands: analysis.cliCommands.length,
    hasTests: analysis.hasTests,
    license: analysis.license,
    quality: scoreSkillQuality(analysis),
    dependencies: analysis.dependencies.length,
    examples: analysis.usageExamples.length,
    isMonorepo: analysis.isMonorepo,
  };
}

export function formatComparison(comp: SkillComparison): string {
  const l = comp.left;
  const r = comp.right;
  const pad = 20;

  const lines: string[] = [];
  lines.push(`\n🔍 Skill Comparison\n`);
  lines.push(`${"".padEnd(pad)} ${l.name.padEnd(25)} ${r.name}`);
  lines.push(`${"─".repeat(pad)} ${"─".repeat(25)} ${"─".repeat(25)}`);
  lines.push(`${"Language".padEnd(pad)} ${l.language.padEnd(25)} ${r.language}`);
  lines.push(`${"All Languages".padEnd(pad)} ${l.languages.join(", ").padEnd(25)} ${r.languages.join(", ")}`);
  lines.push(`${"Category".padEnd(pad)} ${l.category.padEnd(25)} ${r.category}`);
  lines.push(`${"Features".padEnd(pad)} ${String(l.features).padEnd(25)} ${r.features}`);
  lines.push(`${"CLI Commands".padEnd(pad)} ${String(l.cliCommands).padEnd(25)} ${r.cliCommands}`);
  lines.push(`${"Has Tests".padEnd(pad)} ${String(l.hasTests).padEnd(25)} ${r.hasTests}`);
  lines.push(`${"License".padEnd(pad)} ${(l.license || "Unknown").padEnd(25)} ${r.license || "Unknown"}`);
  lines.push(`${"Quality Score".padEnd(pad)} ${`${l.quality.score}/${l.quality.maxScore}`.padEnd(25)} ${r.quality.score}/${r.quality.maxScore}`);
  lines.push(`${"Dependencies".padEnd(pad)} ${String(l.dependencies).padEnd(25)} ${r.dependencies}`);
  lines.push(`${"Examples".padEnd(pad)} ${String(l.examples).padEnd(25)} ${r.examples}`);
  lines.push(`${"Monorepo".padEnd(pad)} ${String(l.isMonorepo).padEnd(25)} ${r.isMonorepo}`);
  lines.push("");

  return lines.join("\n");
}
