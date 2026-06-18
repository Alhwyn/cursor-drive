# Cursor Artifacts Gallery

A local Bun + React gallery for browsing media artifacts produced by Cursor Cloud Agents.

The app scans your cloud agents with the Cursor Cloud Agents API, filters generated assets under each agent's `artifacts/` directory, and proxies downloads through the Bun server so your Cursor API key never reaches the browser.

Supported media types:

- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- Videos: `.mp4`, `.webm`, `.mov`

To install dependencies:

```bash
bun install
```

Create a local `.env` file:

```bash
cp .env.example .env
```

Set your Cursor API key:

```bash
CURSOR_API_KEY=your-key
```

To start a development server:

```bash
bun dev
```

Open the printed local URL to view the gallery.

To run for production:

```bash
bun start
```

## API Routes

- `GET /api/artifacts` lists image and video artifacts across cloud agents.
- `GET /api/artifacts?refresh=true` bypasses the 60-second in-memory cache.
- `GET /api/artifacts/download?agentId=...&path=...` streams one artifact.
- `GET /api/agents` lists the first page of cloud agents for debugging.
