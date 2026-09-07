# `theme.focusVisible` adoption in MUI X

Baseline: `master` @ `3134f8780c`. Upstream: material-ui **PR #48743** (merged 2026-08-27).

`@mui/material` is already on **9.4.0** (`pnpm-workspace.yaml:26`), so `theme.focusVisible` exists at runtime
**and** is typed on `Theme` — read it directly, no cast. The three var-writing helpers are still not reachable
(9.4.0's `exports` map has no wildcard; `./styles` re-exports only the `FocusVisible` type), so they are
duplicated at **`packages/x-internals/src/focusVisible/index.ts`** → import from `@mui/x-internals/focusVisible`.
Exports: `applyInsetFocusVisible`, `outsetFocusRing`, `applyChildrenFocusVisible`.
(Core PR exporting these publicly is separate — swap the import when it lands.)

## Scope

| Phase        | Packages                                                               | Status                                 |
| ------------ | ---------------------------------------------------------------------- | -------------------------------------- |
| **In scope** | Data Grid (community + pro + premium), Date Pickers (+ pro), Tree View | §1–§3                                  |
| Later        | Charts (+ pro, premium)                                                | §4, parked                             |
| Excluded     | Scheduler (+ premium), Chat                                            | §5, research kept for when they resume |

Suggested order: **Pickers → Tree View → Data Grid**. Pickers has concrete defects that land on their own
(§1a) and three real a11y gaps that need no policy call (§1b). Tree View is three edits but settles the
roving-tabindex question (§2), which Data Grid's largest decision then depends on (§3a).

**In scope:** 26 rows — Pickers 9 (§1), Tree View 3 (§2), Data Grid 14 (§3). Everything else is deferred.
Of the Pickers 9, only 7 are work: 4 already wired by core and needing verification, 3 genuine gaps.

The audit's original A/B/C labels (own ring / suppresses / SVG) are dropped from here on: they classify by
CSS pattern, but the thing that matters is whether a themed ring actually reaches the element. Several
`outline: none` rules turn out to be inert — see §1c.

---

## Patterns

`theme.focusVisible` is `undefined` on the older `@mui/material` versions X peers (`^7.3.0`, `^9.0.0`–`9.3.x`)
and `false` when a consumer opts out, so every call site must degrade to today's appearance in both cases —
zero visual diff until someone opts in. Core's own idiom is the truthiness check
(`ButtonBase.js:76`, `Tab.js:66`); X reads the same, with the operator picked per role (see P1 and P3).

**P1 — replace the ring, keep today's as fallback.** Default for a plain `outline`-only focus block.

```ts
'&:focus-visible': theme.focusVisible || {
  outline: `2px solid ${(theme.vars || theme).palette.primary.main}`,
  outlineOffset: 2,
},
```

Replace, never merge — merging a themed `outline` over a hard-coded one double-paints.

**`||`, not `??`.** `theme.focusVisible` has three states, and X's fallback must catch two of them:

| Value       | Meaning                                                 | X renders        |
| ----------- | ------------------------------------------------------- | ---------------- |
| `undefined` | not opted in (incl. every `@mui/material` before 9.4.0) | today's ring     |
| object      | opted in                                                | themed ring      |
| `false`     | consumer opted out of core's auto-ring                  | **today's ring** |

`false` means "don't hand me a ring I didn't ask for" — it must not strip the ring X already draws, which
would be an a11y regression (WCAG 2.4.7). `??` only catches `undefined`, so it would emit
`'&:focus-visible': false` and drop the ring entirely. `||` catches both.

**P2 — ring + extra properties.** Focus block also sets background/opacity: keep those, swap only the ring.

```ts
'&:focus-visible': {
  backgroundColor: getCellFocusBackground(theme),
  ...(theme.focusVisible || { outline: `2px solid …`, outlineOffset: 2 }),
},
```

**P3 — clip-prone root.** Spread on the _root_, not the focus block. Core's resolved offset is
`calc(var(--_focusVisible-offset, 1) * 2px)`, so `applyInsetFocusVisible(1)` yields `-2px` — matching
today's `outlineOffset: -2`.

```ts
import { applyInsetFocusVisible } from '@mui/x-internals/focusVisible';

...(theme.focusVisible && applyInsetFocusVisible(1)),
'&:focus-visible': theme.focusVisible || { /* today's inset ring */ },
```

Note the two operators differ on purpose: the **guard** is `&&` (write the inset vars only when there _is_ a
themed ring — X's own fallback ring already hard-codes its inset), the **fallback** is `||`.

**P4 — outset guard.** Only when the root sits inside a core clip-prone component (Tab, MenuItem, …) whose
inset vars would inherit down. `...(theme.focusVisible && outsetFocusRing)`.

---

# Part I — In scope

# 1. Date Pickers — `x-date-pickers` + `-pro`

**Start here.** Four components already inherit a core ring with no X change, so their appearance moves the
moment a consumer opts in — and three more get nothing at all.

### 1a. Already wired by core — verify, and resolve the `outline` conflict

These are `styled(ButtonBase)` / `styled(MenuItem)`, so core's variant applies to them today. Nothing to
_add_; the work is confirming what it looks like and fixing where it fights existing styles.

| ☐   | Slot                                          | Location                                                                              | What happens                                                                                                                                                                                                    |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `MuiPickerDay` / `Root`                       | `x-date-pickers/src/PickerDay/PickerDay.tsx:46` is `styled(ButtonBase)`               | Gets core's root ring (PickerDay does not set the private `internalDisabledThemeFocusVisible` gate, so the variant is live). **Conflicts with the "today" marker** at `:138` — both write `outline`. See below. |
| ☐   | `MuiDateRangePickerDay` / `Root`              | `x-date-pickers-pro/src/DateRangePickerDay/DateRangePickerDay.tsx:199`                | Same conflict, "today" outline at `:243`. Also `zIndex: 1` + `isolation: 'isolate'` + `::before`/`::after` range pseudo-elements at `:205` that an outset ring will interact with.                              |
| ☐   | `MuiDigitalClock` / `Item`                    | `x-date-pickers/src/DigitalClock/DigitalClock.tsx:88` is `styled(MenuItem)`           | MenuItem is a core clip-prone family → gets core's inset ring, **and** keeps painting its own `.Mui-focusVisible` background (`:92`). Both render — verify they read as one state, not two.                     |
| ☐   | `MuiMultiSectionDigitalClockSection` / `Item` | `x-date-pickers/src/MultiSectionDigitalClock/MultiSectionDigitalClockSection.tsx:116` | Same as above (`:120`).                                                                                                                                                                                         |

**The "today" conflict, precisely.** `outline` is a single CSS property, so the two rules cannot both
render — one overrides the other. Core's rule is `&.Mui-focusVisible` → `.css-buttonbase.Mui-focusVisible`,
specificity (0,2,0). PickerDay's "today" variant lands on its own class, (0,1,0). **Core wins**, so a
keyboard-focused "today" cell shows the focus ring and silently loses its today marker — exactly when a
keyboard user needs it most.

_This is derived from specificity, not yet observed — render-verify it first._ Then decide:

- **(a)** Move "today" off `outline` (to `boxShadow` or a `::after`) so both indicators coexist. _Recommended_ —
  keeps the marker and lets the themed ring do its job.
- **(b)** Suppress core's root ring on the day cells and keep drawing focus manually. Loses theming.

### 1b. Real gaps — focusable, no ring, no core inheritance

None of these is a `ButtonBase`, so `theme.focusVisible` cannot reach them. All three are keyboard-reachable
with `outline` zeroed — genuine WCAG 2.4.7 gaps today, independent of the theme work, and the natural place
to wire the themed ring.

| ☐   | Component              | Location                                                      | Note                                                                                                                                                                                               |
| --- | ---------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `YearCalendarButton`   | `x-date-pickers/src/YearCalendar/YearCalendarButton.tsx:67`   | `styled('button')` with `outline: 0` at `:61`. Focus is a background using `action.focusOpacity`.                                                                                                  |
| ☐   | `MonthCalendarButton`  | `x-date-pickers/src/MonthCalendar/MonthCalendarButton.tsx:69` | Same, `outline: 0` at `:63` — but uses `action.**hoverOpacity**` where its sibling uses `focusOpacity`. Pre-existing slip; flag, don't silently fix (the values differ, so it is a visual change). |
| ☐   | `MuiClock` / `Wrapper` | `x-date-pickers/src/TimeClock/Clock.tsx:107`                  | `styled('div')` rendered with **`tabIndex={0}`** (`:449`) and `'&:focus': { outline: 'none' }`. A focusable element with its only indicator removed — the clearest 2.4.7 failure in the package.   |

### 1c. No action — inert with respect to `theme.focusVisible`

These zero out the **browser default** outline; nothing routes a themed ring to them, so they neither swallow
one nor block one. Listed to record that they were checked, not as work.

| Slot                                                           | Location                                                                               | Why inert                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PickersSectionList` / `Root` + `SectionContent`               | `x-date-pickers/src/PickersSectionList/PickersSectionList.tsx:21`, `:40`               | Inner contenteditable spans of a date field. A ring per date section would be wrong; the field root owns the indicator.                                                                                                                                   |
| `MuiPickersInputBase` / `SectionsContainer` + `SectionContent` | `x-date-pickers/src/PickersTextField/PickersInputBase/PickersInputBase.tsx:83`, `:152` | Same — and text fields are outside `focusVisible`'s remit entirely. PR #48743 covers the `ButtonBase` family, clip-prone families and slot-drawn controls; no `Input`/`TextField` is in scope, because fields signal focus with their border, not a ring. |

Related: clear-button reveal on `:focus-within` at `x-date-pickers/src/internals/components/PickerFieldUI.tsx:272`. Leave.

---

# 2. Tree View — `x-tree-view`

**Decision needed first:** focus is a **background** keyed off roving-tabindex `[data-focused]`.
`:focus-visible` and `.Mui-focusVisible` never match here, so adoption means either wiring
`theme.focusVisible` into the `[data-focused]` selector, or leaving Tree View on its own vocabulary.

Settle this before Data Grid — the same question governs grid cells (§3a) and `GridFormulaEditable` (§3c),
and (when they resume) `ResourcesTreeItem` in Scheduler (§5b).

| ☐   | Slot                         | Location                                           | Today                                                                                                                                       |
| --- | ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `MuiTreeItem` / `Content`    | `src/TreeItem/TreeItem.tsx:66` and `:88`           | `[data-focused]` → `action.focus`; `[data-selected][data-focused]` → blended `selectedOpacity + focusOpacity`                               |
| ☐   | `MuiTreeItem` / `LabelInput` | `src/TreeItemLabelInput/TreeItemLabelInput.tsx:17` | `'&:focus': { outline: '1px solid primary.main' }` — the only real ring in the package. **P1**, but note it's `:focus` not `:focus-visible` |
| ☐   | `MuiTreeItem` / `Root`       | `src/TreeItem/TreeItem.tsx:34`                     | `outline: 0` — verify it doesn't swallow the item ring                                                                                      |

---

# 3. Data Grid — `x-data-grid` + `-pro` + `-premium`

Largest surface, and the one whose decision has the widest blast radius. The grid has its **own token
indirection**: `--DataGrid-t-color-interactive-focus`, defaulted from `palette.primary.main` at
`x-data-grid/src/material/variables.ts:66`. It is already themeable — just not via `theme.focusVisible`.

### 3a. Strategy decision for the whole package

The cell/header ring uses `:focus` / `:focus-within`, **not** `:focus-visible`, because the grid's roving
tabindex must show the ring on click-focus too. Options:

- **(i) Bridge the tokens** — when `theme.focusVisible` is set, feed its `outlineColor` / `outlineWidth` into
  `interactive.focus` + `focusOutlineWidth`. Keeps the grid's 1px-inset design and its `:focus` semantics.
  _Recommended._
- **(ii) Full adoption** — swap the cell ring to `theme.focusVisible` verbatim. Changes width 1px → 2px and
  loses the `:focus-within` 50%-opacity variant. Visually loud.
- **(iii) Out of scope** — the cell ring is a data cursor; only the grid's _buttons_ adopt.

| ☐   | Slot                                        | Location                                                              | Today                                                                                          |
| --- | ------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ☐   | `MuiDataGrid` / `Root` — cells + headers    | `x-data-grid/src/components/containers/GridRootStyles.ts:262`         | `:focus-within` at 50% opacity, `:focus` at full; `focusOutlineWidth = 1` (`:17`), offset `-1` |
| ☐   | `MuiDataGrid` / `Root` — editing cell       | `x-data-grid/src/components/containers/GridRootStyles.ts:636`         | `1px interactive.focus`, offset `-1`                                                           |
| ☐   | `MuiDataGrid` / `Root` — sort button reveal | `x-data-grid/src/components/containers/GridRootStyles.ts:418`, `:425` | `:focus-visible` → `opacity: 1` / `0.78`. Reveal only, no ring — probably leave as-is          |

### 3b. Premium — real `:focus-visible` rings, mechanical

| ☐   | Slot                                        | Location                                                                   | Today                                                                                                      | Action                                                                                         |
| --- | ------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ☐   | `MuiDataGrid` / `CollapsibleTrigger`        | `x-data-grid-premium/src/components/collapsible/CollapsibleTrigger.tsx:47` | `2px interactive.**selected**`, offset `-2`                                                                | **P3**. Note it uses `selected` while cells use `focus` — already inconsistent; fix while here |
| ☐   | `MuiDataGrid` / `ChartsPanelChartSelection` | `x-data-grid-premium/src/components/chartsPanel/GridChartsPanel.tsx:71`    | `'&:hover, &:focus-visible': { backgroundColor }` — **no ring at all**, focus indistinguishable from hover | **Gap** — split focus from hover and give it a ring                                            |
| ☐   | `MuiDataGrid` / `PromptChangesToggle`       | `x-data-grid-premium/src/components/prompt/GridPrompt.tsx:180`             | `'&:hover, &:focus-visible': { textDecoration: 'underline' }` — **no ring**                                | **Gap** — same                                                                                 |
| ☐   | `MuiDataGrid` / `Prompt`                    | `x-data-grid-premium/src/components/prompt/GridPrompt.tsx:84`              | action reveal, `opacity: 1`                                                                                | Reveal only — likely leave                                                                     |

### 3c. B — suppressions, verify each still makes sense

| ☐   | Slot                                        | Location                                                                       | Note                                                                                     |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| ☐   | `MuiDataGrid` / `Root`                      | `x-data-grid/src/components/containers/GridRootStyles.ts:184`                  | `outline: 'none'` on the grid root                                                       |
| ☐   | `MuiDataGrid` / `LongTextCellCornerButton`  | `x-data-grid/src/components/cell/GridLongTextCell.tsx:88`                      | `'&:focus-visible': { outline: 'none' }` — swallows a themed ring                        |
| ☐   | `MuiDataGrid` / `EditLongTextCellTextarea`  | `x-data-grid/src/components/cell/GridEditLongTextCell.tsx:43`                  | ring delegated to the editing cell                                                       |
| ☐   | `MuiDataGrid` / `PanelWrapper`              | `x-data-grid/src/components/panel/GridPanelWrapper.tsx:32`                     | `'&:focus': { outline: 0 }`                                                              |
| ☐   | `ScrollbarVertical` / `ScrollbarHorizontal` | `x-data-grid/src/components/virtualization/GridVirtualScrollbar.tsx:68`, `:85` | `// Disable focus-visible style, it's a scrollbar.` — intentional, leave                 |
| ☐   | `GridEditMultiSelectChips`                  | `x-data-grid-pro/src/components/cell/GridEditMultiSelectCell.tsx:101`          | `outline: 'none', // let the grid cell handle the focus ring` — intentional, leave       |
| ☐   | `GridFormulaEditable`                       | `x-data-grid-premium/src/components/GridFormulaEditable.tsx:68` + `:145`       | `outline: 'none'`; focus is `[data-focused="true"]` background — follows the §2 decision |

Not focus — `[data-drag-over="true"]` outlines at `GridChartsPanelDataBody.tsx:104` and `GridPivotPanelBody.tsx:95`. Leave.

---

# Part II — Later

# 4. Charts — `x-charts` + `-pro` + `-premium`

**Parked.** CSS `outline` has no meaning in SVG. Adoption means reading
`theme.focusVisible.outlineColor` / `outlineWidth` into `stroke` / `strokeWidth`. All ten hard-code
`stroke = palette.text.primary`, `strokeWidth = 2` (pie: `3`), `rx/ry = 3`.

Only `FocusedPieArc` exposes a class key (`pieClasses.focusIndicator`, `x-charts/src/PieChart/pieClasses.ts:20`);
the other nine are **not themeable at all** today. Worth adding class keys in the same pass.

| ☐   | Component              | Location                                                   |
| --- | ---------------------- | ---------------------------------------------------------- |
| ☐   | `FocusedBar`           | `x-charts/src/BarChart/FocusedBar.tsx:59`                  |
| ☐   | `FocusedLineMark`      | `x-charts/src/LineChart/FocusedLineMark.tsx:36`            |
| ☐   | `FocusedPieArc`        | `x-charts/src/PieChart/FocusedPieArc.tsx:69`               |
| ☐   | `FocusedRadarMark`     | `x-charts/src/RadarChart/FocusedRadarMark.tsx:25`          |
| ☐   | `FocusedScatterMark`   | `x-charts/src/ScatterChart/FocusedScatterMark.tsx:27`      |
| ☐   | `FocusedFunnelSection` | `x-charts-pro/src/FunnelChart/FocusedFunnelSection.tsx:84` |
| ☐   | `FocusedHeatmapCell`   | `x-charts-pro/src/Heatmap/FocusedHeatmapCell.tsx:24`       |
| ☐   | `FocusedSankeyLink`    | `x-charts-pro/src/SankeyChart/FocusedSankeyLink.tsx:27`    |
| ☐   | `FocusedSankeyNode`    | `x-charts-pro/src/SankeyChart/FocusedSankeyNode.tsx:31`    |
| ☐   | `FocusedMapShape`      | `x-charts-premium/src/Map/FocusedMapShape.tsx:15`          |

**B:**

| ☐   | Location                                                                                     | Note                                                       |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| ☐   | `x-charts/src/ChartsLayerContainer/ChartsLayerContainer.tsx:39`                              | `outline: 'none', // By default, don't show focus outline` |
| ☐   | `x-charts/src/internals/components/ChartsAccessibilityProxy/ChartsAccessibilityProxy.tsx:20` | `outline: 'none'` on `fullSizeLayerStyle`                  |

Keyboard-vs-pointer intent is already tracked in JS —
`x-charts/src/internals/plugins/featurePlugins/useChartKeyboardNavigation/useChartKeyboardNavigation.ts:55`:
`const focusVisibleIntentRef = React.useRef(true);`

---

# Part III — Excluded

Scheduler and Chat are **out of the current effort**. The audit below is kept as-is so the work can resume
without re-deriving it. Neither package inherits anything from core automatically, so excluding them is
safe: they keep their hard-coded rings and are unaffected by a consumer opting in.

## 5. Scheduler — `x-scheduler` + `x-scheduler-premium`

15 entries. Two shapes: **buttons** (real outline rings) and **grid cells** (background-only, no ring).

Shared helper — `x-scheduler/src/internals/utils/tokens.ts:362`:

```ts
export const getCellFocusBackground = (theme: Theme) =>
  theme.alpha((theme.vars || theme).palette.primary.light, 0.12);
```

### 5a. Buttons — real rings

| Slot                                             | Location                                                                                                          | Today                                                                                  | Action |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| `MuiEventCalendar` / `MiniCalendarDayButton`     | `x-scheduler/src/event-calendar/mini-calendar/MiniCalendar.tsx:130`                                               | `2px primary.main`, offset `2`                                                         | P1     |
| `MuiEventCalendar` / `MonthViewCellNumberButton` | `x-scheduler/src/month-view/month-view-row/MonthViewCell.tsx:121`                                                 | ring offset `2` + `getCellFocusBackground` + `:focus-visible:hover` override at `:126` | P2     |
| `MuiEventCalendar` / `DayTimeGridHeaderCell`     | `x-scheduler/src/internals/components/day-time-grid/DayTimeGrid.tsx:171`                                          | ring offset `-2` + `borderRadius`                                                      | P3     |
| `MuiEventCalendar` / `DayTimeGridHeaderButton`   | `x-scheduler/src/internals/components/day-time-grid/DayTimeGrid.tsx:217`                                          | ring offset `-2` + `borderRadius`                                                      | P3     |
| `MuiEventCalendar` / `ToolbarButton`             | `x-scheduler/src/internals/components/event-toolbar/EventToolbar.tsx:41`                                          | ring offset `-2`                                                                       | P3     |
| `MuiEventCalendar` / `MonthViewHeaderCell`       | `x-scheduler/src/month-view/MonthView.tsx:81`                                                                     | `outline: 'none'` + `boxShadow: inset 0 0 0 2px primary.main`                          | P3     |
| `MuiEventTimeline` / `TitleCell`                 | `x-scheduler-premium/src/event-timeline-premium/content/timeline-title-cell/EventTimelinePremiumTitleCell.tsx:55` | same `boxShadow` hack                                                                  | P3     |

### 5b. Grid cells — background only, no ring today

All four byte-identical: `'&:focus-visible': { outline: 'none', backgroundColor: getCellFocusBackground(theme) }`.

| Slot                                               | Location                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `MuiEventCalendar` / `MonthViewCell`               | `x-scheduler/src/month-view/month-view-row/MonthViewCell.tsx:59`                             |
| `MuiEventCalendar` / `DayTimeGridAllDayEventsCell` | `x-scheduler/src/internals/components/day-time-grid/DayGridCell.tsx:40`                      |
| `MuiEventCalendar` / `DayTimeGridColumn`           | `x-scheduler/src/internals/components/day-time-grid/TimeGridColumn.tsx:34`                   |
| `MuiEventTimeline` / `EventsCell`                  | `x-scheduler-premium/src/event-timeline-premium/content/EventTimelinePremiumContent.tsx:230` |

Also `MuiEventCalendar` / `ResourcesTreeItem` — `x-scheduler/src/event-calendar/resources-tree/ResourcesTree.tsx:56`,
`[data-focused]` background; follows the Tree View decision (§2).

### 5c. Events — ring color from a per-event CSS var

Ring off `var(--event-surface-accent)` so it reads against the event's own color.
`applyChildrenFocusVisible` is the core-sanctioned way to keep that while honoring the theme.

| Slot                                 | Location                                                                           | Today                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `MuiEventCalendar` / `EventItemCard` | `x-scheduler/src/internals/components/event/event-item/EventItem.tsx:41`           | `2px var(--event-surface-accent)`, offset `1` |
| `MuiEventCalendar` / `DayGridEvent`  | `x-scheduler/src/internals/components/event/day-grid-event/DayGridEvent.tsx:63`    | same                                          |
| `TimeGridEvent` root _(no slot)_     | `x-scheduler/src/internals/components/event/time-grid-event/TimeGridEvent.tsx:159` | same, offset `2`                              |

`EventTimelinePremiumEvent.tsx:60` is `[data-dependency-drop-target]` — **not focus**, listed so it isn't mistaken for one.

### 5d. `clip-path` — the one case core does not model

`x-scheduler/src/internals/components/event/arrowClips.ts:11` — `getArrowFocusVisibleStyles` drops `clipPath`
on focus because the chevron clip eats the outline. `applyInsetFocusVisible` only solves `overflow: hidden`.
**Still worth feeding into the core PR** even while Scheduler is excluded.

## 6. Chat — `x-chat`

9 rings, all `2px solid palette.primary.main`, plus one suppression.

| Slot                                             | Location                                                                        | Today                                                                      | Action                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| `MuiChatCodeBlock` / `CopyButton`                | `src/ChatCodeBlock/ChatCodeBlock.tsx:103`                                       | `2px primary.main`, offset `2`                                             | P1                                    |
| `MuiChatComposer` / `AttachButton`               | `src/ChatComposer/ChatComposerAttachButton.tsx:47`                              | same                                                                       | P1                                    |
| `MuiChatComposer` / `SendButton`                 | `src/ChatComposer/ChatComposerSendButton.tsx:47`                                | same                                                                       | P1                                    |
| `MuiChatConfirmation` / `CancelButton`           | `src/ChatConfirmation/ChatConfirmation.tsx:114`                                 | same                                                                       | P1                                    |
| `MuiChatConfirmation` / `ConfirmButton`          | `src/ChatConfirmation/ChatConfirmation.tsx:141`                                 | `2px **warning.main**`, offset `2`                                         | Decision — only non-primary ring in X |
| `MuiChatSuggestions` / `Item`                    | `src/ChatSuggestions/ChatSuggestions.tsx:55`                                    | `2px primary.main`, offset `2`                                             | P1                                    |
| `ChatToolPartSectionCopyButton` _(no name/slot)_ | `src/ChatMessage/ChatMessageContent.tsx:826`                                    | ring + `opacity: 1`                                                        | P2                                    |
| `MuiChatConversationList` / `Item`               | `src/ChatConversationList/ChatConversationList.tsx:163` (root resets at `:147`) | ring, offset `-2`                                                          | P3                                    |
| `MuiChatMessage` / `Root`                        | `src/ChatMessage/ChatMessage.tsx:154`                                           | ring, offset `-2`, `borderRadius`                                          | P3                                    |
| `MuiChatComposer` / `TextArea`                   | `src/ChatComposer/ChatComposerTextArea.tsx:41`                                  | `outline: 'none'`, ring on `:focus-within` (`ChatComposer.tsx:88`, `:109`) | B                                     |

---

## Packages with nothing to do

`x-tree-view-pro`, `x-virtualizer`, `x-internals`, `x-license*`, `x-telemetry`, `x-codemod`,
`x-data-grid-generator`, `x-agent-tools`, `x-chat-headless`, `x-scheduler-headless*`, `x-charts-vendor`, `mcp`, `storybook`.

## Open decisions

**Blocking the in-scope work:**

1. **Pickers "today" outline** — move it off `outline` (a), or suppress core's root ring (b)? (§1a) — _render-verify the conflict first_
2. **Roving tabindex** (`[data-focused]`, `:focus`) — does `theme.focusVisible` reach it, or is it a separate concept? (§2) — _gates §3a_
3. **Data Grid** — bridge tokens (i), full adoption (ii), or buttons-only (iii)? (§3a)

**Parked with their sections:**

4. **Charts** — map `outlineColor`/`outlineWidth` → `stroke`/`strokeWidth`, and add the 9 missing class keys? (§4)
5. **`clip-path`** — core grows a story for it, or X keeps `getArrowFocusVisibleStyles`? (§5d) — _still worth raising in the core PR_
6. **Scheduler grid cells / events**, **Chat confirm button** — deferred with their packages (§5b, §5c, §6)
