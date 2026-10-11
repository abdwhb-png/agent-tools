#!/usr/bin/env python3
"""JSON-RPC external-boundary fixture; never implements instruction merging."""
import json
import os
from pathlib import Path
import sys
import threading
import time


output_lock = threading.Lock()
deferred = None


def emit(value):
    with output_lock:
        sys.stdout.write(json.dumps(value) + "\n")
        sys.stdout.flush()


def config_result(request, settings):
    configured = settings.get("by_cwd", {}).get(
        request.get("params", {}).get("cwd"), settings.get("instructions"),
    )
    return {"id": request["id"], "result": {"config": {"developer_instructions": configured}}}


def delayed_config(request, settings):
    time.sleep(settings["delay"])
    emit(config_result(request, settings))


def delayed_metadata(request, settings):
    time.sleep(settings["thread_delay"])
    emit({"id": request["id"], "result": {"thread": {"cwd": settings.get("thread_cwd", "/saved-workspace")}}})


def delayed_exit():
    time.sleep(0.1)
    os._exit(0)


for line in sys.stdin.buffer:
    message = json.loads(line)
    settings = json.loads(Path(os.environ["PROXY_TEST_SETTINGS"]).read_text())
    with Path(os.environ["PROXY_TEST_SETTINGS"]).with_suffix(".trace").open("a") as trace:
        trace.write(json.dumps(message) + "\n")
    method = message.get("method")
    if method == "config/read":
        if settings.get("mode") == "error":
            emit({"id": message["id"], "error": {"code": -32603, "message": "SECRET_BACKEND_ERROR"}})
            continue
        if settings.get("mode") == "exit":
            raise SystemExit(0)
        if settings.get("mode") == "silent":
            continue
        if settings.get("mode") == "delay_exit":
            threading.Thread(target=delayed_exit, daemon=True).start()
            continue
        if settings.get("mode") == "delay":
            threading.Thread(target=delayed_config, args=(message, settings), daemon=True).start()
            continue
        if settings.get("mode") == "defer":
            deferred = (message, settings)
            emit({"id": "approval", "method": "test/approval", "params": {}})
            continue
        if settings.get("mode") == "malformed":
            emit({"id": message["id"], "result": {"config": []}})
            continue
        emit(config_result(message, settings))
        continue
    elif method == "thread/read":
        if settings.get("thread_delay"):
            threading.Thread(target=delayed_metadata, args=(message, settings), daemon=True).start()
            continue
        result = {"thread": {"cwd": settings.get("thread_cwd", "/saved-workspace")}}
    elif "method" in message and "id" in message:
        result = {"params": message.get("params"), "method": method, "wire": line.decode()}
    elif message.get("id") == "approval" and deferred:
        emit(config_result(*deferred))
        deferred = None
        continue
    else:
        continue
    emit({"id": message["id"], "result": result})
