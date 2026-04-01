# Ecosystem Status Hub

Browser extension (Manifest V3) with **curated links** to official provider status pages and public Internet health signals (routing, DNS observatories, etc.). It does **not** monitor your network or collect personal data.

## Load unpacked (Chrome / Edge)

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder (`ecosystem-status-hub`).

## Floating panel

Click the toolbar icon to open a **separate window** (not the old in-toolbar popup). You can **move** it by the native window title bar, **resize** it from the edges, and **close** it with the window close control or the **×** button in the header. Links still open in your normal browser tabs (`target="_blank"`), so the hub stays open.

If the panel is already open, the toolbar icon **focuses** that window instead of opening a second one.

## Data

- Link directory: [`data/links.json`](data/links.json) (`id`, `family`, `title`, `url`, `sourceType`).
- Update `meta.lastVerified` when you refresh URLs.

## Verify URLs (optional)

Requires Python 3.9+:

```bash
python scripts/verify_links.py
```

Uses a normal browser `User-Agent`, tries `HEAD` then `GET` when some sites block `HEAD`.  
If your Python install fails TLS verification for a specific host, you can run `python scripts/verify_links.py --insecure` (dev only).

Exits with code 1 if any URL fails (connection error or HTTP status outside 200–399). Automated checks can still hit `403` from WAFs despite working in a real browser.

## Store submission

- Icons: `icons/icon-*.png`
- Host a public **privacy policy** (see [`docs/PRIVACY.md`](docs/PRIVACY.md)); GitHub-rendered copy is enough for many submissions.
- Package a **zip** of the extension root (manifest at root, no `.git`).

## License

MIT — see [LICENSE](LICENSE).
