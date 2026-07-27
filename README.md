# Knowledge Base

A personal, searchable knowledge base backed by a Google Spreadsheet, deployed
as a static site on GitHub Pages. No server, no build step, no backend — just
HTML/CSS/JS and a Google Sheets Web App as the data source.

This is version 2 of the project: a full architecture rewrite. The old
three-template system (Notes / Commands / Process) is gone. There is now
**one** spreadsheet schema and **one** renderer.

---

## 1. Architecture

```
index.html                 Shell page: topbar, sidebar, content mount point
404.html                   Converts old path-style links to hash routes
apps-script/Code.gs         Google Apps Script Web App — returns every sheet as JSON
sample-data/sample-sheet.xlsx  Example spreadsheet using the new schema
assets/css/styles.css       All styling (design tokens + components)

src/
  config.js                Site title/tagline/API URL — the only file most people touch
  app.js                    Entry point: wires everything else together

  data/
    loader.js               Fetches + caches the raw sheet JSON
    parser.js               Turns a Content cell into a nested block AST

  models/
    knowledge.js            Raw sheet rows -> KnowledgeItem[] (sections, tags, search text)

  ui/
    renderer.js             renderKnowledgeItem() — the ONE renderer, plus home/list/404 views
    sidebar.js              Search box, Sections, Tags, Recent Articles
    search.js               Scored substring search across ID/Title/Tags/Content
    router.js                Hash-based routing (#ID, #section:x, #tag:x)
    theme.js                Dark mode toggle

  components/
    codeblock.js            Code/command block with copy button + syntax highlighting
    table.js                Markdown-table renderer

  utils/
    dom.js                  el()/escapeHtml() helpers
    slug.js                 Sheet-name -> URL slug
    cache.js                sessionStorage cache with TTL
    markdown.js             Inline **bold**/*italic*/`code`/links + safelisted inline tags
```

Everything under `src/` is loaded as native ES modules
(`<script type="module" src="src/app.js">`) — no bundler, no build step.
Open `index.html` on GitHub Pages and it just runs.

### Why this shape

The old codebase had three parallel rendering paths (`renderNotes`,
`renderCommands`, `renderProcess`) plus a `detectSheetType()` that guessed
which one to use from a sheet's column names. Every new content need meant
either shoehorning it into one of the three templates or adding a fourth.

The new architecture inverts this: **the spreadsheet schema never changes**,
and all expressiveness lives in the *Content* column's block markup, which a
single parser turns into a tree and a single renderer walks. Adding a new
kind of content block (say, a `<video>` embed) means touching exactly two
files — `parser.js` and `renderer.js` — regardless of which sheets end up
using it.

---

## 2. Spreadsheet structure

Every sheet (tab) in the spreadsheet — "Testing Suite", "Development",
"Terminal Commands", "WordPress", whatever you want — uses **exactly** the
same five columns, in this order:

| ID     | Title                  | Content            | Tags               | Related     |
|--------|------------------------|---------------------|---------------------|-------------|
| TS-1   | Running the test suite | `<description>...`  | testing-suite,docker | CMD-3      |

- **ID** — Globally unique across the *entire* spreadsheet, not just the
  sheet. Used for search, URL routing (`/#TS-1`), and the `Related` column.
  A short prefix per section (`TS-`, `DEV-`, `CMD-`, `WC-`) makes collisions
  easy to avoid.
- **Title** — Plain text, shown as the page `<h1>`.
- **Content** — The block markup described in section 3.
- **Tags** — Comma-separated, e.g. `playwright,docker,testing-suite`.
- **Related** — Comma-separated IDs of other articles, e.g. `TS-1,CMD-3`.
  Optional.

`sample-data/sample-sheet.xlsx` has a working example with seven sheets
covering every supported block tag.

### Where "section" comes from

There's no `section` column. The **sheet name itself** is the section — a
row in the "WordPress" tab is a WordPress article; a row in "Git" is a Git
article. Sections and their article counts are computed automatically from
the sheet names returned by the API, so adding a new tab to the spreadsheet
immediately adds a new section to the sidebar, with no code or config change.

---

## 3. Supported Content tags

Content cells are plain text using small XML-like block tags. Blocks can
nest freely — a `<step>` can contain a `<command>`, a `<description>`, and a
`<warning>` all at once, in any order.

| Tag | Purpose |
|---|---|
| `<description>` | A paragraph (or several, separated by a blank line). |
| `<checklist>` | A list of `- item` lines, rendered as checkboxes. |
| `<process>` / `<step>` | A sequence of numbered steps; each `<step>` can contain any other blocks. |
| `<command>` | A single copyable shell command (rendered with a `$ ` prompt). |
| `<code language="...">` | A syntax-highlighted code block. Any language highlight.js supports works (`php`, `js`/`javascript`, `ts`/`typescript`, `html`, `css`, `bash`/`sh`, `json`, `xml`, `python`, `yaml`, `sql`, and many more). |
| `<note>` | An informational callout. |
| `<tip>` | A tip/best-practice callout. |
| `<warning>` | A warning callout. |
| `<quote>` | A block quote. |
| `<image>` | An image — the tag's text content is the URL. |
| `<video>` | A video embed — YouTube URLs get an inline embed; anything else is treated as a direct video file URL. |
| `<table>` | A pipe-delimited markdown table (`\| A \| B \|` rows, with a `---` separator row). |
| `<details>` / `<summary>` | A collapsible section — `<summary>` is the always-visible heading. |

`<note>`, `<tip>`, `<warning>`, `<quote>`, and `<description>` can either hold
plain paragraph text **or** nest other blocks (e.g. a `<warning>` containing
a `<code>` block) — the parser figures out which based on whether any
recognized child tags are present.

### Inline formatting

Inside any text-bearing block, you can use:

- `**bold**`, `*italic*`, `` `inline code` ``
- `[link text](https://example.com)`
- A small safelist of literal inline tags: `<kbd>`, `<b>`, `<strong>`,
  `<i>`, `<em>`, `<u>`, `<sub>`, `<sup>`, `<code>`, `<br>`, and
  `<a href="...">...</a>`

Anything else typed as literal HTML is escaped and shown as plain text —
this keeps spreadsheet content safe to render without a server-side
sanitizer.

### Example

```
<description>
Follow these steps in order the first time you clone the repo.
</description>
<process>
  <step>
    <description>Install dependencies.</description>
    <command>
    npm install
    </command>
  </step>
  <step>
    <description>Start the dev server.</description>
    <command>
    npm run dev
    </command>
    <warning>
    Docker must already be running.
    </warning>
  </step>
</process>
```

---

## 4. How the parser works (`src/data/parser.js`)

1. **Tokenize** — a regex scans the raw Content string for `<tag ...>` /
   `</tag>` markers. Only tags in the known block-tag list are treated as
   structural; anything else (like `<kbd>`) is left as literal text, which is
   what lets inline tags pass through untouched to the markdown-lite
   renderer later.
2. **Build a tree** — a stack-based pass turns the flat token stream into a
   nested tree, closing each tag against the nearest matching ancestor
   (defensive against a missing closing tag).
3. **Convert to AST** — each raw tree node becomes a typed AST node:
   - Container tags (`process`, `step`) always recurse into their children.
   - Text-or-container tags (`description`, `note`, `tip`, `warning`,
     `quote`) recurse into children *if* any were found, otherwise their raw
     text becomes the node's `text`.
   - Leaf tags (`command`, `code`, `image`, `video`, `table`) keep their raw
     text verbatim (after de-denting), plus any attributes (`language`, `alt`).
   - `checklist` splits its raw text into `- item` lines.

The result is a plain nested JS array/object structure with no dependency on
the DOM — it's exactly what `renderKnowledgeItem()` in `ui/renderer.js`
walks over.

---

## 5. How the importer works (`src/data/loader.js` + `src/models/knowledge.js`)

```
for each sheet returned by the Apps Script API
    for each row
        skip it if it has no ID
        create a KnowledgeItem { id, title, rawContent, tags, related, section }
```

There is **no sheet-type detection** anywhere in this pipeline — every sheet
is read identically. `KnowledgeItem.ast` is a lazily-computed getter around
`parseContent()`, so content is only parsed the first time an article is
actually opened (or searched, since the search index needs the flattened
plain text).

`loader.js` caches the raw API response in `sessionStorage` for
`SITE_CONFIG.CACHE_TTL_MS` milliseconds, so navigating between articles
doesn't re-fetch the spreadsheet on every click.

---

## 6. How to add a new sheet (section)

1. Add a new tab to the Google Spreadsheet.
2. Give it the same five headers: `ID | Title | Content | Tags | Related`.
3. Add rows.

That's it — no code changes, no config changes. The new tab appears in the
sidebar's **Sections** list and its rows become searchable and directly
linkable the next time the site loads (or after `CACHE_TTL_MS` expires /
the cache is cleared).

## 7. How to add a new article

Add a row to any sheet with:

- A **globally unique** `ID` (check other sheets too, not just this one).
- A `Title`.
- `Content` using the block tags from section 3.
- Optional `Tags` (comma-separated) and `Related` (comma-separated IDs).

The article is immediately reachable at `yoursite.com/#YOUR-ID`.

---

## 8. How URL routing works (`src/ui/router.js`)

The whole site is a single `index.html` — routing lives entirely in the URL
hash, so GitHub Pages never needs to serve anything but the root page:

| Hash | Shows |
|---|---|
| *(none)* | Home — a grid of all sections |
| `#TS-2` | The article with ID `TS-2` |
| `#section:terminal-commands` | All articles in that section |
| `#tag:docker` | All articles tagged `docker` |

`404.html` exists only as a fallback for old bookmarks that used a path
segment instead of a hash (e.g. from a previous version of this scheme); it
converts the path into the modern hash format and redirects to the root.

---

## 9. How search works (`src/ui/search.js`)

Every `KnowledgeItem` precomputes a lowercase `searchText` field (its ID,
title, tags, and the flattened plain text of its parsed Content) once, right
after the knowledge base is built. Searching is then a synchronous scoring
pass over that in-memory list:

- Exact ID match scores highest.
- Partial ID match, then a Title match, then a Tag match, then a Content
  match, each contributing decreasing weight per matched search term.

This is intentionally simple — for a personal knowledge base of a few
hundred to a few thousand articles, a plain scored substring scan is fast
enough that a proper search index or worker thread isn't worth the
complexity, and it keeps `search.js` trivially easy to read and modify.

---

## 10. Developer notes

- **No build step.** Everything in `src/` is a native ES module; open
  `index.html` directly (or via GitHub Pages) and it runs.
- **One renderer.** `renderKnowledgeItem()` in `ui/renderer.js` is the only
  function that turns a `KnowledgeItem` into DOM. There is no per-sheet or
  per-template branching anywhere — only per-block-type branching inside
  `renderBlock()`. If you're tempted to add an `if (section === "...")`
  anywhere, that's a sign the distinction belongs in the Content block
  markup instead.
- **Extending the block language.** To add a new block tag: add it to
  `BLOCK_TAGS` (and the appropriate leaf/container set) in
  `data/parser.js`, add a case for its `type` in `renderBlock()` in
  `ui/renderer.js`, and document it in section 3 above. That's the entire
  surface area.
- **Syntax highlighting** is provided by [highlight.js](https://highlightjs.org/)
  loaded from a CDN in `index.html` — no language-specific imports are
  needed since the CDN bundle covers common languages automatically.
- **XSS safety.** Sheet content is never trusted as HTML. `utils/markdown.js`
  escapes everything first, then selectively re-enables a small safelist of
  inline tags (`<kbd>`, `<b>`, `<a href="http(s)/...">`, etc.) — arbitrary
  HTML typed into a cell can never execute as a script.
- **Recent Articles** is powered by a small `localStorage` history of
  visited IDs (see `ui/sidebar.js`), not spreadsheet data — it's purely a
  client-side convenience.
