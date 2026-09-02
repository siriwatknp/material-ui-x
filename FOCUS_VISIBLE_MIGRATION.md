# `theme.focusVisible` adoption in MUI X

Baseline: `master` @ `3134f8780c`. Upstream: material-ui **PR #48743** (merged 2026-08-27).

Utils duplicated at **`packages/x-internals/src/focusVisible/index.ts`** → import from `@mui/x-internals/focusVisible`.
Exports: `getThemeFocusVisible`, `applyInsetFocusVisible`, `outsetFocusRing`, `applyChildrenFocusVisible`, type `FocusVisibleStyles`.
(Core PR exporting these publicly is separate — swap the import when it lands.)

Grouped by **product**, not npm package: Data Grid = community + pro + premium, same for Scheduler / Pickers / Charts.

**Totals:** 39 custom rings (A), 14 suppressions (B), 10 SVG indicators (C).

---

## Patterns

`theme.focusVisible` is `undefined` on `@mui/material` v7 and on v9 before the ring ships, so every call site
must no-op by default. `getThemeFocusVisible` returns `undefined` for both `undefined` and `false`.

**P1 — replace the ring, keep today's as fallback.** Default for a plain `outline`-only focus block.

```ts
import { getThemeFocusVisible } from '@mui/x-internals/focusVisible';

})(({ theme }) => {
  const focusVisible = getThemeFocusVisible(theme);
  return {
    '&:focus-visible': focusVisible ?? {
      outline: `2px solid ${(theme.vars || theme).palette.primary.main}`,
      outlineOffset: 2,
    },
  };
});
```

Replace, never merge — merging a themed `outline` over a hard-coded one double-paints.

**P2 — ring + extra properties.** Focus block also sets background/opacity: keep those, swap only the ring.

```ts
'&:focus-visible': {
  backgroundColor: getCellFocusBackground(theme),
  ...(focusVisible ?? { outline: `2px solid …`, outlineOffset: 2 }),
},
```

**P3 — clip-prone root.** Spread on the _root_, not the focus block. Core's resolved offset is
`calc(var(--_focusVisible-offset, 1) * 2px)`, so `applyInsetFocusVisible(1)` yields `-2px` — matching
today's `outlineOffset: -2`.

```ts
...(focusVisible && applyInsetFocusVisible(1)),
'&:focus-visible': focusVisible ?? { /* today's inset ring */ },
```

**P4 — outset guard.** Only when the root sits inside a core clip-prone component (Tab, MenuItem, …) whose
inset vars would inherit down. `...(focusVisible && outsetFocusRing)`.

---

# 1. Chat — `x-chat`

9 rings, all `2px solid palette.primary.main`. **Lowest risk, start here** — every block is identical and
nothing is clip-prone except two.

| ☐   | Slot                                             | Location                                                                        | Today                              | Action                                                                                                               |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| ☐   | `MuiChatCodeBlock` / `CopyButton`                | `src/ChatCodeBlock/ChatCodeBlock.tsx:103`                                       | `2px primary.main`, offset `2`     | **P1**                                                                                                               |
| ☐   | `MuiChatComposer` / `AttachButton`               | `src/ChatComposer/ChatComposerAttachButton.tsx:47`                              | same                               | **P1**                                                                                                               |
| ☐   | `MuiChatComposer` / `SendButton`                 | `src/ChatComposer/ChatComposerSendButton.tsx:47`                                | same                               | **P1**                                                                                                               |
| ☐   | `MuiChatConfirmation` / `CancelButton`           | `src/ChatConfirmation/ChatConfirmation.tsx:114`                                 | same                               | **P1**                                                                                                               |
| ☐   | `MuiChatConfirmation` / `ConfirmButton`          | `src/ChatConfirmation/ChatConfirmation.tsx:141`                                 | `2px **warning.main**`, offset `2` | **Decision** — only non-primary ring in X. Keep `warning.main` on the destructive button, or let the theme ring win? |
| ☐   | `MuiChatSuggestions` / `Item`                    | `src/ChatSuggestions/ChatSuggestions.tsx:55`                                    | `2px primary.main`, offset `2`     | **P1**                                                                                                               |
| ☐   | `ChatToolPartSectionCopyButton` _(no name/slot)_ | `src/ChatMessage/ChatMessageContent.tsx:826`                                    | ring + `opacity: 1`                | **P2** — keep `opacity: 1`. Also consider giving it a `name`/`slot`.                                                 |
| ☐   | `MuiChatConversationList` / `Item`               | `src/ChatConversationList/ChatConversationList.tsx:163` (root resets at `:147`) | ring, offset **`-2`**              | **P3** — inset, `applyInsetFocusVisible(1)`                                                                          |
| ☐   | `MuiChatMessage` / `Root`                        | `src/ChatMessage/ChatMessage.tsx:154`                                           | ring, offset `-2`, `borderRadius`  | **P3** — comment already states the scroller-clip rationale; that's exactly what P3 encodes                          |

**B (suppression), verify only:**

| ☐   | Slot                           | Location                                       | Note                                                                                                                                                    |
| --- | ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `MuiChatComposer` / `TextArea` | `src/ChatComposer/ChatComposerTextArea.tsx:41` | `outline: 'none'`; ring delegated to `:focus-within` on the composer (`ChatComposer.tsx:88`, `:109`). Decide whether the wrapper ring adopts the theme. |

---

# 2. Scheduler — `x-scheduler` + `x-scheduler-premium`

15 entries. Two shapes: **buttons** (real outline rings) and **grid cells** (background-only, no ring).

Shared helper — `x-scheduler/src/internals/utils/tokens.ts:362`:

```ts
export const getCellFocusBackground = (theme: Theme) =>
  theme.alpha((theme.vars || theme).palette.primary.light, 0.12);
```

### 2a. Buttons — real rings

| ☐   | Slot                                             | Location                                                                                                          | Today                                                                                  | Action                                                                              |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| ☐   | `MuiEventCalendar` / `MiniCalendarDayButton`     | `x-scheduler/src/event-calendar/mini-calendar/MiniCalendar.tsx:130`                                               | `2px primary.main`, offset `2`                                                         | **P1**                                                                              |
| ☐   | `MuiEventCalendar` / `MonthViewCellNumberButton` | `x-scheduler/src/month-view/month-view-row/MonthViewCell.tsx:121`                                                 | ring offset `2` + `getCellFocusBackground` + `:focus-visible:hover` override at `:126` | **P2** — keep background + the hover override                                       |
| ☐   | `MuiEventCalendar` / `DayTimeGridHeaderCell`     | `x-scheduler/src/internals/components/day-time-grid/DayTimeGrid.tsx:171`                                          | ring offset `-2` + `borderRadius`                                                      | **P3**                                                                              |
| ☐   | `MuiEventCalendar` / `DayTimeGridHeaderButton`   | `x-scheduler/src/internals/components/day-time-grid/DayTimeGrid.tsx:217`                                          | ring offset `-2` + `borderRadius`                                                      | **P3**                                                                              |
| ☐   | `MuiEventCalendar` / `ToolbarButton`             | `x-scheduler/src/internals/components/event-toolbar/EventToolbar.tsx:41`                                          | ring offset `-2`                                                                       | **P3**                                                                              |
| ☐   | `MuiEventCalendar` / `MonthViewHeaderCell`       | `x-scheduler/src/month-view/MonthView.tsx:81`                                                                     | `outline: 'none'` + `boxShadow: inset 0 0 0 2px primary.main`                          | **P3** — the `boxShadow` hack becomes unnecessary; the themed outline insets itself |
| ☐   | `MuiEventTimeline` / `TitleCell`                 | `x-scheduler-premium/src/event-timeline-premium/content/timeline-title-cell/EventTimelinePremiumTitleCell.tsx:55` | same `boxShadow` hack                                                                  | **P3** — same as above                                                              |

### 2b. Grid cells — background only, **no ring today**

**Decision needed for the whole group:** when `theme.focusVisible` is set, do these gain an actual ring, or
stay background-only? A themed ring here changes the scheduler's visual language; leaving them out means
`focusVisible: true` gives an inconsistent calendar.

| ☐   | Slot                                               | Location                                                                                     |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ☐   | `MuiEventCalendar` / `MonthViewCell`               | `x-scheduler/src/month-view/month-view-row/MonthViewCell.tsx:59`                             |
| ☐   | `MuiEventCalendar` / `DayTimeGridAllDayEventsCell` | `x-scheduler/src/internals/components/day-time-grid/DayGridCell.tsx:40`                      |
| ☐   | `MuiEventCalendar` / `DayTimeGridColumn`           | `x-scheduler/src/internals/components/day-time-grid/TimeGridColumn.tsx:34`                   |
| ☐   | `MuiEventTimeline` / `EventsCell`                  | `x-scheduler-premium/src/event-timeline-premium/content/EventTimelinePremiumContent.tsx:230` |

All four are byte-identical: `'&:focus-visible': { outline: 'none', backgroundColor: getCellFocusBackground(theme) }`.
If they adopt, the cleanest move is to thread the decision through `getCellFocusBackground`'s module so it stays one edit.

### 2c. Events — ring color from a per-event CSS var

**Decision needed:** these ring off `var(--event-surface-accent)` so the indicator reads against the event's own
color. `applyChildrenFocusVisible(color)` is the core-sanctioned way to keep that while still honoring the theme —
set the shadow slot per event and let the outline come from the theme.

| ☐   | Slot                                 | Location                                                                           | Today                                                                                |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| ☐   | `MuiEventCalendar` / `EventItemCard` | `x-scheduler/src/internals/components/event/event-item/EventItem.tsx:41`           | `2px var(--event-surface-accent)`, offset `1`                                        |
| ☐   | `MuiEventCalendar` / `DayGridEvent`  | `x-scheduler/src/internals/components/event/day-grid-event/DayGridEvent.tsx:63`    | same                                                                                 |
| ☐   | `TimeGridEvent` root _(no slot)_     | `x-scheduler/src/internals/components/event/time-grid-event/TimeGridEvent.tsx:159` | same, offset `2`                                                                     |
| ☐   | `EventTimelinePremiumEvent`          | `x-scheduler-premium/…/timeline-event/EventTimelinePremiumEvent.tsx:60`            | `[data-dependency-drop-target]` — **not focus**, listed so it isn't mistaken for one |

### 2d. `clip-path` — the one case core does not model

| ☐   | Location                                                      | Note                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `x-scheduler/src/internals/components/event/arrowClips.ts:11` | `getArrowFocusVisibleStyles` drops `clipPath` on focus because the chevron clip eats the outline. `applyInsetFocusVisible` only solves `overflow: hidden`. **Feed this into the core PR** — either core grows a clip-path story, or X keeps this escape hatch permanently. |

### 2e. Related, not `:focus-visible`

| ☐   | Slot                                     | Location                                                             | Note                                                                  |
| --- | ---------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| ☐   | `MuiEventCalendar` / `ResourcesTreeItem` | `x-scheduler/src/event-calendar/resources-tree/ResourcesTree.tsx:56` | `[data-focused]` background — follows whatever Tree View decides (§5) |

---

# 3. Data Grid — `x-data-grid` + `-pro` + `-premium`

The grid has its **own token indirection**: `--DataGrid-t-color-interactive-focus`, defaulted from
`palette.primary.main` at `x-data-grid/src/material/variables.ts:66`. It is already themeable — just not via
`theme.focusVisible`.

### 3a. Core decision for the whole package

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

| ☐   | Slot                                        | Location                                                                       | Note                                                                               |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| ☐   | `MuiDataGrid` / `Root`                      | `x-data-grid/src/components/containers/GridRootStyles.ts:184`                  | `outline: 'none'` on the grid root                                                 |
| ☐   | `MuiDataGrid` / `LongTextCellCornerButton`  | `x-data-grid/src/components/cell/GridLongTextCell.tsx:88`                      | `'&:focus-visible': { outline: 'none' }` — swallows a themed ring                  |
| ☐   | `MuiDataGrid` / `EditLongTextCellTextarea`  | `x-data-grid/src/components/cell/GridEditLongTextCell.tsx:43`                  | ring delegated to the editing cell                                                 |
| ☐   | `MuiDataGrid` / `PanelWrapper`              | `x-data-grid/src/components/panel/GridPanelWrapper.tsx:32`                     | `'&:focus': { outline: 0 }`                                                        |
| ☐   | `ScrollbarVertical` / `ScrollbarHorizontal` | `x-data-grid/src/components/virtualization/GridVirtualScrollbar.tsx:68`, `:85` | `// Disable focus-visible style, it's a scrollbar.` — intentional, leave           |
| ☐   | `GridEditMultiSelectChips`                  | `x-data-grid-pro/src/components/cell/GridEditMultiSelectCell.tsx:101`          | `outline: 'none', // let the grid cell handle the focus ring` — intentional, leave |
| ☐   | `GridFormulaEditable`                       | `x-data-grid-premium/src/components/GridFormulaEditable.tsx:68` + `:145`       | `outline: 'none'`; focus is `[data-focused="true"]` background                     |

Not focus — `[data-drag-over="true"]` outlines at `GridChartsPanelDataBody.tsx:104` and `GridPivotPanelBody.tsx:95`. Leave.

---

# 4. Date Pickers — `x-date-pickers` + `-pro`

**Highest urgency: this package regresses on core release even if nothing else is touched.**

### 4a. Collisions — components that already inherit core's ring

| ☐   | Slot                                          | Location                                                                              | Problem                                                                                                                                                                                          |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ☐   | `MuiPickerDay` / `Root`                       | `x-date-pickers/src/PickerDay/PickerDay.tsx:46` is `styled(ButtonBase)`               | Gets core's root ring on release. But `outline` is already the **"today" marker** (`:138`, `1px solid text.secondary`, offset `-1`) → **double outline**. Focus itself is a background at `:85`. |
| ☐   | `MuiDateRangePickerDay` / `Root`              | `x-date-pickers-pro/src/DateRangePickerDay/DateRangePickerDay.tsx:199`                | Same collision, "today" outline at `:243`. Also `zIndex: 1` + `isolation: 'isolate'` + `::before`/`::after` range pseudo-elements at `:205` that an outset ring will interact with.              |
| ☐   | `MuiDigitalClock` / `Item`                    | `x-date-pickers/src/DigitalClock/DigitalClock.tsx:88` is `styled(MenuItem)`           | MenuItem is a core clip-prone family → gets core's inset ring, **and** keeps painting its own `.Mui-focusVisible` background (`:92`). Stacks.                                                    |
| ☐   | `MuiMultiSectionDigitalClockSection` / `Item` | `x-date-pickers/src/MultiSectionDigitalClock/MultiSectionDigitalClockSection.tsx:116` | Same as above (`:120`).                                                                                                                                                                          |

**Decision for the two day components:** move "today" off `outline` (to `boxShadow` or a `::after`), or suppress
the core root ring there and keep drawing focus manually?

### 4b. Gap — plain `<button>`, gets nothing from core

| ☐   | Component             | Location                                                      | Note                                                                                                                                                |
| --- | --------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `YearCalendarButton`  | `x-date-pickers/src/YearCalendar/YearCalendarButton.tsx:67`   | `styled('button')` with `outline: 0` at `:61`. Focus is a background using `action.focusOpacity`. **No ring, no core inheritance.**                 |
| ☐   | `MonthCalendarButton` | `x-date-pickers/src/MonthCalendar/MonthCalendarButton.tsx:69` | Same, `outline: 0` at `:63` — but uses `action.**hoverOpacity**` where its sibling uses `focusOpacity`. Pre-existing inconsistency; fix while here. |

### 4c. B — suppressions

| ☐   | Slot                   | Location                                                                                                                               |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `MuiClock` / `Wrapper` | `x-date-pickers/src/TimeClock/Clock.tsx:111`                                                                                           |
| ☐   | `PickersSectionList`   | `x-date-pickers/src/PickersSectionList/PickersSectionList.tsx:21`, `:40`                                                               |
| ☐   | `MuiPickersInputBase`  | `x-date-pickers/src/PickersTextField/PickersInputBase/PickersInputBase.tsx:83`, `:152` — ring delegated to `:focus-within` on the root |

Related: clear-button reveal on `:focus-within` at `x-date-pickers/src/internals/components/PickerFieldUI.tsx:272`. Leave.

---

# 5. Tree View — `x-tree-view`

**Decision needed:** focus is a **background** keyed off roving-tabindex `[data-focused]`. `:focus-visible` and
`.Mui-focusVisible` never match here, so adoption means either wiring `theme.focusVisible` into the
`[data-focused]` selector, or leaving Tree View on its own vocabulary.

| ☐   | Slot                         | Location                                           | Today                                                                                                                                       |
| --- | ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐   | `MuiTreeItem` / `Content`    | `src/TreeItem/TreeItem.tsx:66` and `:88`           | `[data-focused]` → `action.focus`; `[data-selected][data-focused]` → blended `selectedOpacity + focusOpacity`                               |
| ☐   | `MuiTreeItem` / `LabelInput` | `src/TreeItemLabelInput/TreeItemLabelInput.tsx:17` | `'&:focus': { outline: '1px solid primary.main' }` — the only real ring in the package. **P1**, but note it's `:focus` not `:focus-visible` |
| ☐   | `MuiTreeItem` / `Root`       | `src/TreeItem/TreeItem.tsx:34`                     | `outline: 0` — verify it doesn't swallow the item ring                                                                                      |

Whatever is decided here also governs `ResourcesTreeItem` (§2e) and `GridFormulaEditable` (§3c).

---

# 6. Charts — `x-charts` + `-pro` + `-premium`

**Decision needed:** CSS `outline` has no meaning in SVG. Adoption means reading
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

## Packages with nothing to do

`x-tree-view-pro`, `x-virtualizer`, `x-internals`, `x-license*`, `x-telemetry`, `x-codemod`,
`x-data-grid-generator`, `x-agent-tools`, `x-chat-headless`, `x-scheduler-headless*`, `x-charts-vendor`, `mcp`, `storybook`.

## Open cross-cutting decisions

1. **Chat confirm button** — keep `warning.main` ring, or theme wins? (§1)
2. **Scheduler grid cells** — gain a ring when themed, or stay background-only? (§2b)
3. **Scheduler events** — keep `var(--event-surface-accent)` via `applyChildrenFocusVisible`, or theme ring? (§2c)
4. **`clip-path`** — core grows a story for it, or X keeps `getArrowFocusVisibleStyles` forever? (§2d) _Feed into the core PR._
5. **Data Grid** — bridge tokens (i), full adoption (ii), or out of scope (iii)? (§3a)
6. **Pickers "today" outline** — move it off `outline`, or suppress core's root ring? (§4a)
7. **Roving tabindex** (`[data-focused]`, `:focus`) — in scope for Tree View / Data Grid / Scheduler tree, or a separate concept? (§5)
8. **Charts** — map `outlineColor`/`outlineWidth` → `stroke`/`strokeWidth`, and add the 9 missing class keys? (§6)
