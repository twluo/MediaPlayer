# Media Player

A browser-based music player that connects to Navidrome and/or Plex media servers. The main feature is a unified library view that merges albums from all your configured providers into a single browsable grid.

Other features include:
- **Recently Added** — a chronological view of the latest albums across all providers (capped at 50)
- **Search** — fuzzy search across the combined library by album title or artist
- **Playback** — shuffle, repeat, queue viewing, and volume control
- **Scrobbling** — play state is reported back to each provider as you listen

## Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0`
- **Bun** (used as the package manager)

## Installation

```sh
bun install
```

## Development

Start the local dev server:

```sh
bun run dev
```

The app will be available at `http://localhost:5173`.

## Build

Type-check and build for production:

```sh
bun run build
```

Preview the production build locally:

```sh
bun run preview
```

Output is written to `dist/`.

## Adding a Media Provider

On first load you will be prompted to add a provider. You can also reach this screen at any time via **Settings**.

**Navidrome / Subsonic**
1. Choose *Navidrome* in the provider dialog.
2. Enter a short ID (used internally, e.g. `home`), your server URL, and your username and password.
3. Click *Connect*.

**Plex**
1. Choose *Plex* in the provider dialog.
2. Enter a short ID, then click *Sign in with Plex*.
3. Approve access in the Plex window that opens.
4. Select the Media Server you want to use from the list.
5. Click *Connect*.

Multiple providers can be added and individually enabled or disabled from the Settings page.

---

*Parts of this codebase were written with the assistance of an AI coding tool (Mainly the UI elements).*
