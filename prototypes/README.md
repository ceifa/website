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

## Inhabited page

`inhabited.html` makes the document itself the environment, instead of adding a game beside it. A small resident walks and jumps on measured headings, text lines and project surfaces. Dragging works across the page, Down drops through a surface, and proximity reveals short notes. The same notes remain available through ordinary footnote buttons. There is no score, game frame, locked content or progress requirement. All six archive excerpts, project links and personal-section disclosures are native HTML and remain usable without JavaScript.

The physics loop sleeps at rest; a brief initial stroll is disabled for reduced-motion preferences. Discovery positions are cached when the document layout changes. The controller releases the keyboard for links, reading controls, blur and Escape. Typography and content changes remeasure the actual page rather than a separate game map.

Verification: 15 disposable physics assertions and 68 browser assertions at 320, 390, 768 and 1440 pixels passed again after cleanup. Checks cover walking, jumping, one-way landings, dropping, bounds, layout reflow, ordinary navigation/reading, notes and dark mode. Pointer dragging and note discovery were exercised in a touch-enabled mobile viewport and on the deployed Agent Host page. Native Space activation/jumping preserved the control state; the cleanup review's concern about a second native click did not reproduce, so no workaround was added. Explicit host theme overrides and idle blinking were retained deliberately. The deployed modules and fonts returned HTTP 200 with appropriate types. No physical-device or cross-browser audit and no committed automated test harness.

## Autonomous reading companion

The resident now follows the reader without requiring a click. A deterministic local controller chooses visible content ledges, plans jumps and drops through the same measured document geometry, and rests after arriving. The opening hop introduces the behavior using the existing title; subsequent destinations come from the viewport. No model API, network inference or claim of text comprehension is involved.

Manual input takes priority, with autonomy resuming after 6.5 seconds of inactivity or immediately on Escape. Rapid scrolling can bring the resident back from above the viewport only after it is well offscreen; visible movement is never teleported. Autonomous behavior never moves the reader's scroll position. Reduced-motion disables autonomous travel but retains explicit controls. Expanded article lines also become surfaces; closed disclosure content is excluded even when its DOM reports nonzero rectangles.

Verification: 15 physics and 15 planner assertions; 58 new browser assertions over four widths for autonomous walking/jumping, quiet rest, both scroll directions, manual takeover/resumption and native reading; the 68 existing controller/navigation assertions also passed. Reduced-motion and idle-loop checks confirmed explicit controls still work and the resting companion schedules zero animation frames. Cleanup removed unused route/rest state and a repeated BFS sort; the opening title destination was deliberately retained.

Two disposable regression cases caught integration defects: the loop initially slept immediately after an autonomous landing, leaving the character just above the visible area; it now gives the planner a landing turn before sleeping. An expanded-article case also failed while hidden disclosure rectangles became phantom floors; excluding closed content at measurement fixed the same case. Before/after results were observed locally. These harnesses remain outside the submitted diff, so there is no lasting committed regression coverage or cross-browser/physical-device audit.

## Minimal multi-page site

`minimal/` keeps the autonomous resident but drops the single-page layout: one narrow column, a home with a name, a one-line bio and three links, and separate real pages for projects, writing, personal and about. Each project and article has its own page; all six archive posts are rendered in full from `posts/`. The setTimeout post keeps its two original canvas demos. The YouTube embed and the externally hosted WebRTC diagram became plain links. Pages use absolute `/assets/` paths, so they expect to be served from the site root.

The resident's first perch is clamped inside short headings (it used to spawn off "Sobre" at desktop width). The opening hop now targets any reachable surface above the heading instead of only an `h1`.

Verification: 432 browser assertions across 13 pages at 320, 390, 768 and 1280 pixels (single heading, real page links, no overflow, all articles complete, demos drawing, dark mode). The short-heading spawn check failed before the clamp and passed after it. On a long article at mobile width, the resident reaches the reading position and rests within about 8 seconds without moving the reader's scroll. The 15 physics and 15 planner assertions still pass. The deployed pages and assets returned HTTP 200. The harness is disposable; nothing was committed as automated coverage.

## Lean inhabited page

`lean.html` returns to the inhabited single page, which Gabriel preferred over the multi-page minimal version. The complaint was the amount of text, not the layout. The hero bio, the section subtitles, the second project's description, the writing note and the expandable excerpts are gone. Posts are a plain list of title and year linking to the originals, and the personal items are one-line "em breve" rows. The "Sobre" nav link was dropped because the footer is now a single line. Visible words went from about 295 to 141. The resident's behavior is unchanged.

Verified at 320, 390, 768 and 1440 pixels: 40 browser assertions (autonomous walking and jumping, following scroll without moving it, six posts, no overflow, dark mode). Desktop and mobile screenshots were inspected, and the deployed modules and fonts returned HTTP 200.
