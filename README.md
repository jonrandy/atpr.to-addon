# atpr.to Shortener (browser extension)

A browser extension for the [atpr.to URL Shortener](https://atpr.to).

Right-click any link → "Shorten this link with atpr.to…" — opens the same toolbar popup, with the link already filled
in and ready to shorten (or rename with a custom code) before it actually happens. Click the toolbar icon directly for
the same popup, defaulting instead to the current tab's URL.

It uses your existing atpr.to session cookie to determine if you're logged in (`credentials: "include"`), same as the
dashboard page itself — there's no login flow in the extension. If you're signed out, it'll tell you and offer to open
atpr.to.

## Install (Chrome / Edge / Brave)

1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this folder

## Install (Firefox)

### Temporary
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…" and select `manifest.json` in this folder

### Permanent (Unsigned)
Standard Firefox releases enforce signature checks for permanent add-on installations, but you can bypass this requirement if you use **Firefox Nightly** or **Firefox Developer Edition**:

1. Open `about:config` in the address bar.
2. Search for `xpinstall.signatures.required` and toggle its value to `false`.
3. Zip the contents of this folder (or build an `.xpi` file).
4. Drag and drop the archive directly into `about:addons` or install it via the gear icon ("Install Add-on From File…").

*Note: For standard release versions of Firefox, permanently installing an add-on outside the official store requires packaging and submitting it for unlisted signing via [addons.mozilla.org](https://addons.mozilla.org).*

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