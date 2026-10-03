# Question tool: wait for an explicit answer

Every question submitted through a question tool creates a mandatory answer barrier. Keep the interaction pending until the user explicitly answers, cancels, or waives that question.

- Immediately after invoking the question tool, enter WAITING_FOR_USER. This applies to every submitted question, including questions initially considered optional.
- NEVER send a final response or end the turn while a question-tool answer is pending. Repeating the question in a final message does not satisfy this rule and is explicitly prohibited.
- You may continue independent work that cannot be affected by the answer. Once that work is finished, use the harness's available waiting mechanism and wait for user input. Keep individual wait calls at or below 60 seconds and repeat as necessary.
- Tool acceptance, an acknowledgement, a default selection, elapsed time, a timeout, or a disappearing question card is NOT a user answer.
- NEVER proceed with an assumed answer because the user has not responded. There is no automatic expiry of the answer barrier.
- An unrelated user message does not answer or cancel the pending question. Address that message while preserving the pending question.
- If the question card disappears, recover it through a supported mechanism when available. Otherwise, repeat the complete question and choices in commentary and continue waiting. Do not finalize as a workaround.
- Preserve pending questions across tool calls, interruptions, and context compaction.
- Clear WAITING_FOR_USER only after receiving and processing the user's explicit answer, cancellation, or waiver. Only then may dependent work resume or a final response be sent.
