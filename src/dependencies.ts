/**
 * Skill Dependency Resolution — detect and document skill dependencies.
 */

import * as path from "path";
import * as fs from "fs";

export interface DependencyReport {
  runtime: Record<string, string>;   // name -> version range
  peer: Record<string, string>;
  dev: Record<string, string>;
  system: string[];                   // e.g. "Node.js >= 18", "MongoDB"
}

/**
 * Resolve dependencies from a repo directory.
 */
export function resolveDependencies(repoDir: string): DependencyReport {
  const report: DependencyReport = { runtime: {}, peer: {}, dev: {}, system: [] };

  // Node.js: package.json
  const pkgPath = path.join(repoDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.dependencies) report.runtime = { ...pkg.dependencies };
      if (pkg.peerDependencies) report.peer = { ...pkg.peerDependencies };
      if (pkg.devDependencies) report.dev = { ...pkg.devDependencies };
      // System requirements from engines
      if (pkg.engines) {
        for (const [eng, ver] of Object.entries(pkg.engines)) {
          report.system.push(`${eng} ${ver}`);
        }
      }
    } catch {}
  }

  // Python: requirements.txt
  const reqPath = path.join(repoDir, "requirements.txt");
  if (fs.existsSync(reqPath)) {
    const lines = fs.readFileSync(reqPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*([><=!~]+.+)?/);
      if (match) report.runtime[match[1]] = match[2] || "*";
    }
  }

  // Python: pyproject.toml
  const pyprojectPath = path.join(repoDir, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    try {
      const toml = require("@iarna/toml");
      const parsed = toml.parse(fs.readFileSync(pyprojectPath, "utf-8"));
      const proj = parsed.project || parsed.tool?.poetry || {};
      if (proj.dependencies && typeof proj.dependencies === "object" && !Array.isArray(proj.dependencies)) {
        for (const [name, ver] of Object.entries(proj.dependencies)) {
          if (name === "python") {
            report.system.push(`Python ${ver}`);
          } else {
            report.runtime[name] = String(ver);
          }
        }
      }
      if (Array.isArray(proj.dependencies)) {
        for (const dep of proj.dependencies) {
          const m = dep.match(/^([a-zA-Z0-9_-]+)\s*([><=!~]+.+)?/);
          if (m) {
            if (m[1] === "python") report.system.push(`Python ${m[2] || ""}`);
            else report.runtime[m[1]] = m[2] || "*";
          }
        }
      }
      const requires = parsed.project?.["requires-python"];
      if (requires) report.system.push(`Python ${requires}`);
      // Dev dependencies
      const devDeps = parsed.project?.["optional-dependencies"]?.dev ||
                      parsed.tool?.poetry?.["dev-dependencies"] ||
                      parsed.tool?.poetry?.group?.dev?.dependencies;
      if (devDeps) {
        if (Array.isArray(devDeps)) {
          for (const dep of devDeps) {
            const m = dep.match(/^([a-zA-Z0-9_-]+)/);
            if (m) report.dev[m[1]] = "*";
          }
        } else if (typeof devDeps === "object") {
          for (const [name, ver] of Object.entries(devDeps)) {
            report.dev[name] = String(ver);
          }
        }
      }
    } catch {}
  }

  // Rust: Cargo.toml
  const cargoPath = path.join(repoDir, "Cargo.toml");
  if (fs.existsSync(cargoPath)) {
    try {
      const toml = require("@iarna/toml");
      const parsed = toml.parse(fs.readFileSync(cargoPath, "utf-8"));
      if (parsed.dependencies) {
        for (const [name, ver] of Object.entries(parsed.dependencies)) {
          const version = typeof ver === "string" ? ver : (ver as any)?.version || "*";
          report.runtime[name] = version;
        }
      }
      if (parsed["dev-dependencies"]) {
        for (const [name, ver] of Object.entries(parsed["dev-dependencies"])) {
          const version = typeof ver === "string" ? ver : (ver as any)?.version || "*";
          report.dev[name] = version;
        }
      }
      const rustVersion = parsed.package?.["rust-version"];
      if (rustVersion) report.system.push(`Rust >= ${rustVersion}`);
    } catch {}
  }

  // Go: go.mod
  const goModPath = path.join(repoDir, "go.mod");
  if (fs.existsSync(goModPath)) {
    const content = fs.readFileSync(goModPath, "utf-8");
    const goVer = content.match(/^go\s+(\S+)/m);
    if (goVer) report.system.push(`Go >= ${goVer[1]}`);
    const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireBlock) {
      for (const line of requireBlock[1].split("\n")) {
        const m = line.trim().match(/^(\S+)\s+(\S+)/);
        if (m && !m[1].startsWith("//")) report.runtime[m[1]] = m[2];
      }
    }
  }

  // Detect system dependencies from common files
  detectSystemDeps(repoDir, report);

  return report;
}

function detectSystemDeps(repoDir: string, report: DependencyReport): void {
  // Docker-compose / README hints for system services
  const dockerComposePath = path.join(repoDir, "docker-compose.yml");
  const dockerComposeAlt = path.join(repoDir, "docker-compose.yaml");
  const composePath = fs.existsSync(dockerComposePath) ? dockerComposePath : fs.existsSync(dockerComposeAlt) ? dockerComposeAlt : null;

  if (composePath) {
    const content = fs.readFileSync(composePath, "utf-8");
    const services = ["postgres", "mysql", "mongodb", "mongo", "redis", "rabbitmq", "elasticsearch", "kafka", "minio"];
    for (const svc of services) {
      if (content.toLowerCase().includes(svc) && !report.system.some(s => s.toLowerCase().includes(svc))) {
        const label = svc === "mongo" ? "MongoDB" : svc.charAt(0).toUpperCase() + svc.slice(1);
        report.system.push(label);
      }
    }
  }
}

/**
 * Format dependency report for display.
 */
export function formatDependencies(report: DependencyReport): string {
  const lines: string[] = ["Dependencies:"];

  const runtimeEntries = Object.entries(report.runtime);
  if (runtimeEntries.length > 0) {
    lines.push(`  Runtime: ${runtimeEntries.slice(0, 10).map(([n, v]) => `${n}@${v}`).join(", ")}`);
    if (runtimeEntries.length > 10) lines.push(`    ... and ${runtimeEntries.length - 10} more`);
  }

  const peerEntries = Object.entries(report.peer);
  if (peerEntries.length > 0) {
    lines.push(`  Peer: ${peerEntries.map(([n, v]) => `${n}@${v}`).join(", ")}`);
  }

  const devEntries = Object.entries(report.dev);
  if (devEntries.length > 0) {
    lines.push(`  Dev: ${devEntries.slice(0, 8).map(([n]) => n).join(", ")}`);
  }

  if (report.system.length > 0) {
    lines.push(`  System: ${report.system.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Generate prerequisites markdown section from dependencies.
 */
export function generatePrerequisitesSection(report: DependencyReport): string {
  const lines: string[] = [];

  if (report.system.length > 0) {
    lines.push("### System Requirements");
    lines.push("");
    for (const sys of report.system) {
      lines.push(`- ${sys}`);
    }
    lines.push("");
  }

  const runtimeEntries = Object.entries(report.runtime);
  if (runtimeEntries.length > 0) {
    lines.push("### Runtime Dependencies");
    lines.push("");
    for (const [name, ver] of runtimeEntries.slice(0, 15)) {
      lines.push(`- \`${name}\` ${ver !== "*" ? ver : ""}`);
    }
    if (runtimeEntries.length > 15) {
      lines.push(`- ... and ${runtimeEntries.length - 15} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
