const GITHUB_SEARCH = "https://api.github.com/search/repositories";
const TIMEOUT_MS = 10_000;

interface GitHubSearchResponse {
  total_count: number;
}

export async function fetchGitHubTopicCount(topic: string): Promise<number> {
  const url = `${GITHUB_SEARCH}?q=topic:${encodeURIComponent(topic)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status === 403 || res.status === 422)
        throw new Error(`GitHub API error: ${res.status}. Set GITHUB_TOKEN for higher rate limits.`);
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as GitHubSearchResponse;
    if (typeof data.total_count !== "number") {
      throw new Error("Unexpected response shape from GitHub search API");
    }
    return data.total_count;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error) throw err;
    throw new Error("GitHub API request failed");
  }
}
