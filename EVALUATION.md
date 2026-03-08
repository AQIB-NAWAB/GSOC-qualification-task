# Evaluation — json-schema-org/ecosystem projects/initial-data

Review of the proof-of-concept in [projects/initial-data](https://github.com/json-schema-org/ecosystem/tree/main/projects/initial-data).

## What it does

The project uses Node.js (ESM) with Octokit to paginate GitHub’s search API for repositories with the `json-schema` topic. For each repository it fetches creation date, first release date, first commit date, and topics, then appends a row to a CSV file. The README describes using the Internet Archive API to check when the topic was first applied; the main script focuses on GitHub and repo metadata. Output is a timestamped CSV (e.g. `initialTopicRepoData-<ts>.csv`) with columns for repo, topics, first commit, creation, and first release. Post-processing (sort, reformat, gnuplot) is documented as separate manual steps.

## What it does well

- **Rate-limit awareness** — The design is built for long-running runs and documents pacing to avoid hitting GitHub limits.
- **Progressive CSV writing** — DataRecorder appends each row as it’s processed, so a crash partway through still leaves partial results.
- **Clear DataRecorder responsibility** — A small class handles only file creation and appending CSV rows, which is easy to reason about and test.
- **Flexible configuration** — setup.js reads from environment and CLI (e.g. `GITHUB_TOKEN`, `TOPIC`, `NUM_REPOS`), so the same code can run locally and in CI.

## Limitations

- **No type safety** — The codebase is JavaScript. CSV row shape is implicit (column order must match a separate column list); refactors can silently break the format.
- **Internet Archive dependency** — The README mentions the Wayback API with a 500 requests/hour limit and no documented way to raise it. There is no retry or backoff, so a rate limit can stop the run.
- **Mixed toolchain** — Full pipeline uses Node, csvkit (Python), and gnuplot. That increases setup and makes “run once and get a graph” harder for contributors who only have Node.
- **Tests require a live token** — processRepository tests call getInput() and hit the real GitHub API (or fail without GITHUB_TOKEN), so the suite is integration-style and environment-dependent.
- **CSV as the only output** — CSV is fine for inspection but harder to consume from other tools or to diff meaningfully in version control; JSON or JSONL would suit automation and history better.

## Run experience

With a valid `GITHUB_TOKEN` and `NUM_REPOS=10`, running the script paginates the topic search and, for each of the first 10 repos, requests repo details, releases, commits, and topics. Each row is appended to the CSV and progress is logged. A full run with `NUM_REPOS=-1` would process all matching repos and, if the Internet Archive step were enabled, would be constrained by the 500 req/hr cap. There is no resume or checkpoint; an interrupted run must be restarted from the beginning.

## Recommendation

**Build on it.** The idea of tracking when repos joined the ecosystem (and the optional Internet Archive angle) is specific and not duplicated by generic tooling. The existing structure—config, pagination, incremental file writing—is a solid base. The main gaps (types, retry, output format, post-processing automation) are addressable without a full rewrite.

## If building on it: what to change first

1. **Add types to the data layer** — Introduce TypeScript or JSDoc so the repository record and CSV row shapes are explicit. That prevents column-order drift and makes refactors safer.
2. **Wrap Internet Archive calls in retry/backoff** — On 429, back off and retry a few times; after repeated failure, skip and log so the run can continue.
3. **Script the post-processing** — Replace the manual csvsort/csvcut/gnuplot sequence with a single script (e.g. `npm run process`) that reads the latest CSV and produces the graph, so the pipeline is one command end-to-end.

## If starting fresh: what to keep

- **Progressive / append-only writing** — Writing each row (or each snapshot) as it’s ready avoids losing everything on a crash and scales to long runs.
- **Config from environment and CLI** — Supporting both makes local runs and CI (e.g. GitHub Actions) straightforward without code changes.
- **The Internet Archive heuristic** — Using the Wayback Machine to approximate when a repo first had the topic is a distinctive idea worth carrying over if the dependency and rate limits can be managed.
