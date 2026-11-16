# ScopeDue source (v68)

The app is written here, in small files. `python3 build.py` (in the release folder) puts it together:

| Output | What it is |
|---|---|
| `scopedue-extension/app.html`, `app.css`, `app.js`, `boot.js`, `i18n.js`, `i18n-vi.js`, `i18n-vi-panel.js` | the extension's new tab and side panel |
| `scopedue_v68.html` | everything in one file: the tests, and a quick look in a browser |
| `portal.html`, `portal-assets/` (`boot.js`, `i18n.js`, `i18n-vi.js`, `portal.css`, `portal.js`) | the client portal, built from `src/portal/` (see below) |

Never edit the outputs: they are written again by every build. The extension's own files that are not built
(`manifest.json`, `sw.js`, `capture.html`, `capture.js`, `capture.css`, `reminder.html`, `reminder.js`, `reminder.css`, `_locales/`, `fonts/`, `icons/`) are edited where they are.

## Where things are

```
src/
  html/page.html            the page: head, the shell, and <!-- @include … --> for every part below
  html/icons.html           the SVG icon sprite (<symbol id="i-…">)
  html/sidebar.html         the sidebar
  html/views/*.html         one file per page (dashboard, projects, project, clients, client, mywork, actions, inbox, profile, settings)
  html/drawers/*.html       one file per drawer (the panels that slide in from the right)
  css/00-tokens.css         spacing, motion, fonts: what no theme changes
  css/themes/*.css          the colour themes (see below)
  css/NN-*.css              the styles, one file per area, in the order of their numbers
  js/store.js               saved data: IndexedDB, backups, the boot copy
  js/app/NN-*.js            the app, one file per feature, in the order of their numbers
  js/app/_open.js, _close.js   the two lines that wrap the files above (they wait for the saved data, then run)
  js/ext/boot.js            the extension's first script: theme and language before anything is drawn
  portal/                   the client portal, laid out the same way:
    page.html               the page (<!-- @csp -->, @head, @css, @js are filled in by the build)
    css/00-tokens.css, css/themes/*.css, css/NN-*.css     type and motion, the portal's themes, the styles
    js/boot.js              its first script: never in a frame, the language, the theme, before anything is drawn
    js/app/NN-*.js          the portal, one file per part, in number order inside one closure (_open.js, _close.js)
i18n/vi.tsv, i18n/runtime.js   the Vietnamese dictionary and the language layer (see i18n/README.md)
```

The files in `js/app/` are one program cut into chapters: they share their names (a function in `08-clients.js` can call one in
`02-ui-kit.js`), and they run in the order of their numbers. A new feature goes in a new file with a number that places it after
what it uses. Keep the number prefix; the name after it is free.

## Themes

A theme is one file in `src/css/themes/`. To add one: copy `_template.css` to `themes/<id>.css`, set its header and colours,
run `python3 build.py`. It appears in Settings › General › Theme and in the footer switch, in both languages (`name`, `name-vi`).

- `light.css` is the default (`default: yes`): every value the app uses is set there, on `:root`.
- `dark.css` says `system: dark`: "System" uses it when the computer is in dark mode.
- Any other theme sets its values on `:root[data-theme="<id>"]`; what it leaves out comes from `light.css`.
- Colours used in components come from these variables only. Shadows use `--shade` and `--shade-deep` as "r g b", so a theme can
  tint them (`rgb(var(--shade) / .3)`). A colour written directly in a component is a bug: give it a variable in `light.css`.
- Files whose name starts with `_` are not built.

## The client portal

`src/portal/` builds `portal.html` (5 KB: the page and its CSP) and `portal-assets/`. Each file is linked as `name?v=<hash>`, so a
browser keeps it until a build changes it. The page has no script of its own: its CSP is `script-src 'self'`.

- **Themes**: one file each in `src/portal/css/themes/`: `light` (default; tones Porcelain, Sand, Mist, Plum, Midnight), `dark` (System on a dark computer), `ivory` (palettes Forest, Terracotta, Navy, Olive, Bordeaux, Graphite).
  The header is the app's (`theme`, `name`, `name-vi`, `default: yes`, `system: dark`) plus `note` / `note-vi`, the line under
  the name in the app's theme picker. To add one, copy `_template.css`, set its values, build: it appears in the portal, in its
  Appearance menu and in the app's picker (New project, a project's Portal theme), with a small picture drawn from its own values. Accents are mixed from `--tone` (the studio's
  colour). A theme may also set the type (`--sans`, `--display`, `--label`, `--dw`, `--dw-strong`, `--dtrack`, `--caps`, `--caps-k`, in
  `00-tokens.css`), bring fonts (`.woff2` in `src/portal/fonts`, declared with `@font-face` in the theme; read only when the theme
  is used), offer colour palettes (`palette: <id> | <name> | <tên>` in its header and a
  `:root[data-theme="<id>"][data-palette="<id>"]` block each; studio.theme is then `"<theme>.<palette>"`), and refine components, or lay them out differently, under its own `:root[data-theme="<id>"]` (`ivory.css`
  moves the hero's status, the record strip and the request's icon; the content stays the same). A colour written directly in a component is
  a bug: give it a variable in `light.css`.
- **Which theme**: `?theme=<id>` in the address (a preview, not remembered), else the client's own (the Appearance menu in the
  portal header, kept in that browser), else the project's (chosen in New project or on the project page; on Home the first
  project's), else `studio.theme` (older), else Automatic: light, or dark when the computer is. The studio's theme and language
  are remembered in that browser (`localStorage['sd-portal']`), so the next visit has them from the first frame.
- **The dictionary** (`i18n-vi.js`, only the portal's texts) is read only in Vietnamese: up front when the page will start in it,
  else when the studio's language turns out to be Vietnamese. The first page waits for it, so it is never drawn in English first.

## Loading only what is shown

- **Closed drawers are not laid out.** `.drawer:not(.dr-live)` is `display: none`; `openDrawer` adds `dr-live` (so the drawer can
  be measured and slide in), `closeDrawer` removes it when the slide ends. Code that measures a drawer runs in its open hook.
- **Hidden pages and closed drawers are translated when shown**, not at start: `showView` and `openDrawer` call
  `SDI18N.reveal(el)` before the browser paints.
- **The Vietnamese dictionary (about 450 KB) loads only for Vietnamese.** `boot.js` adds `i18n-vi.js` before the app when the app
  starts in Vietnamese; in English it is never read, unless someone switches (then `i18n.js` fetches it once) or a Vietnamese
  client's reminder is drafted (`SDI18N.load`). The side panel reads `i18n-vi-panel.js` instead: only its own texts (about 7 KB).
  Sentence patterns are filed by word and compiled the first time they are needed.
- **Pages that are not open are not drawn at start**: the Profile page is drawn by `pfEnter`. Sliders (`.seg`) on screen are
  measured all at once, then moved (one layout, not one per slider); a slider on a hidden page is placed when the page is shown.
- **The theme is set before the first frame** (`boot.js`), so a dark theme never flashes white.

Measured on the extension's new tab, CPU slowed 4×, median of 7 cold starts (`tests/perf68.js`): see `tests/README.md`.
