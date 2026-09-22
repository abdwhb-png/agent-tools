---
name: systems-thinking
description: Diagnose which kind of system a situation is — Clear, Complicated, Complex, or Chaotic — then apply the response protocol that matches, before committing effort. Use when a problem returns after fixes that appeared to work, when several actors with divergent incentives must act together, when a decision is expensive to reverse and cause↔effect is not obvious, or during an incident where you must choose between stabilizing and investigating. Triggers include "why does this keep happening", "we already fixed this", "what will this set off", "second-order effects", "feedback loop", "incentives", "leverage point", "stabilize or root-cause". Not for single-owner implementation work with a known cause, or plain code review.
---

# Systems Thinking

## The Problem

Some problems keep coming back. A fix removes the symptom and the symptom returns. A change looks safe and makes things worse six weeks later. Three teams agree on a plan and each one acts in a way that defeats it.

These are failures of framing rather than of effort: the response was correct for a different kind of system than the one in play.

## The Result

A short decision brief that names the system type, the players and their incentives, what accumulates, what the proposed change sets off, and the response protocol that matches the type — produced before effort is committed.

## Why Classification Comes First

Each system type has one protocol that works and several that fail:

- Expert analysis decides the outcome in a **Complicated** system and adds nothing in a **Complex** one, where cause↔effect exists only in hindsight.
- A checklist prevents errors in a **Clear** system and causes paralysis in a **Chaotic** one.

Protocol mismatch, not lack of cleverness, is where the expensive mistakes come from. Classification is therefore the highest-leverage step, not a preliminary formality.

## When to Use

Any one of these is enough:

- The same problem has returned after a fix that appeared to work.
- Several actors with different incentives must act for the outcome to occur.
- The decision is expensive to reverse and cause↔effect is not visible.
- Something is failing now and you must choose between stabilizing and investigating.

## When Not to Use

Do not run this when the cause is already visible: single-owner implementation work, a plain code review, a bug with a reproducible stack trace, or a question that merely contains the word "system" (type system, build system, system prompt). The brief costs attention and tokens, and framing adds nothing once the answer is visible in the code.

## Procedure

### 1. Classify the system

Ask one discriminating question: **how does cause↔effect work here?**

| Type            | Cause↔effect               | Protocol                                      |
| --------------- | -------------------------- | --------------------------------------------- |
| **Clear**       | Obvious and repeatable     | Follow the checklist; no improvisation        |
| **Complicated** | Exists but is hidden       | Slow down; have the right expert walk it      |
| **Complex**     | Knowable only in hindsight | Run the smallest experiment; adapt on results |
| **Chaotic**     | Broken; no usable pattern  | Act to stabilize first, analyze later         |

State the observable evidence that decided the classification. If two types compete, name both and say which the evidence favors.

`DART` (Deconstruct, Analyze, Recognize, Test) is a mnemonic for this step, not a second framework. **Analyze** carries the discriminative weight; Deconstruct, Recognize, and Test are cheap checks that a stable problem rewards. In a Chaotic system, skip Test — there is no time and no pattern to test against.

Depth, anchor cases, and the reclassification loop: [`references/swadia-typology.md`](references/swadia-typology.md).

### 2. Map players and incentives

List every player — users, customers, partners, employees, regulators, competitors, and your own side — then record for each what they want and what their incentives actually reward. Players respond to their own incentives, not to the stated goal; when a reward is only a proxy for the goal, people optimize the proxy (the cobra-bounty trap).

### 3. Name the stocks and flows

Identify what accumulates (cash, headcount, trust, technical debt, backlog) and what moves between states (hiring and attrition, revenue and burn, activation and churn). Most systems that feel stuck are asking a stock to change faster than its flows allow.

### 4. Trace what the change sets off

For the proposed change, work out the second-order and third-order consequences and mark each loop as reinforcing or dampening. Treat delayed feedback as a risk category of its own: when the reward arrives fast and the cost arrives late, first-order feedback actively misleads.

### 5. Choose the protocol and the smallest test

Apply the protocol from step 1 — checklist, expert, experiment, or stabilize — and name the constraint that, if removed, unlocks the most value. Then state the smallest reversible action that would falsify the classification: if the test contradicts step 1, the classification was wrong and everything after it re-derives.

Depth on stocks, flows, and leverage points: [`references/lenny-mapping.md`](references/lenny-mapping.md).

## Output: The System Brief

Use this structure. Each field is one line or one small table; the value sits in the classification and the protocol, not in prose. When a field does not change the decision, say so in one line rather than dropping it, so the reader can see it was considered.

```markdown
**System type** — Clear | Complicated | Complex | Chaotic, plus the observable evidence that decided it.

**Players and incentives**

| Player | Wants | Their incentive actually rewards |
| ------ | ----- | -------------------------------- |

**Stocks and flows** — what accumulates; the flow that must change; the stock being pushed faster than its flows allow, if any.

**What the change sets off** — change → second-order → third-order; reinforcing or dampening; delayed feedback called out separately.

**Protocol** — checklist | expert consultation | smallest experiment | stabilize-then-analyze, consistent with the type above.

**Next smallest test** — one reversible action, and the result that would falsify the classification.
```

If the system is Chaotic, lead with the stabilizing action and fill the remaining fields once the system is stable enough to observe.

## Questions Worth Asking

Use these to fill the brief, not as a checklist to recite:

- What kind of system is this, and what observable evidence shows it?
- Who are all the players, and what does each one actually want?
- What are you rewarding, and is anyone optimizing the reward instead of the goal?
- What accumulates here, and what moves between states?
- If this change lands, what happens next? And after that?
- How delayed is the feedback, and who pays the cost when it arrives?
- What constraint, if removed, unlocks the most value?
- What is the smallest test that would prove this classification wrong?

## Common Mistakes

- **Skipping classification.** Treating chaos as a complex problem produces analysis paralysis; treating a clear problem as complex burns cycles.
- **Reasoning only from first-order effects.** Ripples compound and are rarely visible from the first move.
- **Assuming players share your goal.** They respond to their own incentives, and a misaligned proxy produces the cobra effect.
- **Ignoring delayed feedback.** The cost arrives long after the reward, so present-tense feedback is not evidence of safety.
- **Optimizing a part.** Improving one component can degrade the whole.
- **Forcing a checklist in chaos.** There is no pattern to follow; stabilize, then analyze.

## Sources

Two traditions, one workflow. The typology and DART come from Sandeep Swadia's Cynefin-derived four-system model; the mapping tools come from [`RefoundAI/lenny-skills`](https://github.com/RefoundAI/lenny-skills/tree/main/skills/systems-thinking), distilled from six Lenny's Podcast guests.

- [`references/swadia-typology.md`](references/swadia-typology.md) — typology, DART, anchor cases, incentive traps, delayed feedback.
- [`references/lenny-mapping.md`](references/lenny-mapping.md) — players and incentives, stocks and flows, leverage points, systematizing recurring pain.
- [`references/lenny-guest-insights.md`](references/lenny-guest-insights.md) — the six raw source quotes, provenance only.
