# Awesome Store activity simulator

The simulator runs on GitHub's hosted runners hourly at minute 17. Your computer
does not need to stay on. It defaults to dry runs: these read the public product
feed but send no Clerk requests. Enable live mode only for the demo store.

## Behaviour

- Default target: a randomly selected 50–100 orders daily, configurable from 1 to 100.
- Deterministic daily plans, weighted towards Copenhagen daytime and evening.
- Approximate purchase mix: 45% organic, 35% mixed, 20% entirely Clerk-assisted.
- Assisted purchases in new daily plans are selected randomly with target weights
  of **30% Search, 30% Recommendations, 25% Email, 15% Chat**. These percentages
  apply only to assisted order counts; organic purchases are outside this split.
  Counts fluctuate each day and approach the target over time, rather than using
  fixed daily quotas. When only some channels are enabled, their weights are
  normalized (Search/Recommendations alone become 50/50).
  Browsing journeys retain their separate mix, and summaries show orders by channel.
- Four additional browsing sessions per planned order; these never buy.
- A separate **minimum of 100 accepted Search requests daily** is planned, with
  a varying target of 100–150. Existing Search requests and pending search-only
  browsers count towards this target. Extra non-buying Search journeys are
  appended when needed, without changing existing orders or their channel mix.
  Searches include refinements and some visitors leave without clicking.
  Successful request counts and the daily target appear in each run summary.
  Delivery still depends on runner/API availability; errors are reported, not
  fabricated as successes. Replacement search visitors are bounded to avoid
  unlimited traffic during an outage.
- Every journey logs page views and identifies its dummy email. Buyers track
  cart additions, the cart page, a sale, the cleared cart, and checkout success.
  Some non-buyers leave a tracked abandoned cart. No dummy address is subscribed.
- Search shoppers use natural type/color/brand queries, sometimes refine their
  search, and occasionally explore a plausible catalogue gap. Real responses
  determine no-result searches; the simulator never fabricates result counts.
  Search uses v3 `search/omni` with the store's existing `omni-search` Content
  and its exact `Omni-search` tracking label. It searches products, categories
  and blog pages, with brand/color product facets;
  page views use v3 `log/pageview`. Other tracking APIs remain v2.
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
6. For recurring live activity, add a repository variable `SIMULATION_ENABLED` with value `true`.
   Optionally set `MIN_DAILY_ORDERS` (default `50`) and `MAX_DAILY_ORDERS` (default `100`).
7. Run the workflow with **dry_run** unchecked for a live batch. This explicit
   manual choice works even while recurring live activity is paused. Set
   **max_sessions** to a small number, such as `12`, for a bounded first test.
   To verify a Search sale, choose **channel: search**, **purchase_only: true**,
   and **max_sessions: 1**. This processes an existing due purchase; it does not
   add orders beyond the daily plan or replay completed journeys.
   Scheduled runs use the repository variable. The summary says `live` or `dry-run`.

To pause live activity, set `SIMULATION_ENABLED` to `false`. To stop all runs,
disable the workflow in GitHub Actions. The default `GITHUB_TOKEN` requires
permission to write repository contents; branch rules must allow writes to
`simulator-state`. A secret is never written into the JSON activity records.

### Search-only daily activity

`MIN_DAILY_SEARCHES` controls the daily search floor (default `100`). Set
`SIMULATION_SEARCH_ENABLED=true` to enable scheduled **search-only** live traffic
while orders remain paused. Hourly runs then use `--live --browse-only --channel
search`, so they cannot send sales, Email clicks or Chat conversations.
`SIMULATION_ENABLED=true` enables the full shopping simulator instead, including
the same Search floor. Set both enable variables to `false` to pause all live calls.
Explicit manual dry runs remain dry even when scheduled Search activity is enabled.

For a manual live Search-only batch, uncheck `dry_run`, set `channel: search`,
check `browse_only`, leave `purchase_only` unchecked and choose `max_sessions`.
Search targets can be added to today's saved plan; only additional non-buyers and
the target metadata are added. Existing orders and completed journeys stay intact.

## Email and Chat

Manual tests can select `email` or `chat` with `max_sessions: 1` and
`purchase_only: true`. If today's saved plan has no pending journey in that
channel, one **unprocessed** assisted journey is assigned to it before claiming.
Completed orders are never changed. For future daily plans, set repository
variable `SIMULATION_CHANNELS` to `search,recommendations,email,chat` to spread
assisted journeys across all four using the 30/30/25/15 target probabilities.
This repository variable is already configured for the demo; the standalone
script default remains Search/Recommendations.

Email uses the real configured `automated-popular` embed (override with repository
variable `SIMULATION_EMAIL_EMBED`). It requests `campaigns/click`, checks the
redirect without following it, and logs the returned product, original source,
position and labels with `external: true` (the JSON API requires a boolean,
even though the landing URL uses `clerk_external=1`). A dynamic product filter keeps the
selection in the profile/budget/purchasing cohort. This tests **embedded Email
attribution**, not newsletter delivery or flow-open statistics. It does not send
emails, create subscribers, or pretend that a newsletter/flow was delivered.

Chat opens a genuine conversation and asks the store assistant for suitable
products. Only products in the assistant's response can be clicked/bought, using
the same `assistant/search/products` source as Chat.js. No extra LLM provider,
agent subscription or continuously running computer is needed. This isolated
adapter mirrors the current public Chat.js transport (`chat/data` and `chat`),
which is **not a versioned public API**; contract changes fail closed. Returned
client-tool hooks are not executed: they stop the journey for manual review.
This does not yet simulate the Chat add-to-cart tool itself.

### Demo account setup (14 October 2026)

- Shared MJML design: **Awesome Store — Everyday picks**, ID `327953`.
- Newsletter drafts: **Newsletter — Weekend essentials** (Visitor Recommendations)
  and **Newsletter — Fresh everyday finds** (Newest Products).
- Disabled flow: **Cart — Helpful reminder**, Abandoned Cart, four-hour delay,
  Products In Cart.
- Disabled flow: **After purchase — Complementary picks**, Made an Order,
  seven-day delay, Recommendations Based On Orders.
- Existing **Automated / Popular** embed is used for simulated Email clicks.

Bounded live tests verified Search, Email and Chat orders in the Overview
dashboard. Search query-insights tables still showed no queries after refreshing,
despite successful v2/v3 Search responses and Search-attributed sales. Do not
describe those tables as validated or fabricate their contents; this needs a
separate tracking/aggregation investigation in Clerk.

Keep flows disabled while testing synthetic tracking. Actual newsletter/flow
delivery needs a verified sender domain and deliberately opted-in controlled
test inboxes; `example.com` addresses must never receive marketing emails.

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
The target split is not a guarantee of dashboard revenue shares: basket values,
mixed baskets, attribution rules and failed journeys affect the revenue mix.
Changing weights only affects newly generated daily plans, never saved orders
or existing daily plans. Today’s manual channel tests are not a representative
sample of the scheduled distribution.
The recorded new orders are not automatically added to the storefront parcel feed.

References: [Clerk visitor tracking](https://docs.clerk.io/docs/visitor-tracking),
[GitHub schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
