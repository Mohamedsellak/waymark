# Design system: Cartographic

The world of survey sheets and nautical charts, applied as type, palette, density and one signature move.
Tokens live in `src/styles.scss`; components consume tokens only.

## Palette
| Token | Light (survey sheet) | Dark (chart night) | Role |
|---|---|---|---|
| `--paper` | `#f1f3ee` | `#0e1a20` | page ground |
| `--sheet` / `--sheet-2` | `#fbfcfa` / `#e7ebe4` | `#142630` / `#1b313c` | raised surfaces / wells, hover |
| `--ink` / `--ink-2` / `--ink-3` | `#18242b` / `#4b5a61` / `#6c7a80` | `#e3eae4` / `#a9b8b3` / `#82938f` | text tiers |
| `--magenta` | `#a3166c` | `#e45aa9` | chart magenta: primary action, depot, selection |
| `--rule` | `#d3dad0` | `#26404c` | hairlines |
| `--contour` | `#8a9b84` | `#2c4a56` | contour lines |

Route inks (`shared/utils/route-colors.ts`): magenta, sea, forest, ochre, plum, teal, brick, slate.
Dotted route line = straight-line estimate (road routing unavailable).

## Type
Barlow (body, UI) and Barlow Semi Condensed (headings, wordmark, figures in stat blocks): a grotesk drawn
from highway signage. Numbers use `tabular-nums` (`.num`). Product scale is fixed rem; only landing
headlines use `clamp`.

## Signature move
The **map legend**: a neat-lined box (1px ink border + offset outline, like a printed map's frame) keying
depot, stops and each vehicle's ink with distance and drive time. Reused on the landing hero plate.
Contour fields (`app-contour-field`, marching squares) appear only on non-working surfaces: landing,
auth, 404.

## Components
Buttons `.btn` / `.btn-quiet` / `.btn-ghost` / `.btn-danger`, sizes `.btn-sm` `.btn-icon`; `.field` with
label span, `.hint`, `.field-error`; `.notice-{error,success,info}`; `.table`; `.badge`; `.sheet` surface.
Icons: Lucide via `<app-icon name>`. Radius: 6 / 10 / 16. Motion: 120–240ms ease-out on state changes;
the only authored sequence is the landing routes drawing in; all respect reduced motion.
