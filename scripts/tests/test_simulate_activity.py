import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime
from zoneinfo import ZoneInfo
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('simulator', Path(__file__).parents[1] / 'simulate_activity.py')
sim = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sim)


def catalog_fixture():
    return {i: {'id': i, 'name': f'Useful Product {i}', 'price': 25 + i % 20,
                'profit': 12, 'categories': [101], 'inventory': 10}
            for i in range(10001, 10041)}


def session(mode):
    return {'id': f'demo-2026-10-14-{mode}', 'visitor': 'abcd1234',
            'email': 'luke.skywalker@example.com', 'customer': 'demo-luke',
            'profile': 2, 'mode': mode}


class RecordingClient(sim.ClerkClient):
    def __init__(self, catalog, fail_on=None):
        super().__init__(catalog)
        self.calls = []
        self.fail_on = fail_on

    def request(self, endpoint, payload):
        self.calls.append((endpoint, payload))
        if endpoint == self.fail_on:
            raise sim.ApiError('Test API failure')
        return super().request(endpoint, payload)


class SimulatorTests(unittest.TestCase):
    def test_assisted_daily_plan_contains_balanced_channels(self):
        plan = sim.create_plan('2026-10-15', ZoneInfo('Europe/Copenhagen'), 50, 100, 4)
        channels = [s['channel'] for s in plan['sessions'] if s['mode'] in ('mixed', 'clerk')]
        self.assertGreater(channels.count('search'), 0)
        self.assertGreater(channels.count('recommendations'), 0)
        self.assertLessEqual(abs(channels.count('search') - channels.count('recommendations')), 1)

    def test_search_test_selects_only_due_search_purchases(self):
        plan = {'sessions': [{**session(mode), 'id': f'test-{index}', 'status': 'pending',
                             'channel': channel, 'scheduled_at': '2026-10-14T08:00:00+02:00'}
                            for index, (mode, channel) in enumerate([
                                ('browse', 'search'), ('clerk', 'recommendations'), ('mixed', 'search')])]}
        client = RecordingClient(catalog_fixture())
        sim.execute_batch(plan, client.catalog, client,
                          datetime.fromisoformat('2026-10-14T09:00:00+02:00'), 1,
                          lambda: None, channel='search', purchase_only=True)
        self.assertEqual([s['status'] for s in plan['sessions']], ['pending', 'pending', 'completed'])
        self.assertIn('search/search', [endpoint for endpoint, _ in client.calls])
        click = next(p for endpoint, p in client.calls if endpoint == 'log/click')
        self.assertEqual(click['api'], 'search/search')
        self.assertEqual(click['labels'], ['Search - Results'])
        self.assertEqual(sum(endpoint == 'log/sale' for endpoint, _ in client.calls), 1)

    def test_old_completed_channels_are_read_from_recorded_events(self):
        old = {**session('mixed'), 'outcome': {'events': [
            {'api': 'log/click', 'source_api': 'recommendations/category/popular'}]}}
        self.assertEqual(sim.get_channel(old), 'recommendations')

    def test_plan_determinism_target_and_schedule(self):
        tz = ZoneInfo('Europe/Copenhagen')
        plan = sim.create_plan('2026-10-14', tz, 50, 50, 4)
        self.assertEqual(plan, sim.create_plan('2026-10-14', tz, 50, 50, 4))
        self.assertEqual(sum(s['mode'] != 'browse' for s in plan['sessions']), 50)
        self.assertEqual(len(plan['sessions']), 250)
        self.assertEqual(len({s['id'] for s in plan['sessions']}), 250)
        for s in plan['sessions']:
            self.assertEqual(datetime.fromisoformat(s['scheduled_at']).date().isoformat(), plan['date'])
            self.assertTrue(s['email'].endswith('@example.com'))

    def test_dst_days_are_valid_and_daily_ids_do_not_overlap(self):
        tz = ZoneInfo('Europe/Copenhagen')
        a = sim.create_plan('2026-10-25', tz, 50, 100, 1)
        b = sim.create_plan('2026-10-26', tz, 50, 100, 1)
        self.assertFalse({s['id'] for s in a['sessions']} & {s['id'] for s in b['sessions']})
        self.assertTrue(50 <= a['target_orders'] <= 100)

    def test_hourly_runs_finish_today_and_do_not_repeat_orders(self):
        catalog = catalog_fixture()
        client = RecordingClient(catalog)
        tz = ZoneInfo('Europe/Copenhagen')
        plan = sim.create_plan('2026-10-14', tz, 50, 50, 4)
        for s in plan['sessions']:
            s['profile'] = 2
        for hour in range(24):
            now = datetime(2026, 10, 14, hour, 17, tzinfo=tz)
            sim.execute_batch(plan, catalog, client, now, 100, lambda: None)
            calls = len(client.calls)
            sim.execute_batch(plan, catalog, client, now, 100, lambda: None)
            self.assertEqual(calls, len(client.calls))
        summary = sim.summarize(plan)
        self.assertEqual(summary['completed_orders'], 50)
        self.assertEqual(summary['pending_sessions'], 0)
        sale_ids = [p['sale'] for endpoint, p in client.calls if endpoint == 'log/sale']
        self.assertEqual(len(sale_ids), len(set(sale_ids)))

    def test_organic_has_no_clerk_clicks(self):
        catalog = catalog_fixture()
        client = RecordingClient(catalog)
        outcome = sim.run_journey(session('organic'), catalog, client)
        self.assertFalse(any(endpoint == 'log/click' for endpoint, _ in client.calls))
        self.assertTrue(any(endpoint == 'log/pageview' for endpoint, _ in client.calls))
        self.assertFalse(outcome['clicked_ids'])
        self.assertGreater(len(outcome['sale']['products']), 0)

    def test_mixed_has_both_clicked_and_organic_products(self):
        catalog = catalog_fixture()
        client = RecordingClient(catalog)
        outcome = sim.run_journey(session('mixed'), catalog, client)
        purchased = {p['id'] for p in outcome['sale']['products']}
        clicked = set(outcome['clicked_ids'])
        self.assertTrue(clicked < purchased)
        self.assertTrue(clicked)

    def test_clerk_sale_uses_only_clicked_results_and_matching_identity(self):
        catalog = catalog_fixture()
        client = RecordingClient(catalog)
        outcome = sim.run_journey(session('clerk'), catalog, client)
        self.assertEqual(set(outcome['clicked_ids']), {p['id'] for p in outcome['sale']['products']})
        source, params = next((endpoint, payload) for endpoint, payload in client.calls
                              if endpoint.startswith('recommendations/') or endpoint == 'search/search')
        result = sim.ClerkClient(catalog).request(source, params)['result']
        for endpoint, payload in client.calls:
            self.assertEqual(payload['visitor'], 'abcd1234')
            if endpoint == 'log/click':
                self.assertEqual(result[payload['n']], payload['product'])
                self.assertEqual(payload['labels'], params['labels'])
                self.assertEqual(payload['api'], source)
        self.assertTrue(all('profit' not in p for p in outcome['sale']['products']))

    def test_browse_never_sends_sale(self):
        catalog = catalog_fixture()
        client = RecordingClient(catalog)
        outcome = sim.run_journey(session('browse'), catalog, client)
        self.assertIsNone(outcome['sale'])
        self.assertFalse(any(endpoint == 'log/sale' for endpoint, _ in client.calls))

    def test_empty_results_do_not_fabricate_clerk_sales(self):
        client = RecordingClient(catalog_fixture())
        with patch.object(client, 'request', return_value={'result': []}) as request:
            with self.assertRaises(sim.ApiError):
                sim.run_journey(session('clerk'), client.catalog, client)
            self.assertFalse(any(call.args[0] == 'log/sale' for call in request.call_args_list))

    def test_natural_queries_are_not_full_titles(self):
        product = {'name': 'Studio Cobalt Overshirt Edition 4', 'color': ['Cobalt'], 'brand': 'Northline'}
        queries = sim.search_queries(product, sim.random.Random(4))
        self.assertEqual(queries[-1], 'overshirt')
        self.assertTrue(all('studio' not in q and 'edition' not in q for q in queries))

    def test_purchase_tracks_cart_then_sale_then_empty_cart(self):
        client = RecordingClient(catalog_fixture())
        outcome = sim.run_journey(session('organic'), client.catalog, client)
        endpoints = [e for e, _ in client.calls]
        sale_index = endpoints.index('log/sale')
        self.assertIn('log/cart/update', endpoints[:sale_index])
        self.assertEqual(client.calls[sale_index + 1][1]['products'], [])
        self.assertEqual(outcome['events'][-1]['url'], sim.STORE_URL + 'checkout/success/')

    def test_pageviews_use_documented_v3_endpoint_and_accept_204(self):
        client = sim.ClerkClient(catalog_fixture(), key='test-secret', live=True)
        with patch.object(sim, 'urlopen') as connection:
            connection.return_value.__enter__.return_value.read.return_value = b''
            client.request('log/pageview', {'visitor': 'abc', 'url': sim.STORE_URL})
            self.assertEqual(connection.call_args.args[0].full_url, 'https://api.clerk.io/v3/log/pageview')

    def test_claim_is_persisted_before_api_and_rerun_skips_completed_and_failed(self):
        catalog = catalog_fixture()
        plan = {'date': '2026-10-14', 'sessions': [
            {**session('organic'), 'status': 'pending', 'scheduled_at': '2026-10-14T08:00:00+02:00'}]}
        client = RecordingClient(catalog, fail_on='log/sale')
        snapshots = []
        def checkpoint():
            snapshots.append(json.loads(json.dumps(plan)))
            if len(snapshots) == 1:
                self.assertEqual(client.calls, [])
        now = datetime.fromisoformat('2026-10-14T09:00:00+02:00')
        self.assertEqual(sim.execute_batch(plan, catalog, client, now, 100, checkpoint), (1, 1))
        self.assertEqual(snapshots[0]['sessions'][0]['status'], 'in_progress')
        self.assertEqual(plan['sessions'][0]['status'], 'needs_review')
        calls = len(client.calls)
        self.assertEqual(sim.execute_batch(plan, catalog, client, now, 100, checkpoint), (0, 0))
        self.assertEqual(len(client.calls), calls)
        plan['sessions'][0]['status'] = 'completed'
        self.assertEqual(sim.execute_batch(plan, catalog, client, now, 100, checkpoint), (0, 0))

    def test_failed_checkpoint_sends_nothing(self):
        plan = {'sessions': [{**session('organic'), 'status': 'pending',
                             'scheduled_at': '2026-10-14T08:00:00+02:00'}]}
        client = RecordingClient(catalog_fixture())
        def checkpoint():
            raise RuntimeError('Cannot persist claim')
        with self.assertRaises(RuntimeError):
            sim.execute_batch(plan, client.catalog, client,
                              datetime.fromisoformat('2026-10-14T09:00:00+02:00'), 100, checkpoint)
        self.assertFalse(client.calls)

    def test_dry_run_never_uses_network(self):
        client = sim.ClerkClient(catalog_fixture())
        with patch.object(sim, 'urlopen', side_effect=AssertionError('Network forbidden')):
            for mode in ['organic', 'mixed', 'clerk', 'browse']:
                sim.run_journey(session(mode), client.catalog, client)
            for channel in ['email', 'chat']:
                sim.run_journey({**session('mixed'), 'channel': channel}, client.catalog, client)

    def test_email_sale_uses_actual_embed_and_external_click(self):
        client = RecordingClient(catalog_fixture())
        outcome = sim.run_journey({**session('mixed'), 'channel': 'email'}, client.catalog, client)
        self.assertEqual(outcome['events'][2]['api'], 'campaigns/click')
        click = next(p for e, p in client.calls if e == 'log/click')
        self.assertEqual(click['external'], 1)
        self.assertEqual(click['labels'], ['Automated / Popular'])
        self.assertEqual(outcome['channel'], 'email')

    def test_chat_clicks_only_products_from_conversation(self):
        client = RecordingClient(catalog_fixture())
        outcome = sim.run_journey({**session('clerk'), 'channel': 'chat'}, client.catalog, client)
        self.assertTrue(any(e['api'] == 'chat/message' for e in outcome['events']))
        click = next(p for e, p in client.calls if e == 'log/click')
        self.assertEqual(click['api'], 'assistant/search/products')
        self.assertNotIn('labels', click)
        self.assertEqual(outcome['channel'], 'chat')

    def test_chat_tool_hooks_are_not_executed(self):
        with self.assertRaises(sim.ApiError):
            sim.chat_products({'messages': [{'type': 'hook', 'content': 'run-this'}]})

    def test_daily_plan_can_include_four_assisted_channels(self):
        plan = sim.create_plan('2026-10-15', ZoneInfo('Europe/Copenhagen'), 100, 100, 4,
                               ['search', 'recommendations', 'email', 'chat'])
        self.assertEqual({s['channel'] for s in plan['sessions'] if s['mode'] == 'clerk'},
                         {'search', 'recommendations', 'email', 'chat'})

    def test_invalid_http_200_body_is_not_success(self):
        client = sim.ClerkClient(catalog_fixture(), key='test-secret', live=True)
        with patch.object(sim, 'urlopen') as connection:
            connection.return_value.__enter__.return_value.read.return_value = b'{"status":"error"}'
            with self.assertRaises(sim.ApiError) as caught:
                client.request('log/sale', {'sale': 'demo-test'})
            self.assertNotIn('test-secret', str(caught.exception))

    def test_future_sessions_wait_and_state_roundtrips(self):
        plan = {'sessions': [{**session('organic'), 'status': 'pending',
                             'scheduled_at': '2026-10-14T18:00:00+02:00'}]}
        client = RecordingClient(catalog_fixture())
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'dry-run' / '2026-10-14.json'
            checkpoint = lambda: sim.save_state(path, plan)
            sim.execute_batch(plan, client.catalog, client,
                              datetime.fromisoformat('2026-10-14T09:00:00+02:00'), 100, checkpoint)
            self.assertEqual(json.loads(path.read_text()), plan)
        self.assertFalse(client.calls)


if __name__ == '__main__':
    unittest.main()
