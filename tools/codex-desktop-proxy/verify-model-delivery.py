#!/usr/bin/env python3
"""Verify outbound developer roles using the real backend and a local model stub."""
import argparse
import hashlib
import http.server
import json
import os
from pathlib import Path
import queue
import subprocess
import tempfile
import threading
import time
import tomllib


CAPTURES = queue.Queue()
HOST = "DESKTOP_HOST_RULES_MUST_REMAIN_673291"


class Endpoint(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        CAPTURES.put(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        self.send_response(400)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"error":{"message":"intentional local probe stop"}}')

    def log_message(self, *_):
        pass


class Client:
    def __init__(self, proxy, binary, home, workspace):
        environment = os.environ.copy()
        environment.pop("CODEX_FIXES_PROXY_ACTIVE", None)
        environment.update(CODEX_HOME=str(home), CODEX_FIXES_REAL_CODEX=str(binary),
                           CODEX_SQLITE_HOME=str(home / "sqlite"),
                           XDG_STATE_HOME=str(home / "proxy-state"))
        self.process = subprocess.Popen(
            [str(proxy), "app-server", "--listen", "stdio://"],
            cwd=workspace, env=environment, stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
        )
        self.messages = queue.Queue()
        self.sequence = 0
        self.reader = threading.Thread(target=self.consume, daemon=True)
        self.reader.start()
        self.rpc("initialize", {"clientInfo": {"name": "a1_delivery_probe", "version": "1"},
                                "capabilities": {"experimentalApi": True}})
        self.send({"method": "initialized", "params": {}})

    def consume(self):
        for line in self.process.stdout:
            self.messages.put(json.loads(line))
        self.messages.put(None)

    def send(self, message):
        self.process.stdin.write(json.dumps(message) + "\n")
        self.process.stdin.flush()

    def rpc(self, method, params):
        self.sequence += 1
        self.send({"id": self.sequence, "method": method, "params": params})
        deadline = time.monotonic() + 20
        while True:
            message = self.messages.get(timeout=max(0.01, deadline - time.monotonic()))
            if message is None:
                raise RuntimeError("backend exited during " + method)
            if message.get("id") == self.sequence:
                if "error" in message:
                    raise RuntimeError("backend rejected " + method)
                return message["result"]

    def capture(self, thread_id, expected):
        self.rpc("turn/start", {"threadId": thread_id, "input": [
            {"type": "text", "text": "Reply OK.", "text_elements": []},
        ]})
        body = CAPTURES.get(timeout=20)
        roles = [json.dumps(item, ensure_ascii=False) for item in body["input"]
                 if item.get("role") == "developer"]
        # Decode content strings, avoiding escaped newlines in the JSON representation.
        def texts(value):
            if isinstance(value, str):
                return [value]
            if isinstance(value, list):
                return [text for item in value for text in texts(item)]
            if isinstance(value, dict):
                return [text for item in value.values() for text in texts(item)]
            return []
        developer = "\n".join(text for item in body["input"]
                               if item.get("role") == "developer" for text in texts(item.get("content")))
        if HOST not in developer or expected not in developer:
            raise AssertionError("outbound developer role is missing complete host or configured instructions")
        return {"developer_roles": len(roles), "configured_chars": len(expected),
                "configured_sha256": hashlib.sha256(expected.encode()).hexdigest(),
                "complete_config_present": True, "host_present": True}

    def close(self):
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)
        self.process.stdin.close()
        self.reader.join(timeout=1)
        self.process.stdout.close()


def verify(proxy, binary, instructions):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Endpoint)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with tempfile.TemporaryDirectory(prefix="codex-a1-model-") as folder:
            root = Path(folder)
            home, workspace = root / "home", root / "workspace"
            home.mkdir()
            workspace.mkdir()
            config = (
                'model = "diagnostic-model"\nmodel_provider = "local_probe"\n'
                f'developer_instructions = {json.dumps(instructions, ensure_ascii=False)}\n'
                'approval_policy = "never"\nsandbox_mode = "read-only"\n'
                '[analytics]\nenabled = false\n'
                '[model_providers.local_probe]\nname = "Local credential-free probe"\n'
                f'base_url = "http://127.0.0.1:{server.server_port}/v1"\n'
                'wire_api = "responses"\nrequires_openai_auth = false\n'
                'request_max_retries = 0\nstream_max_retries = 0\n'
            )
            (home / "config.toml").write_text(config)
            source_id = None
            for method in ("thread/start", "thread/resume", "thread/fork"):
                client = Client(proxy, binary, home, workspace)
                try:
                    params = {"developerInstructions": HOST}
                    if source_id:
                        params["threadId"] = source_id
                    else:
                        params["cwd"] = str(workspace)
                    thread_id = client.rpc(method, params)["thread"]["id"]
                    source_id = source_id or thread_id
                    results.append({"method": method, **client.capture(thread_id, instructions)})
                finally:
                    client.close()
            override = "EXPLICIT_REQUEST_OVERRIDE_927835"
            client = Client(proxy, binary, home, workspace)
            try:
                thread_id = client.rpc("thread/start", {
                    "cwd": str(workspace), "ephemeral": True, "developerInstructions": HOST,
                    "config": {"developer_instructions": override},
                })["thread"]["id"]
                results.append({"method": "thread/start + config override", **client.capture(thread_id, override)})
            finally:
                client.close()
            (workspace / ".git").mkdir()
            (workspace / ".codex").mkdir()
            project_instructions = "TRUSTED_PROJECT_DEVELOPER_RULES_583912"
            (workspace / ".codex/config.toml").write_text(
                f"developer_instructions = {json.dumps(project_instructions)}\n")
            for trust in ("untrusted", "trusted"):
                (home / "config.toml").write_text(config +
                    f"\n[projects.{json.dumps(str(workspace))}]\ntrust_level = {json.dumps(trust)}\n")
                client = Client(proxy, binary, home, workspace)
                try:
                    thread_id = client.rpc("thread/start", {
                        "cwd": str(workspace), "ephemeral": True, "developerInstructions": HOST,
                    })["thread"]["id"]
                    expected = project_instructions if trust == "trusted" else instructions
                    results.append({"method": "thread/start + " + trust + " project",
                                    **client.capture(thread_id, expected)})
                finally:
                    client.close()
    finally:
        server.shutdown()
        server.server_close()
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--proxy", type=Path, default=Path(__file__).with_name("codex-app-server-proxy"))
    parser.add_argument("--instruction-config", type=Path, required=True)
    arguments = parser.parse_args()
    with arguments.instruction_config.open("rb") as source:
        instructions = tomllib.load(source)["developer_instructions"]
    result = {"binary": str(arguments.binary), "proxy": str(arguments.proxy),
              "scope": "isolated config and state; credential-free localhost model stub",
              "results": verify(arguments.proxy.resolve(), arguments.binary.resolve(), instructions)}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
