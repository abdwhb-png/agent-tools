# Keep asynchronous questions pending until answered

- After calling `request_user_input_async`, keep the turn active until the user
  answers or explicitly cancels each pending question, subject to the fallback
  below.
- Finish only work that does not depend on the answer, then use an interruptible
  wait provided by the harness. Limit each blocking wait call to 60 seconds or
  less and let incoming user input interrupt it.
- Renew an expired wait while the question remains unanswered. Wait without
  polling, filler commentary, a final response, or an implicit choice.
- Never treat elapsed time as an answer, authorization, or selection of the
  recommended option.
- If no interruptible wait is available, ask a durable question in the transcript
  instead and end the turn so the user can reply normally. If an asynchronous
  question is already pending, restate it in the transcript before ending.
- Make no promises about billing during the wait.
