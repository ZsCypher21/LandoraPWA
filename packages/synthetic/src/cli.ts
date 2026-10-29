// Writes the synthetic dataset to data/synthetic/. Usage: pnpm --filter @landora/synthetic generate
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./generate";
import { toReaxml } from "./reaxml";

const outDir = fileURLToPath(new URL("../../../data/synthetic", import.meta.url));

try {
  const dataset = generate();
  mkdirSync(join(outDir, "reaxml"), { recursive: true });
  writeFileSync(join(outDir, "dataset.json"), `${JSON.stringify(dataset, null, 2)}\n`);
  for (const agency of dataset.agencies) {
    writeFileSync(join(outDir, "reaxml", `${agency.externalAgentId}.xml`), toReaxml(dataset, agency));
  }
  console.log(`Wrote ${JSON.stringify(dataset.meta.counts)} to ${outDir}`);
} catch (error) {
  console.error(`Synthetic data generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
