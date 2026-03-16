/**
 * Skill Graph — visualize relationships between skills as interactive HTML.
 */

import * as fs from "fs";
import * as path from "path";
import { parseSkillToData, SkillData } from "./formats";

export interface SkillNode {
  id: string;
  name: string;
  category: string;
  language: string;
  quality: number;
  dependencies: string[];
  tools: string[];
}

export interface SkillEdge {
  from: string;
  to: string;
  type: "dependency" | "shared-tool" | "same-category";
}

export interface SkillGraph {
  nodes: SkillNode[];
  edges: SkillEdge[];
  categories: Record<string, string[]>;
}

/**
 * Scan a skills directory and build a graph of relationships.
 */
export function buildSkillGraph(skillsDir: string): SkillGraph {
  const nodes: SkillNode[] = [];
  const edges: SkillEdge[] = [];
  const categories: Record<string, string[]> = {};

  if (!fs.existsSync(skillsDir)) {
    return { nodes, edges, categories };
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  // Parse all skills
  for (const entry of entries) {
    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, "utf-8");
    const node = parseSkillNode(entry.name, content);
    nodes.push(node);

    const cat = node.category || "uncategorized";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(node.id);
  }

  // Build edges
  const toolIndex: Record<string, string[]> = {};
  for (const node of nodes) {
    for (const tool of node.tools) {
      if (!toolIndex[tool]) toolIndex[tool] = [];
      toolIndex[tool].push(node.id);
    }
  }

  // Shared tools edges
  for (const [tool, skillIds] of Object.entries(toolIndex)) {
    if (skillIds.length < 2) continue;
    for (let i = 0; i < skillIds.length; i++) {
      for (let j = i + 1; j < skillIds.length; j++) {
        const exists = edges.some(e =>
          e.type === "shared-tool" && e.from === skillIds[i] && e.to === skillIds[j]
        );
        if (!exists) {
          edges.push({ from: skillIds[i], to: skillIds[j], type: "shared-tool" });
        }
      }
    }
  }

  // Same category edges
  for (const [, skillIds] of Object.entries(categories)) {
    if (skillIds.length < 2) continue;
    for (let i = 0; i < skillIds.length; i++) {
      for (let j = i + 1; j < skillIds.length; j++) {
        edges.push({ from: skillIds[i], to: skillIds[j], type: "same-category" });
      }
    }
  }

  // Dependency edges
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      const depNorm = dep.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (nodeIds.has(depNorm) && depNorm !== node.id) {
        edges.push({ from: node.id, to: depNorm, type: "dependency" });
      }
    }
  }

  return { nodes, edges, categories };
}

function parseSkillNode(id: string, content: string): SkillNode {
  const catMatch = content.match(/category:\s*"?([^"\n]+)"?/);
  const langMatch = content.match(/\*\*Language:\*\*\s*(.+)/);
  const qualityMatch = content.match(/Quality Score:\s*(\d+)/);

  // Extract dependencies from content
  const deps: string[] = [];
  const depMatch = content.match(/\*\*Key dependencies:\*\*\s*(.+)/);
  if (depMatch) {
    deps.push(...depMatch[1].split(",").map(d => d.replace(/`/g, "").trim()).filter(Boolean));
  }

  // Extract tools mentioned
  const tools: string[] = [];
  const toolPatterns = [
    /\b(webpack|vite|rollup|esbuild|parcel)\b/gi,
    /\b(jest|vitest|mocha|pytest|junit)\b/gi,
    /\b(docker|kubernetes|terraform|ansible)\b/gi,
    /\b(react|vue|angular|svelte|next\.?js|nuxt)\b/gi,
    /\b(express|fastify|koa|flask|django|fastapi)\b/gi,
    /\b(postgres|mysql|redis|mongodb|sqlite)\b/gi,
    /\b(git|npm|yarn|pnpm|pip|cargo)\b/gi,
  ];
  for (const pat of toolPatterns) {
    let m;
    while ((m = pat.exec(content)) !== null) {
      const tool = m[1].toLowerCase();
      if (!tools.includes(tool)) tools.push(tool);
    }
  }

  return {
    id,
    name: id,
    category: catMatch?.[1]?.trim() || "uncategorized",
    language: langMatch?.[1]?.trim() || "unknown",
    quality: qualityMatch ? parseInt(qualityMatch[1]) : 0,
    dependencies: deps,
    tools,
  };
}

/**
 * Generate an interactive HTML graph visualization.
 */
export function generateGraphHtml(graph: SkillGraph): string {
  const categoryColors: Record<string, string> = {};
  const palette = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ff6d01", "#46bdc6", "#7b1fa2", "#c2185b", "#00897b", "#6d4c41"];
  const cats = Object.keys(graph.categories);
  for (let i = 0; i < cats.length; i++) {
    categoryColors[cats[i]] = palette[i % palette.length];
  }

  const nodesJson = JSON.stringify(graph.nodes.map(n => ({
    id: n.id,
    label: n.name,
    color: categoryColors[n.category] || "#999",
    size: 10 + Math.min(n.quality / 5, 15),
    title: `${n.name}\nCategory: ${n.category}\nLanguage: ${n.language}\nQuality: ${n.quality}\nTools: ${n.tools.join(", ") || "none"}`,
    group: n.category,
  })));

  const edgesJson = JSON.stringify(graph.edges.map((e, i) => ({
    id: `e${i}`,
    from: e.from,
    to: e.to,
    color: e.type === "dependency" ? "#e53935" : e.type === "shared-tool" ? "#1e88e5" : "#ccc",
    width: e.type === "dependency" ? 2 : 1,
    dashes: e.type === "same-category",
    title: e.type,
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skill Graph — repo2skill</title>
<script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #eee; }
#graph { width: 100vw; height: 85vh; }
#legend { padding: 1em; display: flex; gap: 2em; flex-wrap: wrap; justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 0.4em; font-size: 0.9em; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; }
h1 { text-align: center; padding: 0.5em; font-size: 1.3em; color: #8ab4f8; }
.stats { text-align: center; font-size: 0.85em; color: #aaa; margin-bottom: 0.5em; }
</style>
</head>
<body>
<h1>🕸️ Skill Graph</h1>
<div class="stats">${graph.nodes.length} skills · ${graph.edges.length} relationships · ${cats.length} categories</div>
<div id="graph"></div>
<div id="legend">
  ${cats.map(c => `<div class="legend-item"><div class="legend-dot" style="background:${categoryColors[c] || '#999'}"></div>${c}</div>`).join("\n  ")}
  <div class="legend-item"><div class="legend-dot" style="background:#e53935"></div>dependency</div>
  <div class="legend-item"><div class="legend-dot" style="background:#1e88e5"></div>shared tool</div>
  <div class="legend-item"><div class="legend-dot" style="background:#ccc"></div>same category</div>
</div>
<script>
const nodes = new vis.DataSet(${nodesJson});
const edges = new vis.DataSet(${edgesJson});
const container = document.getElementById("graph");
const data = { nodes, edges };
const options = {
  physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01 } },
  nodes: { shape: "dot", font: { color: "#eee", size: 12 } },
  edges: { smooth: { type: "continuous" } },
  interaction: { hover: true, tooltipDelay: 100 },
};
new vis.Network(container, data, options);
</script>
</body>
</html>`;
}

/**
 * Format graph summary for CLI output.
 */
export function formatGraphSummary(graph: SkillGraph): string {
  const lines: string[] = [];
  lines.push("🕸️  Skill Graph Summary\n");
  lines.push(`  Skills:        ${graph.nodes.length}`);
  lines.push(`  Relationships: ${graph.edges.length}`);
  lines.push(`  Categories:    ${Object.keys(graph.categories).length}`);

  const depEdges = graph.edges.filter(e => e.type === "dependency").length;
  const toolEdges = graph.edges.filter(e => e.type === "shared-tool").length;
  const catEdges = graph.edges.filter(e => e.type === "same-category").length;
  lines.push(`    Dependencies:    ${depEdges}`);
  lines.push(`    Shared tools:    ${toolEdges}`);
  lines.push(`    Same category:   ${catEdges}`);

  if (Object.keys(graph.categories).length > 0) {
    lines.push("\n  Categories:");
    for (const [cat, ids] of Object.entries(graph.categories)) {
      lines.push(`    ${cat}: ${ids.join(", ")}`);
    }
  }

  return lines.join("\n");
}
