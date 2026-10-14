#!/usr/bin/env python3
"""Scheduled synthetic shopping journeys. Standard library only; dry-run by default."""

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import random
import subprocess
import sys
from datetime import datetime, time, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

FEED_URL = "https://olzen90.github.io/awesomestoredemo/feeds/products.json"
API_URL = "https://api.clerk.io/v2/"
PROFILES = [
    ("commuter", [201, 301], 250),
    ("weekend-traveller", [301, 302, 701], 250),
    ("wardrobe-refresh", [101, 102, 103], 220),
    ("home-host", [401, 402, 403], 200),
    ("focused-workday", [501, 502], 220),
    ("slow-morning", [601, 602], 180),
    ("thoughtful-gift", [801, 802, 401], 150),
]
CHARACTERS = ["luke.skywalker", "neo", "ellen.ripley", "hermione.granger",
              "frodo.baggins", "tony.stark", "leia.organa", "jeanluc.picard"]
# Copenhagen shopping hours; fewer journeys overnight, peaks during the evening.
HOUR_WEIGHTS = [1, 1, 1, 1, 1, 2, 3, 5, 6, 7, 8, 8, 9, 8, 8, 9, 10, 12, 15, 17, 16, 12, 7, 3]


def seed(value):
    return int(hashlib.sha256(str(value).encode()).hexdigest()[:16], 16)


def money(value):
    return round(value + 1e-9, 2)


def eligible(product):
    # Stable ~70% purchasing cohort; new products don't force historical changes.
    return seed(f"purchase-cohort:{product['id']}") % 100 < 70


def load_catalog(source):
    if source.startswith("https://"):
        with urlopen(Request(source, headers={"User-Agent": "AwesomeStoreSimulator/1.0"}), timeout=30) as response:
            data = json.load(response)
    else:
        data = json.loads(Path(source).read_text())
    if not isinstance(data, list) or not data:
        raise ValueError("Product feed must be a non-empty array")
    catalog = {}
    for product in data:
        product_id = product.get("id")
        if type(product_id) is not int or product_id <= 0 or product_id in catalog:
            raise ValueError("Product IDs must be unique positive integers")
        price = product.get("price")
        if type(price) not in (int, float) or not math.isfinite(price) or price <= 0:
            raise ValueError(f"Invalid price for product {product_id}")
        if not product.get("categories"):
            raise ValueError(f"Missing categories for product {product_id}")
        if product.get("inventory", 1) > 0 and product.get("stock_status") != "out_of_stock":
            catalog[product_id] = product
    if not catalog:
        raise ValueError("No available products in feed")
    return catalog


def create_plan(day, tz, minimum, maximum, browsers_per_order):
    rng = random.Random(seed(f"awesome-store:{day}:v1"))
    target = rng.randint(minimum, maximum)
    modes = rng.choices(["organic", "mixed", "clerk"], weights=[45, 35, 20], k=target)
    modes += ["browse"] * (target * browsers_per_order)
    rng.shuffle(modes)
    sessions = []
    for index, mode in enumerate(modes):
        hour = rng.choices(range(24), weights=HOUR_WEIGHTS)[0]
        scheduled = datetime.combine(datetime.fromisoformat(day).date(),
                                     time(hour, rng.randrange(17), rng.randrange(60)), tz)
        # A reusable pool makes roughly 30% of shoppers returning customers.
        customer = rng.randrange(120) if rng.random() < 0.3 else f"{day}-{index}"
        identity = f"{'organic' if mode == 'organic' else 'assisted'}-{customer}"
        sessions.append({
            "id": f"demo-{day}-{index:04d}",
            "visitor": hashlib.sha256(identity.encode()).hexdigest()[:12],
            "customer": f"demo-{identity}",
            "email": f"{rng.choice(CHARACTERS)}.{identity}@example.com",
            "profile": rng.randrange(len(PROFILES)),
            "mode": mode,
            "scheduled_at": scheduled.isoformat(),
            "status": "pending",
        })
    return {"version": 1, "date": day, "target_orders": target,
            "timezone": str(tz), "sessions": sorted(sessions, key=lambda s: s['scheduled_at'])}


class ApiError(Exception):
    pass


class ClerkClient:
    def __init__(self, catalog, key=None, live=False):
        self.catalog = catalog
        self.key = key
        self.live = live

    def request(self, endpoint, payload):
        if not self.live:
            if endpoint.startswith("recommendations/") or endpoint == "search/search":
                category = payload.get("category")
                query = payload.get("query", "").lower()
                matches = [p['id'] for p in self.catalog.values()
                           if (category is None or category in p['categories'])
                           and (not query or query in p['name'].lower())]
                return {"result": matches[:payload.get("limit", 12)]}
            return {"status": "ok"}
        body = json.dumps({**payload, "key": self.key}).encode()
        request = Request(API_URL + endpoint, data=body, method="POST",
                          headers={"Content-Type": "application/json", "User-Agent": "AwesomeStoreSimulator/1.0"})
        try:
            with urlopen(request, timeout=20) as response:
                raw = response.read()
                result = json.loads(raw) if raw else {}
        except HTTPError as error:
            # Don't print bodies, URLs or payloads: they can contain the API key.
            raise ApiError(f"{endpoint}: HTTP {error.code}; review before retrying") from None
        except (URLError, TimeoutError, OSError, ValueError):
            raise ApiError(f"{endpoint}: delivery uncertain; review before retrying") from None
        if not isinstance(result, dict) or result.get("status") == "error" or result.get("error"):
            raise ApiError(f"{endpoint}: API rejected response; review before retrying")
        return result


def run_journey(session, catalog, client):
    rng = random.Random(seed(session['id']))
    name, categories, budget = PROFILES[session['profile']]
    candidates = [p for p in catalog.values() if eligible(p)
                  and set(p['categories']).intersection(categories) and p['price'] <= budget]
    if not candidates:
        raise ApiError("No available products matching the shopper profile")
    rng.shuffle(candidates)
    anchor = candidates[0]
    mode = session['mode']
    events = []
    clicked = []
    basket = []
    source = None
    if mode != "organic":
        category = anchor['categories'][0]
        source, params, label = rng.choice([
            ("recommendations/category/popular", {"category": category}, "Category - Popular"),
            ("search/search", {"query": anchor['name'].split(" Edition")[0]}, "Search - Results"),
        ])
        payload = {**params, "visitor": session['visitor'], "limit": 12, "labels": [label]}
        response = client.request(source, payload)
        events.append({"api": source, **payload})
        ids = response.get("result", [])
        if not isinstance(ids, list):
            raise ApiError("Unexpected Clerk result format")
        returned = []
        for position, value in enumerate(ids):
            try:
                product_id = int(value['id'] if isinstance(value, dict) else value)
            except (ValueError, TypeError, KeyError):
                continue
            product = catalog.get(product_id)
            if product and eligible(product) and set(product['categories']).intersection(categories):
                if product_id not in [p['id'] for _, p in returned]:
                    returned.append((position, product))
        rng.shuffle(returned)
        count = 1 if mode in ("mixed", "browse") else rng.choices([1, 2, 3], [55, 35, 10])[0]
        spend = 0
        for position, product in returned:
            if len(clicked) >= count:
                break
            if spend + product['price'] > budget:
                continue
            click = {"visitor": session['visitor'], "product": product['id'],
                     "api": source, "n": position, "labels": [label]}
            client.request("log/click", click)
            events.append({"api": "log/click", **{k: v for k, v in click.items() if k != "api"}, "source_api": source})
            clicked.append(product['id'])
            basket.append(product)
            spend += product['price']
        if mode != "browse" and not basket:
            raise ApiError("No eligible Clerk results; no synthetic sale sent")
    if mode == "browse":
        return {"profile": name, "clicked_ids": clicked, "events": events, "sale": None}
    if mode == "organic":
        basket = [anchor]
    if mode == "mixed" or (mode == "organic" and rng.random() < 0.4):
        spend = sum(p['price'] for p in basket)
        companions = [p for p in candidates if p['id'] not in [x['id'] for x in basket]
                      and p['price'] + spend <= budget]
        if not companions and mode == "mixed":
            raise ApiError("Mixed basket has no affordable organic companion; no sale sent")
        if companions:
            basket.append(companions[0])
    remaining_budget = budget - sum(p['price'] for p in basket)
    lines = []
    for product in basket:
        quantity = 2 if rng.random() < 0.12 and remaining_budget >= product['price'] else 1
        remaining_budget -= (quantity - 1) * product['price']
        lines.append({"id": product['id'], "price": product['price'], "quantity": quantity})
    # Omit order-line profit so Clerk uses the product-feed profit fallback.
    sale = {"sale": session['id'], "visitor": session['visitor'],
            "customer": session['customer'], "email": session['email'], "products": lines}
    client.request("log/sale", sale)
    events.append({"api": "log/sale", **sale})
    return {"profile": name, "clicked_ids": clicked, "events": events, "sale": sale,
            "revenue": money(sum(p['price'] * p['quantity'] for p in lines)),
            "estimated_profit": money(sum(catalog[p['id']].get('profit', 0) * p['quantity'] for p in lines))}


def save_state(path, state, checkpoint_git=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(path)
    if checkpoint_git:
        root = path.parents[1]
        subprocess.run(['git', '-C', str(root), 'add', str(path.relative_to(root))], check=True)
        result = subprocess.run(['git', '-C', str(root), 'diff', '--cached', '--quiet'])
        if result.returncode == 1:
            subprocess.run(['git', '-C', str(root), 'commit', '-m', 'Record simulator batch'], check=True, stdout=subprocess.DEVNULL)
        elif result.returncode != 0:
            raise RuntimeError('Cannot inspect simulator state repository')
        subprocess.run(['git', '-C', str(root), 'push', 'origin', 'HEAD:refs/heads/simulator-state'], check=True, stdout=subprocess.DEVNULL)


def execute_batch(state, catalog, client, now, limit, checkpoint, local_checkpoint=None):
    due = [s for s in state['sessions'] if s['status'] == 'pending'
           and datetime.fromisoformat(s['scheduled_at']) <= now][:limit]
    # Persist the claim remotely before sending anything. A crashed batch is
    # deliberately not replayed: the API might already have received the sale.
    for session in due:
        session['status'] = 'in_progress'
    checkpoint()
    failures = 0
    for session in due:
        try:
            session['outcome'] = run_journey(session, catalog, client)
            session['status'] = 'completed'
        except ApiError as error:
            session['status'] = 'needs_review'
            session['error'] = str(error)
            failures += 1
        session['processed_at'] = now.isoformat()
        if local_checkpoint:
            local_checkpoint()
    checkpoint()
    return len(due), failures


def summarize(state):
    completed = [s for s in state['sessions'] if s['status'] == 'completed']
    orders = [s for s in completed if s['outcome'].get('sale')]
    return {"date": state['date'], "target_orders": state['target_orders'],
            "completed_orders": len(orders), "completed_browsing_sessions": len(completed) - len(orders),
            "orders_by_type": {m: sum(s['mode'] == m for s in orders) for m in ('organic', 'mixed', 'clerk')},
            "revenue": money(sum(s['outcome'].get('revenue', 0) for s in orders)),
            "estimated_profit": money(sum(s['outcome'].get('estimated_profit', 0) for s in orders)),
            "pending_sessions": sum(s['status'] == 'pending' for s in state['sessions']),
            "needs_review": sum(s['status'] in ('needs_review', 'in_progress') for s in state['sessions'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', default=FEED_URL)
    parser.add_argument('--state-dir', type=Path, default=Path('.simulation-state'))
    parser.add_argument('--min-orders', type=int, default=50)
    parser.add_argument('--max-orders', type=int, default=100)
    parser.add_argument('--browsers-per-order', type=int, default=4)
    parser.add_argument('--max-sessions', type=int, default=100)
    parser.add_argument('--timezone', default='Europe/Copenhagen')
    parser.add_argument('--now', help='Dry-run only: ISO timestamp for reproducible previews')
    parser.add_argument('--live', action='store_true', help='Send real tracking events to the configured demo store')
    parser.add_argument('--checkpoint-git', action='store_true', help='Persist batch claims on simulator-state before API calls')
    args = parser.parse_args()
    if not (1 <= args.min_orders <= args.max_orders <= 100):
        parser.error('Order range must be between 1 and 100')
    if not (0 <= args.browsers_per_order <= 10 and 1 <= args.max_sessions <= 1000):
        parser.error('Invalid batch or browsing volume')
    key = os.environ.get('CLERK_API_KEY')
    if args.live and (not key or args.now):
        parser.error('Live mode requires CLERK_API_KEY and cannot use --now')
    if args.live and not args.checkpoint_git:
        parser.error('Live mode requires --checkpoint-git for durable batch claims')
    tz = ZoneInfo(args.timezone)
    now = datetime.fromisoformat(args.now) if args.now else datetime.now(timezone.utc)
    if now.tzinfo is None:
        parser.error('--now must include a timezone offset')
    now = now.astimezone(tz)
    catalog = load_catalog(args.catalog)
    day = now.date().isoformat()
    mode = 'live' if args.live else 'dry-run'
    path = args.state_dir / mode / f'{day}.json'
    state = json.loads(path.read_text()) if path.exists() else create_plan(
        day, tz, args.min_orders, args.max_orders, args.browsers_per_order)
    client = ClerkClient(catalog, key, args.live)
    checkpoint = lambda: save_state(path, state, args.checkpoint_git)
    processed, failures = execute_batch(state, catalog, client, now, args.max_sessions, checkpoint,
                                        lambda: save_state(path, state))
    summary = {"mode": mode, "processed_this_run": processed, **summarize(state)}
    print(json.dumps(summary, indent=2))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as report:
            report.write('### Awesome Store simulation\n\n```json\n' + json.dumps(summary, indent=2) + '\n```\n')
    return 1 if failures else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f'Simulator stopped: {type(error).__name__}; inspect the run and saved state.', file=sys.stderr)
        sys.exit(1)
