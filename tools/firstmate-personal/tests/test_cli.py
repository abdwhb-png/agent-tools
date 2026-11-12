import json
from contextlib import redirect_stderr, redirect_stdout
import io
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / 'firstmate_personal.py'
sys.path.insert(0, str(ROOT))
import firstmate_personal


class NotificationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        (self.home / 'config').mkdir(mode=0o700)
        (self.home / 'config/personal-machine').write_text('fixture\n')
        self.requests = []
        self.response = {'ok': True, 'result': {'message_id': 42}}
        self.status = 200
        self.redirect = None
        self.method_responses = {}
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                owner.requests.append((self.path, payload))
                self.send_response(owner.status)
                if owner.redirect:
                    self.send_header('Location', owner.redirect)
                self.end_headers()
                self.wfile.write(json.dumps(owner.method_responses.get(self.path.rsplit('/', 1)[-1], owner.response)).encode())

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=lambda: self.server.serve_forever(poll_interval=0.05), daemon=True)
        thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.config = {'token': '123:fake-token', 'chatId': 987,
                       'apiBase': f'http://127.0.0.1:{self.server.server_port}'}
        self.write_config()

    def write_config(self):
        path = self.home / 'config/telegram.json'
        path.write_text(json.dumps(self.config))
        path.chmod(0o600)

    def notify(self, *extra):
        return subprocess.run([sys.executable, str(ROOT / 'bin/fm-notify'), '--home', str(self.home),
                               '--project', 'example-project', '--event', 'mission-complete',
                               '--message', 'Validation finished: **literal**', *extra],
                              text=True, capture_output=True)

    def test_real_http_send_has_machine_project_event_and_confirmed_receipt(self):
        result = self.notify('--link', 'https://example.invalid/review')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['messageId'], 42)
        self.assertEqual(len(self.requests), 1)
        path, payload = self.requests[0]
        self.assertEqual(path, '/bot123:fake-token/sendMessage')
        self.assertEqual(payload['chat_id'], 987)
        for part in ['fixture', 'example-project', 'mission-complete', '**literal**',
                     'https://example.invalid/review']:
            self.assertIn(part, payload['text'])
        self.assertIn(f'<b>Firstmate [{os.uname().nodename}(fixture)]</b>\n\n', payload['text'])
        self.assertIn('<b>example-project</b> · mission-complete\n\n', payload['text'])
        self.assertTrue(payload['text'].endswith('\n\nhttps://example.invalid/review'))
        self.assertEqual(payload['parse_mode'], 'HTML')
        self.assertTrue(payload['link_preview_options']['is_disabled'])
        self.assertNotIn(self.config['token'], result.stdout + result.stderr)

    def test_formatted_fields_preserve_literal_content_without_injected_markup(self):
        result = self.notify('--project', 'A < B & C', '--event', '<ready>',
                             '--message', 'Text: <b>literal</b> & "quotes"\nNext step: **review**')
        self.assertEqual(result.returncode, 0, result.stderr)
        text = self.requests[0][1]['text']
        self.assertIn('<b>A &lt; B &amp; C</b> · &lt;ready&gt;', text)
        self.assertIn('Text: &lt;b&gt;literal&lt;/b&gt; &amp; "quotes"\nNext step: **review**', text)
        self.assertNotIn('<b>literal</b>', text)

    def test_message_limit_counts_visible_text_after_formatting(self):
        prefix = f'Firstmate [{os.uname().nodename}(fixture)]\n\nexample-project · mission-complete\n\n'
        length = 4096 - len(prefix.encode('utf-16-le')) // 2
        result = self.notify('--message', '<' * length)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.requests[0][1]['text'].count('&lt;'), length)
        oversized = self.notify('--message', '<' * (length + 1))
        self.assertEqual(oversized.returncode, 1)
        self.assertIn('4096', oversized.stderr)
        self.assertEqual(len(self.requests), 1)

    def test_api_rejection_and_invalid_receipt_are_not_success_or_retried(self):
        for body in [{'ok': False, 'error_code': 429, 'description': self.config['token'],
                      'result': {'message_id': 42}},
                     {'ok': True, 'result': {'message_id': True}},
                     {'ok': True, 'result': {}}]:
            with self.subTest(body=body):
                self.response = body
                count = len(self.requests)
                result = self.notify()
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn('not confirmed', result.stderr)
                self.assertEqual(len(self.requests), count + 1)
                self.assertNotIn(self.config['token'], result.stdout + result.stderr)

    def test_http_errors_and_redirects_do_not_leak_token_or_follow(self):
        for status in [500, 307]:
            with self.subTest(status=status):
                self.status = status
                self.redirect = self.config['apiBase'] + '/leaked-token'
                count = len(self.requests)
                result = self.notify()
                self.assertEqual(result.returncode, 1)
                self.assertIn('not confirmed', result.stderr)
                self.assertNotIn(self.config['token'], result.stdout + result.stderr)
                self.assertNotIn('Traceback', result.stderr)
                self.assertEqual(len(self.requests), count + 1)

    def test_secret_file_requires_private_permissions_and_stays_local(self):
        path = self.home / 'config/telegram.json'
        path.chmod(0o644)
        result = self.notify()
        self.assertEqual(result.returncode, 1)
        self.assertIn('private', result.stderr)
        self.assertEqual(self.requests, [])

    def test_invalid_endpoint_and_oversized_message_never_send(self):
        self.config['apiBase'] = 'http://example.invalid'
        self.write_config()
        result = self.notify()
        self.assertEqual(result.returncode, 1)
        self.assertIn('endpoint', result.stderr)
        self.assertEqual(self.requests, [])
        self.config['apiBase'] = f'http://127.0.0.1:{self.server.server_port}'
        self.write_config()
        result = self.notify('--message', 'a' * 4097)
        self.assertEqual(result.returncode, 1)
        self.assertIn('4096', result.stderr)
        self.assertEqual(self.requests, [])

    def test_network_failure_is_redacted_and_not_claimed_delivered(self):
        self.server.shutdown()
        self.server.server_close()
        result = self.notify()
        self.assertEqual(result.returncode, 1)
        self.assertIn('not confirmed', result.stderr)
        self.assertNotIn(self.config['token'], result.stdout + result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_setup_resolves_one_started_private_chat_and_never_sends(self):
        token = self.home / 'provided-token'
        token.write_text(self.config['token'])
        token.chmod(0o600)
        (self.home / 'config/telegram.json').unlink()
        self.method_responses = {
            'getMe': {'ok': True, 'result': {'username': 'fixture_bot'}},
            'getUpdates': {'ok': True, 'result': [
                {'message': {'chat': {'id': -1, 'type': 'group'}, 'text': '/start'}},
                {'message': {'chat': {'id': 987, 'type': 'private'}, 'text': '/start'}},
                {'message': {'chat': {'id': 987, 'type': 'private'}, 'text': 'unrelated'}}]},
        }
        result = subprocess.run([sys.executable, str(CLI), 'telegram-setup',
                                 '--home', str(self.home), '--token-file', str(token),
                                 '--api-base', self.config['apiBase']], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        path = self.home / 'config/telegram.json'
        stored = json.loads(path.read_text())
        self.assertEqual(stored['chatId'], 987)
        self.assertEqual(stored['token'], self.config['token'])
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        self.assertEqual([p.rsplit('/', 1)[-1] for p, _ in self.requests], ['getMe', 'getUpdates'])
        self.assertNotIn(self.config['token'], result.stdout + result.stderr)


class ProfileTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.repo = self.base / 'profile'
        self.home = self.base / 'home'
        self.repo.mkdir()
        self.home.mkdir()
        (self.home / 'AGENTS.md').write_text('Existing Firstmate instructions\n')
        subprocess.run(['git', 'init', '-q', str(self.home)], check=True)
        subprocess.run(['git', '-C', str(self.home), 'add', 'AGENTS.md'], check=True)
        subprocess.run(['git', '-C', str(self.home), '-c', 'user.name=Test', '-c',
                        'user.email=test@example.invalid', 'commit', '-qm', 'Fixture'], check=True)
        self.revision = subprocess.check_output(
            ['git', '-C', str(self.home), 'rev-parse', 'HEAD'], text=True).strip()
        (self.repo / 'common').mkdir()
        (self.repo / 'profiles').mkdir()
        (self.repo / 'profiles/fixture.json').write_text('{"files": {}}')
        (self.repo / 'common/preferences.md').write_text('Shared preferences\n')
        self.manifest = {
            'schemaVersion': 1,
            'firstmateRevisions': [self.revision],
            'files': {'common/preferences.md': 'data/captain-shared.md'},
        }
        self.write_manifest()

    def write_manifest(self):
        (self.repo / 'profile.json').write_text(json.dumps(self.manifest))

    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(ROOT / 'bin/fm-personal'), 'sync', '--repo', str(self.repo),
                               '--home', str(self.home), '--machine', 'fixture', *args],
                              text=True, capture_output=True)

    def test_split_checkout_requires_an_explicit_private_profile(self):
        result = subprocess.run([sys.executable, str(ROOT / 'bin/fm-personal'), 'sync',
                                 '--home', str(self.home), '--machine', 'fixture', '--apply'],
                                text=True, capture_output=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('--repo', result.stderr)
        self.assertFalse((self.home / 'data').exists())

    def test_preview_apply_and_repeat_preserve_unrelated_work(self):
        (self.home / 'state').mkdir()
        unrelated = self.home / 'state/live-task'
        unrelated.write_text('busy')
        preview = self.run_cli()
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertEqual(json.loads(preview.stdout)['changes'][0]['action'], 'create')
        self.assertFalse((self.home / 'data').exists())
        applied = self.run_cli('--apply')
        self.assertEqual(applied.returncode, 0, applied.stderr)
        target = self.home / 'data/captain-shared.md'
        self.assertEqual(target.read_text(), 'Shared preferences\n')
        self.assertEqual(target.stat().st_mode & 0o777, 0o600)
        again = self.run_cli('--apply')
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertEqual(json.loads(again.stdout)['changes'][0]['action'], 'unchanged')
        self.assertEqual(unrelated.read_text(), 'busy')
        self.assertEqual((self.home / 'AGENTS.md').read_text(), 'Existing Firstmate instructions\n')

    def test_unmanaged_collision_requires_explicit_adoption_with_backup(self):
        target = self.home / 'data/captain-shared.md'
        target.parent.mkdir()
        target.write_text('Local preference\n')
        refused = self.run_cli('--apply')
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn('unmanaged', refused.stderr)
        self.assertEqual(target.read_text(), 'Local preference\n')
        adopted = self.run_cli('--apply', '--adopt-existing')
        self.assertEqual(adopted.returncode, 0, adopted.stderr)
        backups = list((self.home / 'state/personal-profile/backups').rglob('*.bak'))
        self.assertEqual([p.read_text() for p in backups], ['Local preference\n'])

    def test_managed_drift_is_never_overwritten_even_with_adoption(self):
        self.assertEqual(self.run_cli('--apply').returncode, 0)
        target = self.home / 'data/captain-shared.md'
        target.write_text('Live local edit\n')
        (self.repo / 'common/preferences.md').write_text('New upstream value\n')
        result = self.run_cli('--apply', '--adopt-existing')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('diverged', result.stderr)
        self.assertEqual(target.read_text(), 'Live local edit\n')

    def test_source_updates_apply_and_manifest_removal_never_deletes(self):
        self.assertEqual(self.run_cli('--apply').returncode, 0)
        (self.repo / 'common/preferences.md').write_text('Updated\n')
        self.assertEqual(self.run_cli('--apply').returncode, 0)
        target = self.home / 'data/captain-shared.md'
        self.assertEqual(target.read_text(), 'Updated\n')
        self.manifest['files'] = {}
        self.write_manifest()
        result = self.run_cli('--apply')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('removed', result.stderr)
        self.assertEqual(target.read_text(), 'Updated\n')

    def test_unqualified_firstmate_revision_refuses_before_writing(self):
        self.manifest['firstmateRevisions'] = ['0' * 40]
        self.write_manifest()
        result = self.run_cli('--apply')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('revision', result.stderr)
        self.assertFalse((self.home / 'data').exists())

    def test_machine_override_is_explicit_and_unknown_machine_refused(self):
        (self.repo / 'common/machine.md').write_text('Machine preference\n')
        (self.repo / 'profiles/fixture.json').write_text(json.dumps({
            'files': {'common/machine.md': 'data/captain-shared.md'}}))
        result = self.run_cli('--apply')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.home / 'data/captain-shared.md').read_text(), 'Machine preference\n')
        (self.repo / 'profiles/fixture.json').unlink()
        result = self.run_cli('--apply')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('machine', result.stderr)

    def test_forbidden_target_refuses_entire_batch(self):
        self.manifest['files']['common/preferences.md'] = 'state/live-task'
        self.write_manifest()
        result = self.run_cli('--apply')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('target', result.stderr)
        self.assertFalse((self.home / 'state/live-task').exists())

    def test_source_traversal_and_destination_symlinks_are_refused(self):
        outside = self.base / 'outside'
        outside.write_text('Not profile data')
        self.manifest['files'] = {'../outside': 'data/captain-shared.md'}
        self.write_manifest()
        self.assertNotEqual(self.run_cli('--apply').returncode, 0)
        self.manifest['files'] = {'common/preferences.md': 'data/captain-shared.md'}
        self.write_manifest()
        (self.home / 'data').symlink_to(self.base, target_is_directory=True)
        self.assertNotEqual(self.run_cli('--apply').returncode, 0)
        self.assertEqual(outside.read_text(), 'Not profile data')

    def test_bad_later_source_does_not_partially_apply_valid_earlier_source(self):
        self.manifest['files']['missing.md'] = 'config/crew-dispatch.json'
        self.write_manifest()
        self.assertNotEqual(self.run_cli('--apply').returncode, 0)
        self.assertFalse((self.home / 'data').exists())

    def test_invalid_profile_types_refuse_cleanly_before_writing(self):
        self.manifest['files'] = {'common/preferences.md': ['data/captain-shared.md']}
        self.write_manifest()
        result = self.run_cli('--apply')
        self.assertEqual(result.returncode, 1)
        self.assertNotIn('Traceback', result.stderr)
        self.assertFalse((self.home / 'data').exists())
        self.manifest['files'] = {'common/preferences.md': 'data/captain-shared.md'}
        self.manifest['firstmateRevisions'] = self.revision
        self.write_manifest()
        result = self.run_cli('--apply')
        self.assertEqual(result.returncode, 1)
        self.assertFalse((self.home / 'data').exists())

    def test_os_write_failure_restores_files_and_previous_receipt(self):
        self.assertEqual(self.run_cli('--apply').returncode, 0)
        receipt = self.home / 'state/personal-profile/receipt.json'
        previous_receipt = receipt.read_bytes()
        (self.repo / 'common/preferences.md').write_text('Updated\n')
        (self.repo / 'common/machine').write_text('fixture\n')
        self.manifest['files']['common/machine'] = 'config/personal-machine'
        self.write_manifest()
        replace = os.replace

        def failing_replace(source, destination):
            if Path(destination) == self.home / 'config/personal-machine':
                raise OSError('injected filesystem write failure')
            return replace(source, destination)

        with patch('os.replace', side_effect=failing_replace), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            code = firstmate_personal.main(['sync', '--repo', str(self.repo), '--home', str(self.home),
                                            '--machine', 'fixture', '--apply'])
        self.assertEqual(code, 1)
        self.assertEqual((self.home / 'data/captain-shared.md').read_text(), 'Shared preferences\n')
        self.assertEqual(receipt.read_bytes(), previous_receipt)
        self.assertFalse((self.home / 'config/personal-machine').exists())

    def test_unreadable_git_index_refuses_instead_of_assuming_untracked(self):
        (self.home / '.git/index').write_bytes(b'corrupt-index')
        result = self.run_cli('--apply')
        self.assertEqual(result.returncode, 1)
        self.assertIn('index', result.stderr)
        self.assertFalse((self.home / 'data').exists())


if __name__ == '__main__':
    unittest.main()
