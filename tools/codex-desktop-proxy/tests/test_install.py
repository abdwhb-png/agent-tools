import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("a1_install", ROOT / "install.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "canonical"
        self.destination = self.root / "CodexFixes"
        self.source.mkdir()
        (self.destination / "source").mkdir(parents=True)
        self.original = b"original WSL path proxy\n"
        self.replacement = b"new A1 proxy\n"
        installer.UPSTREAM_SHA256 = installer.digest(self.original) if hasattr(installer, "digest") else ""
        self.targets = [self.destination / "codex-app-server-proxy",
                        self.destination / "source/codex-app-server-proxy"]
        for target in self.targets:
            target.write_bytes(self.original)
            target.chmod(0o755)
        (self.source / "codex-app-server-proxy").write_bytes(self.replacement)
        (self.source / "README.md").write_text("A1 installation guide\n")

    def test_install_and_rollback_preserve_original_fix(self):
        backup = installer.install(self.source, self.destination)
        for target in self.targets:
            self.assertEqual(target.read_bytes(), self.replacement)
            self.assertTrue(target.stat().st_mode & 0o111)
        self.assertEqual((self.destination / "A1-INSTRUCTIONS.md").read_text(), "A1 installation guide\n")
        installer.rollback(backup)
        for target in self.targets:
            self.assertEqual(target.read_bytes(), self.original)
        self.assertFalse((self.destination / "A1-INSTRUCTIONS.md").exists())
        self.assertFalse((self.destination / "instruction-merge-installation.json").exists())

    def test_unknown_local_edits_are_rejected_before_mutation(self):
        self.targets[1].write_bytes(b"local customization")
        with self.assertRaisesRegex(ValueError, "unrecognized"):
            installer.install(self.source, self.destination)
        self.assertEqual(self.targets[0].read_bytes(), self.original)
        self.assertFalse((self.destination / "backups").exists())

    def test_repeat_install_is_idempotent(self):
        backup = installer.install(self.source, self.destination)
        self.assertEqual(installer.install(self.source, self.destination), backup)
        self.assertEqual(len(list((self.destination / "backups").iterdir())), 1)

    def test_rollback_refuses_subsequent_proxy_edits(self):
        backup = installer.install(self.source, self.destination)
        self.targets[0].write_bytes(b"subsequent edit")
        with self.assertRaisesRegex(ValueError, "changed"):
            installer.rollback(backup)
        self.assertEqual(self.targets[1].read_bytes(), self.replacement)

    def test_upgrade_rollback_restores_previous_installation(self):
        first = installer.install(self.source, self.destination)
        previous_manifest = (self.destination / "instruction-merge-installation.json").read_bytes()
        (self.source / "codex-app-server-proxy").write_bytes(b"A1 version two\n")
        second = installer.install(self.source, self.destination)
        installer.rollback(second)
        self.assertEqual(self.targets[0].read_bytes(), self.replacement)
        self.assertEqual((self.destination / "instruction-merge-installation.json").read_bytes(), previous_manifest)
        installer.rollback(first)
        self.assertEqual(self.targets[0].read_bytes(), self.original)

    def test_failed_install_restores_both_copies(self):
        real_write = installer.atomic_write
        failed = False

        def fail_once(path, content, mode=0o644):
            nonlocal failed
            if path == self.targets[1] and content == self.replacement and not failed:
                failed = True
                raise OSError("simulated filesystem failure")
            return real_write(path, content, mode)

        installer.atomic_write = fail_once
        self.addCleanup(setattr, installer, "atomic_write", real_write)
        with self.assertRaisesRegex(OSError, "simulated"):
            installer.install(self.source, self.destination)
        for target in self.targets:
            self.assertEqual(target.read_bytes(), self.original)

    def test_symlink_destination_is_rejected(self):
        other = self.root / "other"
        other.write_bytes(self.original)
        self.targets[1].unlink()
        self.targets[1].symlink_to(other)
        with self.assertRaisesRegex(ValueError, "symlink"):
            installer.install(self.source, self.destination)
        self.assertEqual(other.read_bytes(), self.original)

    def test_corrupted_backup_is_rejected_before_mutation(self):
        backup = installer.install(self.source, self.destination)
        (backup / "files/codex-app-server-proxy").write_bytes(b"corrupt backup")
        with self.assertRaisesRegex(ValueError, "backup"):
            installer.rollback(backup)
        self.assertEqual(self.targets[0].read_bytes(), self.replacement)

    def test_failed_rollback_restores_installation_and_can_be_retried(self):
        backup = installer.install(self.source, self.destination)
        real_write = installer.atomic_write
        failed = False

        def fail_once(path, content, mode=0o644):
            nonlocal failed
            if path == self.targets[1] and content == self.original and not failed:
                failed = True
                raise OSError("simulated rollback failure")
            return real_write(path, content, mode)

        installer.atomic_write = fail_once
        self.addCleanup(setattr, installer, "atomic_write", real_write)
        with self.assertRaisesRegex(OSError, "simulated"):
            installer.rollback(backup)
        for target in self.targets:
            self.assertEqual(target.read_bytes(), self.replacement)
        installer.rollback(backup)
        self.assertEqual(self.targets[0].read_bytes(), self.original)
