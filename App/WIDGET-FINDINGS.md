# Widget authoring test — findings

Exercising four marketplace widget families (**Tree node**, **Timeline**, **Badge/pill**,
**Charts**) against `mxcli` (ako/mxcli main build) on this **MPR v2** project surfaced
several page-writer gaps. This documents what works, what doesn't, and how to reproduce.

Reproducible scripts live in `mdlsource/`:
- `04-insights-views.mdl` — the aggregation view entities the charts read
- `05-charts.mdl` — Pie + Column charts woven into `Trips_Overview`
- `05-widgets.mdl` — Badge / TreeNode / Timeline woven into `Trip_Detail`

## Marketplace updates applied (PAT via `mxcli auth login`)

| Widget | Content ID | Was | Now (latest) |
|--------|-----------|-----|------|
| Charts | 105695 | 6.2.1 | **6.3.1** |
| Timeline | 115852 | 3.2.2 | **3.2.3** |
| Badge | 50325 | 3.2.2 | **3.2.3** |
| Badge Button | 52705 | 3.2.1 | **3.3.0** |

`marketplace install <id> -p App.mpr` copies the `.mpk` into `widgets/` and preserves v2.
With **no instances** on any page, `mx check` stays at 0 errors after the update.

## Results by widget

### Charts (Pie / Column) — authorable, but blocked in v2 by CE0463
- All series properties **persist correctly**, including textTemplate ones: `datasource`,
  `seriesName`/`staticName`, `seriesValueAttribute`, `staticXAttribute`, `staticYAttribute`.
  (Note: the pie's datasource must be given via the `datasource:` clause, not
  `seriesDataSource:` — `mxcli check` flags the latter as `MDL-WIDGET05`.)
- **However**, every chart instance trips **CE0463** "The definition of this widget has
  changed" at `mx check`. It reproduces even after `mxcli widget init --force` and
  re-stamping, and regardless of whether Charts is at 6.2.1 or 6.3.1.
- The only thing that clears it is `mx update-widgets`, which **downgrades MPR v2 → v1**
  (removes `mprcontents/`). So charts cannot currently be shipped in a v2 project.
- Contrast: the **Image** widget authors cleanly with 0 errors in the same project — so the
  version-stamp fix that covers Image does **not** cover the Charts widgets.

### Badge (pill) — content property dropped
- `value` (textTemplate) is **silently dropped** by the page writer. After
  `exec`, `describe page` shows `bdgStatus (type: badge)` with **no** `value`, and
  `mxcli check` reports `MDL-WIDGET01 "widget bdgStatus (badge) has no property value"`.
- There is no slot alternative on Badge, so a Badge can't be authored with dynamic text.

### Tree node — textTemplate **and** child-slot dropped
- `headerCaption` (textTemplate) is dropped (`MDL-WIDGET01`).
- The `container children { … }` widget-slot is **also dropped** — after `exec` the tree
  node persists with only scalar props (`headerType`, `openNodeOn`, `showIcon`) and no
  children at all. So neither the header text nor the nested content can be authored.

### Timeline — textTemplate dropped
- `title` / `description` / `timeIndication` (all textTemplate) are dropped (`MDL-WIDGET01`).
- A 2-hop XPath datasource (`[Travel.Day_Activity/Travel.Trip_Day = $Trip]`) mis-serialized
  to **CE1613** "The selected entity 'Travel.Trip_Day' no longer exists" (the association
  path was read as an entity).

## Why `describe` proves the drops are real
`describe page` **does** render textTemplate properties — e.g. the Image widget shows
`ImageUrl: '{1}'`. The same command shows **no** `value` / `headerCaption` / `title` on the
Badge / TreeNode / Timeline instances after `exec`, confirming the writer discarded them
rather than `describe` merely hiding them.

### OQL view entities — deploy cleanly ✅ (earlier failure did not reproduce)
- The two aggregation views (`Travel.CostByCategory` with an **enum-typed** `CategoryName`
  projected from `group by a.Category`, and `Travel.BudgetByTrip`) report **0 errors** under
  `mx check` **and** build cleanly under the full deploy build:
  ```
  mxbuild --target=deploy --java-home=<jdk21> --java-exe-path=<jdk21>/bin/java \
          --write-errors=deploy-errors.json App.mpr
  → BUILD SUCCEEDED (exit 0, no deploy-errors.json written)
  ```
  This was re-run on mxbuild **11.12.1** with both views present. An earlier note here
  reported the deploy build failing on these views; that behavior **did not reproduce** —
  the OQL views (including the enum-typed projection) deploy without errors. The two views
  are therefore kept in the shipped model as the chart data sources.

## Net
- **Image**: full-fidelity authoring in v2. ✅
- **Widget `.mpk` updates** (Charts/Timeline/Badge/BadgeButton): applying the latest
  marketplace versions is fine while **unused** — build stays green, v2 preserved. ✅
- **Charts** (when placed on a page): properties persist, but each instance raises CE0463,
  which only `mx update-widgets` clears — and that downgrades v2→v1. ⚠️
- **Badge / TreeNode / Timeline**: essential content (textTemplate + widget-slots) is not
  persisted by the page writer, so functional instances can't be authored via MDL yet. ❌
- **OQL view entities**: pass `mx check` **and** deploy cleanly (`BUILD SUCCEEDED`). ✅

To keep this deliverable a **clean, bootable v2 build** (0 errors, `mprcontents/` intact,
HTTP 200), the widget **instances** are **not** applied to the shipped model — the widget
`.mdl` scripts above remain as runnable repros because of the CE0463 / dropped-content
gaps. The two **view entities** *are* applied (they deploy cleanly and are the chart data
sources). The four widget `.mpk`s are updated to the marketplace latest on disk, as
requested.
