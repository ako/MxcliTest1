# Proposal: `atlas-design` — a skill for building visually appealing Mendix apps

**Status:** Draft for review · **Author:** generated from the Itinera travel-planner build
**Target:** a new mxcli skill (`.claude/skills/atlas-design.md`) + companion scaffold & recipe library
**Related:** `artifact-design` (HTML/React), `dataviz` (charts), `create-page`, `alter-page`, `run-local`

---

## 1. Problem & goal

mxcli can generate a fully-functional Mendix app, but the default output looks *bland* — it leans
on raw Atlas defaults plus ad-hoc SCSS. When asked to hit the polish of a hand-designed HTML
artifact, we can get there, but only by a day of manual iteration, fighting Atlas specificity, and
re-discovering the same gotchas each time.

**Goal:** a repeatable standard — encoded as a skill + assets — so a generated Mendix app reaches
"designed product" quality *by default*, the way `artifact-design` does for standalone HTML.

This session (the **Itinera** travel planner) proved the *method* end-to-end. This proposal captures
it, folds in **research on Atlas's own building blocks** (Section 3), and specifies the skill to build.

---

## 2. Evidence base — what this session proved

| Proven | How |
|--------|-----|
| **Design-first workflow** (HTML mock → approve → port) | Itinera mockup → live Mendix pages matched closely; the artifact became the spec |
| **Token layer over Atlas** transforms the look | `--tv-*` tokens (color/space/type/elevation) drove overview, detail, sidebar |
| **Retuning Atlas brand tokens** makes Atlas cooperate | `theme/web/custom-variables.scss` → azure `--brand-primary`, cool bg |
| **Class-hook + rendered-DOM styling** | `class:`/`dynamicclasses:` in MDL → SCSS on `.mx-text`, `.region-sidebar`, `.mx-navigationtree a`, … |
| **Override Atlas state vars, don't out-specificity them** | sidebar current-item via `--navsidebar-bg-active`, not `!important` wars |
| **Native widgets for pixel-fidelity** | itinerary/timeline rebuilt as native `listview`s beat the pluggable widgets' fixed DOM |
| **Monospace for temporal/numeric data** | times/dates/budgets — CSP-safe signature, high character |
| **The dev loop is now reliable** | `--watch` (theme source) + build-generation log + stale-port guard + Playwright verify |

The tooling fixes landed in mxcli during this session are what make the standard *dependable*:
`--watch` now watches `theme/` + `themesource/`, the run loop refuses stale ports, and the
page-writer serialization bugs (charts CE0463, dropped textTemplate/slots, 2-hop XPath, native
ListView `SearchRefs`) are fixed — so *what you author in MDL actually renders*.

---

## 3. Research: Atlas's own visual building blocks — **use them, don't reinvent**

The key question for this proposal: *Mendix ships visual building blocks (cards, titles, …) — are
they useful?* **Yes, substantially.** Atlas exposes three tiers of reusable visual assets, all
reachable from mxcli/MDL. Our first pass hand-rolled things (`.panel`, `.trip-card`, `.stat`) that
partly duplicate what Atlas already gives for free.

### 3a. Design-property appearance classes (the big win)

Atlas's `themesource/atlas_core/web/design-properties.json` defines a vocabulary of **appearance
toggles that are just CSS classes** — settable directly via the MDL `class:` property. Confirmed
present in this project (Atlas Core 4.1.3), with real compiled CSS behind them (`.card` alone has 19
rules):

| Concern | Atlas classes (apply via `class:`) |
|---------|-----------------------------------|
| **Cards** | `card`, `cards` (+ "Card style" variants) |
| **Backgrounds** | `background-default` / `-main` / `-primary` / `-secondary` / `-success` / `-warning` / `-danger` |
| **Buttons** | `btn-primary` / `-secondary` / `-success` / `-warning` / `-danger`, `btn-lg` / `-sm`, `btn-bordered`, `btn-block`, `btn-icon-right` / `-top` |
| **Flex layout** | `flex-row` / `-column` / `-nowrap`, `flex-items-grow` / `-shrink` / `-auto` / `-fixed`, `flex-width flex-large/medium/small` |
| **Alignment** | `align-x-left/center/right/between/around/evenly`, `align-y-top/center/bottom/…` |
| **Spacing utilities** | `spacing-outer-{top,right,bottom,left}[-medium|-large|-none]` (inner variants too) |
| **Borders / overflow** | `div-border-toggle-{all,top,right,bottom,left,none}`, `div-overflow-{auto,hidden,visible}`, Border radius/color/style/width |
| **Elevation** | `Shadow` toggle |
| **Data grids** | `datagrid-bordered` / `-hover` / `-striped` / `-lined` / `-lg` / `-sm` |
| **Group boxes / callouts** | `groupbox-primary` / `-danger` / `-secondary` / `-callout` |
| **Screen width / gutter** | `--max-screen-width` (XXL…S), `--gutter-size` (S/M/L) |

**Implication:** structure, spacing, cards, backgrounds, buttons, and flex alignment should come
from **Atlas classes**, not bespoke SCSS. The custom layer then only has to supply the *identity*
Atlas can't: the exact palette, monospace data type, the elevation curve, status pills, and the
timeline spine. This is less code, fewer specificity fights, and forward-compatible with Atlas.

> Example: `container ctnCard (class: 'card spacing-inner-large')` gives an Atlas card with padding
> for free; the token layer then only tunes radius/shadow/border-color via CSS variables.

### 3b. Page templates (`Atlas_Web_Content`, 46 pages)

Atlas ships full **page templates** — the "choose a template" set when creating a page. Present here:

- **Dashboards:** `Dashboard_Action_Center`, `Dashboard_Status`, `Dashboard_Transactions`, `Dashboard_Navigation`
- **Detail:** `Detail_Cards`, `Detail_Summary`, **`Detail_Timeline`**, `Detail_Map`
- **Lists/Grids:** `Grid_Card`, `Grid_Tabbed`, `Grid_WithNavigation`, `List_Status`, `List_MasterDetail`, `List_Columns`, `List_Filtered`
- **Forms/Tabs/Wizard:** `Form_Centered/Columns/Split`, `Tabs_Card`, `Wizard_Form`

These are **reference structures** — several map 1:1 onto what we hand-built (our detail page is
`Detail_Cards` + `Detail_Timeline`; the overview is `Dashboard_Status` + `Grid_Card`). The skill
should point at them as canonical compositions to mirror, even when authoring fresh via MDL.

### 3c. Studio Pro Building Blocks (toolbox)

The drag-and-drop **Building Blocks** (KPI cards, headers/titles, list items, callouts) are an
authoring-time toolbox concept — they're *copied* into a page rather than referenced, so they're not
individually enumerable in the model. Their **composition + classes** are what matter, and those are
exactly the design-property classes in 3a. So mxcli reproduces a "KPI card" building block as
`container (class: 'card') { … heading + big number + delta }` — no special support needed.

### Net of the research
Atlas building blocks are **very useful and under-used by our current output.** The standard should
be **Atlas-first**: compose from Atlas cards/utilities/templates, and reserve custom CSS for the
brand identity layer. This is the single biggest correction to what we did by hand.

---

## 4. Recommended architecture — the standard (4 layers)

```
Layer 3  VERIFY      run --local --watch  +  Playwright screenshot  (mx check is NOT enough)
Layer 2  IDENTITY    themesource/<mod>/web/main.scss  — --tv-* tokens + recipes (palette, mono,
                     elevation, pills, timeline) — ONLY what Atlas doesn't provide
Layer 1  BRAND       theme/web/custom-variables.scss  — retune Atlas tokens (--brand-primary, bg,
                     semantic colors, radius) so Atlas components inherit the palette
Layer 0  ATLAS       Atlas classes (card, background-*, spacing-*, align-*, flex-*, shadow, btn-*)
                     + page templates (Detail_Cards, Grid_Card, Dashboard_*) — structure & base look
```

Rule of thumb: **reach down the stack first.** Need a card? `class:'card'` (Layer 0) before a
`.panel` rule (Layer 2). Need brand blue on buttons? `--brand-primary` (Layer 1) before overriding
`.btn-primary` (Layer 2). Custom CSS is the *last* resort, for identity only.

---

## 5. The skill: `atlas-design`

### 5a. Trigger / when to use
Load before styling any Mendix web app or page group, or when the user asks to make an app "look
good / professional / branded / less bland", or to match a design mock. Companion to `create-page`
(which covers widget *syntax*); `atlas-design` covers visual *system*.

### 5b. Structure
```
.claude/skills/atlas-design.md            # the method (this proposal §4–6 distilled)
.claude/skills/atlas-design/
  ├─ references/atlas-classes.md          # §3a cheat-sheet: every design-property class + when to use
  ├─ references/page-templates.md         # §3b: which Atlas template maps to which screen
  ├─ references/gotchas.md                # §6 catalog
  ├─ references/verify.md                 # §4 Layer 3: the run+screenshot loop, stale-port recovery
  ├─ assets/custom-variables.scss         # Layer 1 brand-token scaffold (fill-in-the-blanks)
  ├─ assets/main.scss                     # Layer 2 token + recipe starter
  └─ recipes/*.mdl                        # Layer 0/2 snippet recipes (card, stat tile, pill, hero,
                                          #   panel, sidebar rail, timeline, budget row)
```

### 5c. Contents (what the skill teaches)
1. **The workflow** — design-first (mock → approve → port), then compose Atlas-first.
2. **The 4-layer architecture** (§4) with the "reach down the stack first" rule.
3. **Atlas class cheat-sheet** (§3a) — so the model uses `card`/`background-*`/`spacing-*`/`flex-*`
   instead of hand CSS.
4. **The token architecture** — the two-file split, both-theme tokens, style-through-tokens.
5. **The gotchas catalog** (§6) — the MDL/Atlas traps, each with the fix.
6. **The recipe library** — drop-in `.mdl` snippets for the common blocks, each pairing Atlas classes
   with the minimum token CSS.
7. **The verify loop** (§4 Layer 3) — `run --local --watch`, Playwright screenshot, and the
   "mx check does not catch client crashes" rule.

### 5d. Companion assets
- **Token scaffold** (`custom-variables.scss` + `main.scss`) — a strong baseline so every app starts
  above raw Atlas. Derived from Itinera, palette-swappable.
- **Recipe snippets** — extracted from this app: stat tile, status pill, elevated card, page header
  w/ eyebrow, hero-with-overlay, day-grouped timeline, budget row. Each is Atlas-first (uses `card`,
  `spacing-*`, `flex-*`) with a thin token layer.

---

## 6. The gotchas catalog (encode these — each cost real time this session)

| Gotcha | Fix |
|--------|-----|
| `$` in `dynamictext content:` breaks the parser (starts a variable token) | put `$` in CSS `::before`, bind only the number |
| Enum `dynamictext` renders the **key**, not the caption | accept, or map via `dynamicclasses`/separate text |
| `sort by` not allowed on **association-sourced** listviews | sort the parent, or use a DB source |
| Aggregates can't be inlined in a create-object assignment (CE0117) | compute into vars first, then assign |
| Reserved widget identifiers exist (e.g. `v3`) | prefix names (`sv3`), avoid bare `v<n>` |
| Pluggable widgets impose their own DOM (charts/timeline/treenode) | for pixel-fidelity use native `listview`/`gallery` you fully style |
| **`mx check` passes but the browser client crashes** (e.g. old ListView `SearchRefs`) | **always Playwright-verify a running build; never ship on `mx check` alone** |
| SCSS "cache" — edits don't show | it's never a cache: `--watch` (now watches theme source) or clean restart; kill stale process first |
| Stale process serves old output, looks like a cache | `run --local` now refuses occupied ports; free them (pgrep/kill/curl 000) |
| Multi-class in one `class:` string is fine | but keep tokens/utilities separated for clarity |
| `ALTER PAGE SET layout … map(…)` swaps a page onto a sidebar shell | without rebuilding the widget tree |

---

## 7. Rollout plan

- **Phase 1 — skill + gotchas + verify** (highest value, fastest): write `atlas-design.md`,
  `gotchas.md`, `verify.md`. Captures the method while fresh.
- **Phase 2 — Atlas class cheat-sheet + page-template map** (§3): the "use Atlas first" reference.
- **Phase 3 — token scaffold**: `custom-variables.scss` + `main.scss` starter.
- **Phase 4 — recipe snippet library**: extract the Itinera blocks as Atlas-first `.mdl` recipes.
- **Phase 5 — lint rules** (optional): flag hardcoded hex over tokens; flag data widgets shipped
  without a recorded runtime verification.

---

## 8. Open questions / risks

- **Recipe format:** ship recipes as `.mdl` snippets (composable) vs Mendix Snippet documents
  (reusable but params-limited). Leaning `.mdl` for flexibility.
- **Dark mode:** we author both themes in tokens, but Atlas web apps don't runtime-toggle theme by
  default — decide whether the skill ships light-only or wires a toggle.
- **Atlas version drift:** design-property class names are stable across Atlas 4.x but should be
  re-verified per project (the skill reads `design-properties.json` to confirm availability).
- **Verification is mandatory, not optional:** the standard's correctness depends on the
  runtime-verify step because `mx check` demonstrably misses client crashes — the skill must make
  this non-skippable.

---

### Appendix — reference artifacts from this build
- Working app: `mdlsource/06-redesign.mdl` (overview + detail), `07-shell.mdl` (sidebar + Budget),
  `themesource/travel/web/main.scss` (token layer), `theme/web/custom-variables.scss` (brand tokens).
- Widget-authoring findings: `WIDGET-FINDINGS.md`.
- Approved visual direction: the Itinera HTML mockup (design-first spec).
