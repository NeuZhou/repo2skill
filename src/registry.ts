/**
 * Skill Registry — maintain a local registry of generated skills.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface RegistryEntry {
  repo: string;
  skillDir: string;
  generatedAt: string;
  version?: string;
  template?: string;
}

export interface Registry {
  entries: RegistryEntry[];
}

const REGISTRY_FILE = path.join(os.homedir(), ".repo2skill", "registry.json");

function ensureRegistryDir(): void {
  const dir = path.dirname(REGISTRY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadRegistry(): Registry {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return { entries: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
  } catch {
    return { entries: [] };
  }
}

export function saveRegistry(registry: Registry): void {
  ensureRegistryDir();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

export function registryAdd(repo: string, skillDir: string, template?: string): RegistryEntry {
  const registry = loadRegistry();
  // Update existing or add new
  const existing = registry.entries.findIndex((e) => e.repo === repo);
  const entry: RegistryEntry = {
    repo,
    skillDir: path.resolve(skillDir),
    generatedAt: new Date().toISOString(),
    template,
  };
  if (existing >= 0) {
    registry.entries[existing] = entry;
  } else {
    registry.entries.push(entry);
  }
  saveRegistry(registry);
  return entry;
}

export function registryRemove(repo: string): boolean {
  const registry = loadRegistry();
  const before = registry.entries.length;
  registry.entries = registry.entries.filter((e) => e.repo !== repo);
  if (registry.entries.length < before) {
    saveRegistry(registry);
    return true;
  }
  return false;
}

export function registryList(): RegistryEntry[] {
  return loadRegistry().entries;
}

export function registryClear(): void {
  saveRegistry({ entries: [] });
}

export function getRegistryPath(): string {
  return REGISTRY_FILE;
}
