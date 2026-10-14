# Awesome Store activity simulator

The simulator runs on GitHub's hosted runners hourly at minute 17. Your computer
does not need to stay on. It defaults to dry runs: these read the public product
feed but send no Clerk requests. Enable live mode only for the demo store.

## Behaviour

- Default target: a randomly selected 50–100 orders daily, configurable from 1 to 100.
- Deterministic daily plans, weighted towards Copenhagen daytime and evening.
- Approximate purchase mix: 45% organic, 35% mixed, 20% entirely Clerk-assisted.
- Four additional browsing sessions per planned order; these never buy.
- Category recommendations and product search return real results in live mode.
  Only returned products are logged as Clerk clicks, with their original position,
  source endpoint and matching placement label. All calls in a journey share a visitor.
- Shopper profiles choose sensible categories and baskets within a budget.
- Some shoppers reuse visitor/customer identities on later days. Organic shoppers
  use a separate visitor pool so assisted clicks do not leak into organic journeys.
- Synthetic emails use `example.com`. Order IDs use `demo-YYYY-MM-DD-NNNN`.
- Unit prices and quantities are sent with sales. Profit is omitted from sale lines
  so Clerk can use the product-feed `profit` fallback.
- A stable purchasing cohort includes approximately 70% of product IDs. Adding
  products never rewrites existing plans, orders or the original 10,000-order archive.

## Run locally

Python 3.12 is used by the workflow; there are no third-party Python dependencies.

```bash
python scripts/simulate_activity.py --catalog dist/feeds/products.json
```

To preview an entire day without contacting Clerk:

```bash
python scripts/simulate_activity.py \
  --catalog dist/feeds/products.json \
  --now 2026-10-14T23:59:59+02:00 \
  --state-dir /tmp/awesome-store-preview \
  --max-sessions 1000
```

Rerunning with the same state directory skips already processed sessions.
Dry-run results are mock catalogue matches, not predictions of Clerk's ranking.

## Enable on GitHub

1. Push the script, tests and `simulate-activity.yml` workflow to the default branch.
2. Open **Actions → Simulate Awesome Store activity → Run workflow**. Keep
   **dry_run** checked; check **preview_full_day** for a complete preview.
3. Review the job summary and downloadable JSON artifact.
4. Under **Settings → Secrets and variables → Actions**, add a repository secret
   named `CLERK_API_KEY`, containing the public API key for the Awesome Store demo.
5. Confirm the demo store has imported the current product feed, including profit.
6. Add a repository variable `SIMULATION_ENABLED` with value `true`.
   Optionally set `MIN_DAILY_ORDERS` (default `50`) and `MAX_DAILY_ORDERS` (default `100`).
7. Run the workflow with **dry_run** unchecked for a live batch, or wait for its
   next scheduled run. The summary explicitly says `live` or `dry-run`.

To pause live activity, set `SIMULATION_ENABLED` to `false`. To stop all runs,
disable the workflow in GitHub Actions. The default `GITHUB_TOKEN` requires
permission to write repository contents; branch rules must allow writes to
`simulator-state`. A secret is never written into the JSON activity records.

## State and failure handling

The workflow maintains a dedicated `simulator-state` branch, containing daily
files under `dry-run/` and `live/`. It does not commit generated state to `main`
or rebuild Pages. Each day is planned once; changing volume affects the next day.
Planned times determine eligibility; actual tracking timestamps are when calls
are sent. Journeys run sequentially within each hourly batch, without artificial
minutes-long waits or historical timestamp spoofing.
Plans place due events before minute 17 so the last normal hourly run can finish
the day's target without leaving late-evening orders for tomorrow.

Before any live calls, the complete batch is marked `in_progress` and pushed to
the state branch. When finished, outcomes are pushed. Failed or interrupted
sessions remain `needs_review` or `in_progress` and are never automatically
   replayed. This favours avoiding duplicate sales over guaranteeing the target number of successful
orders after a failure. HTTP errors, timeouts and API errors fail the run; inspect
Clerk's received orders before manually deciding to retry a session.

Successful reruns do not repeat events. This is not an exactly-once guarantee:
a service crash can leave a request outcome unknown. State-push failure prevents
a new batch from sending requests. Concurrency prevents simultaneous workflow
runs. Use separate local dry-run directories rather than sharing live state.

Only the current Copenhagen date is processed. Delayed runs catch up today's due
sessions (up to 100 per run); missed previous days are not backfilled. Unavailable
or unsuitable results can leave the daily order total below target.

GitHub schedules can be delayed or dropped. Scheduled workflows in public repos
are disabled after 60 days without repository activity. This is an approximate
daily demo service, not an uptime-guaranteed traffic generator.

These are synthetic events, which also affect Clerk's learning. The mix describes
the simulated journeys, not a promise of exact attribution percentages in Clerk.
The live test should confirm attribution and profit before leaving it enabled.
The recorded new orders are not automatically added to the storefront parcel feed.

References: [Clerk visitor tracking](https://docs.clerk.io/docs/visitor-tracking),
[GitHub schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
