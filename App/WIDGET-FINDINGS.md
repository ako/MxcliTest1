# Widget authoring test — findings

Exercising four marketplace widget families (**Tree node**, **Timeline**, **Badge/pill**,
**Charts**) against `mxcli` on this **MPR v2** project. An earlier round (mxcli `752ffa2`)
found several page-writer gaps that blocked shipping these widgets. The **ako/mxcli main**
build (`2596c5f`, 2026-07-21) lands targeted fixes for **every one of them**; this documents
the **re-verified** results — all six widget families now author and render — and how to reproduce.

Reproducible scripts live in `mdlsource/`:
- `04-insights-views.mdl` — the aggregation view entities the charts read
- `05-charts.mdl` — Pie + Column charts (both now render)
- `05-widgets.mdl` — the **shipped** integration: Pie + Column + status pills on `Trips_Overview`;
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
| Column chart **runtime `JSON.parse('')`** — unset series String emitted as `" "` | `fc67ef2` don't emit `" "` for unset chart-series String props |

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
  as a donut with a category legend and percentages over the `CostByCategory` view, with **0
  console errors** (no `'{}'` workaround needed — the top-level String path already emits `""`,
  which the chart client's empty-guard turns into `{}`).

### Column chart — ✅ works (was the last residual, fixed by `fc67ef2`)
- Passes `mx check` (0 errors, CE0463 gone) and all series props persist (`staticDataSource`,
  `staticXAttribute`/`staticYAttribute`, `staticName`, `aggregationType`).
- Earlier it passed `mx check` but failed at runtime with a client-side
  `JSON.parse('Unexpected end of JSON input')`: the object-list-item builder emitted an **unset
  series String property as a single space `" "`** instead of `""`. The chart client feeds
  `customSeriesOptions`/`customLayout`/`customConfigurations` to `JSON.parse` behind a
  `value !== "" ? value : "{}"` guard — a lone space slips past the guard, so it ran
  `JSON.parse(" ")` and threw. `mx check` never runs the client, so it stayed green; the Pie
  (widget-level datasource, no series object-list) was unaffected.
- `fc67ef2` leaves an unset String empty, matching Studio Pro. Re-verified: the Column chart now
  **renders as a bar chart** (Budget by trip: Tokyo Spring / Iceland Ring Road / Lisbon Weekend),
  **0 console errors**, no `'{}'` workaround needed. It is now **shipped** alongside the Pie.

## Net

- **Badge / pill, Tree node (header + child slot), Timeline (text + grouping + 2-hop XPath),
  Pie chart, Column chart, Image**: full-fidelity authoring **and** runtime render in MPR v2. ✅
- **OQL view entities**: pass `mx check` and deploy cleanly (`BUILD SUCCEEDED`). ✅
- **No residuals.** Every gap found in the first round has a landed fix on ako/mxcli main.

The shipped model now **integrates all six widget families with live data** (previously
withheld), and stays a clean bootable **MPR v2** build (0 errors, `mprcontents/` intact,
HTTP 200). The four widget `.mpk`s are at marketplace latest.
