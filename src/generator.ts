import * as path from "path";
import * as fs from "fs";
import { RepoAnalysis } from "./analyzer";
import { Repo2SkillResult } from "./index";
import { TemplateConfig, getTemplate } from "./templates";
import { GitHubMetadata, formatGitHubSection } from "./github-integration";

export interface SkillQualityDetail {
  label: string;
  score: number;
  maxScore: number;
  pass: boolean;
  /** Weight category for explain-score breakdown */
  category?: string;
}

export interface SkillQuality {
  score: number;
  maxScore: number;
  details: SkillQualityDetail[];
  /** Legacy 1-5 score for backward compat */
  legacyScore: number;
}

/** Count code blocks (``` ... ```) in a string */
function countCodeBlocks(text: string): number {
  const matches = text.match(/```[\s\S]*?```/g);
  return matches ? matches.length : 0;
}

export function scoreSkillQuality(analysis: RepoAnalysis): SkillQuality {
  // --- Description quality (25%) ---
  const desc = analysis.richDescription || analysis.description || "";
  const descLen = desc.length;
  let descScore = 0;
  if (descLen > 0) {
    descScore = 15; // base: has a description
    if (descLen >= 20 && descLen <= 500) {
      descScore = 25; // ideal length
    } else if (descLen < 20) {
      descScore = 10; // too short — penalized
    } else {
      descScore = 18; // >500 chars — penalized for being too long
    }
  }

  // --- Examples (25% total: 20 for count + 5 for code quality) ---
  const exampleCount = analysis.usageExamples.length;
  let examplesScore: number;
  if (exampleCount >= 3) {
    examplesScore = 20;
  } else if (exampleCount >= 1) {
    examplesScore = 12;
  } else if (analysis.usageSection) {
    examplesScore = 5;
  } else {
    examplesScore = 0;
  }

  // Example code quality: do usage examples contain actual code blocks?
  let codeQualityScore = 0;
  if (exampleCount > 0) {
    const blocksInExamples = analysis.usageExamples.reduce(
      (sum, ex) => sum + countCodeBlocks(ex), 0,
    );
    codeQualityScore = blocksInExamples >= exampleCount ? 5 : blocksInExamples > 0 ? 3 : 0;
  }

  // --- API docs (20% total: 15 for reference + 5 for coverage) ---
  let apiRefScore: number;
  if (analysis.apiSection && analysis.keyApi.length > 0) {
    apiRefScore = 15;
  } else if (analysis.apiSection) {
    apiRefScore = 10;
  } else if (analysis.keyApi.length > 0) {
    apiRefScore = 8;
  } else {
    apiRefScore = 0;
  }

  // API coverage: how many key APIs are documented?
  let apiCoverageScore = 0;
  if (analysis.keyApi.length >= 5) {
    apiCoverageScore = 5;
  } else if (analysis.keyApi.length >= 2) {
    apiCoverageScore = 3;
  } else if (analysis.keyApi.length >= 1) {
    apiCoverageScore = 1;
  }

  // --- Triggers / when-to-use (15% total: 10 + 5) ---
  const whenToUseScore = analysis.whenToUse.length > 0 ? 10 : 0;
  const whenNotToUseScore = analysis.whenNotToUse.length > 0 ? 5 : 0;

  // --- References / extras (15% total: 5 features + 5 tests + 5 install) ---
  let featuresScore: number;
  if (analysis.features.length >= 3) {
    featuresScore = 5;
  } else if (analysis.features.length >= 1) {
    featuresScore = 3;
  } else {
    featuresScore = 0;
  }

  const testsScore = analysis.hasTests ? 5 : 0;
  const installScore = analysis.installInstructions ? 5 : 0;

  const details: SkillQualityDetail[] = [
    {
      label: "Description quality",
      score: descScore,
      maxScore: 25,
      pass: descLen > 0,
      category: "Description (25%)",
    },
    {
      label: "Has examples",
      score: examplesScore,
      maxScore: 20,
      pass: exampleCount > 0 || !!analysis.usageSection,
      category: "Examples (25%)",
    },
    {
      label: "Example code quality",
      score: codeQualityScore,
      maxScore: 5,
      pass: codeQualityScore > 0,
      category: "Examples (25%)",
    },
    {
      label: "Has API reference",
      score: apiRefScore,
      maxScore: 15,
      pass: !!(analysis.apiSection || analysis.keyApi.length > 0),
      category: "API docs (20%)",
    },
    {
      label: "API coverage",
      score: apiCoverageScore,
      maxScore: 5,
      pass: analysis.keyApi.length > 0,
      category: "API docs (20%)",
    },
    {
      label: 'Has "When to Use"',
      score: whenToUseScore,
      maxScore: 10,
      pass: analysis.whenToUse.length > 0,
      category: "Triggers (15%)",
    },
    {
      label: 'Has "When NOT to Use"',
      score: whenNotToUseScore,
      maxScore: 5,
      pass: analysis.whenNotToUse.length > 0,
      category: "Triggers (15%)",
    },
    {
      label: "Has features list",
      score: featuresScore,
      maxScore: 5,
      pass: analysis.features.length > 0,
      category: "References (15%)",
    },
    {
      label: "Has test examples",
      score: testsScore,
      maxScore: 5,
      pass: analysis.hasTests,
      category: "References (15%)",
    },
    {
      label: "Has install command",
      score: installScore,
      maxScore: 5,
      pass: !!analysis.installInstructions,
      category: "References (15%)",
    },
  ];

  const score = details.reduce((sum, d) => sum + d.score, 0);
  const maxScore = details.reduce((sum, d) => sum + d.maxScore, 0);
  const legacyScore = Math.round((score / maxScore) * 5);

  return { score, maxScore, details, legacyScore };
}

export function formatQualityScore(quality: SkillQuality, explainScore = false): string {
  const lines: string[] = [];
  lines.push(`📊 Skill Quality Score: ${quality.score}/${quality.maxScore}`);

  if (explainScore) {
    // Group details by category and show weighted breakdown
    const categories = new Map<string, { earned: number; max: number; items: SkillQualityDetail[] }>();
    for (const d of quality.details) {
      const cat = d.category || "Other";
      if (!categories.has(cat)) {
        categories.set(cat, { earned: 0, max: 0, items: [] });
      }
      const group = categories.get(cat)!;
      group.earned += d.score;
      group.max += d.maxScore;
      group.items.push(d);
    }

    for (const [cat, group] of categories) {
      lines.push(`\n  ── ${cat}: ${group.earned}/${group.max} ──`);
      for (const d of group.items) {
        const icon = d.pass ? "✓" : "✗";
        const label = d.pass ? d.label : `Missing ${d.label.replace(/^Has /, "").replace(/^Description /, "description ").replace(/^Example /, "example ").replace(/^API /, "API ").toLowerCase()}`;
        lines.push(`    ${icon} ${label} (${d.score}/${d.maxScore})`);
      }
    }
    lines.push(`\n  Legacy score: ${quality.legacyScore}/5`);
  } else {
    for (const d of quality.details) {
      const icon = d.pass ? "✓" : "✗";
      const label = d.pass ? d.label : `Missing ${d.label.replace(/^Has /, "").toLowerCase()}`;
      lines.push(`  ${icon} ${label} (${d.score}/${d.maxScore})`);
    }
  }

  return lines.join("\n");
}

export function generateSkill(
  analysis: RepoAnalysis,
  skillDir: string,
  skillName: string,
  sourceRepo?: string,
  templateName?: string,
  githubMeta?: GitHubMetadata | null,
): Repo2SkillResult {
  fs.mkdirSync(skillDir, { recursive: true });

  const template = templateName ? getTemplate(templateName) : getTemplate("default");
  const isCLI = analysis.cliCommands.length > 0;
  const description = buildDescription(analysis, isCLI);
  const body = buildBody(analysis, skillName, isCLI, template, githubMeta);
  const generatedAt = new Date().toISOString();
  const repoLine = sourceRepo ? `\nsource_repo: ${sourceRepo}` : "";

  const skillMd = `---
name: ${skillName}
description: ${description}${repoLine}
generated_at: "${generatedAt}"
---

${body}

> Generated by [repo2skill](https://github.com/NeuZhou/repo2skill)`;

  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd);

  // References
  let referencesCount = 0;
  const refsDir = path.join(skillDir, "references");

  // References (only if template allows)
  if (template ? getTemplate(template.name).includeReferences : true) {
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
  }

  return { skillDir, referencesCount };
}

export interface SkillStructuredData {
  name: string;
  description: string;
  language: string;
  languages: string[];
  category: string;
  features: string[];
  whenToUse: string[];
  whenNotToUse: string[];
  cliCommands: string[];
  installCommand: string;
  packageName: string;
  license: string;
  hasTests: boolean;
  isMonorepo: boolean;
  monorepoPackages: string[];
  dependencies: string[];
  keyApi: string[];
  usageExamples: string[];
  quality: { score: number; maxScore: number };
}

export function buildStructuredData(analysis: RepoAnalysis, category: string): SkillStructuredData {
  const quality = scoreSkillQuality(analysis);
  return {
    name: analysis.name,
    description: analysis.richDescription || analysis.description,
    language: analysis.language,
    languages: analysis.languages,
    category,
    features: analysis.features,
    whenToUse: analysis.whenToUse,
    whenNotToUse: analysis.whenNotToUse,
    cliCommands: analysis.cliCommands.map(c => c.name),
    installCommand: analysis.installInstructions || "",
    packageName: analysis.packageName || analysis.name,
    license: analysis.license,
    hasTests: analysis.hasTests,
    isMonorepo: analysis.isMonorepo,
    monorepoPackages: analysis.monorepoPackages,
    dependencies: analysis.dependencies,
    keyApi: analysis.keyApi,
    usageExamples: analysis.usageExamples,
    quality: { score: quality.score, maxScore: quality.maxScore },
  };
}

function buildDescription(analysis: RepoAnalysis, isCLI: boolean): string {
  const parts: string[] = [];

  const desc = analysis.richDescription || analysis.description || `${analysis.name} — a ${analysis.language} project.`;
  parts.push(desc.split("\n")[0].replace(/\n/g, " ").trim());

  if (analysis.whenToUse.length > 0) {
    parts.push(`WHEN: ${analysis.whenToUse.slice(0, 4).join(", ").toLowerCase()}.`);
  }

  if (analysis.triggerPhrases.length > 0) {
    parts.push(`Triggers: ${analysis.triggerPhrases.slice(0, 4).join(", ")}.`);
  }

  const full = parts.join(" ").replace(/"/g, '\\"');
  return full.slice(0, 200);
}

function buildBody(analysis: RepoAnalysis, skillName: string, isCLI: boolean, template?: TemplateConfig, githubMeta?: GitHubMetadata | null): string {
  const t = template || getTemplate("default");
  const lines: string[] = [];

  lines.push(`# ${skillName}`);
  lines.push("");

  if (analysis.richDescription) {
    lines.push(analysis.richDescription.split("\n")[0]);
    lines.push("");
  } else if (analysis.description) {
    lines.push(analysis.description.split("\n")[0]);
    lines.push("");
  }

  lines.push("## When to Use");
  lines.push("");
  if (analysis.whenToUse.length > 0) {
    for (const item of analysis.whenToUse) {
      lines.push(`- ${item}`);
    }
  } else if (isCLI) {
    lines.push(`- Run \`${analysis.cliCommands[0]?.name || skillName}\` commands`);
  } else {
    lines.push(`- Work with the ${skillName} ${analysis.language} library`);
  }
  lines.push("");

  if (analysis.whenNotToUse.length > 0) {
    lines.push("## When NOT to Use");
    lines.push("");
    for (const item of analysis.whenNotToUse) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  lines.push("## Quick Start");
  lines.push("");

  if (analysis.installInstructions) {
    const codeBlocks = extractCodeBlocks(analysis.installInstructions);
    if (codeBlocks.length > 0) {
      lines.push("### Install");
      lines.push("");
      lines.push(...codeBlocks.slice(0, 2).map(b => b));
      lines.push("");
    } else {
      lines.push("### Install");
      lines.push("");
      lines.push(trimSection(analysis.installInstructions, 10));
      lines.push("");
    }
  } else {
    lines.push("### Install");
    lines.push("");
    const pkgName = analysis.packageName || analysis.name;
    if (analysis.language === "JavaScript" || analysis.language === "TypeScript") {
      lines.push("```bash");
      lines.push(`npm install ${pkgName}`);
      lines.push("```");
    } else if (analysis.language === "Python") {
      lines.push("```bash");
      lines.push(`pip install ${pkgName}`);
      lines.push("```");
    } else if (analysis.language === "Rust") {
      lines.push("```bash");
      lines.push(`cargo install ${pkgName}`);
      lines.push("```");
    } else if (analysis.language === "Go") {
      lines.push("```bash");
      lines.push(`go install ${analysis.entryPoints[0] || analysis.name}@latest`);
      lines.push("```");
    } else if (analysis.language === "Swift") {
      lines.push("```swift");
      lines.push(`// In Package.swift dependencies:`);
      lines.push(`.package(url: "https://github.com/${analysis.name}", from: "1.0.0")`);
      lines.push("```");
    } else if (analysis.language === "C" || analysis.language === "C++") {
      lines.push("```bash");
      lines.push("mkdir build && cd build");
      lines.push("cmake ..");
      lines.push("make");
      lines.push("```");
    } else if (analysis.language === "PHP") {
      lines.push("```bash");
      lines.push(`composer require ${analysis.name}`);
      lines.push("```");
    } else if (analysis.language === "Elixir") {
      lines.push("```elixir");
      lines.push(`# In mix.exs deps:`);
      lines.push(`{:${analysis.name}, "~> 0.1.0"}`);
      lines.push("```");
    }
    lines.push("");
  }

  if (analysis.usageExamples.length > 0) {
    lines.push("### Basic Usage");
    lines.push("");
    const usedBlocks = new Set<string>();
    for (const example of analysis.usageExamples.slice(0, 3)) {
      usedBlocks.add(example);
      lines.push(example);
      lines.push("");
    }
    (analysis as any)._usedCodeBlocks = usedBlocks;
  } else if (analysis.usageSection) {
    lines.push("### Basic Usage");
    lines.push("");
    lines.push(trimSection(analysis.usageSection, 30));
    lines.push("");
  }

  if (isCLI && analysis.cliCommands.length > 0) {
    lines.push("## CLI Commands");
    lines.push("");
    for (const cmd of analysis.cliCommands) {
      lines.push(`- \`${cmd.name}\`${cmd.description ? ` — ${cmd.description}` : ""}`);
    }
    lines.push("");
  }

  if (analysis.features.length > 0) {
    lines.push("## Key Features");
    lines.push("");
    for (const feat of analysis.features.slice(0, 5)) {
      lines.push(`- ${feat}`);
    }
    lines.push("");
  }

  if (analysis.configSection) {
    const configBlocks = extractCodeBlocks(analysis.configSection);
    if (configBlocks.length > 0) {
      lines.push("## Configuration");
      lines.push("");
      lines.push(...configBlocks.slice(0, 2));
      lines.push("");
    }
  }

  if (analysis.isMonorepo && analysis.monorepoPackages.length > 0) {
    lines.push("## Packages");
    lines.push("");
    lines.push("This is a monorepo containing the following packages:");
    lines.push("");
    for (const pkg of analysis.monorepoPackages.slice(0, 10)) {
      lines.push(`- \`${pkg}\``);
    }
    if (analysis.monorepoPackages.length > 10) {
      lines.push(`- ... and ${analysis.monorepoPackages.length - 10} more`);
    }
    lines.push("");
  }

  if (analysis.examplesSection && analysis.examplesSection !== analysis.usageSection) {
    const usedBlocks: Set<string> = (analysis as any)._usedCodeBlocks || new Set();
    let dedupedExamples = analysis.examplesSection;
    for (const block of usedBlocks) {
      dedupedExamples = dedupedExamples.replace(block, "");
    }
    dedupedExamples = dedupedExamples.replace(/\n{3,}/g, "\n\n").trim();
    if (dedupedExamples.length > 20) {
      lines.push("## Examples");
      lines.push("");
      lines.push(trimSection(dedupedExamples, 40));
      lines.push("");
    }
  }

  if (analysis.apiSection) {
    lines.push("## API");
    lines.push("");
    if (analysis.apiSection.length > 500) {
      lines.push(trimSection(analysis.apiSection, 30));
      lines.push("");
      lines.push("> Full API reference: see `references/api.md`");
    } else {
      lines.push(trimSection(analysis.apiSection, 40));
    }
    lines.push("");
  }

  if (analysis.keyApi.length > 0) {
    lines.push("## Key API");
    lines.push("");
    for (const api of analysis.keyApi) {
      lines.push(`- \`${api}\``);
    }
    lines.push("");
  }

  if (analysis.dockerInfo) {
    lines.push("## Docker");
    lines.push("");
    lines.push(`- **Base image:** \`${analysis.dockerInfo.baseImage}\``);
    if (analysis.dockerInfo.exposedPorts.length > 0) {
      lines.push(`- **Exposed ports:** ${analysis.dockerInfo.exposedPorts.map(p => `\`${p}\``).join(", ")}`);
    }
    if (analysis.dockerInfo.entrypoint) {
      lines.push(`- **Entrypoint:** \`${analysis.dockerInfo.entrypoint}\``);
    }
    lines.push("");
  }

  // GitHub Stats (if available and template allows)
  if (githubMeta && t.sections.githubStats) {
    lines.push(formatGitHubSection(githubMeta));
  }

  // Security sections (security template)
  if (t.sections.securityConsiderations) {
    lines.push("## Security Considerations");
    lines.push("");
    lines.push("<!-- manual -->");
    lines.push("_Add security notes, auth patterns, and known CVEs here._");
    lines.push("<!-- /manual -->");
    lines.push("");
  }
  if (t.sections.threatModel) {
    lines.push("## Threat Model");
    lines.push("");
    lines.push("<!-- manual -->");
    lines.push("_Document threat model, attack surfaces, and mitigations here._");
    lines.push("<!-- /manual -->");
    lines.push("");
  }

  lines.push("## Project Info");
  lines.push("");
  lines.push(`- **Language:** ${analysis.languages.join(", ") || "Unknown"}`);
  if (analysis.license) lines.push(`- **License:** ${analysis.license}`);
  if (analysis.hasTests) lines.push("- **Tests:** Yes");
  if (analysis.dependencies.length > 0) {
    lines.push(`- **Key dependencies:** ${analysis.dependencies.slice(0, 8).join(", ")}`);
  }
  lines.push("");

  if (analysis.fileTree) {
    lines.push("## File Structure");
    lines.push("");
    lines.push("```");
    lines.push(analysis.fileTree.split("\n").slice(0, 20).join("\n"));
    lines.push("```");
  }

  return ensureClosedCodeBlocks(lines.join("\n"));
}

function ensureClosedCodeBlocks(markdown: string): string {
  let inBlock = false;
  for (const line of markdown.split("\n")) {
    if (/^```/.test(line.trim())) {
      inBlock = !inBlock;
    }
  }
  if (inBlock) {
    return markdown + "\n```";
  }
  return markdown;
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

function trimSection(text: string, maxLines: number): string {
  const lines = text.split("\n").slice(0, maxLines);
  return lines.join("\n");
}
