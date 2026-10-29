// Builds docs/backlog/backlog.md and backlog.csv from docs/backlog/backlog.json.
// Run: node scripts/build-backlog.mjs
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../docs/backlog/", import.meta.url);
const data = JSON.parse(readFileSync(new URL("backlog.json", dir), "utf8"));

const NFR = [
  ["NFR-PERF-001", "Set search/listing performance targets and validate at pilot load", "Load test report against docs/data/pilot-sizing.md"],
  ["NFR-PERF-002", "Monitor AI latency, first token and fallback separately", "Dashboard panel per AI route"],
  ["NFR-AVL-001", "Define availability, maintenance windows and service targets", "Signed-off SLO doc + alerts"],
  ["NFR-SCL-001", "Document pilot sizing assumptions", "docs/data/pilot-sizing.md (done, draft)"],
  ["NFR-SEO-001", "SSR, canonical URLs, metadata, structured data, sitemaps, robots", "Lighthouse SEO + sitemap check in CI"],
  ["NFR-SEC-001", "Encrypt traffic and sensitive data at rest", "TLS config + KMS evidence"],
  ["NFR-SEC-002", "Secrets only in approved secrets manager", "Secret scanning in CI, no findings"],
  ["NFR-SEC-003", "Strong auth and least privilege for admin", "MFA enforced; IAM review"],
  ["NFR-SEC-004", "Dependency/vulnerability scanning with thresholds", "pnpm audit in CI (high = fail)"],
  ["NFR-RES-001", "Backup, restore and recovery tested before pilot", "Restore drill record"],
  ["NFR-OBS-001", "Logs, metrics, traces for user, feed, rules, AI, integrations", "Runbook links per alert"],
  ["NFR-BRW-001", "Supported browser/device matrix tested", "Playwright matrix run"],
];

const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
const stories = data.epics.flatMap((e) => e.stories.map((s) => ({ ...s, epic: e })));
const count = (p) => stories.filter((s) => s.priority === p).length;

let md = `# Landora MVP backlog\n\nVersion ${data.version} (${data.status}), as of ${data.asOf}. Source: ${data.source}.\n\n`;
md += `Generated from [backlog.json](backlog.json) by \`node scripts/build-backlog.mjs\`. Edit the JSON, not this file. [backlog.csv](backlog.csv) imports into Jira, Linear or GitHub Projects.\n\n`;
md += `**${stories.length} stories** covering every V11 §12.3 requirement: ${count("P0")} P0, ${count("P1")} P1, ${count("P2")} P2. Each meets the §12.11 Definition of Done before acceptance.\n\n`;
md += `**Conflict to confirm with the PO:** V11 §12.3 marks FR-AI-001/002/003 as P0, but §12.13 places the AI concierge in MVP-1. This backlog keeps them P0 (the guardrails must hold wherever AI is used, including AI search in MVP-0) and schedules the concierge itself in MVP-1.\n\n`;
md += `| Epic | Release | Workstream | Stories |\n| --- | --- | --- | --- |\n`;
for (const e of data.epics) md += `| ${e.id} ${e.title} | ${e.release} | ${e.workstream} | ${e.stories.map((s) => `${s.id} (${s.priority})`).join(", ")} |\n`;
for (const e of data.epics) {
  md += `\n## ${e.id} ${e.title}\n\n${e.release} · ${e.workstream}\n`;
  for (const s of e.stories) {
    md += `\n### ${s.id} · ${s.priority}\n\n${s.story}\n\nAcceptance criteria:\n\n${s.ac.map((a) => `- [ ] ${a}`).join("\n")}\n\nDesign-semester status: ${s.done}\n`;
  }
}
md += `\n## Non-functional enablers (V11 §12.4)\n\nThese gate release rather than ship as features. Each needs the evidence listed before the launch gate in [launch-gate checklist](../launch/launch-gate-checklist.md).\n\n| ID | Requirement | Evidence |\n| --- | --- | --- |\n`;
for (const [id, r, ev] of NFR) md += `| ${id} | ${r} | ${ev} |\n`;
writeFileSync(new URL("backlog.md", dir), md);

let csv = "Issue ID,Summary,Epic,Release,Priority,Workstream,Acceptance Criteria,Status\n";
for (const s of stories) csv += [s.id, s.story, `${s.epic.id} ${s.epic.title}`, s.epic.release, s.priority, s.epic.workstream, s.ac.map((a) => `- ${a}`).join("\n"), s.done].map(esc).join(",") + "\n";
for (const [id, r, ev] of NFR) csv += [id, r, "NFR enablers", "MVP-0", "P0", "WS12 DevOps & Cloud", `- Evidence: ${ev}`, ""].map(esc).join(",") + "\n";
writeFileSync(new URL("backlog.csv", dir), csv);
console.log(`Wrote ${stories.length} stories and ${NFR.length} NFR enablers`);
