# Personal-site directions

Five independent navigation and visual explorations for Gabriel's new personal site. These are static design artifacts, intentionally separate from the existing Sapper application and its deployment.

| Direction  | Organizing idea                             | Deliberate visual choice                                            |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Margem     | A selection of writing organized by subject | Cobalt, oversized condensed type, asymmetric reading                |
| Mesa       | Folders and movable windows                 | Plum and lavender, tactile controls, a full-page mobile alternative |
| Caderno    | Notes, projects and visual records          | Pale blue paper, yellow annotations, illustrated contact sheet      |
| Afinidades | Related interests as a navigable map        | Navy and ice blue, labeled connections, equivalent list navigation  |
| Índice     | One searchable personal archive             | Raspberry and pink, type-led rows, mixed content types              |

Each direction deliberately commits to its own palette. The comparison gallery supports both system themes. Comparing two directions uses the available panel width, not a scaled-down desktop screenshot; full-screen links expose the desktop layouts.

## Content boundaries

Article excerpts and dates come from the existing `posts/` archive. Historical opinions remain labeled with their original year. Eleven's description comes from its public repository. Personal sections, favorites, the laboratory and the now page are explicitly proposed content, not claims about Gabriel's life. The landscape is an original Canvas illustration, not a personal travel photo.

The prototypes use local assets with no runtime CDN, analytics, external API or publishing backend. Comparison choices stay in the browser's session storage. Font licenses are included in `assets/FONT-LICENSES.txt`.

## Verification

Local Chromium browser smoke checks covered all seven pages at 320, 390, 768 and 1440 CSS pixels: 28 cases and 192 assertions. Coverage includes horizontal overflow, image loading, article and project reading, topic filters, opening/closing/maximizing/reopening desktop windows, notebook index navigation, map/list switching, accent-insensitive search, empty results, content-type filters, random entries and comparison selection/switching. The same checks passed again after cleanup.

Desktop and 390-pixel screenshots were visually inspected. The first gallery image check incorrectly expected lazy images below the viewport to have loaded; the harness was corrected to decode images before checking them. No product change was needed.

This was a local disposable browser harness, not a new committed test framework. The legacy Sapper build, cross-browser compatibility and a full accessibility audit were not exercised. These artifacts do not replace the live site or finalize its scope.

## Simpler revision

`simple.html` follows the next design decision: understanding the site at a glance matters more than a distinctive navigation metaphor. It uses ordinary labeled navigation, short link lists, readable project descriptions, and separate content views with deep links and browser history. The game is optional and does not gate content or capture keys outside its own board.

The embedded box-pushing puzzle has three solvable levels, directional buttons, keyboard controls, undo, reset and replay. The mobile layout puts content before the game. Light/dark palettes and explicit host theme overrides remain supported.

Local Chromium checks covered this revision at 320, 390, 768 and 1280 pixels: 176 assertions passed, including navigation, active states, content links, keyboard/button movement, blocked walls, undo, reset, every level solved by a breadth-first search, and replay. An initial CSS-grid defect produced unequal row heights (30/30/53/30/30/30 pixels); the check failed before the explicit equal-row fix and passed afterward, including square-cell checks at all four widths. This is a disposable local regression harness, not committed automated coverage. Mobile screenshots were also inspected.
