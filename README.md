# Static Asset Monitor

A Chrome extension (Manifest V3) that monitors the availability of static assets across CDN endpoints. Configure your own endpoints, scan on demand, or run continuous monitoring cycles with browser notifications on failures.

## Features

- **Custom Endpoints** -- Add, edit, and delete CDN endpoints with configurable version manifest and file list paths.
- **On-Demand Scanning** -- Scan a single endpoint and see real-time progress, success/failure counts, and a list of failed URLs.
- **Continuous Monitoring** -- Monitor all endpoints in repeating cycles with a configurable interval and countdown timer between cycles.
- **Browser Notifications** -- Get notified immediately when asset checks fail (can be toggled in settings).
- **Dark / Light Theme** -- Toggle between themes; preference is persisted across sessions.
- **Import / Export** -- Back up or share your endpoint configuration and settings as a JSON file.
- **Batch Control** -- Tune batch size and delay between batches to avoid rate limiting.
- **Error Log** -- Dashboard keeps a rolling log of the last 200 errors for quick review.

## How It Works

```
version.txt          {ver}-filelist.json           HTTP check
+-----------+        +-------------------+         +----------+
| v1.0.0    |  --->  | compressed: [..] |   --->  | 200? OK  |
| v1.1.0    |        | uncompressed:[..]|         | 404? FAIL|
+-----------+        +-------------------+         +----------+
```

1. The scanner fetches a **version manifest** (`version.txt`) from the endpoint, which lists one version identifier per line.
2. For each version, it fetches **`{version}-filelist.json`** containing `compressed` and `uncompressed` arrays of relative asset paths.
3. Full URLs are constructed and **batch-checked** via HTTP requests, looking for `200` status codes.
4. Failures are reported in the UI, logged to storage, and optionally surfaced as browser notifications.

## Project Structure

```
.
├── manifest.json        # Chrome Extension Manifest V3 configuration
├── background.js        # Service worker -- opens dashboard on icon click
├── scanner.js           # Core scan engine (batch URL checking with abort support)
├── storage.js           # Chrome storage.local wrapper + shared utility functions
├── theme.js             # Dark/light theme toggle, persisted to storage
├── dashboard.html/js    # Main view -- endpoint list and recent error log
├── scan.html/js         # Single-endpoint scan with progress bar and failed URL list
├── monitor.html/js      # Multi-endpoint continuous monitoring with cycle countdown
├── settings.html/js     # Endpoint CRUD, general settings, import/export
├── styles.css           # Full design system (light + dark CSS variables)
├── icon-48.png          # Extension icon (48x48)
├── icon-128.png         # Extension icon (128x128)
├── .gitignore           # Ignored files
└── LICENSE              # The Unlicense (public domain)
```

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/harish-ravichandra/Static-Asset-Monitor.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the cloned repository folder.
5. The extension icon will appear in the toolbar. Click it to open the dashboard.

## Getting Started

1. Click the extension icon to open the **Dashboard**.
2. Go to **Settings** (gear icon in the navbar) and click **Add Endpoint**.
3. Fill in:
   - **Name** -- A label for this endpoint (e.g., "Production CDN").
   - **Base URL** -- Root URL of your static content server (no trailing slash).
   - **Version File Path** -- Path to `version.txt` relative to the base URL (default: `/version.txt`).
   - **File List Path** -- Directory containing `{version}-filelist.json` files (default: `/filelist`).
4. Save the endpoint and return to the Dashboard.
5. Click **Scan** on an endpoint for a one-time check, or **Monitor All** to continuously scan all endpoints.

### Expected Server Structure

Your CDN or static server should expose:

```
https://cdn.example.com/assets/version.txt
  -> Lines of version identifiers, e.g.:
     v1.0.0
     v1.1.0

https://cdn.example.com/assets/filelist/v1.0.0-filelist.json
  -> { "compressed": ["path/to/file.gz", ...], "uncompressed": ["path/to/file.js", ...] }
```

## Settings

| Setting              | Default | Description                                      |
|----------------------|---------|--------------------------------------------------|
| Batch Size           | 500     | Number of URLs checked in parallel per batch      |
| Batch Delay (ms)     | 100     | Pause between batches to avoid rate limiting      |
| Monitor Interval (s) | 300     | Delay between automatic monitoring cycles         |
| Notifications        | On      | Browser notifications on scan failures            |

## Permissions

| Permission      | Reason                                              |
|-----------------|-----------------------------------------------------|
| `storage`       | Persist endpoints, settings, errors, and theme      |
| `notifications` | Show browser notifications when asset checks fail   |
| `<all_urls>`    | Fetch assets from any user-configured CDN endpoint  |

## License

This project is licensed under the [MIT License](LICENSE).
