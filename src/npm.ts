const NPM_BASE = "https://api.npmjs.org/downloads/point/last-week";
const TIMEOUT_MS = 10_000;

interface NpmResponse {
  downloads: number;
  package?: string;
}

export async function fetchNpmWeeklyDownloads(packageName: string): Promise<number> {
  const url = `${NPM_BASE}/${encodeURIComponent(packageName)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Package not found: ${packageName}`);
      throw new Error(`npm API error for ${packageName}: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as NpmResponse;
    if (typeof data.downloads !== "number") {
      throw new Error(`Unexpected response shape from npm API for ${packageName}`);
    }
    return data.downloads;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error) throw err;
    throw new Error(`npm API request failed for ${packageName}`);
  }
}
