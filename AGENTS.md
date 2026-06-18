# AGENTS.md

## Cursor Cloud specific instructions

### Project

Cursor Artifacts Gallery: a single Bun + React app (no monorepo, no database, no
separate frontend server). `src/index.ts` runs one `Bun.serve()` process that
serves both the REST API (`/api/*`) and the bundled React frontend. See
`README.md` for the standard install/run commands and `package.json` for scripts.

### Services

| Service | Command | Notes |
| --- | --- | --- |
| Bun server (API + frontend) | `bun dev` | Single process; hot reload. `bun start` runs the production variant. Set `PORT` to pick the port (defaults to Bun's auto-selected port). |

There is no separate lint or test command in this repo (no `lint`/`test` scripts,
no test files). Use `bunx tsc --noEmit` for type checking and `bun run build` to
verify the production bundle.

### Cursor API key

- `CURSOR_API_KEY` is required for the artifact/agent features and is already
  injected into the Cloud Agent environment, so `/api/artifacts`, `/api/agents`,
  and the download proxy work without extra setup. Bun auto-loads `.env`; a local
  `.env` is only needed outside this environment.
- Without the key the server still boots, but artifact routes return HTTP 503.

### Non-obvious caveat: first `/api/artifacts` call is slow

- `/api/artifacts` (and the gallery's initial page load) paginates through *all*
  cloud agents and scans each for media, which can take longer than Bun's default
  ~10s socket idle timeout on a cold cache. A direct client request can therefore
  return an empty reply / connection-closed on the first cold call.
- The server still finishes the scan and populates a 60s in-memory cache, so the
  next request returns instantly (HTTP 200). When doing a browser demo, warm the
  cache first with `curl "http://localhost:3000/api/artifacts"` and retry until it
  returns 200 quickly, then load the page within the 60s cache window. Use
  `?refresh=true` to force a rescan. Agents older than ~6 months return an
  individual 400 from the Cursor API; this is expected and handled (logged as a
  warning, that agent is skipped).
