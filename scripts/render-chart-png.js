import { chromium } from "playwright";
import { spawn } from "child_process";
import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PUBLIC_DIR = path.join(ROOT, "public");
const CHART_PNG = path.join(PUBLIC_DIR, "chart.png");

const PORTS = [3100, 3101, 3102];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function urlIsUp(url) {
  try {
    const r = await fetch(url, { method: "GET" });
    return r.ok;
  } catch {
    return false;
  }
}

async function startServer(port) {
  const child = spawn(process.execPath, ["scripts/serve.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });

  const healthUrl = `http://localhost:${port}/public/chart-image.html`;
  for (let i = 0; i < 50; i++) {
    if (await urlIsUp(healthUrl)) return { child, healthUrl };
    await sleep(200);
  }

  child.kill("SIGTERM");
  throw new Error(`Local server did not start on port ${port}`);
}

async function render() {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  let lastErr;
  for (const port of PORTS) {
    try {
      const { child, healthUrl } = await startServer(port);

      const cacheBase = path.join(os.homedir(), ".cache", "ms-playwright");
      const chromiumDirs = fs
        .readdirSync(cacheBase)
        .filter((n) => n.startsWith("chromium-"))
        .sort((a, b) => Number(a.replace("chromium-", "")) - Number(b.replace("chromium-", "")));

      if (chromiumDirs.length === 0) {
        throw new Error(`Could not find Playwright chromium cache dir under ${cacheBase}`);
      }

      const newest = chromiumDirs[chromiumDirs.length - 1];
      const chromePath = path.join(
        cacheBase,
        newest,
        "chrome-linux64",
        "chrome",
      );

      if (!fs.existsSync(chromePath)) {
        throw new Error(`Could not find Chrome executable at ${chromePath}`);
      }

      const browser = await chromium.launch({
        executablePath: chromePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage({
        viewport: { width: 1200, height: 900 },
      });

      await page.goto(healthUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("#timeseriesChart", { timeout: 15000 });
      await sleep(1500);

      await page.screenshot({ path: CHART_PNG });
      await browser.close();
      child.kill("SIGTERM");
      console.log(`Wrote ${CHART_PNG}`);
      return;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("Failed to render chart.png");
}

render().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

