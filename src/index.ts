import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchNpmWeeklyDownloads } from "./npm.js";
import { fetchGitHubTopicCount } from "./github.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../output");
const METRICS_FILE = path.join(OUTPUT_DIR, "metrics.json");
const HISTORY_FILE = path.join(OUTPUT_DIR, "history.jsonl");
const HISTORY_MAX_LINES = 52;

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

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function appendHistory(snapshot: Snapshot): void {
  try {
    ensureOutputDir();
    const line = JSON.stringify(snapshot) + "\n";
    fs.appendFileSync(HISTORY_FILE, line, "utf-8");
    const content = fs.readFileSync(HISTORY_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    if (lines.length > HISTORY_MAX_LINES) {
      const kept = lines.slice(-HISTORY_MAX_LINES);
      fs.writeFileSync(HISTORY_FILE, kept.join("\n") + "\n", "utf-8");
    }
  } catch (err) {
    console.error("Failed to append history:", err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  const [ajvDownloads, jsonschemaDownloads, githubCount] = await Promise.all([
    fetchNpmWeeklyDownloads("ajv"),
    fetchNpmWeeklyDownloads("jsonschema"),
    fetchGitHubTopicCount("json-schema"),
  ]);

  const snapshot: Snapshot = {
    timestamp: new Date().toISOString(),
    metrics: [
      {
        name: "ajv_weekly_downloads",
        value: ajvDownloads,
        source: "npm",
        description: "Weekly download count for the ajv JSON Schema validator",
      },
      {
        name: "jsonschema_weekly_downloads",
        value: jsonschemaDownloads,
        source: "npm",
        description: "Weekly download count for the jsonschema package",
      },
      {
        name: "github_json_schema_topic_repos",
        value: githubCount,
        source: "github",
        description: "Number of public GitHub repositories tagged with the json-schema topic",
      },
    ],
  };

  ensureOutputDir();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
  appendHistory(snapshot);
  console.log("Metrics written to", METRICS_FILE);
}

main().catch((err: unknown) => {
  console.error("Error collecting metrics:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
