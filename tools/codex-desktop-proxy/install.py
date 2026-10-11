#!/usr/bin/env python3
"""Install or roll back A1 while retaining the original WSL path proxy."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import tempfile
import uuid


UPSTREAM_SHA256 = "1c6f75bbe033944cec8745525f0f83e0410eecbd3738d8c752f0180721faa8ae"
PROXIES = ("codex-app-server-proxy", "source/codex-app-server-proxy")
GUIDE = "A1-INSTRUCTIONS.md"
RECORD = "instruction-merge-installation.json"
FILES = (*PROXIES, GUIDE, RECORD)


def digest(content):
    return hashlib.sha256(content).hexdigest()


def atomic_write(path, content, mode=0o644):
    descriptor, temporary = tempfile.mkstemp(prefix=".a1-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
            os.fchmod(output.fileno(), mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def checked_root(destination):
    destination = Path(destination).absolute()
    for path in (destination, destination / "source", destination / "backups",
                 *(destination / name for name in FILES)):
        if path.is_symlink():
            raise ValueError(f"symlink installation path: {path}")
    return destination.resolve(strict=True)


def encode(value):
    return (json.dumps(value, indent=2) + "\n").encode()


def restore(destination, backup, snapshots, transactional=False):
    # Validate every saved file before writing any destination.
    contents = {}
    if set(snapshots) != set(FILES):
        raise ValueError("invalid backup file set")
    for directory in (backup / "files", backup / "files/source"):
        if directory.is_symlink():
            raise ValueError("symlink backup directory")
    for name, metadata in snapshots.items():
        if metadata is not None:
            saved = backup / "files" / name
            if saved.is_symlink():
                raise ValueError("symlink backup file")
            content = saved.read_bytes()
            if digest(content) != metadata["sha256"]:
                raise ValueError("backup checksum mismatch: " + name)
            contents[name] = content
    current = {}
    if transactional:
        for name in FILES:
            target = destination / name
            current[name] = (target.read_bytes(), target.stat().st_mode & 0o777) if target.exists() else None
    try:
        for name, metadata in snapshots.items():
            target = destination / name
            if metadata is None:
                target.unlink(missing_ok=True)
            else:
                atomic_write(target, contents[name], metadata["mode"])
    except Exception:
        if transactional:
            for name, saved in current.items():
                if saved is None:
                    (destination / name).unlink(missing_ok=True)
                else:
                    atomic_write(destination / name, *saved)
        raise


def install(source, destination):
    source = Path(source).resolve(strict=True)
    destination = checked_root(destination)
    proxy = (source / PROXIES[0]).read_bytes()
    guide = (source / "README.md").read_bytes()
    previous = None
    if (destination / RECORD).exists():
        previous = json.loads((destination / RECORD).read_bytes())
        if previous.get("destination") != str(destination):
            raise ValueError("unrecognized installation ownership")
    for name in PROXIES:
        current = digest((destination / name).read_bytes())
        expected = previous["installed"][name] if previous else UPSTREAM_SHA256
        if current != expected:
            raise ValueError("unrecognized proxy contents: " + name)
    if (destination / GUIDE).exists():
        if previous is None or digest((destination / GUIDE).read_bytes()) != previous["installed"][GUIDE]:
            raise ValueError("unrecognized A1 guide contents")
    replacements = {PROXIES[0]: proxy, PROXIES[1]: proxy, GUIDE: guide}
    hashes = {name: digest(content) for name, content in replacements.items()}
    if previous and previous["installed"] == hashes:
        return Path(previous["backup"])

    identifier = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    backup = destination / "backups" / ("instruction-merge-" + identifier)
    (backup / "files/source").mkdir(parents=True)
    snapshots = {}
    for name in FILES:
        target = destination / name
        if target.exists():
            content = target.read_bytes()
            mode = target.stat().st_mode & 0o777
            snapshots[name] = {"sha256": digest(content), "mode": mode}
            atomic_write(backup / "files" / name, content, mode)
        else:
            snapshots[name] = None
    metadata = {"destination": str(destination), "snapshots": snapshots, "installed": hashes}
    atomic_write(backup / "backup.json", encode(metadata))
    record = {"destination": str(destination), "source": str(source), "backup": str(backup),
              "installed": hashes, "created_at": identifier,
              "upstream_sha256": UPSTREAM_SHA256}
    try:
        for name, content in replacements.items():
            mode = snapshots[name]["mode"] if snapshots[name] else 0o644
            atomic_write(destination / name, content, mode)
        atomic_write(destination / RECORD, encode(record))
    except Exception:
        restore(destination, backup, snapshots)
        raise
    return backup


def rollback(backup):
    raw_backup = Path(backup).absolute()
    if raw_backup.is_symlink():
        raise ValueError("symlink backup directory")
    backup = raw_backup.resolve(strict=True)
    metadata = json.loads((backup / "backup.json").read_bytes())
    destination = checked_root(metadata["destination"])
    if backup.parent != destination / "backups" or not backup.name.startswith("instruction-merge-"):
        raise ValueError("backup is outside its installation")
    record = json.loads((destination / RECORD).read_bytes())
    if record.get("backup") != str(backup) or record.get("installed") != metadata["installed"]:
        raise ValueError("installation changed since this backup")
    for name in (*PROXIES, GUIDE):
        if digest((destination / name).read_bytes()) != metadata["installed"][name]:
            raise ValueError("installed file changed: " + name)
    restore(destination, backup, metadata["snapshots"], transactional=True)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    installation = commands.add_parser("install")
    installation.add_argument("--install-dir", type=Path, required=True)
    removal = commands.add_parser("rollback")
    removal.add_argument("--backup", type=Path, required=True)
    arguments = parser.parse_args()
    if arguments.command == "install":
        backup = install(Path(__file__).parent, arguments.install_dir)
        print(json.dumps({"status": "installed", "backup": str(backup), "restart_required": True}))
    else:
        print(json.dumps({"status": "restored", "destination": str(rollback(arguments.backup)),
                          "restart_required": True}))


if __name__ == "__main__":
    main()
