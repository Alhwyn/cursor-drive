# Cursor Drive

A local Bun + React gallery for browsing images and videos produced by [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent).

The app scans your cloud agents via the Cursor Cloud Agents API, collects media files from each agent's `artifacts/` directory, and proxies downloads through the Bun server so your API key never reaches the browser.

## Features

- **Asset sidebar** — search, filter by Media or Videos, and browse by agent folder
- **Gallery grid** — minimal cards with image previews and video thumbnails
- **Lightbox modal** — click any preview to open full-size media; videos play with controls
- **Keyboard shortcuts** — `←` / `→` to move between assets in the modal, `Escape` to close
- **Download** — save files from the modal header

## Supported formats

Files listed by the Cursor API under each agent's `artifacts/` directory:

| Type   | Extensions                                      |
|--------|-------------------------------------------------|
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg` |
| Videos | `.mp4`, `.webm`, `.mov`, `.m4v`                |

### What shows up

Only artifacts uploaded to Cursor's artifact storage appear in the API. Inline images from agent conversations (for example, GenerateImage outputs that were not saved to `artifacts/`) are **not** available through this gallery.

If an agent saves a generated image as `artifacts/my-image.png`, it will appear here. Agents created more than 6 months ago are skipped (Cursor API limitation).

## Setup

Install dependencies:

```bash
bun install
```

Create a local `.env` file:

```bash
cp .env.example .env
```

Add your Cursor API key:

```bash
CURSOR_API_KEY=your-key
```

Start the dev server:

```bash
bun dev
```

Open the printed local URL to view the gallery.

For production:

```bash
bun run build
bun start
```

## API routes

| Route | Description |
|-------|-------------|
| `GET /api/artifacts` | List image and video artifacts across cloud agents |
| `GET /api/artifacts?refresh=true` | Bypass the 60-second in-memory cache |
| `GET /api/artifacts/download?agentId=...&path=...` | Stream a single artifact |
| `GET /api/agents` | List the first page of cloud agents (debugging) |

## Project structure

```
src/
  api/          # HTTP route handlers
  components/   # React UI (gallery, sidebar, cards, modal)
  cursor/       # Cursor API client and artifact scanning
  types/        # Shared TypeScript types
  utils/        # Formatting and URL helpers
  index.ts      # Bun server entry point
```

## Links

- [Cursor Cloud Agent API — List artifacts](https://cursor.com/docs/cloud-agent/api/endpoints#list-artifacts)
- [Cursor Cloud Agent capabilities](https://cursor.com/docs/cloud-agent/capabilities)
