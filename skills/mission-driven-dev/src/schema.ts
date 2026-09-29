export const artifactKinds = ["roadmap", "mission", "packet", "state", "result"] as const;
export type ArtifactKind = (typeof artifactKinds)[number];
export type Data = Record<string, unknown>;

export const transitions: Record<string, readonly string[]> = {
  draft: ["ready", "cancelled", "superseded"],
  ready: ["draft", "executing", "cancelled", "superseded"],
  executing: ["validating", "failed", "cancelled", "superseded"],
  validating: ["executing", "completed", "failed", "cancelled", "superseded"],
  completed: [],
  failed: [],
  cancelled: [],
  superseded: [],
};
export const outcomes = ["accepted", "correction_required", "needs_decision", "blocked"];

export function isStatus(value: unknown): value is string {
  return typeof value === "string" && Object.hasOwn(transitions, value);
}

export function isInterruption(value: unknown): boolean {
  return (
    value === null ||
    (isObject(value) &&
      ["needs_decision", "blocked"].includes(value.kind as string) &&
      isText(value.reason))
  );
}

export function isCommit(value: unknown): value is string {
  return typeof value === "string" && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value);
}

export interface Reference {
  kind: ArtifactKind | "document" | "evidence";
  path: string;
  id?: string;
  revision?: number;
}

export function isReference(value: unknown, kind?: Reference["kind"]): value is Reference {
  return (
    isObject(value) &&
    isText(value.path) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value.path) &&
    (kind === undefined || value.kind === kind) &&
    (value.kind === "document" ||
      value.kind === "evidence" ||
      (artifactKinds.includes(value.kind as ArtifactKind) &&
        isText(value.id) &&
        isRevision(value.revision)))
  );
}

export function isObject(value: unknown): value is Data {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export function schemaErrors(value: unknown): string[] {
  if (!isObject(value)) return ["Expected an object."];
  const errors: string[] = [];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!artifactKinds.includes(value.kind as ArtifactKind))
    errors.push("Unsupported artifact kind.");
  if (!isText(value.id)) errors.push("id must be a nonempty string.");
  if (!isRevision(value.revision)) errors.push("revision must be a positive safe integer.");
  if (value.kind === "mission" && !isText(value.repository))
    errors.push("repository must be a local directory path.");
  if (
    value.refs !== undefined &&
    (!Array.isArray(value.refs) || !value.refs.every((ref) => isReference(ref)))
  ) {
    errors.push(
      "refs must contain typed local references; workflow references require id and revision.",
    );
  }
  if (
    ["packet", "state", "result"].includes(value.kind as string) &&
    !isReference(value.mission, "mission")
  )
    errors.push("mission must reference an exact Mission Contract revision.");
  if (value.kind === "packet" && !isCommit(value.baseCommit))
    errors.push("baseCommit must be a full Git object id.");
  if (value.kind === "state") {
    if (!isStatus(value.status)) errors.push("Unsupported mission status.");
    if (!isInterruption(value.interruption))
      errors.push("interruption must be null or a blocked/needs_decision record with reason.");
    if (!isText(value.history)) errors.push("history must name the local JSONL journal.");
    if (!isRevision(value.lastSequence))
      errors.push("lastSequence must be a positive safe integer.");
    if (value.currentPacket !== null && !isReference(value.currentPacket, "packet"))
      errors.push("currentPacket must be null or an exact packet reference.");
    if (
      !Array.isArray(value.attempts) ||
      !value.attempts.every(
        (a) =>
          isObject(a) &&
          isReference(a.packet, "packet") &&
          (a.result === null || isReference(a.result, "result")),
      )
    )
      errors.push("attempts must contain packet and nullable result references.");
    if (
      !Array.isArray(value.checkpoints) ||
      !value.checkpoints.every(
        (c) =>
          isObject(c) &&
          isReference(c.packet, "packet") &&
          isReference(c.result, "result") &&
          isCommit(c.commit) &&
          isText(c.actor),
      )
    )
      errors.push("checkpoints require packet, result, full commit and accepting actor.");
    if (!Array.isArray(value.evidence) || !value.evidence.every((e) => isReference(e, "evidence")))
      errors.push("evidence must contain local evidence references.");
    if (value.validation !== null && !isReference(value.validation, "result"))
      errors.push("validation must be null or a result reference.");
  }
  if (value.kind === "result") {
    if (!["packet", "mission"].includes(value.scope as string))
      errors.push("scope must be packet or mission.");
    if (value.scope === "packet" ? !isReference(value.packet, "packet") : value.packet !== null)
      errors.push("packet is required for packet results and must be null for mission results.");
    if (!isText(value.actor) || !isText(value.summary))
      errors.push("actor and summary must be nonempty strings.");
    if (
      !Array.isArray(value.implementers) ||
      value.implementers.length === 0 ||
      !value.implementers.every(isText)
    )
      errors.push("implementers must list nonempty actor identities.");
    if (typeof value.freshContext !== "boolean")
      errors.push("freshContext must be an explicit boolean.");
    if (!outcomes.includes(value.outcome as string)) errors.push("Unsupported attempt outcome.");
    if (!Array.isArray(value.evidence) || !value.evidence.every((e) => isReference(e, "evidence")))
      errors.push("evidence must contain local evidence references.");
  }
  return errors;
}

export function eventErrors(value: unknown): string[] {
  if (!isObject(value)) return ["Expected an event object."];
  const errors: string[] = [];
  if (value.schemaVersion !== 1 || value.kind !== "event") errors.push("Expected a V1 event.");
  if (!isRevision(value.sequence) || !isRevision(value.stateRevision))
    errors.push("sequence and stateRevision must be positive safe integers.");
  if (
    !isText(value.at) ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value.at) ||
    !Number.isFinite(Date.parse(value.at))
  )
    errors.push("at must be an ISO timestamp with timezone.");
  if (!isText(value.actor) || !isText(value.reason))
    errors.push("actor and reason must be nonempty strings.");
  if (!isReference(value.mission, "mission"))
    errors.push("mission must reference an exact contract revision.");
  if (!isStatus(value.status) || !isInterruption(value.interruption))
    errors.push("Invalid status or interruption.");
  if (!Array.isArray(value.evidence) || !value.evidence.every((e) => isReference(e, "evidence")))
    errors.push("evidence must contain local evidence references.");
  return errors;
}
