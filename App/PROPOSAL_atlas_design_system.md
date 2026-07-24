---
title: Atlas Design System — a skill for visually appealing Mendix apps
status: proposed
---

# Proposal: Atlas Design System (the `atlas-design` skill)

## Status: Proposal

> **Destined for** `docs/11-proposals/` in the mxcli repo. Drafted from the Itinera travel-planner
> build (test app `ako/mxclitest1`). This is a **design-system / skill layer**, not new
> infrastructure — it sits *on top of* four existing proposals and consumes what they build.

## Overview

mxcli can generate a fully-functional Mendix app, but the default output looks **bland** — it leans
on raw Atlas defaults plus ad-hoc SCSS. Reaching the polish of a hand-designed HTML artifact is
possible but currently costs a day of manual iteration, fighting Atlas specificity, and
re-discovering the same gotchas.

The Itinera build proved a **repeatable method** for closing that gap. This proposal captures it as
a skill so a generated app reaches "designed product" quality *by default* — the way
`artifact-design` does for standalone HTML and `dataviz` does for charts.

**Scope boundary:** `atlas-design` is the *taste + workflow* layer. It does **not** re-specify the
styling mechanics, composition primitives, or building-block/template introspection — those are the
four proposals below. It *uses* them and adds the design system, the Atlas-first method, the recipe
library, the gotchas catalog, and the verify loop.

---

## Relationship to existing proposals (reconciliation)

This proposal deliberately **defers** to and **depends on** work already proposed. It should not
duplicate any of it.

| Existing proposal | Status | What it owns | What `atlas-design` adds on top |
|---|---|---|---|
| `page-styling-support.md` | partial (Phase 1 done) | the 4 styling channels: `class`, inline `style`, `DynamicClasses`, typed `designproperties` | *which* classes/tokens to use and *when* (the Atlas vocabulary + palette method) |
| `proposal_page_composition.md` | proposed (fragments impl'd) | `define/use fragment`, `alter page`, partial updates, **parameterized fragments (future)** | ships the recipe library *as* fragments; designs recipes to migrate to parameterized fragments |
| `show-describe-building-blocks.md` | proposed (list-only today) | `Forms$BuildingBlock` introspection + (future) instantiation | uses Building Blocks as the eventual native home for recipes; maps Atlas blocks → our recipes |
| `show-describe-page-templates.md` | proposed (list-only today) | `Forms$PageTemplate` introspection | the page-template → screen map (Detail_Cards, Grid_Card, Dashboard_*) |

If any of these advance, `atlas-design` should shrink accordingly (e.g., once `use building block`
lands, the `.mdl`/fragment recipe library becomes a thin adapter over native Building Blocks).

---

## The core insight: be **Atlas-first**

Our first pass hand-rolled `.panel` / `.trip-card` / `.stat` that **partly reinvented what Atlas
already ships**. Atlas exposes a rich appearance system reachable from MDL today via `class:` (Phase
1 of `page-styling-support` is done), with more idiomatic typed `designproperties` coming.

### Atlas appearance vocabulary (from `atlas_core/web/design-properties.json`, verified in-project)

| Concern | Atlas classes (apply via `class:`) |
|---|---|
| **Cards** | `card`, `cards` (+ Card-style variants) — real CSS (`.card` = 19 rules) |
| **Backgrounds** | `background-{default,main,primary,secondary,success,warning,danger}` |
| **Buttons** | `btn-{primary,secondary,success,warning,danger}`, `btn-{lg,sm,bordered,block,icon-right,icon-top}` |
| **Flex / align** | `flex-{row,column,nowrap,items-grow,items-shrink}`, `align-x-{left,center,right,between,around,evenly}`, `align-y-*` |
| **Spacing utils** | `spacing-{outer,inner}-{top,right,bottom,left}[-medium|-large|-none]` |
| **Borders / overflow** | `div-border-toggle-{all,top,…,none}`, `div-overflow-{auto,hidden,visible}`, Border radius/color/style/width |
| **Elevation** | `Shadow` toggle |
| **Data grids** | `datagrid-{bordered,hover,striped,lined,lg,sm}` |
| **Group boxes** | `groupbox-{primary,danger,secondary,callout}` |

### Atlas page templates (`Forms$PageTemplate`, surfaced from `Atlas_Web_Content`, 46 pages)
Several map 1:1 onto what we hand-built: **`Detail_Cards` + `Detail_Timeline`** ≈ our detail page;
**`Dashboard_Status` + `Grid_Card`** ≈ our overview. `Grid_Card`, `List_Status`, `List_MasterDetail`,
`Dashboard_*`, `Wizard_Form`, `Tabs_Card` are canonical compositions to mirror.

### Atlas Building Blocks (`Forms$BuildingBlock`, 233 across the team's test projects)
The Mendix-native "card/title recipe library": reusable widget compositions **copied** onto pages
(templates, not runtime components), with preview thumbnails and categories. Today mxcli can *list*
them; `show/describe/use` is proposed. This is the eventual native home for our recipes.

**Rule of thumb — reach *down* the stack first:** need a card? `class:'card'` before a `.panel`
rule. Brand blue on buttons? `--brand-primary` before overriding `.btn-primary`. Custom CSS is the
**last** resort, for identity only.

---

## Findings from live testing (this app, mxcli `b990548`)

Ran a controlled experiment on the running app: a page of **pure Atlas classes, zero custom CSS**,
authored purely with mxcli's `class:` property. Result — **the Atlas-first thesis holds**:

| Authored via `class:` | Rendered |
|---|---|
| `card` + `spacing-inner-large` | real Atlas card (surface bg, border, radius, padding) ✅ |
| `background-primary` | **the app's azure** — the Atlas utility inherited our retuned `--brand-primary` ✅ |
| `flex-row` + `align-x-between` | children spread left/right ✅ |
| `buttonstyle: primary`, `btn-lg` (class), `btn-bordered` (class) | solid / large / outlined Atlas buttons ✅ |

**Confirmed for the proposal:**
1. **Raw `class:` strings are sufficient today** — `page-styling-support` Phase 1 (`class`) already renders
   the full Atlas appearance vocabulary. The typed `designproperties` channel is **not required for the
   visual result** (it matters only for round-tripping into Studio Pro's Appearance tab). → recipes can
   ship on `class:` now; `designproperties` support is a nicety, not a blocker.
2. **Brand tokens propagate *down* into Atlas utilities** — `background-primary`/`btn-primary` resolve to
   our `--brand-primary`. This validates the layered model: retune Layer 1 tokens and Layer 0 Atlas
   classes follow for free. Strong argument to **delete** the hand-rolled `.panel`/`.trip-card`/`.stat`/
   `.insight-card` and use `class:'card …'`, keeping custom SCSS only for identity (mono type, pills,
   timeline spine, elevation curve).

**Tooling finding for the mxcli session (a real bug):**
- Under `run --local --watch`, a **model change that added a page and repointed the home** hot-applied
  "via restart, client re-bundled (gen 2)" but then **`/dist/index.js` 404'd** → the app served only the
  `<noscript>` shell and was unbootable. A **clean full restart fixed it** (the same page renders fine).
  So the watch client-re-bundle path does not reliably regenerate/serve `/dist/index.js` on *structural*
  model changes. Recommendation: on a structural change (new/removed page, nav/home change), force a full
  client re-bundle (or fall back to a clean restart) rather than the incremental gen-bump — and have the
  readiness probe verify `/dist/index.js` is 200 before reporting the build applied. (Theme-only SCSS
  edits hot-apply correctly — that path is unaffected.)

## The standard — a 4-layer architecture

```
Layer 3  VERIFY      run --local --watch  +  Playwright screenshot   (mx check is NOT enough)
Layer 2  IDENTITY    themesource/<mod>/web/main.scss — --tv-* tokens + recipes (palette, mono type,
                     elevation, status pills, timeline) — ONLY what Atlas can't provide
Layer 1  BRAND       theme/web/custom-variables.scss — retune Atlas tokens (--brand-primary, bg,
                     semantic colors, radius) so Atlas components inherit the palette
Layer 0  ATLAS       Atlas classes / designproperties / templates / building blocks — structure & base
```

Grounded assets from the Itinera build: `mdlsource/06-redesign.mdl`, `07-shell.mdl`,
`themesource/travel/web/main.scss`, `theme/web/custom-variables.scss`, and the approved Itinera HTML
mockup (design-first spec).

---

## Reuse mechanism for the recipe library (settled)

There are **five** reuse mechanisms; the recipe library should use a blend, chosen per recipe and
designed to migrate to the roadmap.

| Mechanism | Persisted | Reuse | Params / slots | Support | Use for |
|---|---|---|---|---|---|
| `.mdl` recipe (text) | — | copy | full fill-in | today | content-varying blocks now |
| **Fragment** (`define/use`) | No (script-scoped) | copy, DRY-in-script | `prefix_` only (params future) | **impl'd** | fixed repeated groups (header, footer, pill) |
| Mendix **Snippet** | Yes | reference (live) | context entity only, no content slot | create/describe | genuinely-shared runtime components |
| **Building Block** | Yes (template) | copy (dragged in) | template + preview | list-only (`use` proposed) | **eventual native home** for recipes |
| **Page Template** | Yes | copy (new-page) | layout + tree | list-only | screen scaffolds |

**Decision:**
1. **Now** — ship recipes as **fragments** (a `define fragment` prelude scripts include) for fixed
   groups, plus **`.mdl` fill-in recipes** for content-varying blocks (a card wrapping arbitrary
   content — fragments can't parameterize content yet). Reserve **Mendix Snippets** for truly-shared
   runtime components.
2. **Design for the roadmap** — author recipes so they migrate cleanly to **parameterized fragments**
   (`proposal_page_composition.md`, future) and ultimately **`use building block`**
   (`show-describe-building-blocks.md`), which would also surface them in Studio Pro's toolbox.

Rationale: a design-recipe library is mostly *shapes whose content varies per use* (a status pill
binds `Trip.Status` in one place and `Activity.Category` in another). Mendix Snippets can't do that
(context-entity only, no content slot); fragments can't yet (no params); so today it's fragments +
fill-in. Parameterized fragments / Building Blocks close the gap.

---

## The skill: `atlas-design`

### Trigger
Load before styling a Mendix web app / page group, when the user asks to make an app "look good /
professional / branded / less bland", or to match a design mock. Companion to `create-page` (widget
*syntax*), `page-styling-support` (styling *mechanics*), and `fragments` (composition).

### Structure
```
.claude/skills/atlas-design.md            # the method (§ Atlas-first, 4-layer, verify)
.claude/skills/atlas-design/
  ├─ references/atlas-classes.md          # the Atlas appearance vocabulary + when to use each
  ├─ references/page-templates.md         # Atlas template → screen map (defers to show-describe-page-templates)
  ├─ references/gotchas.md                # the catalog below
  ├─ references/verify.md                 # run --watch + screenshot loop; "mx check misses client crashes"
  ├─ assets/custom-variables.scss         # Layer-1 brand-token scaffold (palette-swappable)
  ├─ assets/main.scss                     # Layer-2 token + recipe starter
  └─ recipes/                             # fragment prelude + .mdl fill-in recipes
       card / stat-tile / status-pill / page-header / hero-overlay / timeline-row / budget-row
```

### Contents
1. Design-first workflow (mock → approve → port).
2. Atlas-first + the 4-layer architecture + "reach down the stack first".
3. The Atlas appearance cheat-sheet (use `class:`/`designproperties` before hand CSS).
4. Token architecture (the two-file split, both themes, style-through-tokens).
5. The recipe library (fragments + fill-in, migrating to parameterized fragments / Building Blocks).
6. The gotchas catalog.
7. The verify loop (**runtime verification is mandatory** — see below).

---

## Gotchas catalog (encode these — each cost real time this session)

| Gotcha | Fix |
|---|---|
| `$` in `dynamictext content:` breaks the parser (starts a variable token) | put `$` in CSS `::before`; bind only the number |
| Enum `dynamictext` renders the **key**, not the caption | accept, or map via `dynamicclasses` |
| `sort by` not allowed on **association-sourced** listviews | sort the parent, or use a DB source |
| Aggregates can't be inlined in a create-object assignment (CE0117) | compute into vars first |
| Reserved widget identifiers exist (`v3`) | prefix names (`sv3`); avoid bare `v<n>` |
| Pluggable widgets impose their own DOM (charts/timeline/treenode) | for pixel-fidelity use native `listview`/`gallery` you fully style |
| **`mx check` passes but the browser client crashes** (e.g. old ListView `SearchRefs`) | **always Playwright-verify a running build; never ship on `mx check` alone** |
| "SCSS cache" — edits don't show | never a cache: `--watch` (now watches theme source) or clean restart; kill stale process first |
| Stale process serves old output, looks like a cache | `run --local` now refuses occupied ports; free them (pgrep/kill/curl 000) |
| `ALTER PAGE SET layout … map(…)` swaps a page onto a sidebar shell | without rebuilding the widget tree |

---

## Rollout

- **Phase 1 — skill core**: `atlas-design.md` + `gotchas.md` + `verify.md` (captures the method while fresh).
- **Phase 2 — Atlas vocabulary**: `atlas-classes.md` + page-template map (pairs with `show-describe-*`).
- **Phase 3 — token scaffold**: `custom-variables.scss` + `main.scss` starter.
- **Phase 4 — recipe library**: fragment prelude + `.mdl` fill-in recipes extracted from Itinera.
- **Phase 5 (optional) — lint rules**: flag hardcoded hex over tokens; flag data widgets shipped
  without a recorded runtime verification.

## Dependencies
- `page-styling-support.md` Phase 1 (`class`/`style`) — **done**, required. Typed `designproperties`
  (later phase) would let recipes use Atlas tokens idiomatically instead of raw class strings.
- `proposal_page_composition.md` fragments — **implemented**, required for the fragment recipes.
  **Parameterized fragments (future)** would materially simplify the library.
- `show-describe-building-blocks.md` `use` — **proposed**; the ideal long-term recipe home.

## Open questions
- **`designproperties` vs `class` strings**: **resolved by live testing** — raw `class:` renders the full
  Atlas vocabulary today, so recipes ship on `class:` now. Typed `designproperties` becomes a *later*
  nicety (Studio-Pro Appearance-tab round-trip), not a prerequisite.
- **Dark mode**: authored in tokens, but Atlas web apps don't runtime-toggle by default — ship
  light-only or wire a toggle?
- **Recipe home end-state**: parameterized fragments vs native Building Blocks — likely both, with
  Building Blocks winning once `use` lands (Studio-Pro-visible).
- **Verification is non-skippable**: the standard's correctness depends on runtime verification
  because `mx check` demonstrably misses client crashes; the skill must enforce it.

---

### Appendix — reference artifacts
Itinera build: `mdlsource/06-redesign.mdl`, `07-shell.mdl`, `themesource/travel/web/main.scss`,
`theme/web/custom-variables.scss`; widget-authoring findings in `WIDGET-FINDINGS.md`; approved
visual direction in the Itinera HTML mockup.
