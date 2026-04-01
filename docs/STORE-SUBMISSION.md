# Store submission checklist — Ecosystem Status Hub

Use the **versioned ZIP** from `dist/` (name includes the manifest version, e.g. `ecosystem-status-hub-0.3.3.zip`).

## Build the package

**Windows (PowerShell)** — from repo root:

```powershell
.\scripts\package-store.ps1
```

**macOS / Linux** (requires `jq` and `zip`):

```bash
chmod +x scripts/package-store.sh
./scripts/package-store.sh
```

Output: **`dist/ecosystem-status-hub-<version>.zip`** with `manifest.json` at the root of the archive (required by Chrome and Edge).

## What is inside the ZIP

Runtime only: `manifest.json`, `background.js`, `data/`, `icons/`, `panel/`, `popup/`, `LICENSE`.  
Excluded: `.git`, `scripts/`, `docs/`, `README.md` (not needed to run the extension).

## Chrome Web Store

1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) — New item — upload ZIP.
2. **Privacy practices**: host `docs/PRIVACY.md` publicly and paste the **Privacy policy URL** (e.g. GitHub blob or GitHub Pages).  
   Example pattern: `https://github.com/mapicallo/ecosystem-status-hub/blob/main/docs/PRIVACY.md`
3. **Justification for permissions** (short):
   - **windows**: “Open and focus the floating hub panel window when the user clicks the toolbar icon.”
   - **storage**: “Save UI language, custom links list, and the panel window id to avoid duplicate windows.”
4. **Screenshots**: prepare 1280×800 or 640×400 PNG/JPEG of the panel (store requirements change; check current docs).
5. **Promotional images**: small tile 440×280, optional marquee.

## Microsoft Edge Add-ons

1. [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) — submit new extension — upload the **same ZIP**.
2. Privacy policy URL and permission explanations similar to Chrome.

## Before each release

1. Bump `"version"` in `manifest.json` (SemVer).
2. Run the package script again — the **filename** will include the new version automatically.
3. Tag the repo: `git tag v0.3.3` (optional but useful).

## Single version source

The extension **display name** in the store does not include the version number. The **package file name** does (`ecosystem-status-hub-<version>.zip`), matching `manifest.json` → `version`.
