# metrics-dashboard + Impeccable

`metrics-dashboard` and Impeccable have distinct responsibilities.

## Responsibilities

### `metrics-dashboard`

Defines **what the dashboard needs to communicate**:

- metrics and KPIs;
- North Star, drivers, health, and business metrics;
- definitions and formulas;
- data sources;
- information priorities;
- relationships between metrics;
- comparison and drill-down requirements;
- visualization requirements;
- targets and alert thresholds.

It produces a **semantic specification of the dashboard**, not its final visual design.

### Impeccable — `Operate`

Defines **how this information should be presented in the interface**:

- layout;
- density;
- grouping;
- visual hierarchy;
- typography;
- components;
- interactions;
- responsiveness;
- loading / empty / error states;
- polish and consistency with the design system.

`dashboard-spec.md` is the business source of truth.

`PRODUCT.md` and `DESIGN.md` remain the product and design sources of truth for Impeccable.

## Recommended workflow

```text
Product requirements
↓
metrics-dashboard
↓
dashboard-spec.md
↓
Impeccable Operate
↓
implementation
↓
critique
↓
distill / layout / typeset
↓
polish
↓
audit
```

To request implementation or improvement:

````text
/impeccable improve the analytics dashboard.

Treat this surface as Operate.

Use dashboard-spec.md as the source of truth for:
- metric semantics
- information priorities
- relationships
- comparison requirements
- visualization requirements

Use PRODUCT.md for product context.
Use DESIGN.md for visual rules and design-system constraints.

``` Do not change metric definitions, priorities, or business semantics
unless there is an explicit reason to propose such a change.

The final layout is not prescribed by dashboard-spec.md.
Choose the UI composition that best supports scanability,
comparison and task completion.
````

## Important rule

Do not use `metrics-dashboard` to enforce:

- a grid of KPI cards;
- a specific number of columns;
- a precise spatial arrangement;
- spacing, colors, or typography;
- a specific UI component.

It may mandate that a metric be **primary**, that two metrics be **comparable**, that an anomaly be **highlighted**, or that a user be able to **drill down**.

The visual implementation of these constraints is handled by Impeccable.

## When to use `metrics-dashboard`

Use primarily for metric-oriented interfaces:

- product analytics;
- SaaS usage analytics;
- revenue / finance;
- executive KPIs;
- operational monitoring;
- observability;
- growth dashboards.

For interfaces primarily focused on workflows—such as CRM, bookings, support inboxes, user management, moderation, or project management—do not force the use of `metrics-dashboard`.

In these cases, use Impeccable `Operate` directly, potentially with a task- and workflow-oriented specification.
