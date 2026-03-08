# Analysis — JSON Schema Ecosystem Metrics

## What do these metrics tell us?

Three signals are collected:

1. **npm weekly downloads for `ajv`** — The dominant JSON Schema validator in the JavaScript ecosystem. The number is driven largely by transitive use (e.g. via ESLint, build tools). It reflects how deeply JSON Schema is embedded in shared infrastructure, not how many developers consciously choose it.

2. **npm weekly downloads for `jsonschema`** — The main npm package for the Python `jsonschema` library’s usage from Node. It gives a signal for cross-ecosystem (Python-style) adoption on npm.

3. **GitHub repository count for topic `json-schema`** — Repos that explicitly tag themselves with the topic. This approximates intentional engagement: validators, schema libraries, tooling, and docs. It undercounts projects that use JSON Schema but do not add the topic.

Together, the two npm metrics indicate infrastructure reach; the GitHub count indicates visible community size. The gap between reach and visible community is the useful contrast: the standard is widely depended on but only a fraction of those users show up in topic counts or spec participation.

## How would you automate this to run weekly?

Use the GitHub Actions workflow in this repo: `.github/workflows/weekly.yml`. It runs on a schedule (e.g. every Monday) and on `workflow_dispatch`. The job checks out the repo, installs dependencies, runs `npm start`, then commits and pushes `output/metrics.json` and `output/history.jsonl`. Git history becomes the time series. The workflow uses `secrets.GITHUB_TOKEN` for the GitHub API call and for pushing the commit.

## One challenge and solution

**Challenge:** The values differ by orders of magnitude (e.g. hundreds of millions for ajv vs. thousands for GitHub repos). A single linear bar chart makes the smaller series invisible.

**Solution:** The visualization separates summary from comparison. Stat cards at the top show each metric in human-readable form (e.g. 243.8M, 5.3M, 2,377) so readers see the real scale. The bar chart is kept for relative comparison and uses a linear axis with formatted tick labels (M/K). Tooltips show the exact values. An optional line chart over the last 8 history entries shows trend for ajv and jsonschema on a separate canvas, so time series is readable without mixing scales with the snapshot bars.
