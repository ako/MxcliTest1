# Widget authoring test — findings

Exercising four marketplace widget families (**Tree node**, **Timeline**, **Badge/pill**,
**Charts**) against `mxcli` on this **MPR v2** project. An earlier round (mxcli `752ffa2`)
found several page-writer gaps that blocked shipping these widgets. The **ako/mxcli main**
build (`4bd3bc8`, 2026-07-21) lands targeted fixes for every one of them; this documents the
**re-verified** results — what now works, the single residual, and how to reproduce.

Reproducible scripts live in `mdlsource/`:
- `04-insights-views.mdl` — the aggregation view entities the charts read
- `05-charts.mdl` — Pie + Column charts (the Column chart is the residual repro)
- `05-widgets.mdl` — the **shipped** integration: Pie + status pills on `Trips_Overview`;
  TreeNode outline + Timeline + status/category pills on `Trip_Detail`

## The mxcli fixes (ako/mxcli main, after `752ffa2`)

| Earlier gap | Fix commit |
|-------------|-----------|
| Charts **CE0463** in v2 (only `mx update-widgets` cleared it → v1 downgrade) | `e2f3799` reconcile generated-widget defs to mxbuild's WidgetType |
| Badge `value` / TreeNode `headerCaption` / Timeline `title`/`description`/`timeIndication` textTemplates **dropped** (MDL-WIDGET01) | `4a62736` emit a texttemplate mapping for every top-level textTemplate |
| TreeNode `container children` **child slot dropped** | `788f97e` route `container <slotName>` to the slot by name |
| Timeline custom-visualization → empty ClientTemplate CE0463 | `c397745` merge hand-authored visibility fallback with extracted rules |
| Timeline 2-hop XPath `[A/B = $x]` → **CE1613** | `e9339ec` expand multi-hop association paths (insert intermediate entity) |
| TimeSeries `markerColor` empty ClientTemplate CE0463 | `4a00aad` null hidden chart-series textTemplates by item config |

## Marketplace updates applied (PAT via `mxcli auth login`)

| Widget | Content ID | Was | Now (latest) |
|--------|-----------|-----|------|
| Charts | 105695 | 6.2.1 | **6.3.1** |
| Timeline | 115852 | 3.2.2 | **3.2.3** |
| Badge | 50325 | 3.2.2 | **3.2.3** |
| Badge Button | 52705 | 3.2.1 | **3.3.0** |

## Re-verified results (mxbuild 11.12.1, `mx check` = 0 errors, MPR v2 intact)

Verification was done three ways: **`mx check`** (Studio Pro validation), **BSON dump** (the
caption `AttributeRef`s are actually stored), and a **live run + Playwright screenshot** (the
widgets render with real data).

### Badge / pill — ✅ works
- `value: '{Status}'` and `value: '{Category}'` now **persist** (stored as an `AttributeRef`,
  no MDL-WIDGET01). At runtime the pills render: **Completed / Booked / Planning** status
  pills on the trip cards and header, and **Sightseeing / Food & Drink / Activity / Transport**
  category pills inside the itinerary outline.

### Tree node — ✅ works (header text **and** child slot)
- `headerCaption: 'Day {DayNumber} — {Heading}'` persists and renders ("Day 1 — Alfama & Baixa").
- The `container children { … }` **child slot persists** — the "+ Activity / Edit day" actions,
  time labels, category pills and activity names all render nested under each expanded day.

### Timeline — ✅ works (text + grouping + 2-hop XPath)
- `title` / `description` / `timeIndication` (all textTemplate) persist and render
  (Name / Location / time). Day grouping renders as Thursday / Friday / Saturday headers.
- The 2-hop datasource `[Travel.Day_Activity/Travel.Trip_Day = $Trip]` now resolves
  (CE1613 gone) — the timeline shows every activity across all days.

### Pie chart — ✅ works
- `seriesName: '{CategoryName}'` + `seriesValueAttribute` persist; **CE0463 is gone**. Renders
  as a donut with a category legend and percentages over the `CostByCategory` view.
- One wrinkle: the chart's `customLayout` / `customConfigurations` JSON-string props are emitted
  empty by default, which the widget's client code `JSON.parse`s → a (non-fatal) console error.
  Setting them explicitly to `'{}'` in MDL clears it — done on the shipped pie.

### Column chart — ⚠️ the one residual (build-valid, runtime render failure)
- Passes `mx check` (0 errors, CE0463 gone) and all series props persist (`staticDataSource`,
  `staticXAttribute`/`staticYAttribute`, `staticName`, `aggregationType`, `customSeriesOptions`).
- **But it fails to render at runtime**: `Could not render widget 'Travel.Trips_Overview.chartBudget'`,
  from a client-side `JSON.parse('Unexpected end of JSON input')` in the ColumnChart's render path.
  Setting `customLayout` / `customConfigurations` / series `customSeriesOptions` all to `'{}'`
  (verified stored as `"{}"` in the BSON) does **not** clear it — so the empty-JSON source is a
  different, still-unidentified ColumnChart property the writer emits blank. The Pie over the same
  kind of view entity renders fine, so this is specific to the Column/static-series path.
- Because it can't render, the Column chart is **not shipped**. It remains in `05-charts.mdl` as
  a runnable repro.

## Net

- **Badge / pill, Tree node (header + child slot), Timeline (text + grouping + 2-hop XPath),
  Pie chart, Image**: full-fidelity authoring **and** runtime render in MPR v2. ✅
- **OQL view entities**: pass `mx check` and deploy cleanly (`BUILD SUCCEEDED`). ✅
- **Column chart**: build-valid but a residual runtime `JSON.parse('')` blocks rendering. ⚠️

The shipped model now **integrates the five working widget families with live data**
(previously withheld), stays a clean bootable **MPR v2** build (0 errors, `mprcontents/` intact,
HTTP 200), and drops only the Column chart. The four widget `.mpk`s are at marketplace latest.
