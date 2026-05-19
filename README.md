# Note Age Highlighter

An Obsidian plugin that highlights notes in the file explorer when they haven't been modified for a configurable number of days.

## The Problem

Your vault grows. Old notes get buried and forgotten. There's no visual signal that a note hasn't been touched in weeks or months.

## The Solution

Note Age Highlighter scans your vault and highlights stale notes directly in the file explorer. You set the threshold — the plugin does the rest.

## Features

- Highlights notes older than N days in the file explorer
- Configurable threshold in days (default: 30)
- Configurable highlight color (default: #ff6b6b)
- Uses mtime (last modified time), not creation date
- Changes apply instantly when you update settings
- Lightweight — no external dependencies

## Settings

- **Threshold in days** — notes not modified for longer than this will be highlighted
- **Highlight color** — any valid CSS color value (e.g. `#ff6b6b`, `tomato`, `rgb(255,107,107)`)

## Installation

### Manual
1. Download `main.js` and `manifest.json` from the latest [Release](../../releases)
2. Copy them to your vault: `.obsidian/plugins/note-age-highlighter/`
3. Enable the plugin in Settings → Community Plugins

### Via Community Plugins
Search for **Note Age Highlighter** in the Obsidian Community Plugins browser.

## Support

If this plugin saves you time, consider supporting the development:

☕ [Support on Boosty](https://boosty.to/imemineoff)

## Author

Made by [ImeMine](https://github.com/MeMineoff)

## License

MIT
