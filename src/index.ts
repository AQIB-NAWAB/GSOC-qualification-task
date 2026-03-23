import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchNpmWeeklyDownloads } from "./npm.js";
import { fetchGitHubTopicCount } from "./github.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../output");
const METRICS_FILE = path.join(OUTPUT_DIR, "metrics.json");
const HISTORY_FILE = path.join(OUTPUT_DIR, "history.jsonl");
const PUBLIC_DIR = path.resolve(__dirname, "../public");
const PUBLIC_METRICS_FILE = path.join(PUBLIC_DIR, "metrics.json");
const PUBLIC_HISTORY_FILE = path.join(PUBLIC_DIR, "history.jsonl");
const CONFIG_FILE = path.resolve(__dirname, "../ecosystem.config.json");

interface Metric {
  name: string;
  value: number;
  source: string;
  description: string;
}

interface Snapshot {
  timestamp: string;
  metrics: Metric[];
}

interface EcosystemConfig {
  npmWeeklyDownloads: Array<{
    packageName: string;
    metricName: string;
    source: string;
    description: string;
  }>;
  githubTopicCount: {
    topic: string;
    metricName: string;
    source: string;
    description: string;
  };
  history: {
    maxLines: number;
  };
}

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function ensurePublicDir(): void {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
}

function loadConfig(): EcosystemConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error(`Missing config file: ${CONFIG_FILE}`);
  }

  const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  const cfg = parsed as EcosystemConfig;

  if (!Array.isArray(cfg.npmWeeklyDownloads) || cfg.npmWeeklyDownloads.length === 0) {
    throw new Error("Invalid config: npmWeeklyDownloads must be a non-empty array");
  }
  if (!cfg.githubTopicCount || typeof cfg.githubTopicCount.topic !== "string") {
    throw new Error("Invalid config: githubTopicCount.topic must be a string");
  }
  if (!cfg.history || typeof cfg.history.maxLines !== "number") {
    throw new Error("Invalid config: history.maxLines must be a number");
  }

  return cfg;
}

function appendHistory(snapshot: Snapshot, historyMaxLines: number): void {
  try {
    ensureOutputDir();
    const line = JSON.stringify(snapshot) + "\n";
    fs.appendFileSync(HISTORY_FILE, line, "utf-8");
    const content = fs.readFileSync(HISTORY_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    if (lines.length > historyMaxLines) {
      const kept = lines.slice(-historyMaxLines);
      fs.writeFileSync(HISTORY_FILE, kept.join("\n") + "\n", "utf-8");
    }
  } catch (err) {
    console.error("Failed to append history:", err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  const config = loadConfig();

  const npmConfigs = config.npmWeeklyDownloads;
  const npmDownloads = await Promise.all(npmConfigs.map((m) => fetchNpmWeeklyDownloads(m.packageName)));
  const githubCount = await fetchGitHubTopicCount(config.githubTopicCount.topic);

  const snapshot: Snapshot = {
    timestamp: new Date().toISOString(),
    metrics: [
      ...npmConfigs.map((cfg, idx) => ({
        name: cfg.metricName,
        value: npmDownloads[idx] as number,
        source: cfg.source,
        description: cfg.description,
      })),
      {
        name: config.githubTopicCount.metricName,
        value: githubCount,
        source: config.githubTopicCount.source,
        description: config.githubTopicCount.description,
      },
    ],
  };

  ensureOutputDir();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
  appendHistory(snapshot, config.history.maxLines);

  // Make the latest data easily consumable by external users and dashboards.
  // The HTML frontend loads from `public/` (not `output/`).
  try {
    ensurePublicDir();
    fs.copyFileSync(METRICS_FILE, PUBLIC_METRICS_FILE);
    fs.copyFileSync(HISTORY_FILE, PUBLIC_HISTORY_FILE);
  } catch (err) {
    console.error(
      "Failed to publish metrics to public/:",
      err instanceof Error ? err.message : String(err),
    );
  }
  console.log("Metrics written to", METRICS_FILE);
}

main().catch((err: unknown) => {
  console.error("Error collecting metrics:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
