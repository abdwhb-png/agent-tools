---
name: metrics-dashboard
description: "Define a product metrics dashboard specification with key metrics, data sources, information hierarchy, visualization requirements, and alert thresholds. Use when defining KPIs, product analytics, or a data monitoring plan. This skill defines what the dashboard must communicate, not its final visual layout."
---

## Product Metrics Dashboard

Define a comprehensive product metrics dashboard specification with the right metrics, information hierarchy, visualization requirements, and alert thresholds.

The output of this skill is a product and data specification, not a final UI design.
Do not prescribe card grids, column layouts, spacing, typography, colors, or other visual composition decisions unless they are required by the semantics of the data.
Leave final visual hierarchy and interface composition to the product's UI/design system or a dedicated design skill.

### Context

You are designing a metrics dashboard for **$ARGUMENTS**.

If the user provides files (existing dashboards, analytics data, OKRs, or strategy docs), read them first.

### Domain Context

**Metrics vs KPIs vs NSM**: Metrics = all measurable things. KPIs = a few key quantitative metrics tracked over a longer period. North Star Metric = a single customer-centric KPI that is a leading indicator of business success.

**4 criteria for a good metric** (Ben Yoskovitz, _Lean Analytics_): (1) Understandable — creates a common language. (2) Comparative — over time, not a snapshot. (3) Ratio or Rate — more revealing than whole numbers. (4) Behavior-changing — the Golden Rule: "If a metric won't change how you behave, it's a bad metric."

**8 metric types**: Vanity vs Actionable (only actionable metrics change behavior), Qualitative vs Quantitative (WHAT vs WHY — you need both; never stop talking to customers), Exploratory vs Reporting (explore data to uncover unexpected insights), Lagging vs Leading (leading indicators enable faster learning cycles, e.g. customer complaints predict churn).

**5 action steps**: (1) Audit metrics against the 4 good-metric criteria. (2) Update dashboards — ensure all key metrics are good ones. (3) Identify vanity metrics — be careful how you use them. (4) Classify leading vs lagging indicators. (5) Pick one problem and dig deep into the data.

For case studies and more detail: [Are You Tracking the Right Metrics?](https://www.productcompass.pm/p/are-you-tracking-the-right-metrics) by Ben Yoskovitz

### Instructions

1. **Identify the metrics framework** — organize metrics into layers:

   **North Star Metric**: The single metric that best captures core value delivery

   **Input Metrics** (3-5): The levers that drive the North Star

   **Health Metrics**: Guardrails that ensure overall product health

   **Business Metrics**: Revenue, cost, and unit economics

2. **For each metric, define**:

   | Metric | Definition                                              | Data Source                 | Visualization Requirement                                                                             | Target       | Alert Threshold            |
   | ------ | ------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- | ------------ | -------------------------- |
   | [Name] | [Exact calculation: numerator/denominator, time window] | [Where the data comes from] | [What the user needs to perceive or compare; recommend a chart type only when semantically justified] | [Goal value] | [When to trigger an alert] |

   Visualization choices must follow the analytical task:
   - Trend over time → time-series visualization
   - Compare categories → comparative visualization
   - Part-to-whole → composition visualization, only when the relationship matters
   - Conversion stages → funnel or stage-based visualization
   - Current status against a threshold → compact status/KPI representation

   Do not choose a visualization merely to add visual variety.

3. **Define the dashboard information architecture**:

   Define what information deserves attention and how the metrics relate to each other. Do not define the final visual layout.

   For each group, specify:

   - **Priority** — primary, secondary, supporting, or diagnostic
   - **Purpose** — what decision or question this information supports
   - **Relationships** — which metrics should be compared, correlated, or read together
   - **Default context** — relevant time range, segment, baseline, or comparison period
   - **Drill-down** — whether the user needs access to underlying dimensions or details
   - **Attention conditions** — when the information should become more prominent because of an anomaly, threshold, or state

   Produce a semantic structure such as:

   ```yaml
   primary:
     metric: weekly_active_projects
     purpose: measure recurring value delivery
     comparison: previous_period

   drivers:
     - projects_created
     - projects_completed
     - returning_users

   health:
     - failure_rate
     - p95_processing_time

   business:
     - mrr
     - churn

   relationships:
     - weekly_active_projects must have the highest information priority
     - driver metrics should be easy to compare with each other
     - health metrics should surface abnormal states
     - business metrics are secondary on this dashboard
   ```

   This structure expresses information hierarchy and analytical relationships only.
   A downstream UI/design system decides whether these become cards, tables, charts, sections, panels, or another composition.

4. **Set review cadence**:
   - **Daily**: Operational health (errors, latency, critical flows)
   - **Weekly**: Input metrics and engagement trends
   - **Monthly**: North Star, business metrics, OKR progress
   - **Quarterly**: Strategic review and metric recalibration

5. **Define alerts**:
   - What thresholds trigger investigation?
   - Who gets alerted and through what channel?
   - What's the expected response time?
   - Should the abnormal state also change the metric's information priority in the dashboard?

6. **Recommend tools** based on the user's context:
   - Amplitude, Mixpanel, PostHog for product analytics
   - Looker, Metabase, Mode for SQL-based dashboards
   - Datadog, Grafana for operational health

Think step by step.

Save the result as a markdown dashboard specification containing:

1. Metric framework
2. Exact metric definitions
3. Information architecture
4. Visualization requirements
5. Targets and alert thresholds
6. Review cadence
7. Data sources

Do not produce a final UI layout unless the user explicitly asks for one.

---

### Further Reading

- [The Ultimate List of Product Metrics](https://www.productcompass.pm/p/the-ultimate-list-of-product-metrics)
- [The North Star Framework 101](https://www.productcompass.pm/p/the-north-star-framework-101)
- [The Product Analytics Playbook: AARRR, HEART, Cohorts & Funnels for PMs](https://www.productcompass.pm/p/the-product-analytics-playbook-aarrr)
- [AARRR (Pirate) Metrics: The 5-Stage Framework for Growth](https://www.productcompass.pm/p/aarrr-pirate-metrics)
- [The Google HEART Framework: Your Guide to Measuring User-Centric Success](https://www.productcompass.pm/p/the-google-heart-framework)
- [Funnel Analysis 101: How to Track and Optimize Your User Journey](https://www.productcompass.pm/p/funnel-analysis)
- [Are You Tracking the Right Metrics?](https://www.productcompass.pm/p/are-you-tracking-the-right-metrics)
- [Continuous Product Discovery Masterclass (CPDM)](https://www.productcompass.pm/p/cpdm) (video course)
