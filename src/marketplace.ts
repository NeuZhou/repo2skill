/**
 * Skill Marketplace Integration — Publish skills to ClawHub registry.
 */
import * as fs from "fs";
import * as path from "path";

export interface MarketplaceMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  language: string;
  tags: string[];
  source: string;
  skillPath: string;
}

export interface PublishResult {
  success: boolean;
  message: string;
  metadata?: MarketplaceMetadata;
}

/**
 * Extract metadata from a SKILL.md file for marketplace submission.
 */
export function extractMarketplaceMetadata(skillMdPath: string): MarketplaceMetadata {
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`SKILL.md not found: ${skillMdPath}`);
  }

  const content = fs.readFileSync(skillMdPath, "utf-8");

  const name = extractField(content, /^#\s+(.+)/m) || path.basename(path.dirname(skillMdPath));
  const description = extractField(content, /^description:\s*(.+)$/m)
    || extractField(content, /^>\s*(.+)$/m)
    || "";
  const version = extractField(content, /^version:\s*(.+)$/m) || "1.0.0";
  const author = extractField(content, /^author:\s*(.+)$/m) || "";
  const license = extractField(content, /\*\*License:\*\*\s*(.+)/) || "MIT";
  const language = extractField(content, /\*\*Language:\*\*\s*(.+)/) || "unknown";
  const source = extractField(content, /^source_repo:\s*(.+)$/m)
    || extractField(content, /github\.com\/([^\s)]+)/)
    || "";

  // Extract tags from description keywords and features
  const tags: string[] = [];
  const featureSection = content.match(/##\s+(?:Features|What it does)[\s\S]*?(?=\n##|\n$)/i);
  if (featureSection) {
    const bullets = featureSection[0].match(/^[-*]\s+(.+)/gm);
    if (bullets) {
      for (const b of bullets.slice(0, 5)) {
        const keyword = b.replace(/^[-*]\s+/, "").split(/[.,:;]/)[0].trim().toLowerCase();
        if (keyword.length > 2 && keyword.length < 30) tags.push(keyword);
      }
    }
  }

  // Add language as tag
  if (language !== "unknown") tags.push(language.toLowerCase());

  return {
    name,
    description: description.slice(0, 200),
    version,
    author,
    license,
    language,
    tags: [...new Set(tags)].slice(0, 10),
    source,
    skillPath: skillMdPath,
  };
}

/**
 * Generate a marketplace-ready metadata JSON file alongside the skill.
 */
export function generateMarketplaceJson(skillMdPath: string): string {
  const metadata = extractMarketplaceMetadata(skillMdPath);
  const jsonPath = path.join(path.dirname(skillMdPath), "marketplace.json");
  fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
  return jsonPath;
}

/**
 * Publish a skill to the ClawHub registry.
 * Uses the clawhub CLI if available, otherwise generates metadata for manual submission.
 */
export async function publishToMarketplace(
  skillPath: string,
  registry: string = "clawhub",
): Promise<PublishResult> {
  const skillMdPath = skillPath.endsWith("SKILL.md")
    ? skillPath
    : path.join(skillPath, "SKILL.md");

  if (!fs.existsSync(skillMdPath)) {
    return { success: false, message: `SKILL.md not found at ${skillMdPath}` };
  }

  try {
    const metadata = extractMarketplaceMetadata(skillMdPath);

    // Generate marketplace.json for the registry
    const jsonPath = generateMarketplaceJson(skillMdPath);

    if (registry === "clawhub") {
      // Try using clawhub CLI
      try {
        const { execSync } = require("child_process");
        execSync("clawhub --version", { stdio: "ignore" });
        execSync(`clawhub publish "${path.dirname(skillMdPath)}"`, { stdio: "inherit" });
        return {
          success: true,
          message: `Published ${metadata.name} to ClawHub`,
          metadata,
        };
      } catch {
        return {
          success: false,
          message: `Metadata generated at ${jsonPath}. Install clawhub CLI to publish: npm i -g clawhub`,
          metadata,
        };
      }
    }

    return {
      success: false,
      message: `Unknown registry: ${registry}. Metadata saved to ${jsonPath}`,
      metadata,
    };
  } catch (err: any) {
    return { success: false, message: `Publish failed: ${err.message}` };
  }
}

function extractField(content: string, pattern: RegExp): string {
  const match = content.match(pattern);
  return match ? match[1].trim() : "";
}
