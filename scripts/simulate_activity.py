#!/usr/bin/env python3
"""Scheduled synthetic shopping journeys. Standard library only; dry-run by default."""

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import random
import re
import subprocess
import sys
from datetime import datetime, time, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler
from urllib.parse import urlencode, urlsplit, parse_qs
from zoneinfo import ZoneInfo

FEED_URL = "https://olzen90.github.io/awesomestoredemo/feeds/products.json"
API_URL = "https://api.clerk.io/v2/"
STORE_URL = FEED_URL.split('/feeds/')[0] + '/'


def search_queries(product, rng):
    """Shopping intent, not a copied product title or SKU."""
    name = product['name'].split(' Edition')[0].lower()
    colors = product.get('color', [])
    if isinstance(colors, str):
        colors = [colors]
    kind = name
    for color in colors:
        marker = str(color).lower() + ' '
        if marker in name:
            kind = name.split(marker, 1)[1]
            break
    kind = re.sub(r'\s+\d+$', '', kind).strip()
    qualified = f"{rng.choice(colors).lower()} {kind}" if colors else kind
    if rng.random() < 0.3 and product.get('brand'):
        qualified = f"{product['brand'].lower()} {kind}"
    return list(dict.fromkeys([qualified, kind]))
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


def get_channel(session):
    if session['mode'] == 'organic':
        return 'organic'
    if session.get('channel'):
        return session['channel']
    # Older completed plans retain their actual source, not a new random choice.
    for event in session.get('outcome', {}).get('events', []):
        if event.get('source_api'):
            return 'search' if event['source_api'].startswith('search/') else 'recommendations'
    return 'search' if seed('channel:' + session['id']) % 2 else 'recommendations'


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


def create_plan(day, tz, minimum, maximum, browsers_per_order, channels=('search', 'recommendations')):
    rng = random.Random(seed(f"awesome-store:{day}:v1"))
    target = rng.randint(minimum, maximum)
    modes = rng.choices(["organic", "mixed", "clerk"], weights=[45, 35, 20], k=target)
    modes += ["browse"] * (target * browsers_per_order)
    rng.shuffle(modes)
    sessions = []
    assisted_orders = 0
    for index, mode in enumerate(modes):
        hour = rng.choices(range(24), weights=HOUR_WEIGHTS)[0]
        scheduled = datetime.combine(datetime.fromisoformat(day).date(),
                                     time(hour, rng.randrange(17), rng.randrange(60)), tz)
        # A reusable pool makes roughly 30% of shoppers returning customers.
        customer = rng.randrange(120) if rng.random() < 0.3 else f"{day}-{index}"
        if mode == 'organic':
            channel = 'organic'
        elif mode == 'browse':
            channel = rng.choice(channels)
        else:
            channel = channels[assisted_orders % len(channels)]
            assisted_orders += 1
        identity = f"{channel}-{customer}"
        sessions.append({
            "id": f"demo-{day}-{index:04d}",
            "visitor": hashlib.sha256(identity.encode()).hexdigest()[:12],
            "customer": f"demo-{identity}",
            "email": f"{rng.choice(CHARACTERS)}.{identity}@example.com",
            "profile": rng.randrange(len(PROFILES)),
            "mode": mode,
            "channel": channel,
            "scheduled_at": scheduled.isoformat(),
            "status": "pending",
        })
    return {"version": 1, "date": day, "target_orders": target,
            "timezone": str(tz), "sessions": sorted(sessions, key=lambda s: s['scheduled_at'])}


class ApiError(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ClerkClient:
    def __init__(self, catalog, key=None, live=False, categories=None, email_embed='automated-popular'):
        self.catalog = catalog
        self.key = key
        self.live = live
        self.categories = categories or {}
        self.email_embed = email_embed

    def request(self, endpoint, payload):
        if not self.live:
            if endpoint.startswith("recommendations/") or endpoint == "search/search":
                category = payload.get("category")
                query = payload.get("query", "").lower()
                matches = [p['id'] for p in self.catalog.values()
                           if (category is None or category in p['categories'])
                           and (not query or all(word in (p['name'] + ' ' + p.get('brand', '')).lower()
                                                for word in query.split()))]
                return {"result": matches[:payload.get("limit", 12)]}
            return {"status": "ok"}
        body = json.dumps({**payload, "key": self.key}).encode()
        base = "https://api.clerk.io/v3/" if endpoint == 'log/pageview' else API_URL
        request = Request(base + endpoint, data=body, method="POST",
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
            detail = str(result.get('error') or result.get('message') or 'API error') if isinstance(result, dict) else 'Invalid JSON shape'
            detail = detail.replace(self.key or '\0', '[redacted]')
            detail = re.sub(r'https?://\S+', '[url]', detail)[:180]
            raise ApiError(f"{endpoint}: API rejected response ({detail}); review before retrying")
        return result

    def chat_request(self, endpoint, payload):
        """Isolated adapter to the same transport used by public Clerk Chat.js.

        No arbitrary URLs, returned code, or client tools are executed.
        This is not a versioned public API; fail closed if its contract changes.
        """
        if not self.live:
            if endpoint == 'data':
                return {'chat_uid': 'dry-chat'}
            return {'chat_uid': payload['chat_uid'], 'messages': [
                {'type': 'slider', 'metadata': {'products': list(self.catalog.values())}}]}
        values = {**payload, 'key': self.key}
        url = 'https://chat.clerk.io/chat'
        if endpoint == 'data':
            request = Request(url + '/data?' + urlencode(values),
                              headers={'User-Agent': 'AwesomeStoreSimulator/1.0'})
        elif endpoint == 'message':
            request = Request(url, data=json.dumps(values).encode(), method='POST',
                              headers={'Content-Type': 'application/json',
                                       'User-Agent': 'AwesomeStoreSimulator/1.0'})
        else:
            raise ApiError('Unsupported Chat operation')
        try:
            with urlopen(request, timeout=55) as response:
                result = json.load(response)
        except (HTTPError, URLError, TimeoutError, OSError, ValueError):
            raise ApiError('Chat request failed or delivery uncertain; review before retrying') from None
        if not isinstance(result, dict) or result.get('error'):
            raise ApiError('Unexpected Chat response; review before retrying')
        return result

    def email_landing(self, session, candidates):
        # This is an actual configured Embed, not a made-up Email label.
        params = {'embed': self.email_embed, 'email': session['email'],
                  'n': 0, 'v': session['id'],
                  'filter': 'id in ' + json.dumps([p['id'] for p in candidates])}
        if not self.live:
            return {'id': candidates[0]['id'], 'api': 'recommendations/popular',
                    'labels': ['Automated / Popular'], 'n': 0}
        request = Request(API_URL + 'campaigns/click?' + urlencode({**params, 'key': self.key}),
                          headers={'User-Agent': 'AwesomeStoreSimulator/1.0'})
        try:
            with build_opener(NoRedirect()).open(request, timeout=30):
                raise ApiError('Email click did not return a tracking redirect')
        except HTTPError as error:
            if error.code not in (301, 302, 303, 307, 308):
                raise ApiError(f'Email click: HTTP {error.code}; review before retrying') from None
            landing = urlsplit(error.headers.get('Location', ''))
        except (URLError, TimeoutError, OSError):
            raise ApiError('Email click delivery uncertain; review before retrying') from None
        # Do not follow arbitrary external URLs supplied by the response.
        if landing.scheme != 'https' or landing.netloc != urlsplit(STORE_URL).netloc:
            raise ApiError('Email returned an unexpected landing domain')
        query = parse_qs(landing.query)
        try:
            result = {'id': int(query['clerk_product'][0]),
                      'api': query['clerk_api'][0].replace('*', '/'),
                      'labels': [query['clerk_labels'][0]],
                      'n': int(query['clerk_n'][0])}
        except (KeyError, ValueError, TypeError):
            raise ApiError('Email redirect missing tracking parameters') from None
        if result['id'] not in {p['id'] for p in candidates}:
            raise ApiError('Email returned an ineligible product; no sale sent')
        if not result['api'].startswith('recommendations/') or not isinstance(result['labels'], list):
            raise ApiError('Email redirect contains unexpected source metadata')
        return result


def chat_products(response):
    products = []
    for message in response.get('messages', []):
        metadata = message.get('metadata') or {}
        # Never act on model-generated client-tool hooks.
        if message.get('type') == 'hook':
            raise ApiError('Chat requested a client tool; manual review required')
        values = metadata.get('products') or ([metadata['product']] if metadata.get('product') else [])
        if not values and message.get('type') in ('slider', 'single_product'):
            try:
                data = json.loads(message.get('content', ''))
                values = data if isinstance(data, list) else data.get('products', [data])
            except (ValueError, TypeError, AttributeError):
                pass
        products.extend(values)
    return products


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
    channel = get_channel(session)
    events = []
    session['attempt_events'] = events
    clicked = []
    basket = []
    source = None
    def record(endpoint, payload):
        response = client.request(endpoint, payload)
        events.append({'api': endpoint, **payload})
        return response

    def view(url, **context):
        record('log/pageview', {'visitor': session['visitor'], 'url': url, **context})
        if context.get('product'):
            record('log/product', {'visitor': session['visitor'], 'product': context['product']})

    def cart(products):
        record('log/cart/update', {'visitor': session['visitor'], 'email': session['email'],
                                  'products': products})

    view(STORE_URL)
    record('log/email', {'visitor': session['visitor'], 'email': session['email']})
    category_url = client.categories.get(anchor['categories'][0])
    if category_url:
        view(category_url, category=str(anchor['categories'][0]))
    if mode != "organic":
        category = anchor['categories'][0]
        email_result = None
        if channel == 'email':
            email_result = client.email_landing(session, candidates)
            source, params, label = email_result['api'], {}, None
            events.append({'api': 'campaigns/click', 'embed': client.email_embed,
                           'product': email_result['id'], 'n': email_result['n'],
                           'source_api': email_result['api'], 'labels': email_result['labels']})
        elif channel == 'chat':
            source, params, label = 'assistant/search/products', {}, None
        elif channel == 'search':
            source, params, label = 'search/search', {}, 'Search - Results'
        else:
            source, params, label = 'recommendations/category/popular', {'category': category}, 'Category - Popular'
        payload = {**params, "visitor": session['visitor'], "limit": 12}
        if label:
            payload['labels'] = [label]
        if channel == 'email':
            response = {'result': [email_result['id']]}
        elif channel == 'chat':
            config = client.chat_request('data', {'visitor': session['visitor'], 'chat_uid': 'null'})
            uid = config.get('chat_uid')
            if not uid:
                raise ApiError('Chat did not create a conversation')
            query = search_queries(anchor, rng)[-1]
            prompt = f"I'm shopping for {query} for my {name.replace('-', ' ')}. My budget is {budget} euros. Can you show me suitable products?"
            message_payload = {
                'visitor': session['visitor'], 'chat_uid': uid, 'user_message': prompt,
                'metadata': {'current_page': {'page_id': str(category), 'page_type': 'category'}}}
            if config.get('user_consent_message'):
                message_payload['user_consent_message'] = config['user_consent_message']
            response = client.chat_request('message', message_payload)
            events.append({'api': 'chat/message', 'visitor': session['visitor'],
                           'chat_uid': response.get('chat_uid', uid), 'prompt': prompt,
                           'message_types': [m.get('type', 'text') for m in response.get('messages', [])],
                           'returned_ids': [p.get('id') if isinstance(p, dict) else p
                                            for p in chat_products(response)]})
            products = chat_products(response)
            candidate_ids = {p['id'] for p in candidates}
            if not any(isinstance(p, dict) and p.get('id') in candidate_ids for p in products):
                # A shopper can clarify an unhelpful answer. This is a new turn,
                # not a retry of an uncertain request or a fabricated product.
                followup = f"I'm interested in {anchor['name']}. Please show that product and similar options under {budget} euros."
                response = client.chat_request('message', {
                    **message_payload, 'chat_uid': response.get('chat_uid', uid), 'user_message': followup})
                products = chat_products(response)
                events.append({'api': 'chat/message', 'visitor': session['visitor'],
                               'chat_uid': response.get('chat_uid', uid), 'prompt': followup,
                               'message_types': [m.get('type', 'text') for m in response.get('messages', [])],
                               'returned_ids': [p.get('id') if isinstance(p, dict) else p for p in products]})
            response = {'result': products}
        elif channel == 'search':
            queries = search_queries(anchor, rng)
            # A small proportion explores a plausible catalogue gap before
            # changing their mind; real responses determine whether it is a miss.
            if rng.random() < 0.12:
                gap = rng.choice(['wireless earbuds', 'suitcase', 'tent', 'sunscreen', 'sofa'])
                record(source, {**payload, 'query': gap})
            response = {}
            for query in queries:
                view(STORE_URL + 'search?' + urlencode({'q': query}))
                payload = {**payload, 'query': query}
                response = record(source, payload)
                if response.get('result') and (len(queries) == 1 or query == queries[-1] or rng.random() < 0.5):
                    break
        else:
            response = record(source, payload)
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
            if mode == 'mixed' and not any(p['id'] != product['id'] and
                                          p['price'] + product['price'] <= budget for p in candidates):
                continue
            click = {"visitor": session['visitor'], "product": product['id'],
                     "api": source, "n": position}
            if label:
                click['labels'] = [label]
            if email_result:
                click.update(n=email_result['n'], labels=email_result['labels'], external=1)
            client.request("log/click", click)
            events.append({"api": "log/click", **{k: v for k, v in click.items() if k != "api"}, "source_api": source})
            clicked.append(product['id'])
            basket.append(product)
            spend += product['price']
            view(product.get('url', STORE_URL + 'product/' + str(product['id'])), product=str(product['id']))
            if mode != 'browse':
                cart([{'id': p['id'], 'quantity': 1} for p in basket])
        if mode != "browse" and not basket:
            raise ApiError("No eligible Clerk results; no synthetic sale sent")
    if mode == "browse":
        # Some non-buyers leave a tracked cart behind, others leave after looking.
        if basket and rng.random() < 0.25:
            cart([{'id': basket[0]['id'], 'quantity': 1}])
            view(STORE_URL + 'cart/')
        return {"profile": name, "channel": channel, "clicked_ids": clicked, "events": events, "sale": None}
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
        if product['id'] not in clicked:
            view(product.get('url', STORE_URL + 'product/' + str(product['id'])), product=str(product['id']))
    cart([{'id': p['id'], 'quantity': p['quantity']} for p in lines])
    view(STORE_URL + 'cart/')
    # Omit order-line profit so Clerk uses the product-feed profit fallback.
    sale = {"sale": session['id'], "visitor": session['visitor'],
            "customer": session['customer'], "email": session['email'], "products": lines}
    client.request("log/sale", sale)
    events.append({"api": "log/sale", **sale})
    cart([])
    view(STORE_URL + 'checkout/success/')
    return {"profile": name, "channel": channel, "clicked_ids": clicked, "events": events, "sale": sale,
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


def execute_batch(state, catalog, client, now, limit, checkpoint, local_checkpoint=None,
                  channel='auto', purchase_only=False):
    due = [s for s in state['sessions'] if s['status'] == 'pending'
           and (channel == 'auto' or get_channel(s) == channel)
           and (not purchase_only or s['mode'] != 'browse')
           and datetime.fromisoformat(s['scheduled_at']) <= now][:limit]
    # Persist the claim remotely before sending anything. A crashed batch is
    # deliberately not replayed: the API might already have received the sale.
    for session in due:
        session['channel'] = get_channel(session)
        session['status'] = 'in_progress'
    checkpoint()
    failures = 0
    for session in due:
        try:
            session['outcome'] = run_journey(session, catalog, client)
            session.pop('attempt_events', None)
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
            "orders_by_channel": {c: sum(get_channel(s) == c for s in orders)
                                  for c in ('organic', 'search', 'recommendations', 'email', 'chat')},
            "revenue": money(sum(s['outcome'].get('revenue', 0) for s in orders)),
            "estimated_profit": money(sum(s['outcome'].get('estimated_profit', 0) for s in orders)),
            "pending_sessions": sum(s['status'] == 'pending' for s in state['sessions']),
            "needs_review": sum(s['status'] in ('needs_review', 'in_progress') for s in state['sessions'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', default=FEED_URL)
    parser.add_argument('--categories', default=STORE_URL + 'feeds/categories.json')
    parser.add_argument('--state-dir', type=Path, default=Path('.simulation-state'))
    parser.add_argument('--min-orders', type=int, default=50)
    parser.add_argument('--max-orders', type=int, default=100)
    parser.add_argument('--browsers-per-order', type=int, default=4)
    parser.add_argument('--max-sessions', type=int, default=100)
    parser.add_argument('--channel', choices=['auto', 'search', 'recommendations', 'email', 'chat'], default='auto')
    parser.add_argument('--channels', default='search,recommendations',
                        help='Channels for NEW daily plans; opt in to email/chat explicitly')
    parser.add_argument('--email-embed', default='automated-popular')
    parser.add_argument('--purchase-only', action='store_true', help='Bounded test: process planned purchasing journeys only')
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
    channels = tuple(c.strip() for c in args.channels.split(','))
    if not channels or len(set(channels)) != len(channels) or any(c not in ('search', 'recommendations', 'email', 'chat') for c in channels):
        parser.error('Invalid channels')
    day = now.date().isoformat()
    mode = 'live' if args.live else 'dry-run'
    path = args.state_dir / mode / f'{day}.json'
    state = json.loads(path.read_text()) if path.exists() else create_plan(
        day, tz, args.min_orders, args.max_orders, args.browsers_per_order, channels)
    # A targeted Chat test reuses ONE unprocessed assisted journey rather than
    # rewriting any completed purchase or creating a duplicate test order.
    if args.channel in ('email', 'chat') and not any(s['status'] == 'pending' and get_channel(s) == args.channel for s in state['sessions']):
        pending = next((s for s in state['sessions'] if s['status'] == 'pending'
                        and s['mode'] in ('mixed', 'clerk') and datetime.fromisoformat(s['scheduled_at']) <= now), None)
        if pending:
            pending['channel'] = args.channel
    if args.categories.startswith('https://'):
        with urlopen(args.categories, timeout=30) as response:
            category_data = json.load(response)
    else:
        category_data = json.loads(Path(args.categories).read_text())
    client = ClerkClient(catalog, key, args.live, {c['id']: c['url'] for c in category_data}, args.email_embed)
    checkpoint = lambda: save_state(path, state, args.checkpoint_git)
    processed, failures = execute_batch(state, catalog, client, now, args.max_sessions, checkpoint,
                                        lambda: save_state(path, state), args.channel, args.purchase_only)
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
