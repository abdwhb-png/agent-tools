import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { eventErrors, schemaErrors, transitions, type Data, type Reference } from "./schema.js";

export interface Issue {
  path: string;
  rule: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: Issue[];
  exitCode: 0 | 1 | 2;
}

export async function validateArtifact(path: string): Promise<ValidationReport> {
  const issues: Issue[] = [];
  const cache = new Map<string, Data | undefined>();
  let readError = false;
  const issue = (path: string, rule: string, message: string) => {
    issues.push({ path, rule, message });
  };

  function sameReference(aFile: string, a: Reference, bFile: string, b: Reference): boolean {
    return (
      a.kind === b.kind &&
      a.id === b.id &&
      a.revision === b.revision &&
      resolve(dirname(aFile), a.path) === resolve(dirname(bFile), b.path)
    );
  }

  function sameInterruption(a: unknown, b: unknown): boolean {
    if (a === null || b === null) return a === b;
    return (a as Data).kind === (b as Data).kind && (a as Data).reason === (b as Data).reason;
  }

  async function history(file: string, text: string): Promise<Data | undefined> {
    const lines = text.trimEnd().split(/\r?\n/);
    if (!text.trim()) {
      issue(file, "history-empty", "History must contain at least the initial draft event.");
      return undefined;
    }
    let previous: Data | undefined;
    for (let index = 0; index < lines.length; index++) {
      let value: unknown;
      try {
        value = JSON.parse(lines[index]);
      } catch {
        issue(file, "parse", `Invalid JSONL event on line ${index + 1}.`);
        return undefined;
      }
      const errors = eventErrors(value);
      if (errors.length) {
        for (const message of errors) issue(file, "schema", `Line ${index + 1}: ${message}`);
        return undefined;
      }
      const event = value as Data;
      if (event.sequence !== index + 1)
        issue(file, "history-sequence", `Expected sequence ${index + 1} on line ${index + 1}.`);
      if (!previous && event.status !== "draft")
        issue(file, "history-transition", "History must start in draft.");
      if (previous) {
        const from = previous.status as string;
        if (
          !(
            transitions[from].includes(event.status as string) ||
            (from === event.status && transitions[from].length > 0)
          )
        )
          issue(file, "history-transition", `Invalid phase transition on line ${index + 1}.`);
        if ((event.stateRevision as number) <= (previous.stateRevision as number))
          issue(file, "history-sequence", "stateRevision must increase with each event.");
        if (
          (event.mission as Reference).id !== (previous.mission as Reference).id ||
          ((event.mission as Reference).revision as number) <
            ((previous.mission as Reference).revision as number)
        )
          issue(
            file,
            "history-mission",
            "History must keep one mission identity without decreasing its revision.",
          );
      }
      await reference(file, event.mission as Reference);
      for (const ref of event.evidence as Reference[]) await reference(file, ref);
      previous = event;
    }
    return previous;
  }

  async function reference(owner: string, ref: Reference): Promise<Data | undefined> {
    const target = resolve(dirname(owner), ref.path);
    try {
      if (!(await stat(target)).isFile()) throw new Error("Not a file");
    } catch {
      issue(owner, "reference-missing", `Referenced file is unavailable: ${ref.path}`);
      return undefined;
    }
    if (ref.kind === "document" || ref.kind === "evidence") return undefined;
    const data = await visit(target);
    if (data && (data.kind !== ref.kind || data.id !== ref.id || data.revision !== ref.revision)) {
      issue(
        owner,
        "reference-identity",
        `Referenced kind, id or revision does not match: ${ref.path}`,
      );
      return undefined;
    }
    return data;
  }

  async function visit(file: string, asHistory = false): Promise<Data | undefined> {
    let key: string;
    let text: string;
    try {
      key = await realpath(file);
      if (cache.has(key)) {
        const cached = cache.get(key);
        if (asHistory && cached && cached.kind !== "event") {
          issue(
            file,
            "history-format",
            "history must reference a JSONL event journal, not another artifact.",
          );
          return undefined;
        }
        return cached;
      }
      if (!(await stat(key)).isFile()) throw new Error("Not a regular file");
      text = await readFile(key, "utf8");
    } catch {
      issue(file, "read", "Cannot read artifact.");
      readError = true;
      return undefined;
    }
    cache.set(key, undefined);
    file = key;
    if (asHistory || file.endsWith(".jsonl")) {
      const last = await history(file, text);
      cache.set(key, last);
      return last;
    }
    let parsed: unknown;
    const metadata = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    try {
      parsed = JSON.parse(metadata ? metadata[1] : text);
    } catch {
      issue(file, "parse", "Expected strict JSON or JSON frontmatter.");
      return undefined;
    }
    const errors = schemaErrors(parsed);
    if (errors.length) {
      for (const message of errors) issue(file, "schema", message);
      return undefined;
    }
    const data = parsed as Data;
    const markdown = ["roadmap", "mission", "packet"].includes(data.kind as string);
    if (markdown !== Boolean(metadata) || (metadata && !text.slice(metadata[0].length).trim())) {
      issue(
        file,
        "format",
        "Contracts and packets require JSON frontmatter with prose; state and results require plain JSON.",
      );
      return undefined;
    }
    cache.set(key, data);
    if (data.kind === "mission") {
      try {
        if (!(await stat(resolve(dirname(file), data.repository as string))).isDirectory())
          throw new Error("Not a directory");
      } catch {
        issue(file, "repository", "repository must resolve to an existing local directory.");
      }
    }
    for (const ref of (data.refs ?? []) as Reference[]) await reference(file, ref);
    if (data.mission) await reference(file, data.mission as Reference);
    if (data.kind === "result") {
      if (data.packet) {
        const ref = data.packet as Reference;
        const packet = await reference(file, ref);
        if (
          packet &&
          !sameReference(
            file,
            data.mission as Reference,
            resolve(dirname(file), ref.path),
            packet.mission as Reference,
          )
        )
          issue(
            file,
            "result-mission",
            "Result and packet must refer to the same mission revision.",
          );
      }
      for (const ref of data.evidence as Reference[]) await reference(file, ref);
      if (data.outcome === "accepted") {
        if ((data.implementers as string[]).includes(data.actor as string))
          issue(file, "independent-acceptance", "An implementer cannot accept their own result.");
        if (!(data.evidence as Reference[]).length)
          issue(file, "acceptance-evidence", "Acceptance must reference evidence.");
        if (data.scope === "mission" && data.freshContext !== true)
          issue(
            file,
            "independent-validation",
            "Mission acceptance requires a fresh validation context.",
          );
      }
    }
    if (data.kind === "state") {
      const mission = data.mission as Reference;
      if (data.id !== mission.id)
        issue(file, "mission-identity", "State id must match its mission id.");
      const attempts = data.attempts as { packet: Reference; result: Reference | null }[];
      for (const attempt of attempts) {
        const packet = await reference(file, attempt.packet);
        if (packet && (packet.mission as Reference).id !== data.id)
          issue(file, "mission-identity", "Every attempt must belong to this mission.");
        if (attempt.result) {
          const result = await reference(file, attempt.result);
          if (
            result &&
            (result.scope !== "packet" ||
              !sameReference(
                file,
                attempt.packet,
                resolve(dirname(file), attempt.result.path),
                result.packet as Reference,
              ))
          )
            issue(file, "attempt-result", "Attempt result must address its packet.");
        }
      }
      if (data.currentPacket) {
        const active = data.currentPacket as Reference;
        const packet = await reference(file, active);
        if (!attempts.some((a) => sameReference(file, a.packet, file, active)))
          issue(file, "active-attempt", "currentPacket must belong to attempts.");
        if (
          packet &&
          !sameReference(
            file,
            mission,
            resolve(dirname(file), active.path),
            packet.mission as Reference,
          )
        )
          issue(
            file,
            "active-revision",
            "The active packet does not reference the active mission revision.",
          );
      }
      for (const ref of data.evidence as Reference[]) await reference(file, ref);
      for (const checkpoint of data.checkpoints as {
        packet: Reference;
        result: Reference;
        actor: string;
      }[]) {
        await reference(file, checkpoint.packet);
        const result = await reference(file, checkpoint.result);
        if (
          !attempts.some(
            (a) =>
              sameReference(file, a.packet, file, checkpoint.packet) &&
              a.result &&
              sameReference(file, a.result, file, checkpoint.result),
          ) ||
          (result &&
            (result.scope !== "packet" ||
              result.outcome !== "accepted" ||
              !sameReference(
                file,
                checkpoint.packet,
                resolve(dirname(file), checkpoint.result.path),
                result.packet as Reference,
              ) ||
              (result.implementers as string[]).includes(checkpoint.actor)))
        )
          issue(
            file,
            "checkpoint-acceptance",
            "Checkpoint must cite a registered accepted packet result and a non-implementing accepting actor.",
          );
      }
      const validation = data.validation
        ? await reference(file, data.validation as Reference)
        : undefined;
      if (
        validation &&
        (validation.scope !== "mission" ||
          !sameReference(
            file,
            mission,
            resolve(dirname(file), (data.validation as Reference).path),
            validation.mission as Reference,
          ))
      )
        issue(
          file,
          "validation-revision",
          "Mission validation must address the active mission revision.",
        );
      if (data.status === "completed") {
        if (
          validation?.scope !== "mission" ||
          validation.outcome !== "accepted" ||
          validation.freshContext !== true
        )
          issue(
            file,
            "completion-validation",
            "Completion requires an accepted independent mission result.",
          );
        if (
          data.currentPacket !== null ||
          data.interruption !== null ||
          !attempts.length ||
          attempts.some((a) => a.result === null)
        )
          issue(
            file,
            "completion-pending",
            "Completion cannot retain an active packet, interruption or unresolved attempt, and requires an attempt history.",
          );
      }
      const historyPath = resolve(dirname(file), data.history as string);
      const last = await visit(historyPath, true);
      if (
        last &&
        (last.sequence !== data.lastSequence ||
          last.stateRevision !== data.revision ||
          last.status !== data.status ||
          !sameInterruption(last.interruption, data.interruption) ||
          !sameReference(file, mission, historyPath, last.mission as Reference))
      )
        issue(
          file,
          "history-state",
          "State must agree with the last event's sequence, state revision, mission, status and interruption.",
        );
    }
    return data;
  }

  await visit(resolve(path));
  issues.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.rule.localeCompare(b.rule) ||
      a.message.localeCompare(b.message),
  );
  return { valid: issues.length === 0, issues, exitCode: readError ? 2 : issues.length ? 1 : 0 };
}
