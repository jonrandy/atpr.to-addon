# atpr.to Shortener (browser extension)

A browser extension for the [atpr.to URL Shortener](https://atpr.to).

Right-click any link → "Shorten this link with atpr.to…" — opens the same toolbar popup, with the link already filled
in and ready to shorten (or rename with a custom code) before it actually happens. Click the toolbar icon directly for
the same popup, defaulting instead to the current tab's URL.

It uses your existing atpr.to session cookie to determine if you're logged in (`credentials: "include"`), same as the
dashboard page itself — there's no login flow in the extension. If you're signed out, it'll tell you and offer to open
atpr.to.

**Assumption:** the site is `atpr.to` (inferred from the dashboard JS's own comment identifying its four-square mark
as the atpr.to brand). If that's wrong, it's one line to change — `BASE` at the top of `src/background.js` and
`src/popup.js`, plus the `host_permissions` entry in `src/manifest.json`.

## Project layout

```
src/              the extension itself — edit here
scripts/build.mjs builds dist/chrome and dist/firefox from src/
dist/             build output (gitignored) — unpacked folders + zips, not checked in
```

`src/manifest.json` is the one source file that differs between browsers in principle (Firefox supports
`browser_specific_settings.gecko` and `theme_icons`; Chrome has no equivalent for either). Rather than maintaining two
manifests by hand, there's a single one in `src/` and the build strips the Firefox-only keys for the Chrome copy. The
`version` field in `src/manifest.json` is a placeholder (`0.0.0-dev`) — the real version comes from `package.json` and
is injected at build time, so that's the only place to bump it.

## Building

```
npm install
npm run build           # both targets → dist/chrome/, dist/firefox/, and two zips
npm run build:chrome     # Chrome only
npm run build:firefox    # Firefox only
```

Each run produces:

- `dist/chrome/` and `dist/firefox/` — unpacked folders, loadable directly (see Install below)
- `dist/atpr-to-addon-<version>-chrome.zip` — plain zip, the format the Chrome Web Store itself wants on upload.
  There's no local `.crx` build: a `.crx` needs an actual signature (a private key and Chrome's CRX3 signing step,
  not just a renamed zip), and Chrome won't let regular users install one by file/drag-and-drop anyway outside the
  Web Store or an enterprise install policy — so it isn't a useful artifact for local use.
- `dist/atpr-to-addon-<version>-firefox.xpi` — built via [`web-ext`](https://github.com/mozilla/web-ext), which also
  validates `manifest.json` against Firefox's schema as part of packaging. An `.xpi` *is* a zip by spec, so this is
  just web-ext's own output renamed to the extension Firefox expects.

Both packages are **unsigned**. Chrome's unpacked-folder install doesn't need signing at all; Firefox does for a
permanent install — see below.

`npm run lint:firefox` runs `web-ext lint` against the Firefox build on its own, without producing a package.

`npm run format` formats everything in `src/` with the project's Prettier config.

## Install (Chrome / Edge / Brave)

1. `npm run build:chrome`
2. Go to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select `dist/chrome`

The `.zip` this same build produces isn't directly installable — Chrome dropped support for dragging a plain zip
onto `chrome://extensions` (only a signed `.crx` ever worked there, which we deliberately don't build; see
"Building" above). The zip exists for two other purposes: uploading as-is to the Chrome Web Store developer
dashboard, or handing off to someone without this repo, who'd unzip it and point "Load unpacked" at the extracted
folder — the same step 4 above, just on a folder they made themselves instead of `dist/chrome`.

## Install (Firefox)

### Temporary (until you restart Firefox)

1. `npm run build:firefox`
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on…" and select `dist/firefox/manifest.json`

For active development, `npm run dev:firefox` is faster than either of the above: it runs `web-ext run` straight
against `src/` (no build step first), launching a disposable Firefox profile with the extension already loaded and
reloading it automatically whenever a source file changes.

### Permanent (unsigned)

Standard Firefox releases enforce signature checks for permanent add-on installations, but you can bypass this
requirement if you use **Firefox Nightly** or **Firefox Developer Edition**:

1. Open `about:config` in the address bar.
2. Search for `xpinstall.signatures.required` and toggle its value to `false`.
3. `npm run build:firefox` (produces `dist/atpr-to-addon-<version>-firefox.xpi`).
4. Drag and drop the `.xpi` directly into `about:addons`, or install it via the gear icon ("Install Add-on From
   File…").

*Note: for standard release versions of Firefox, permanently installing an add-on outside the official store requires
packaging and submitting it for unlisted signing via [addons.mozilla.org](https://addons.mozilla.org).*

## Files

- `src/manifest.json` — MV3 manifest (browser-specific keys stripped/kept per target at build time)
- `src/background.js` — context menu + the actual `/api/shorten` call
- `src/popup.html` / `src/popup.js` / `src/popup.css` — toolbar popup
- `src/icons/` — generic placeholder icons (swap these for your own)

## Known limitations

- Built against the endpoints visible in the dashboard's own JS (`POST /api/shorten`, 401/409/429 handling) — not a
  documented API, so it can break if the site changes.
- No way to browse/edit/delete existing links from the extension — that's still the dashboard's job. Easy to add if
  useful.
- Firefox's MV3 `service_worker` support varies by version; the manifest declares both `service_worker` and `scripts`
  so each browser picks what it supports.
- Right-click uses `action.openPopup()` to open the real toolbar popup — supported in Firefox since v63, and in
  Chrome only from v127 onward. On older Chrome the call is a no-op: the link is still stashed, so opening the popup
  by hand afterward will show it prefilled, but the popup won't pop open on its own from the right-click.
- The popup uses CSS system colors (`Canvas`, `CanvasText`, `Field`, `AccentColor`, …) rather than a hardcoded
  palette, so it follows light/dark automatically and blends into Firefox's native popup panel.
- `web-ext lint` currently flags one notice: Firefox will require a `data_collection_permissions` key under
  `browser_specific_settings.gecko` at some point. Not required yet, but worth adding before it is.