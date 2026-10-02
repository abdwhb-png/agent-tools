# Form Behavior and Recovery

Read this reference when conditional data, validation, submission, destructive actions, or interruption affects the task. Apply the relevant sections to the existing form or workflow implementation. Leave visual styling to the project's conventions.

## Conditional data and correction

A changed answer can invalidate later work without making all previous effort useless. Keep useful drafts while making the active requirements and submitted data agree.

- Identify which answers control field visibility, requiredness, and later decisions. Update those together using the existing owner of the rules.
- Exclude inapplicable fields from active validation. Follow the API contract for omitting or clearing their submitted values rather than sending hidden stale data as current.
- Preserve a branch's draft during reversible in-session switching when appropriate. On return, recheck values against the current prerequisites. Clear values when the domain or sensitivity requires it and explain consequential loss before it occurs.
- If an earlier change invalidates a later selection, show what needs review. Preserve unaffected work and revalidate the dependent selection before commitment.
- If the current step disappears, return to the controlling decision or the nearest applicable task. Recompute progress without pretending skipped steps were completed.
- Apply prerequisites and permissions to direct links as well as ordinary navigation. Restore an applicable destination when possible, otherwise explain the missing prerequisite and guide the user there.

For example, switching delivery to collection can remove address requirements while retaining an address draft for switching back. Submit only the applicable delivery data, and recheck availability if switching back changes the fulfillment context.

## Validation timing

Feedback should help users correct completed input rather than interrupt unfinished thinking. Choose timing by the information available and the cost of interruption.

| Situation | Default behavior |
| --- | --- |
| Untouched input before an attempt to continue | Show instructions when useful, without error treatment. |
| Empty required value | Explain the requirement on the relevant Continue/Submit attempt. |
| Completed, non-empty value with a useful format check | Validate on blur, or keep submit-time validation for a short simple form. |
| Feedback helps during entry, such as a character limit | Update guidance during input without declaring unfinished input a failure. |
| An error is already displayed | Clear it promptly once resolved, without announcing every keystroke. |
| A rule depends on multiple values | Evaluate when those values are available, and again at the relevant commitment boundary. |
| A field or step becomes inapplicable | Remove its active error and exclude it from the current validation scope. |

Validate applicable required inputs even if untouched when the user attempts to continue. Validate the current step before forward progression where its answers are prerequisites. Backward correction does not require the current step to be valid. Final submission still needs authoritative server validation.

Preserve existing library behavior where it already fits these needs. Accept copy-paste, autofill, and unambiguous input variants supported by the domain. Do not invent stricter formats or weaken technical requirements to make a form easier.

## Error presentation and focus

An error is useful only if the user can find it, understand the correction, and resume. Keep the explanation attached to the affected task and preserve entered values.

- Use persistent labels and meaningful group labels. Associate instructions and field errors programmatically, using native semantics and attributes such as `aria-describedby` and `aria-invalid` where applicable.
- State what failed and the available correction. Keep cross-field errors connected to the relevant group. Present service failures as service failures, not as invalid user input.
- On failed submission with multiple errors, provide a focusable summary linking to the affected fields and retain inline messages. Focus the summary when present, otherwise focus the first invalid field. Do not move focus on every inline validation update.
- Bring a target field's section into view before focusing it. For an error on an earlier step, provide a route back to that step without discarding other work.
- For non-field failures, keep a persistent form-level explanation and recovery action. Do not send focus to a valid field just because the service failed.
- Announce relevant dynamic status without duplicate announcements or constant interruption. Do not use a transient toast or color alone as the only explanation of an actionable error.
- After an explicit step or route change, place focus at a meaningful heading or main region. For inline disclosure, keep focus stable unless its current target disappears, then move it to a logical surviving control.
- Verify keyboard behavior, accessible names, and focus visibility. Report assistive-technology behavior as unverified unless it was actually tested.

## Asynchronous checks and server truth

An availability check can become stale while a user edits, and a network error cannot establish validity. Tie feedback to the input it actually checked and keep final acceptance authoritative.

- Check only inputs ready for validation. Reuse existing request timing and cancellation mechanisms rather than firing on every keystroke.
- Associate each response with the value and relevant context that initiated it. Cancel or ignore obsolete responses, including after a branch change.
- Distinguish pending, rejected, unavailable, and confirmed results. Clear stale success indicators when their input changes.
- If an advisory check fails, preserve the input and allow the server to validate on submit where supported. If successful verification is a genuine prerequisite, keep the action blocked with a visible reason and a supported retry or alternative path. Never fail open on a mandatory rule.
- Recheck authority-sensitive conditions at commitment, such as current availability or permissions. Do not represent a client-side format check as confirmed server acceptance.

## Submission and retry

A silent disabled action conceals the path forward, while uncontrolled retry can duplicate an operation. Make blockers understandable and distinguish an incomplete form from an operation already in flight.

- Keep Continue/Submit available by default so an attempt can explain missing inputs. Activation still validates and stops an invalid transition.
- Disable an action when there is genuine unavailability, a mandatory prerequisite in progress, or a duplicate operation to prevent. Explain the reason next to it, with accessible status and a useful next action.
- Choose native disabled behavior or a focusable `aria-disabled` control according to the need to discover its explanation. If using `aria-disabled`, block pointer and keyboard activation in code. Do not rely on styling or pointer suppression alone.
- During submission, show pending status, preserve data, and prevent repeated activation. Use existing server duplicate protection where relevant. A disabled button alone does not guarantee an operation happens once.
- On a definite failure, restore the relevant action and offer correction or retry. After a timeout with an unknown outcome, check the operation's status or reuse an established idempotent retry mechanism before repeating a consequential action. Do not blindly resend it.
- Confirm success only after acceptance. Explain what completed and provide the next useful destination. Distinguish a saved draft from a finished operation.

## Destructive actions and recovery

Confirmation can prevent an accidental click but cannot recover from a mistaken decision. Make the consequences understandable and expose supported recovery so users can correct consequential mistakes after commitment.

- Establish what the action affects: the current item, explicitly selected items, or every matching result across pages. Show the meaningful scope and count before commitment. Keep delete, archive, remove-from-group, and revoke-access wording distinct because their effects differ.
- Inspect whether the operation is reversible, who may restore it, any deadline, and which side effects remain irreversible. Use a supported undo, restore, or rollback path with those limits. Do not promise that restoring a record also retracts sent messages or reverses external effects.
- If no recovery exists, state the irreversible consequence before commitment and use a proportionate review or confirmation. Do not invent an undo endpoint, silently replace permanent deletion with archiving, or add typed confirmations indiscriminately.
- For bulk work, distinguish successful, failed, and unresolved items using actual server results. Offer recovery only for eligible completed changes and retry only for appropriate failures. Do not repeat successful destructive actions or label a partially restored batch fully restored.
- Keep recovery discoverable for its supported lifetime, such as an existing archive or operation history. A short-lived toast must not be the only entry point when the product supports later restoration. After recovery, confirm the authoritative result and retain a correction path if restoration fails.

## Exit, persistence, and resume

Retaining input while navigating does not mean it survives reload or sign-out. Match the promise to the storage and recovery mechanisms that actually exist.

- Inspect what is saved, where, when, for whom, and for how long. Reuse the existing draft mechanism. Do not introduce browser storage for sensitive data merely to simulate resume.
- Preserve in-session values across back/edit and recoverable errors. If durable drafts exist, show accurate saving, saved, or failed states and restore only an authorized, applicable draft.
- If durable persistence is absent, say so. Explain potential work loss at a consequential exit and provide the supported stay/leave choice. Treat durable resume as a separate capability change, not an assumed affordance.
- On resume, restore valid work, recheck changed prerequisites and expiring data, and identify any steps requiring review. Avoid restarting valid completed work without a reason.
- If saving fails, retain recoverable local state while the session remains active and make the failure visible. Never report a draft as saved before its persistence succeeds.

## Focused verification

Use only the scenarios affected by the change, through the real form or workflow boundary:

- Switch a controlling choice after filling later inputs, switch back, and submit. Check displayed requirements, retained drafts, active errors, and actual payload together.
- Attempt to continue with empty required inputs, then correct them. Check focus, linked errors, preserved values, and the resulting transition.
- Resolve two validation requests out of order. Confirm only the current input's response affects status or progression.
- Reject submission on the server, retry a known failure, and test an unknown-outcome timeout separately. Check state preservation and duplicate prevention.
- Go back, leave, reload, and resume where supported. Compare the observed behavior with the persistence promise.
- Perform a reversible destructive action and restore it through the existing mechanism. Check permission/expiry limits, partial batch failures, and unsupported reversal separately from confirmation before deletion.
- Complete and correct the task with a keyboard and at a narrow viewport. Record what was inspected, exercised, or left unverified.
