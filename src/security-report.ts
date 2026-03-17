/**
 * Security Report — Lightweight security scanning for generated skills.
 * Inspired by ClawGuard patterns but fully standalone (no external dependencies).
 *
 * Scans skill content and source files for common security issues:
 * - Hardcoded secrets (API keys, tokens, passwords)
 * - Dangerous eval/exec usage
 * - Network calls to unknown hosts
 * - File system access patterns
 */

import * as fs from "fs";
import * as path from "path";

export interface SecurityFinding {
  /** Severity: critical, warning, info */
  severity: "critical" | "warning" | "info";
  /** Short category label */
  category: string;
  /** Human-readable description */
  message: string;
  /** File where the issue was found (if applicable) */
  file?: string;
  /** Line number (1-based, if applicable) */
  line?: number;
  /** The matched snippet (truncated) */
  snippet?: string;
}

export interface SecurityReport {
  /** Total files scanned */
  filesScanned: number;
  /** Findings grouped by severity */
  findings: SecurityFinding[];
  /** Overall risk level */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** Timestamp */
  timestamp: string;
}

// --- Pattern definitions ---

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/gi, label: "API key" },
  { pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/gi, label: "Password/secret" },
  { pattern: /(?:token|auth_token|access_token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/gi, label: "Token" },
  { pattern: /(?:aws_access_key_id|aws_secret_access_key)\s*[:=]\s*["'][A-Za-z0-9/+=]{16,}["']/gi, label: "AWS credential" },
  { pattern: /ghp_[A-Za-z0-9]{36}/g, label: "GitHub personal access token" },
  { pattern: /sk-[A-Za-z0-9]{32,}/g, label: "OpenAI API key" },
  { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, label: "Private key" },
];

const EVAL_EXEC_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\beval\s*\(/g, label: "eval() call" },
  { pattern: /new\s+Function\s*\(/g, label: "new Function() constructor" },
  { pattern: /child_process.*\bexec\b/g, label: "child_process exec" },
  { pattern: /execSync\s*\(/g, label: "execSync() call" },
  { pattern: /\bspawn\s*\(/g, label: "spawn() call" },
  { pattern: /subprocess\.(?:run|Popen|call)\s*\(/g, label: "Python subprocess" },
  { pattern: /os\.system\s*\(/g, label: "os.system() call" },
  { pattern: /shell=True/g, label: "shell=True (Python)" },
];

const NETWORK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /https?:\/\/(?!(?:github\.com|npmjs\.com|pypi\.org|localhost|127\.0\.0\.1|example\.com|schemas\.))[^\s"'`)>\]]{10,}/gi, label: "External URL" },
  { pattern: /fetch\s*\(\s*[`"'][^"'`]*\$\{/g, label: "Dynamic fetch URL (template literal)" },
  { pattern: /axios\.\w+\s*\(\s*[`"'][^"'`]*\$\{/g, label: "Dynamic axios URL" },
  { pattern: /\.connect\s*\(\s*["'][^"']+["']/g, label: "Socket/DB connect" },
];

const FS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /fs\.(?:writeFile|appendFile|createWriteStream|unlink|rmdir|rm)\s*\(/g, label: "File write/delete" },
  { pattern: /fs\.(?:readFile|readdir|createReadStream)\s*\(/g, label: "File read" },
  { pattern: /(?:\/etc\/|\/root\/|C:\\Windows\\|%APPDATA%)/gi, label: "Sensitive path access" },
  { pattern: /\.env\b/g, label: ".env file reference" },
  { pattern: /process\.env\[/g, label: "Environment variable access" },
];

const SCANNABLE_EXTENSIONS = new Set([
  ".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt",
  ".sh", ".bash", ".zsh", ".ps1",
  ".md", ".yml", ".yaml", ".json", ".toml",
]);

/**
 * Scan a single file's content for security issues.
 */
function scanContent(content: string, filePath: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split("\n");

  function addFindings(patterns: Array<{ pattern: RegExp; label: string }>, category: string, severity: SecurityFinding["severity"]) {
    for (const { pattern, label } of patterns) {
      // Reset regex state
      const re = new RegExp(pattern.source, pattern.flags);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (re.test(line)) {
          // Skip comments and obvious test/example lines
          const trimmed = line.trim();
          if (trimmed.startsWith("//") && category !== "secrets") continue;
          if (trimmed.startsWith("#") && !trimmed.startsWith("#!") && category !== "secrets") continue;

          findings.push({
            severity,
            category,
            message: label,
            file: filePath,
            line: i + 1,
            snippet: line.trim().slice(0, 120),
          });
        }
        // Reset for next line
        re.lastIndex = 0;
      }
    }
  }

  addFindings(SECRET_PATTERNS, "secrets", "critical");
  addFindings(EVAL_EXEC_PATTERNS, "code-execution", "warning");
  addFindings(NETWORK_PATTERNS, "network", "info");
  addFindings(FS_PATTERNS, "file-system", "info");

  return findings;
}

/**
 * Recursively collect scannable files from a directory.
 */
function collectFiles(dir: string, maxFiles = 500): string[] {
  const files: string[] = [];
  const skipDirs = new Set(["node_modules", ".git", "dist", "build", "__pycache__", ".venv", "vendor"]);

  function walk(current: string) {
    if (files.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name) && !entry.name.startsWith(".")) {
          walk(path.join(current, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SCANNABLE_EXTENSIONS.has(ext)) {
          files.push(path.join(current, entry.name));
        }
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Run a security scan on a directory (repo or skill output).
 */
export function generateSecurityReport(targetDir: string): SecurityReport {
  const files = collectFiles(targetDir);
  const allFindings: SecurityFinding[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      // Use relative path for cleaner output
      const relPath = path.relative(targetDir, file);
      const findings = scanContent(content, relPath);
      allFindings.push(...findings);
    } catch {
      // Skip unreadable files
    }
  }

  // Deduplicate similar findings in same file
  const deduped = deduplicateFindings(allFindings);

  // Determine risk level
  const criticalCount = deduped.filter(f => f.severity === "critical").length;
  const warningCount = deduped.filter(f => f.severity === "warning").length;

  let riskLevel: SecurityReport["riskLevel"];
  if (criticalCount > 0) riskLevel = "critical";
  else if (warningCount > 3) riskLevel = "high";
  else if (warningCount > 0) riskLevel = "medium";
  else riskLevel = "low";

  return {
    filesScanned: files.length,
    findings: deduped,
    riskLevel,
    timestamp: new Date().toISOString(),
  };
}

function deduplicateFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const seen = new Set<string>();
  return findings.filter(f => {
    const key = `${f.file}:${f.line}:${f.category}:${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Format security report for console output.
 */
export function formatSecurityReport(report: SecurityReport): string {
  const lines: string[] = [];
  const riskEmoji = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" };
  const severityEmoji = { critical: "🔴", warning: "🟡", info: "ℹ️" };

  lines.push(`\n🔒 Security Report`);
  lines.push(`${"─".repeat(50)}`);
  lines.push(`  Risk Level:    ${riskEmoji[report.riskLevel]} ${report.riskLevel.toUpperCase()}`);
  lines.push(`  Files Scanned: ${report.filesScanned}`);
  lines.push(`  Findings:      ${report.findings.length}`);
  lines.push(`  Scanned:       ${report.timestamp}`);

  if (report.findings.length === 0) {
    lines.push(`\n  ✅ No security issues detected.`);
  } else {
    // Group by severity
    for (const severity of ["critical", "warning", "info"] as const) {
      const group = report.findings.filter(f => f.severity === severity);
      if (group.length === 0) continue;

      lines.push(`\n  ${severityEmoji[severity]} ${severity.toUpperCase()} (${group.length})`);
      for (const f of group) {
        const location = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : "";
        lines.push(`    • [${f.category}] ${f.message}`);
        if (location) lines.push(`      at ${location}`);
        if (f.snippet) lines.push(`      > ${f.snippet}`);
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}
