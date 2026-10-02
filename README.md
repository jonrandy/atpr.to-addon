# atpr.to Shortener (browser extension)

A browser extension for the [atpr.to URL Shortener](https://atpr.to).

Right-click any link → "Shorten this link with atpr.to…" — opens the same toolbar popup, with the link already filled
in and ready to shorten (or rename with a custom code) before it actually happens. Click the toolbar icon directly for
the same popup, defaulting instead to the current tab's URL.

It uses your existing atpr.to session cookie to determine if you're logged in (`credentials: "include"`), same as the
dashboard page itself — there's no login flow in the extension. If you're signed out, it'll tell you and offer to open
atpr.to.

**Assumption:** the site is `atpr.to` (inferred from the dashboard JS's own comment identifying its four-square mark
as the atpr.to brand). If that's wrong, it's one line to change — `BASE` at the top of `background.js` and
`popup.js`, plus the `host_permissions` entry in `manifest.json`.

## Install (Chrome / Edge / Brave)

1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this folder

## Install (Firefox)

Temporary (until you restart Firefox):
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…" and select `manifest.json` in this folder

Permanent: Firefox requires signing for permanent installs outside the add-on store. For personal use,
`about:config` → set `xpinstall.signatures.required` to `false` (Firefox Developer/Nightly builds only — not
available on release Firefox), or package it for self-distribution via addons.mozilla.org's unlisted signing.

## Files

- `manifest.json` — MV3 manifest, works in both browsers
- `background.js` — context menu + the actual `/api/shorten` call
- `popup.html` / `popup.js` / `popup.css` — toolbar popup
- `icons/` — generic placeholder icons (swap these for your own)

## Known limitations

- Built against the endpoints visible in the dashboard's own JS (`POST /api/shorten`, 401/409/429 handling) — not a
  documented API, so it can break if the site changes.
- No way to browse/edit/delete existing links from the extension — that's still the dashboard's job. Easy to add if
  useful.
- Firefox's MV3 `service_worker` support varies by version; the manifest declares both `service_worker` and