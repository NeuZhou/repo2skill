# 🛡️ ClawGuard

**AI Agent Security & Observability Platform**

[![npm version](https://img.shields.io/npm/v/@neuzhou/clawguard)](https://www.npmjs.com/package/@neuzhou/clawguard)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)]()
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-green)]()
[![Tests](https://img.shields.io/badge/tests-205%20passed-brightgreen)]()

> **285+ security patterns** across 9 rule categories. Risk Score Engine with attack chain detection. Insider Threat Detection. Policy Engine for tool call governance. Zero native dependencies. SARIF output. Built for OpenClaw, works with any AI agent framework.

---

## 🔥 Why This Exists

AI agents have access to your files, tools, shell, and secrets. A single prompt injection can:

- **Exfiltrate API keys** via tool calls
- **Hijack the agent's identity** by overwriting personality files
- **Register shadow MCP servers** to intercept tool calls
- **Install backdoored skills** with obfuscated reverse shells
- **The agent itself can become the threat** — self-preservation, deception, goal misalignment

**ClawGuard catches these attacks before they execute.**

---

## 🚀 Installation

### As OpenClaw Skill (static scanning)
```bash
clawhub install clawguard
```
Then ask your agent: *"scan my skills for security threats"*

### As OpenClaw Hook Pack (real-time protection)
```bash
openclaw hooks install clawguard
openclaw hooks enable clawguard-guard
openclaw hooks enable clawguard-policy
```
Every message is now automatically scanned. Critical threats trigger alerts.

### As CLI Tool
```bash
npx @neuzhou/clawguard scan ./path/to/scan
```

### As npm Library
```bash
npm install @neuzhou/clawguard
```
```typescript
import { runSecurityScan, calculateRisk, evaluateToolCall } from '@neuzhou/clawguard';
```

---

## ⚡ Quick Start

```bash
# Scan a skill directory for threats
npx @neuzhou/clawguard scan ./skills/

# Scan with strict mode (exit code 1 on high/critical findings)
npx @neuzhou/clawguard scan ./skills/ --strict

# Output SARIF for GitHub Code Scanning
npx @neuzhou/clawguard scan . --format sarif > results.sarif

# Generate default config
npx @neuzhou/clawguard init
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                   ClawGuard                      │
├──────────┬──────────┬──────────┬─────────────────────┤
│  CLI     │  Hooks   │ Scanner  │   Dashboard :19790  │
├──────────┴──────────┴──────────┴─────────────────────┤
│  ┌──────────────┐ ┌─────────────┐ ┌────────────────┐ │
│  │ Risk Engine  │ │Policy Engine│ │Insider Threat  │ │
│  │ Score 0-100  │ │ allow/deny  │ │ AI Misalign.   │ │
│  │ Chain Detect │ │ exec/file/  │ │ 5 categories   │ │
│  │ Multipliers  │ │ browser/msg │ │ 39 patterns    │ │
│  └──────────────┘ └─────────────┘ └────────────────┘ │
├──────────────────────────────────────────────────────┤
│              Security Engine — 285+ Patterns          │
│  • Prompt Injection (93)   • Data Leakage (62)       │
│  • Insider Threat (39)     • Supply Chain (35)        │
│  • Identity Protection (19)• MCP Security (20)        │
│  • File Protection (16)    • Anomaly Detection        │
│  • Compliance                                         │
├──────────────────────────────────────────────────────┤
│  Exporters: JSONL · Syslog/CEF · Webhook · SARIF     │
└──────────────────────────────────────────────────────┘
```

---

## 🗂️ Rule Categories

### OWASP Agentic AI Top 10 Mapping

| Rule | OWASP Category | Patterns | Severity Range |
|---|---|---|---|
| `prompt-injection` | LLM01: Prompt Injection | 93 | warning → critical |
| `data-leakage` | LLM06: Sensitive Information Disclosure | 62 | info → critical |
| `insider-threat` | Agentic AI: Misalignment | 39 | warning → critical |
| `supply-chain` | Agentic AI: Supply Chain | 35 | warning → critical |
| `mcp-security` | Agentic AI: Tool Manipulation | 20 | warning → critical |
| `identity-protection` | Agentic AI: Identity Hijacking | 19 | warning → critical |
| `file-protection` | LLM07: Insecure Plugin Design | 16 | warning → critical |
| `anomaly-detection` | LLM04: Model Denial of Service | 6+ | warning → high |
| `compliance` | LLM09: Overreliance | 5+ | info → warning |

---

## 🎯 Key Features

### Risk Score Engine

Weighted scoring with attack chain detection and multiplier system:

```typescript
import { calculateRisk } from '@neuzhou/clawguard';

const result = calculateRisk(findings);
// → { score: 87, verdict: 'MALICIOUS', icon: '🔴',
//    attackChains: ['credential-exfiltration'],
//    enrichedFindings: [...] }
```

- **Severity weights**: critical=40, high=15, medium=5, low=2
- **Confidence scoring**: every finding carries a confidence (0-1)
- **Attack chain detection**: auto-correlates findings into combo attacks
  - credential + exfiltration → 2.2x multiplier
  - identity-hijack + persistence → score ≥ 90
  - prompt-injection + worm → 1.2x multiplier
- **Verdicts**: ✅ CLEAN / 🟡 LOW / 🟠 SUSPICIOUS / 🔴 MALICIOUS

### 🧠 Insider Threat Detection

Based on [Anthropic's research on agentic misalignment](https://www.anthropic.com/research), detects when AI agents themselves become threats:

- **Self-Preservation** (16 patterns): kill switch bypass, self-replication
- **Information Leverage**: reading secrets + composing threats
- **Goal Conflict Reasoning**: prioritizing own goals over user instructions
- **Deception**: impersonation, suppressing transparency
- **Unauthorized Data Sharing**: exfiltration planning, steganographic hiding

```typescript
import { detectInsiderThreats } from '@neuzhou/clawguard';
const threats = detectInsiderThreats(agentOutput);
```

### 🚦 Policy Engine

Evaluate tool call safety against configurable policies:

```typescript
import { evaluateToolCall } from '@neuzhou/clawguard';

const decision = evaluateToolCall('exec', { command: 'rm -rf /' });
// → { decision: 'deny', tool: 'exec', reason: 'Dangerous command', severity: 'critical' }
```

YAML policy configuration:

```yaml
policies:
  exec:
    dangerous_commands:
      - rm -rf
      - mkfs
      - curl|bash
  file:
    deny_read:
      - /etc/shadow
      - '*.pem'
    deny_write:
      - '*.env'
  browser:
    block_domains:
      - evil.com
```

### 🔍 Prompt Injection — 13 Sub-Categories

1. **Direct instruction override** — "ignore previous instructions"
2. **Role confusion / jailbreaks** — DAN, developer mode
3. **Delimiter attacks** — chat template delimiters
4. **Invisible Unicode** — zero-width chars, directional overrides
5. **Multi-language** — 12 languages (CN/JP/KR/AR/FR/DE/IT/RU...)
6. **Encoding evasion** — Base64, hex, URL-encoded
7. **Indirect / embedded** — HTML comments, tool output cascading
8. **Multi-turn manipulation** — false memories, fake agreements
9. **Payload cascading** — template injection, string interpolation
10. **Context window stuffing** — oversized messages
11. **Prompt worm** — self-replication, agent-to-agent propagation
12. **Trust exploitation** — authority claims, fake audits
13. **Safeguard bypass** — retry-on-block, rephrase-to-bypass

---

## 🔧 Programmatic Usage

```typescript
import {
  runSecurityScan,
  calculateRisk,
  evaluateToolCall,
  detectInsiderThreats,
} from '@neuzhou/clawguard';

// Scan content
const findings = runSecurityScan(message.content, 'inbound', context);

// Get risk score
const risk = calculateRisk(findings);
if (risk.verdict === 'MALICIOUS') { /* block */ }

// Check tool calls
const decision = evaluateToolCall('exec', { command }, policies);
if (decision.decision === 'deny') { /* reject */ }

// Check for insider threats
const threats = detectInsiderThreats(agentOutput);
```

---

## 📤 GitHub Actions / SARIF Integration

```yaml
- name: Security Scan
  run: npx @neuzhou/clawguard scan . --format sarif > results.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

---

## 🛡️ Real-Time Protection (OpenClaw Hooks)

Install as a hook pack for automatic protection on every message:

```bash
openclaw hooks install clawguard
openclaw hooks enable clawguard-guard    # Scans every message
openclaw hooks enable clawguard-policy   # Enforces tool call policies
```

**clawguard-guard** — Hooks into `message:received` and `message:sent`, runs all 285+ patterns, logs findings, and alerts on critical/high threats.

**clawguard-policy** — Evaluates outbound tool calls against security policies, blocks dangerous commands, and protects sensitive files.

---

## 📚 References

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OWASP Agentic AI Top 10 (2026)](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [Anthropic: Research on Agentic Misalignment](https://www.anthropic.com/research)
- [OWASP Guide for Secure MCP Server Development](https://genai.owasp.org/resource/a-practical-guide-for-secure-mcp-server-development/)

---

## 📜 License

**AGPL-3.0** © [NeuZhou](https://github.com/NeuZhou)

ClawGuard is dual-licensed:

- **Open Source**: [AGPL-3.0](LICENSE) — free for open-source use
- **Commercial**: [Commercial License](COMMERCIAL-LICENSE.md) — for proprietary/SaaS use

Contributors must agree to our [CLA](CLA.md) to enable dual licensing.

For commercial inquiries: neuzhou@users.noreply.github.com

---

## 👀 See Also

- [repo2skill](https://github.com/NeuZhou/repo2skill) — Convert GitHub repos into OpenClaw skills
- [FinClaw](https://github.com/NeuZhou/finclaw) — AI Financial Intelligence Engine
- [awesome-llm-security](https://github.com/NeuZhou/awesome-llm-security) — Curated LLM security resources

---

<p align="center">
  <b>ClawGuard</b> — Because agents with shell access need a security guard. 🛡️
</p>


