#!/usr/bin/env python3
"""Portable personal configuration and explicit milestone notifications."""

import argparse
from contextlib import contextmanager
import fcntl
import hashlib
from html import escape
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request


class PersonalError(Exception):
    pass


TARGETS = frozenset({
    'data/captain-shared.md', 'config/crew-dispatch.json', 'config/personal-machine',
    '.agents/skills/firstmate-notify/SKILL.md',
})


def digest(data):
    return hashlib.sha256(data).hexdigest()


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, name = tempfile.mkstemp(prefix='.personal-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def safe_path(root, relative):
    if not isinstance(relative, str) or not relative or '\\' in relative:
        raise PersonalError('invalid relative path')
    parts = relative.split('/')
    if any(part in ('', '.', '..') for part in parts):
        raise PersonalError('unsafe relative path')
    path = root
    for part in parts:
        path = path / part
        if path.is_symlink():
            raise PersonalError(f'symlink refused: {relative}')
        if path.exists():
            info = path.stat()
            if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                raise PersonalError(f'nonregular path refused: {relative}')
            if stat.S_ISREG(info.st_mode) and info.st_nlink != 1:
                raise PersonalError(f'hard-linked file refused: {relative}')
    return path


def file_map(value):
    if not isinstance(value, dict):
        raise PersonalError('files must be a source/target object')
    result = {}
    for source, target in value.items():
        if not isinstance(source, str) or not isinstance(target, str) or target not in TARGETS:
            raise PersonalError('target is not in the portable-file allowlist')
        if target in result:
            raise PersonalError(f'duplicate target: {target}')
        result[target] = source
    return result


def read_json(path):
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise PersonalError('expected a JSON object')
    return value


def plan_sync(args):
    repo, home = Path(args.repo).absolute(), Path(args.home).absolute()
    if repo.resolve() != repo or home.resolve() != home:
        raise PersonalError('home and repository must use canonical nonsymlink paths')
    manifest = read_json(safe_path(repo, 'profile.json'))
    if manifest.get('schemaVersion') != 1:
        raise PersonalError('unsupported profile schema')
    revisions = manifest.get('firstmateRevisions')
    if not isinstance(revisions, list) or not revisions or any(
            not isinstance(value, str) or not re.fullmatch(r'[0-9a-f]{40}', value) for value in revisions):
        raise PersonalError('firstmateRevisions must list qualified full Git revisions')
    revision = subprocess.run(['git', '-C', str(home), 'rev-parse', 'HEAD'],
                              capture_output=True, text=True, timeout=10)
    if revision.returncode or revision.stdout.strip() not in revisions:
        raise PersonalError('Firstmate revision has not been qualified for this profile')
    if not (home / 'AGENTS.md').is_file():
        raise PersonalError('Firstmate home has no AGENTS.md')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}', args.machine):
        raise PersonalError('invalid machine profile name')
    machine_path = safe_path(repo, f'profiles/{args.machine}.json')
    if not machine_path.is_file():
        raise PersonalError('unknown machine profile')
    targets = file_map(manifest.get('files'))
    targets.update(file_map(read_json(machine_path).get('files')))
    receipt_path = safe_path(home, 'state/personal-profile/receipt.json')
    receipt = read_json(receipt_path) if receipt_path.exists() else {'installed': {}}
    installed = receipt.get('installed')
    if not isinstance(installed, dict) or any(
            name not in TARGETS or not isinstance(value, str) or not re.fullmatch(r'[0-9a-f]{64}', value)
            for name, value in installed.items()):
        raise PersonalError('invalid installed-file receipt')
    if set(installed) - set(targets):
        raise PersonalError('managed target removed from manifest; explicit reconciliation required')
    changes = []
    planned = []
    for target, source in targets.items():
        data = safe_path(repo, source).read_bytes()
        path = safe_path(home, target)
        tracked = subprocess.run(['git', '-C', str(home), 'ls-files', '--error-unmatch', '--', target],
                                 capture_output=True, timeout=10)
        if tracked.returncode == 0:
            raise PersonalError(f'tracked Firstmate target refused: {target}')
        if tracked.returncode != 1:
            raise PersonalError('cannot verify Firstmate Git index; no profile file applied')
        previous = path.read_bytes() if path.exists() else None
        if target in installed and (previous is None or digest(previous) != installed[target]):
            raise PersonalError(f'managed target diverged locally: {target}')
        if target not in installed and previous not in (None, data) and not args.adopt_existing:
            raise PersonalError(f'unmanaged target differs; inspect then use --adopt-existing: {target}')
        action = 'unchanged' if previous == data else ('create' if previous is None else 'update')
        changes.append({'target': target, 'action': action})
        planned.append((target, path, data, previous))
    fingerprint = digest(json.dumps({name: digest(data) for name, _, data, _ in planned},
                                    sort_keys=True).encode())
    result = {'machine': args.machine, 'applied': args.apply, 'profileDigest': fingerprint,
              'firstmateRevision': revision.stdout.strip(), 'changes': changes}
    return home, receipt_path, planned, result


@contextmanager
def sync_lock(home):
    path = safe_path(home, 'state/personal-profile/apply.lock')
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        if os.fstat(fd).st_nlink != 1:
            raise PersonalError('hard-linked apply lock refused')
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise PersonalError('profile application already running') from None
        yield
    finally:
        os.close(fd)


def sync(args):
    home, receipt_path, planned, result = plan_sync(args)
    if not args.apply:
        return result
    with sync_lock(home):
        home, receipt_path, planned, result = plan_sync(args)
        backups = safe_path(home, 'state/personal-profile/backups')
        for target, _, data, previous in planned:
            if previous is not None and previous != data:
                backup = backups / (digest(target.encode()) + '-' + digest(previous) + '.bak')
                if not backup.exists():
                    atomic_write(backup, previous)
        written = []
        try:
            for target, path, data, previous in planned:
                current = safe_path(home, target)
                if (current.read_bytes() if current.exists() else None) != previous:
                    raise PersonalError(f'target changed during application: {target}')
                if previous != data:
                    atomic_write(path, data)
                    written.append((target, path, data, previous))
            receipt = {'schemaVersion': 1, 'machine': args.machine,
                       'profileDigest': result['profileDigest'],
                       'firstmateRevision': result['firstmateRevision'],
                       'installed': {target: digest(data) for target, _, data, _ in planned}}
            atomic_write(receipt_path, (json.dumps(receipt, indent=2) + '\n').encode())
        except (OSError, PersonalError):
            failed = []
            for target, path, data, previous in reversed(written):
                try:
                    safe_path(home, target)
                    if path.read_bytes() != data:
                        raise PersonalError('concurrent edit prevents rollback')
                    if previous is None:
                        path.unlink()
                    else:
                        atomic_write(path, previous)
                except (OSError, PersonalError):
                    failed.append(target)
            if failed:
                raise PersonalError('rollback incomplete; preserved backups require recovery: ' + ', '.join(failed)) from None
            raise
    return result


def private_bytes(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise PersonalError('Telegram configuration must be a private file owned by this user (mode 600)')
        return stream.read()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def telegram_request(config, method, payload):
    token = config.get('token')
    if not isinstance(token, str) or not re.fullmatch(r'[0-9]+:[A-Za-z0-9_-]+', token):
        raise PersonalError('invalid Telegram token configuration')
    endpoint = config.get('apiBase', 'https://api.telegram.org')
    if not isinstance(endpoint, str):
        raise PersonalError('invalid Telegram endpoint')
    parsed = urllib.parse.urlsplit(endpoint)
    if (not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment
            or parsed.path not in ('', '/') or not (parsed.scheme == 'https' or
                (parsed.scheme == 'http' and parsed.hostname in ('127.0.0.1', '::1', 'localhost')))):
        raise PersonalError('Telegram endpoint requires HTTPS (HTTP is only allowed on loopback)')
    request = urllib.request.Request(endpoint.rstrip('/') + '/bot' + token + '/' + method,
                                     data=json.dumps(payload).encode(),
                                     headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=10) as response:
            raw = response.read(1_048_577)
            if len(raw) > 1_048_576:
                raise PersonalError('Telegram response too large; delivery not confirmed')
            body = json.loads(raw)
    except urllib.error.HTTPError as error:
        raise PersonalError(f'Telegram HTTP {error.code}; delivery not confirmed; no automatic retry') from None
    except (OSError, ValueError):
        raise PersonalError('Telegram network or response error; delivery not confirmed; no automatic retry') from None
    if not isinstance(body, dict) or body.get('ok') is not True or 'result' not in body:
        raise PersonalError('Telegram rejected the request; delivery not confirmed')
    return body['result']


def notify(args):
    home = Path(args.home).resolve()
    config = json.loads(private_bytes(safe_path(home, 'config/telegram.json')))
    if not isinstance(config, dict) or type(config.get('chatId')) is not int or config['chatId'] == 0:
        raise PersonalError('Telegram configuration requires a numeric chatId')
    machine = safe_path(home, 'config/personal-machine').read_text().strip()
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}', machine):
        raise PersonalError('invalid local machine identity')
    title = f'Firstmate [{socket.gethostname()}({machine})]'
    body = args.message
    if args.link:
        body += '\n\n' + args.link
    visible = f'{title}\n\n{args.project} · {args.event}\n\n{body}'
    if not args.project.strip() or not args.event.strip() or not args.message.strip() or len(visible.encode('utf-16-le')) // 2 > 4096:
        raise PersonalError('notification needs nonempty project/event/message and at most 4096 UTF-16 characters')
    text = (f'<b>{escape(title, quote=False)}</b>\n\n'
            f'<b>{escape(args.project, quote=False)}</b> · {escape(args.event, quote=False)}\n\n'
            f'{escape(body, quote=False)}')
    payload = {'chat_id': config['chatId'], 'text': text, 'parse_mode': 'HTML',
               'link_preview_options': {'is_disabled': True}}
    result = telegram_request(config, 'sendMessage', payload)
    if not isinstance(result, dict) or type(result.get('message_id')) is not int or result['message_id'] <= 0:
        raise PersonalError('Telegram returned an invalid receipt; delivery not confirmed')
    return {'accepted': True, 'messageId': result['message_id']}


def telegram_setup(args):
    home = Path(args.home).resolve()
    destination = safe_path(home, 'config/telegram.json')
    if destination.exists():
        raise PersonalError('Telegram already configured; existing configuration preserved')
    config = {'token': private_bytes(Path(args.token_file)).decode().strip(),
              'apiBase': args.api_base}
    bot = telegram_request(config, 'getMe', {})
    if not isinstance(bot, dict) or not re.fullmatch(r'[A-Za-z0-9_]+', bot.get('username', '')):
        raise PersonalError('invalid bot identity')
    updates = telegram_request(config, 'getUpdates', {'timeout': 0, 'allowed_updates': ['message']})
    if not isinstance(updates, list):
        raise PersonalError('invalid Telegram chat discovery response')
    chats = set()
    for update in updates:
        message = update.get('message', {}) if isinstance(update, dict) else {}
        chat = message.get('chat', {})
        if chat.get('type') == 'private' and type(chat.get('id')) is int and message.get('text') == '/start':
            chats.add(chat['id'])
    if args.chat_id is not None:
        chats &= {args.chat_id}
    if len(chats) != 1:
        raise PersonalError(f'Open https://t.me/{bot["username"]} and send /start; '
                            'setup requires one private chat (use --chat-id if ambiguous)')
    config['chatId'] = chats.pop()
    atomic_write(destination, (json.dumps(config, indent=2) + '\n').encode())
    return {'configured': True, 'bot': bot['username'], 'chatId': config['chatId'], 'sent': False}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    command = commands.add_parser('sync', help='Preview or apply an explicit profile')
    command.add_argument('--repo', required=True, help='Path to the separate private configuration repository')
    command.add_argument('--home', required=True)
    command.add_argument('--machine', required=True)
    command.add_argument('--apply', action='store_true')
    command.add_argument('--adopt-existing', action='store_true')
    command = commands.add_parser('notify', help='Send one explicit Telegram milestone')
    command.add_argument('--home', required=True)
    command.add_argument('--project', required=True)
    command.add_argument('--event', required=True)
    command.add_argument('--message', required=True)
    command.add_argument('--link')
    command = commands.add_parser('telegram-setup', help='Configure a local bot from a protected token file')
    command.add_argument('--home', required=True)
    command.add_argument('--token-file', required=True)
    command.add_argument('--api-base', default='https://api.telegram.org')
    command.add_argument('--chat-id', type=int)
    args = parser.parse_args(argv)
    try:
        result = {'sync': sync, 'notify': notify, 'telegram-setup': telegram_setup}[args.command](args)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (PersonalError, OSError, ValueError, KeyError) as error:
        print(f'firstmate-personal: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
