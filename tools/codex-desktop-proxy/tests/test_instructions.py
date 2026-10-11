from __future__ import annotations

import json
import os
from pathlib import Path
import queue
import subprocess
import tempfile
import threading
import unittest


ROOT = Path(__file__).resolve().parents[1]
PROXY = ROOT / "codex-app-server-proxy"
FAKE_BACKEND = Path(__file__).with_name("fake_backend.py")


class ProxyClient:
    """Run the real proxy against a controllable external JSON-RPC backend."""

    def __init__(self, folder: Path, settings: dict | None = None):
        self.folder = folder
        self.settings = folder / "settings.json"
        self.settings.write_text(json.dumps(settings or {"instructions": "CONFIG RULES"}))
        environment = os.environ.copy()
        environment.pop("CODEX_FIXES_PROXY_ACTIVE", None)
        environment.update(
            CODEX_FIXES_REAL_CODEX=str(FAKE_BACKEND),
            PROXY_TEST_SETTINGS=str(self.settings),
            XDG_STATE_HOME=str(folder / "state"),
        )
        self.process = subprocess.Popen(
            [str(PROXY), "app-server"], env=environment,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        self.messages: queue.Queue = queue.Queue()
        self.stderr = bytearray()

        def consume():
            for line in self.process.stdout:
                self.messages.put(line)
            self.messages.put(None)

        def errors():
            self.stderr.extend(self.process.stderr.read())

        self.reader = threading.Thread(target=consume, daemon=True)
        self.error_reader = threading.Thread(target=errors, daemon=True)
        self.reader.start()
        self.error_reader.start()

    def send(self, value: dict):
        self.send_wire(json.dumps(value).encode() + b"\n")

    def send_wire(self, line: bytes):
        self.process.stdin.write(line)
        self.process.stdin.flush()

    def receive(self, timeout: float = 3):
        line = self.messages.get(timeout=timeout)
        if line is None:
            raise AssertionError(f"proxy exited ({self.process.poll()})")
        return json.loads(line)

    def request(self, method="thread/start", params=None, request_id=1):
        self.send({"id": request_id, "method": method, "params": params or {
            "cwd": "/workspace", "developerInstructions": "DESKTOP RULES",
        }})
        while True:
            result = self.receive()
            if result.get("id") == request_id and "method" not in result:
                return result

    def close(self):
        if not self.process.stdin.closed:
            try:
                self.process.stdin.close()
            except BrokenPipeError:
                pass
        try:
            self.process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            self.process.wait(timeout=3)
        self.reader.join(timeout=1)
        self.error_reader.join(timeout=1)
        self.process.stdout.close()
        self.process.stderr.close()


class InstructionDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.folder = Path(self.temporary.name)
        self.client = ProxyClient(self.folder)
        self.addCleanup(self.temporary.cleanup)
        self.addCleanup(self.client.close)

    def test_config_instructions_survive_desktop_thread_override(self):
        response = self.client.request()
        delivered = response["result"]["params"]["developerInstructions"]
        self.assertIn("CONFIG RULES", delivered)
        self.assertTrue(delivered.startswith("DESKTOP RULES"))
        self.assertEqual(delivered.count("CONFIG RULES"), 1)

    def configure(self, settings):
        self.client.settings.write_text(json.dumps(settings))

    def trace(self):
        filename = self.client.settings.with_suffix(".trace")
        return [json.loads(line) for line in filename.read_text().splitlines()] if filename.exists() else []

    def test_resume_and_fork_resolve_configuration_from_source_metadata(self):
        self.configure({"instructions": "WRONG DEFAULT", "thread_cwd": "/source",
                        "by_cwd": {"/source": "SOURCE RULES"}})
        for method in ["thread/resume", "thread/fork"]:
            with self.subTest(method=method):
                result = self.client.request(method, {"threadId": "source", "developerInstructions": "HOST"})
                self.assertIn("SOURCE RULES", result["result"]["params"]["developerInstructions"])
                self.assertNotIn("WRONG DEFAULT", result["result"]["params"]["developerInstructions"])

    def test_explicit_cwd_wins_over_source_metadata(self):
        self.configure({"instructions": "WRONG DEFAULT", "by_cwd": {"/new": "NEW RULES"}})
        result = self.client.request("thread/fork", {"threadId": "source", "cwd": "/new", "developerInstructions": "HOST"})
        self.assertIn("NEW RULES", result["result"]["params"]["developerInstructions"])
        self.assertNotIn("thread/read", [item.get("method") for item in self.trace()])

    def test_start_without_cwd_uses_backend_default(self):
        result = self.client.request(params={"developerInstructions": "HOST"})
        self.assertIn("CONFIG RULES", result["result"]["params"]["developerInstructions"])
        self.assertNotIn("cwd", self.trace()[0]["params"])

    def test_explicit_developer_config_override_is_preserved(self):
        params = {"cwd": "/workspace", "developerInstructions": "HOST",
                  "config": {"developer_instructions": "EXPLICIT RULES", "model": "keep-model"}}
        result = self.client.request(params=params)
        delivered = result["result"]["params"]
        self.assertIn("EXPLICIT RULES", delivered["developerInstructions"])
        self.assertNotIn("CONFIG RULES", delivered["developerInstructions"])
        self.assertEqual(delivered["config"], params["config"])

    def test_empty_configuration_preserves_host_and_wire_bytes(self):
        for configured in [None, ""]:
            with self.subTest(configured=configured):
                self.configure({"instructions": configured})
                wire = b'{ "id": "public", "method": "thread/start", "params": {"developerInstructions":"HOST"}}\r\n'
                self.client.send_wire(wire)
                result = self.client.receive()["result"]
                self.assertEqual(result["params"]["developerInstructions"], "HOST")
                self.assertEqual(result["wire"].encode(), wire)

    def test_absent_or_null_host_override_is_forwarded_without_queries(self):
        for params in [{"cwd": "/workspace"}, {"developerInstructions": None}]:
            with self.subTest(params=params):
                result = self.client.request(params=params)
                self.assertEqual(result["result"]["params"], params)
        self.assertEqual([item["method"] for item in self.trace()], ["thread/start", "thread/start"])

    def test_existing_config_text_is_not_duplicated(self):
        result = self.client.request(params={"developerInstructions": "HOST\nCONFIG RULES"})
        self.assertEqual(result["result"]["params"]["developerInstructions"], "HOST\nCONFIG RULES")

    def test_managed_block_is_idempotent_and_refreshes_after_configuration_change(self):
        first = self.client.request()["result"]["params"]["developerInstructions"]
        second = self.client.request(params={"developerInstructions": first})["result"]["params"]["developerInstructions"]
        self.assertEqual(first, second)
        self.configure({"instructions": "NOUVELLES RÈGLES\n\n完整规则"})
        updated = self.client.request(params={"developerInstructions": first + "\nADDITIONAL HOST"})["result"]["params"]["developerInstructions"]
        self.assertNotIn("CONFIG RULES", updated)
        self.assertIn("DESKTOP RULES\nADDITIONAL HOST", updated)
        self.assertEqual(updated.count("NOUVELLES RÈGLES\n\n完整规则"), 1)
        self.assertEqual(updated.count("<!-- codex-fixes:developer-instructions "), 1)

    def test_block_delimiter_inside_config_is_retained_exactly(self):
        configured = "Explain <!-- /codex-fixes:developer-instructions --> precisely.\n"
        self.configure({"instructions": configured})
        first = self.client.request()["result"]["params"]["developerInstructions"]
        second = self.client.request(params={"developerInstructions": first})["result"]["params"]["developerInstructions"]
        self.assertEqual(first, second)
        self.assertIn(configured, second)

    def test_empty_configuration_removes_previous_managed_block(self):
        first = self.client.request()["result"]["params"]["developerInstructions"]
        self.configure({"instructions": ""})
        updated = self.client.request(params={"developerInstructions": first})
        self.assertEqual(updated["result"]["params"]["developerInstructions"], "DESKTOP RULES")

    def test_configuration_errors_fail_closed_without_leaking_backend_error(self):
        for mode in ["error", "malformed", "exit"]:
            with self.subTest(mode=mode):
                temporary = tempfile.TemporaryDirectory()
                self.addCleanup(temporary.cleanup)
                client = ProxyClient(Path(temporary.name), {"mode": mode, "instructions": "CONFIG RULES"})
                self.addCleanup(client.close)
                result = client.request(request_id="client-error")
                self.assertEqual(result["id"], "client-error")
                self.assertIn("error", result)
                self.assertNotIn("SECRET_BACKEND_ERROR", json.dumps(result))
                trace = client.settings.with_suffix(".trace").read_text()
                self.assertNotIn('"method": "thread/start"', trace)

    def test_invalid_instruction_types_fail_closed(self):
        for configured in [42, {}, []]:
            self.configure({"instructions": configured})
            result = self.client.request()
            self.assertIn("error", result)
        self.assertNotIn("thread/start", [item["method"] for item in self.trace()])

    def test_corrupted_managed_block_is_rejected(self):
        managed = self.client.request()["result"]["params"]["developerInstructions"]
        corrupt = managed.replace("CONFIG RULES", "BROKEN RULES")
        result = self.client.request(params={"developerInstructions": corrupt})
        self.assertIn("invalid", result["error"]["message"])
        self.assertEqual(sum(item["method"] == "thread/start" for item in self.trace()), 1)

    def test_invalid_explicit_override_is_rejected(self):
        for value in [None, 42, {}]:
            result = self.client.request(params={"developerInstructions": "HOST", "config": {
                "developer_instructions": value,
            }})
            self.assertIn("override must be a string", result["error"]["message"])
        self.assertNotIn("thread/start", [item["method"] for item in self.trace()])

    def test_missing_source_cwd_is_rejected(self):
        self.configure({"thread_cwd": None})
        result = self.client.request("thread/fork", {"threadId": "source", "developerInstructions": "HOST"})
        self.assertIn("source cwd", result["error"]["message"])
        self.assertEqual([item["method"] for item in self.trace()], ["thread/read"])

    def test_path_and_history_resume_require_explicit_cwd(self):
        for field, value in [("path", "/history/file.jsonl"), ("history", [])]:
            result = self.client.request("thread/resume", {
                "threadId": "source", "developerInstructions": "HOST", field: value,
            })
            self.assertIn("error", result)
            self.assertIn("explicit cwd", result["error"]["message"])
        self.assertEqual(self.trace(), [])

    def test_client_replies_and_unrelated_requests_flow_during_resolution(self):
        self.configure({"mode": "defer", "instructions": "CONFIG RULES"})
        self.client.send({"id": "thread", "method": "thread/start", "params": {"developerInstructions": "HOST"}})
        approval = self.client.receive()
        self.assertEqual(approval["method"], "test/approval")
        self.client.send({"id": "codex-fixes:public", "method": "status/probe", "params": {}})
        probe = self.client.receive()
        self.assertEqual(probe["id"], "codex-fixes:public")
        self.client.send({"id": approval["id"], "result": {"approved": True}})
        result = self.client.receive()
        self.assertEqual(result["id"], "thread")
        self.assertIn("CONFIG RULES", result["result"]["params"]["developerInstructions"])

    def test_concurrent_requests_keep_caller_ids_and_hide_internal_responses(self):
        for request_id in [1, "two", "codex-fixes:public"]:
            self.client.send({"id": request_id, "method": "thread/start", "params": {"developerInstructions": "HOST"}})
        received = [self.client.receive() for _ in range(3)]
        self.assertEqual({item["id"] for item in received}, {1, "two", "codex-fixes:public"})
        for item in received:
            self.assertIn("CONFIG RULES", item["result"]["params"]["developerInstructions"])

    def test_client_eof_waits_for_resolution_and_forwards_original_request(self):
        self.client.send({"id": 91, "method": "thread/start", "params": {"developerInstructions": "HOST"}})
        self.client.process.stdin.close()
        response = self.client.receive()
        self.assertEqual(response["id"], 91)
        self.assertIn("CONFIG RULES", response["result"]["params"]["developerInstructions"])

    def test_slow_configuration_keeps_requests_flowing_and_completes_resume(self):
        self.configure({"mode": "delay", "delay": 10.3, "instructions": "CONFIG RULES"})
        self.client.send({"id": 81, "method": "thread/resume", "params": {
            "threadId": "source", "developerInstructions": "HOST",
        }})
        self.client.send({"id": 82, "method": "status/probe", "params": {}})
        self.assertEqual(self.client.receive()["id"], 82)
        response = self.client.receive(timeout=12)
        self.assertEqual(response["id"], 81)
        self.assertNotIn("error", response)
        self.assertIn("CONFIG RULES", response["result"]["params"]["developerInstructions"])
        with self.assertRaises(queue.Empty):
            self.client.messages.get(timeout=0.1)
        self.assertEqual(sum(item.get("method") == "thread/resume" for item in self.trace()), 1)

    def test_logs_contain_fingerprint_but_not_instruction_text(self):
        self.client.request()
        log = (self.folder / "state/codex-fixes/proxy.log").read_text()
        self.assertIn("sha256=", log)
        self.assertNotIn("CONFIG RULES", log)
        self.assertNotIn("DESKTOP RULES", log)

    def test_slow_metadata_and_configuration_complete_without_combined_deadline(self):
        self.configure({"mode": "delay", "delay": 6, "thread_delay": 6, "instructions": "CONFIG RULES"})
        self.client.send({"id": 83, "method": "thread/resume", "params": {
            "threadId": "source", "developerInstructions": "HOST",
        }})
        response = self.client.receive(timeout=14)
        self.assertEqual(response["id"], 83)
        self.assertNotIn("error", response)
        self.assertIn("CONFIG RULES", response["result"]["params"]["developerInstructions"])

    def test_backend_disconnect_while_waiting_fails_without_forwarding_resume(self):
        self.configure({"mode": "delay_exit", "instructions": "CONFIG RULES"})
        response = self.client.request("thread/resume", {"threadId": "source", "developerInstructions": "HOST"})
        self.assertIn("backend closed", response["error"]["message"])
        self.assertNotIn("thread/resume", [item.get("method") for item in self.trace()])


if __name__ == "__main__":
    unittest.main()
