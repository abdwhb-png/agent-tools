import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateArtifact as validateModule } from "../src/validate.js";

// Every fixture exercises both the exported module and the delivered Node binary.
async function validateArtifact(path: string) {
  const report = await validateModule(path);
  const cli = resolve(dirname(fileURLToPath(import.meta.url)), "../scripts/validate.mjs");
  const invocation = spawnSync("node", [cli, path, "--json"], {
    cwd: tmpdir(),
    encoding: "utf8",
    timeout: 5000,
  });
  expect(invocation.status).toBe(report.exitCode);
  expect(JSON.parse(invocation.stdout)).toEqual({ valid: report.valid, issues: report.issues });
  expect(invocation.stderr).toBe("");
  return report;
}

const temporaryRoots: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "mission-validator-test-"));
  temporaryRoots.push(root);
  function write(relative: string, value: unknown, body?: string) {
    const file = join(root, relative);
    mkdirSync(dirname(file), { recursive: true });
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    writeFileSync(file, body === undefined ? text : `---\n${text}\n---\n${body}\n`);
    return file;
  }
  return { root, write };
}

function missionFixture() {
  const f = fixture();
  f.write(
    "docs/missions/m1/r1.md",
    { schemaVersion: 1, kind: "mission", id: "m1", revision: 1, repository: "../../.." },
    "# Mission",
  );
  const mission = { kind: "mission", id: "m1", revision: 1, path: "../../docs/missions/m1/r1.md" };
  const packetRef = { kind: "packet", id: "p1", revision: 1, path: "packet.md" };
  const packet = {
    schemaVersion: 1,
    kind: "packet",
    id: "p1",
    revision: 1,
    mission,
    baseCommit: "a".repeat(40),
  };
  f.write(".missions/m1/packet.md", packet, "# Assignment");
  const event = {
    schemaVersion: 1,
    kind: "event",
    sequence: 1,
    stateRevision: 1,
    at: "2026-09-23T12:00:00Z",
    actor: "user",
    mission,
    status: "draft",
    interruption: null,
    reason: "Prepare mission",
    evidence: [],
  };
  f.write(".missions/m1/history.jsonl", `${JSON.stringify(event)}\n`);
  const state = {
    schemaVersion: 1,
    kind: "state",
    id: "m1",
    revision: 1,
    mission,
    status: "draft",
    interruption: null,
    history: "history.jsonl",
    lastSequence: 1,
    currentPacket: null as typeof packetRef | null,
    attempts: [{ packet: packetRef, result: null }],
    checkpoints: [],
    evidence: [],
    validation: null,
  };
  const path = f.write(".missions/m1/state.json", state);
  return { ...f, mission, packetRef, packet, event, state, path };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("accepts a versioned mission contract at the public module boundary", async () => {
  const { write } = fixture();
  const path = write(
    "docs/missions/m1/r1.md",
    {
      schemaVersion: 1,
      kind: "mission",
      id: "m1",
      revision: 1,
      repository: "../../..",
      refs: [],
    },
    "# Mission\n\n## Outcome\nReturn an explicit failure for invalid input.",
  );
  expect(await validateArtifact(path)).toEqual({ valid: true, issues: [], exitCode: 0 });
});

test.each([
  { schemaVersion: 2, kind: "mission", id: "m1", revision: 1, repository: "." },
  { schemaVersion: 1, kind: "unknown", id: "m1", revision: 1 },
  { schemaVersion: 1, kind: "mission", id: "", revision: 1, repository: "." },
  { schemaVersion: 1, kind: "mission", id: "m1", revision: 0, repository: "." },
  { schemaVersion: 1, kind: "mission", id: "m1", revision: 1 },
  null,
])("rejects unsupported or incomplete metadata: %j", async (metadata) => {
  const { write } = fixture();
  const path = write("contract.md", metadata, "# Mission");
  const report = await validateArtifact(path);
  expect(report.valid).toBe(false);
  expect(report.exitCode).toBe(1);
  expect(report.issues.some((issue) => issue.rule === "schema")).toBe(true);
});

test("distinguishes malformed input from an unreadable entrypoint", async () => {
  const { write, root } = fixture();
  expect((await validateArtifact(write("bad.md", "---\nkind: mission\n---\nText"))).exitCode).toBe(
    1,
  );
  expect((await validateArtifact(join(root, "missing.md"))).exitCode).toBe(2);
});

test("resolves typed references relative to the owning document and reports missing or mismatched targets", async () => {
  const { write } = fixture();
  write(
    "design/contract.md",
    { schemaVersion: 1, kind: "mission", id: "m1", revision: 1, repository: ".." },
    "# Mission",
  );
  const reference = { kind: "mission", path: "../design/contract.md", id: "m1", revision: 1 };
  const metadata = {
    schemaVersion: 1,
    kind: "roadmap",
    id: "road",
    revision: 1,
    refs: [reference],
  };
  const path = write("planning/roadmap.md", metadata, "# Destination");
  expect((await validateArtifact(path)).valid).toBe(true);
  reference.revision = 2;
  write("planning/roadmap.md", metadata, "# Destination");
  expect((await validateArtifact(path)).issues.some((i) => i.rule === "reference-identity")).toBe(
    true,
  );
  reference.path = "missing.md";
  write("planning/roadmap.md", metadata, "# Destination");
  const missing = await validateArtifact(path);
  expect(missing.exitCode).toBe(1);
  expect(missing.issues.some((i) => i.rule === "reference-missing")).toBe(true);
});

test("rejects malformed references and a repository path that is not a directory", async () => {
  const { write } = fixture();
  const path = write(
    "mission.md",
    {
      schemaVersion: 1,
      kind: "mission",
      id: "m1",
      revision: 1,
      repository: "absent",
      refs: [{ path: "file" }],
    },
    "# Mission",
  );
  expect((await validateArtifact(path)).issues.some((i) => i.rule === "schema")).toBe(true);
  write(
    "mission.md",
    { schemaVersion: 1, kind: "mission", id: "m1", revision: 1, repository: "mission.md" },
    "# Mission",
  );
  expect((await validateArtifact(path)).issues.some((i) => i.rule === "repository")).toBe(true);
});

test("terminates cyclic artifact references without losing a nested error", async () => {
  const { write } = fixture();
  const path = write(
    "a.md",
    {
      schemaVersion: 1,
      kind: "roadmap",
      id: "a",
      revision: 1,
      refs: [{ kind: "roadmap", path: "b.md", id: "b", revision: 1 }],
    },
    "# A",
  );
  write(
    "b.md",
    {
      schemaVersion: 1,
      kind: "roadmap",
      id: "b",
      revision: 1,
      refs: [
        { kind: "roadmap", path: "a.md", id: "a", revision: 1 },
        { kind: "evidence", path: "missing.txt" },
      ],
    },
    "# B",
  );
  expect((await validateArtifact(path)).issues.some((i) => i.rule === "reference-missing")).toBe(
    true,
  );
});

test("checks active packet freshness without rejecting historical packets", async () => {
  const f = missionFixture();
  f.write(
    "docs/missions/m1/r2.md",
    { schemaVersion: 1, kind: "mission", id: "m1", revision: 2, repository: "../../.." },
    "# Revised mission",
  );
  f.state.mission = { ...f.mission, revision: 2, path: "../../docs/missions/m1/r2.md" };
  f.event.mission = f.state.mission;
  f.write(".missions/m1/history.jsonl", `${JSON.stringify(f.event)}\n`);
  f.write(".missions/m1/state.json", f.state);
  expect((await validateArtifact(f.path)).valid).toBe(true);
  f.state.currentPacket = f.packetRef;
  f.write(".missions/m1/state.json", f.state);
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "active-revision")).toBe(
    true,
  );
  expect((await validateArtifact(join(f.root, ".missions/m1/packet.md"))).valid).toBe(true);
});

test("requires complete packet and state metadata, keeping outcomes separate from phases", async () => {
  const f = missionFixture();
  f.write(".missions/m1/packet.md", { ...f.packet, baseCommit: "HEAD" }, "# Assignment");
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "schema")).toBe(true);
  f.write(".missions/m1/packet.md", f.packet, "# Assignment");
  f.write(".missions/m1/state.json", { ...f.state, status: "correction_required" });
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "schema")).toBe(true);
});

test("checks state against its nonempty history and rejects a sequence gap", async () => {
  const f = missionFixture();
  expect((await validateArtifact(f.path)).valid).toBe(true);
  f.write(".missions/m1/state.json", { ...f.state, lastSequence: 2 });
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "history-state")).toBe(
    true,
  );
  f.write(".missions/m1/state.json", f.state);
  f.write(".missions/m1/history.jsonl", `${JSON.stringify({ ...f.event, sequence: 3 })}\n`);
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "history-sequence")).toBe(
    true,
  );
  f.write(".missions/m1/history.jsonl", "");
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "history-empty")).toBe(
    true,
  );
});

test("rejects discontinuous phases and inconsistent mission identities in history", async () => {
  const f = missionFixture();
  f.write(
    ".missions/m1/history.jsonl",
    [f.event, { ...f.event, sequence: 2, stateRevision: 2, status: "completed" }]
      .map((e) => JSON.stringify(e))
      .join("\n"),
  );
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "history-transition")).toBe(
    true,
  );
  f.write(
    ".missions/m1/history.jsonl",
    JSON.stringify({ ...f.event, mission: { ...f.mission, id: "other" } }),
  );
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "reference-identity")).toBe(
    true,
  );
});

test("requires accepted packet evidence before a checkpoint", async () => {
  const f = missionFixture();
  f.write(".missions/m1/proof.md", "Focused test passed at the recorded revision.");
  const resultRef = { kind: "result", id: "result1", revision: 1, path: "result.json" };
  const result = {
    schemaVersion: 1,
    kind: "result",
    id: "result1",
    revision: 1,
    mission: f.mission,
    packet: f.packetRef,
    scope: "packet",
    actor: "coordinator",
    implementers: ["worker"],
    freshContext: false,
    outcome: "correction_required",
    summary: "A failing counterexample remains.",
    evidence: [{ kind: "evidence", path: "proof.md" }],
  };
  f.write(".missions/m1/result.json", result);
  const state = {
    ...f.state,
    attempts: [{ packet: f.packetRef, result: resultRef }],
    checkpoints: [
      { packet: f.packetRef, result: resultRef, actor: "coordinator", commit: "b".repeat(40) },
    ],
  };
  f.write(".missions/m1/state.json", state);
  expect(
    (await validateArtifact(f.path)).issues.some((i) => i.rule === "checkpoint-acceptance"),
  ).toBe(true);
  f.write(".missions/m1/result.json", { ...result, outcome: "accepted" });
  expect((await validateArtifact(f.path)).valid).toBe(true);
  f.write(".missions/m1/result.json", { ...result, outcome: "accepted", actor: "worker" });
  expect(
    (await validateArtifact(f.path)).issues.some((i) => i.rule === "independent-acceptance"),
  ).toBe(true);
});

test("completed requires a fresh accepted mission result for its current revision", async () => {
  const f = missionFixture();
  const events = ["draft", "ready", "executing", "validating", "completed"].map((status, i) => ({
    ...f.event,
    sequence: i + 1,
    stateRevision: i + 1,
    status,
  }));
  f.write(".missions/m1/history.jsonl", events.map((e) => JSON.stringify(e)).join("\n"));
  const state = { ...f.state, revision: 5, lastSequence: 5, status: "completed" };
  f.write(".missions/m1/state.json", state);
  expect(
    (await validateArtifact(f.path)).issues.some((i) => i.rule === "completion-validation"),
  ).toBe(true);
  const result = {
    schemaVersion: 1,
    kind: "result",
    id: "review",
    revision: 1,
    mission: f.mission,
    packet: null,
    scope: "mission",
    actor: "reviewer",
    implementers: ["worker"],
    freshContext: false,
    outcome: "accepted",
    summary: "Reviewed complete diff.",
    evidence: [{ kind: "evidence", path: "proof.md" }],
  };
  f.write(".missions/m1/proof.md", "Recorded checks and complete review.");
  f.write(".missions/m1/review.json", result);
  // A mission with no packet history cannot be claimed complete either.
  f.write(".missions/m1/state.json", {
    ...state,
    validation: { kind: "result", id: "review", revision: 1, path: "review.json" },
  });
  expect(
    (await validateArtifact(f.path)).issues.some((i) => i.rule === "independent-validation"),
  ).toBe(true);
});

test("malformed result and event records fail explicitly instead of crashing", async () => {
  const f = missionFixture();
  const resultPath = f.write(".missions/m1/result.json", {
    schemaVersion: 1,
    kind: "result",
    id: "r",
    revision: 1,
    mission: f.mission,
  });
  expect((await validateArtifact(resultPath)).issues.some((i) => i.rule === "schema")).toBe(true);
  f.write(".missions/m1/history.jsonl", JSON.stringify({ ...f.event, evidence: null }));
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "schema")).toBe(true);
  f.write(".missions/m1/history.jsonl", "{broken}");
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "parse")).toBe(true);
});

test("compares interruption values independently of JSON property order", async () => {
  const f = missionFixture();
  f.write(".missions/m1/state.json", {
    ...f.state,
    interruption: { kind: "needs_decision", reason: "Choose scope" },
  });
  f.write(
    ".missions/m1/history.jsonl",
    JSON.stringify({
      ...f.event,
      interruption: { reason: "Choose scope", kind: "needs_decision" },
    }),
  );
  expect((await validateArtifact(f.path)).valid).toBe(true);
});

test("enforces Markdown contracts and JSON records without interpreting prose", async () => {
  const f = missionFixture();
  const mission = { schemaVersion: 1, kind: "mission", id: "m1", revision: 1, repository: "." };
  const path = f.write("plain.json", mission);
  expect((await validateArtifact(path)).issues.some((i) => i.rule === "format")).toBe(true);
  f.write(".missions/m1/state.json", f.state, "# Wrong record format");
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "format")).toBe(true);
});

test("a cached contract cannot stand in for a journal or crash validation", async () => {
  const f = missionFixture();
  f.write(".missions/m1/state.json", { ...f.state, refs: [f.mission], history: f.mission.path });
  const report = await validateArtifact(f.path);
  expect(report.valid).toBe(false);
  expect(report.issues.some((i) => i.rule === "history-format")).toBe(true);
});

test("accepts completed evidence and refuses a reopened terminal history", async () => {
  const f = missionFixture();
  f.write(".missions/m1/proof.md", "Recorded independent checks.");
  const packetResultRef = {
    kind: "result",
    id: "packet-result",
    revision: 1,
    path: "packet-result.json",
  };
  const result = {
    schemaVersion: 1,
    kind: "result",
    id: "packet-result",
    revision: 1,
    mission: f.mission,
    scope: "packet",
    packet: f.packetRef,
    actor: "coordinator",
    implementers: ["worker"],
    freshContext: false,
    outcome: "accepted",
    summary: "Checks observed.",
    evidence: [{ kind: "evidence", path: "proof.md" }],
  };
  f.write(".missions/m1/packet-result.json", result);
  f.write(".missions/m1/review.json", {
    ...result,
    id: "review",
    scope: "mission",
    packet: null,
    actor: "reviewer",
    freshContext: true,
  });
  const events = ["draft", "ready", "executing", "validating", "completed"].map((status, i) => ({
    ...f.event,
    sequence: i + 1,
    stateRevision: i + 1,
    status,
  }));
  const state = {
    ...f.state,
    revision: 5,
    lastSequence: 5,
    status: "completed",
    attempts: [{ packet: f.packetRef, result: packetResultRef }],
    checkpoints: [
      {
        packet: f.packetRef,
        result: packetResultRef,
        actor: "coordinator",
        commit: "b".repeat(40),
      },
    ],
    validation: { kind: "result", id: "review", revision: 1, path: "review.json" },
  };
  f.write(".missions/m1/state.json", state);
  f.write(".missions/m1/history.jsonl", events.map((e) => JSON.stringify(e)).join("\n"));
  expect(await validateArtifact(f.path)).toEqual({ valid: true, issues: [], exitCode: 0 });
  f.write(".missions/m1/state.json", {
    ...state,
    revision: 6,
    lastSequence: 6,
    status: "executing",
  });
  events.push({ ...f.event, sequence: 6, stateRevision: 6, status: "executing" });
  f.write(".missions/m1/history.jsonl", events.map((e) => JSON.stringify(e)).join("\n"));
  expect((await validateArtifact(f.path)).issues.some((i) => i.rule === "history-transition")).toBe(
    true,
  );
});
