# Input and Decision Design

Read this reference when choosing controls, configuring data entry, designing repeatable groups, or writing questions. Specify functional semantics using the project's existing components, without prescribing visual styling. Use the HTML attributes below for web interfaces and equivalent native semantics on other platforms.

## Choose a control from the decision

The wrong control hides available choices or asks users to recall information they could recognize. Match the control to the answer space, comparison needs, and commitment behavior before choosing its appearance.

| Decision | Starting control | Decision condition |
| --- | --- | --- |
| One choice among alternatives that need comparison | Radio group | Keep alternatives and their consequences available together. Leave unanswered when an explicit decision is required rather than silently choosing the first option. |
| One choice from a familiar list | Native select | Use when inspecting every option together adds little value. Prefer an existing accessible searchable combobox when the list is costly to scan or users know an entity to look up. |
| Several independent choices | Checkbox group | Explain whether any, all, or a bounded number may be selected. Include an explicit mutually exclusive None option only when the task needs it. |
| Agreement or a setting committed by a later Save/Continue | Checkbox or explicit yes/no choice | Use yes/no when unanswered must remain distinct from no. Do not preselect consent. |
| An on/off setting applied immediately | Switch | Use only when the current state and save/failure feedback are clear. Do not make a switch appear to apply immediately when it merely edits a draft. |
| A value not known to the system | Text input or textarea | Use free entry only when the answer is genuinely open. Use multiline entry when a meaningful explanation is needed, not for short structured values. |
| A genuine numeric quantity | Numeric input or a supported stepper | Respect meaningful bounds, units, and precision. Digit-only identifiers are text, not quantities. |

Choose by task rather than fixed option-count cutoffs. Reuse native controls or the project's accessible components. A searchable picker must distinguish typed query text from a selected allowed value, make loading/no-match/error states clear, and support keyboard selection and dismissal. Do not build a custom combobox solely for its appearance or accept arbitrary text when only existing entities are valid.

## Make entry cooperate with devices and autofill

An inconvenient keyboard or incorrect autofill purpose adds work even when the question is clear. Describe the value accurately so the browser can assist without changing its meaning.

| Value | Web starting point | Important boundary |
| --- | --- | --- |
| Email address | `type="email"`, `autocomplete="email"` | Keep paste enabled. Do not use autocapitalization or spellchecking that changes an identifier. |
| Telephone number | `type="tel"`, `autocomplete="tel"` | Preserve international prefixes and supported formatting. Do not impose one country's length without a domain requirement. |
| Postal code | `type="text"`, `autocomplete="postal-code"` | Preserve leading zeros and letters. Use `inputmode="numeric"` only when the selected country's accepted codes are all digits. |
| Digit-only reference or identifier | `type="text"`, `inputmode="numeric"` | Preserve the string, including leading zeros. Do not invent an autocomplete purpose for a domain identifier. |
| One-time authentication code | `type="text"`, `autocomplete="one-time-code"` | Use a numeric keyboard hint only for digit-only codes. Accept a complete pasted/autofilled code without requiring manual character-by-character entry. |
| Existing or newly created password | `type="password"`, `autocomplete="current-password"` or `"new-password"` | Match the task, permit password-manager entry and paste, and do not disable autofill globally. |

`inputmode` is a keyboard hint, not validation. Choose numeric or decimal hints only when they admit the required input, and test whether needed separators, signs, or letters remain available on target devices. Keep domain validation and normalization in the existing owner. Do not use `type="number"` merely to obtain a digit keypad for a postal code or identifier.

Use the appropriate autocomplete purpose for personal data, such as `name`, `given-name`, `family-name`, `street-address`, or `country-name`, matching what the control actually accepts. Do not split a full-name question unless separate parts are needed. For independent shipping/billing or repeated-person groups, use distinct supported sections, such as `section-person42 given-name`, and the relevant shipping/billing grouping where applicable. These hints distinguish fields but cannot guarantee browser behavior.

Keep unique label-target IDs and stable form names consistent with the framework and server contract. Preserve standard form semantics so password managers and autofill can identify fields. Disable spelling/capitalization assistance selectively for codes and identifiers, not for all prose inputs. Verify paste, autofill, edit-after-autofill, and mobile keyboard behavior with actual controls when implementing; markup inspection alone does not prove device behavior.

## Repeatable groups without losing identity

Adding or removing an item must not move someone else's values, errors, or focus. Treat each group as a stable item in the existing form state so the visible list remains connected to the correct data.

- Name the group in the user's terms, such as Passenger or Line item, and provide a group label plus labels for its fields. Distinguish repeated controls with unique IDs, associated instructions, and contextual action names such as Remove passenger 2.
- Provide explicit Add another and Remove controls. Add/remove buttons inside a form must not accidentally submit it. Create items only on a deliberate action, with task-appropriate defaults and no unasked copying of another person's data.
- Use stable item identities rather than array positions for component state, focus targets, and error association. Display numbers may change after removal. Adapt positional API errors to the submitted item snapshot so later edits cannot attach a response to a different person or item.
- When adding, focus the new group's heading or first useful input. After removing the focused group, move focus to a nearby surviving group or Add control, and announce the change without reading the entire form again.
- Respect domain minimums, maximums, and duplicate rules. Explain limits near the relevant action. Distinguish an unused optional blank group from a partly completed required item, and do not silently discard partial input.
- Separate removal of an unsaved group from deletion of a persisted record. For meaningful loss, provide an appropriate confirmation or supported restoration path. Use [Form behavior and recovery](form-behavior-and-recovery.md#destructive-actions-and-recovery) for persisted destructive effects.
- If order matters, expose a keyboard-operable reorder path through the existing component, not drag-only manipulation. Preserve each item's values and errors when its position changes.

For example, after deleting passenger 2, passenger 3 may become the second visible group. Its existing error must stay attached to that passenger's stable identity, not to whatever item now occupies a previous array index.

## Write questions people can answer

Vague questions shift interpretation work onto the user and produce avoidable errors. Ask for a specific decision or fact using the user's vocabulary, with enough context to answer correctly the first time.

- Ask one coherent question at a time. Separate two independent facts in a label such as Company and billing contact, while keeping naturally related fields in a meaningful group. Do not turn every field into a separate screen.
- Use a persistent label or group legend that identifies the information needed. Put a format example, reason for collection, or consequence in associated hint text rather than hiding it in a placeholder or tooltip. Keep hints short and relevant to this decision.
- State required/optional status consistently. Distinguish blank, No, None, and I do not know when the business process treats them differently. Offer uncertainty or Not applicable only when there is a supported path for that answer.
- State units, time period, and relevant context where they change the answer. Prefer What is your monthly spending limit? with a currency cue over Amount. Ask Whose email should receive invoices? when an unlabeled Email could be confused with the login address.
- Name options by their meaning and expose consequential differences such as cost or who gains access. Avoid internal enum names, unexplained jargon, negative questions, and double negatives. Verify whether choices are exclusive or combinable before writing the options.
- Use action labels that explain the actual transition or commitment, such as Save draft, Send invitations, or Publish integration. Keep Continue for progression that does not itself make the final commitment. Do not promise a save, invitation, or publication before that behavior exists.

## Focused verification

Exercise only the changed decisions and controls:

- Select, clear, and change answers with a keyboard. Check unanswered versus no, single versus multiple selection, and draft versus immediate-save behavior.
- Paste values with leading zeros, international phone prefixes, and supported postal-code letters. Confirm the chosen keyboard and autofill purpose do not corrupt or obstruct them.
- Add two groups, produce an error in the second, remove the first, and verify identity, values, focus, and payload. Repeat with a delayed server error and reordered items if supported.
- Read the questions without surrounding implementation context. Verify that requiredness, units, who or what the answer refers to, and commitment consequences are unambiguous. Test any example as an accepted input rather than displaying an impossible format.
