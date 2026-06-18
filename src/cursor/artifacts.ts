import type { GalleryArtifact, MediaKind } from "../types/artifacts";
import { requireCursorKey } from "./client";

const CURSOR_API_BASE = "https://api.cursor.com/v1";
const CACHE_TTL_MS = 60_000;
const MAX_AGENT_ARTIFACT_SCANS = 5;
const ARTIFACT_WINDOW_MONTHS = 6;

const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "webm"]);

interface ArtifactCache {
  items: GalleryArtifact[];
  cachedAt: string;
  expiresAt: number;
}

interface CursorArtifact {
  path: string;
  sizeBytes: number;
  updatedAt: string;
}

interface CursorAgentSummary {
  agentId: string;
  name: string;
  createdAt?: string;
}

interface CursorAgentListItem {
  id: string;
  name: string;
  createdAt?: string;
}

interface CursorAgentListResponse {
  items: CursorAgentListItem[];
  nextCursor?: string;
}

interface CursorArtifactListResponse {
  items: CursorArtifact[];
}

interface CursorArtifactDownloadResponse {
  url: string;
  expiresAt: string;
}

export interface DownloadedArtifact {
  body: ArrayBuffer;
  contentType: string;
}

let artifactCache: ArtifactCache | undefined;

export function getArtifactFilename(path: string): string {
  const parts = path.split("/");
  return parts.at(-1) || path;
}

export function getMediaKind(path: string): MediaKind | undefined {
  const extension = getExtension(path);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  return undefined;
}

export function isMediaArtifact(path: string): boolean {
  return getMediaKind(path) !== undefined;
}

export function mimeFromPath(path: string): string {
  const extension = getExtension(path);

  const mimeTypes: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    m4v: "video/x-m4v",
    mov: "video/quicktime",
    mp4: "video/mp4",
    png: "image/png",
    svg: "image/svg+xml",
    webm: "video/webm",
    webp: "image/webp",
  };

  return mimeTypes[extension] ?? "application/octet-stream";
}

export async function listAllGalleryArtifacts(options?: {
  refresh?: boolean;
}): Promise<{ items: GalleryArtifact[]; cachedAt: string }> {
  if (!options?.refresh && artifactCache && artifactCache.expiresAt > Date.now()) {
    return {
      items: artifactCache.items,
      cachedAt: artifactCache.cachedAt,
    };
  }

  const apiKey = requireCursorKey();
  const agents = await listCloudAgents(apiKey);
  const perAgentArtifacts = await mapWithConcurrency(
    agents,
    MAX_AGENT_ARTIFACT_SCANS,
    agent => listAgentMediaArtifacts(agent, apiKey),
  );

  const items = perAgentArtifacts
    .flat()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const cachedAt = new Date().toISOString();

  artifactCache = {
    items,
    cachedAt,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return { items, cachedAt };
}

export async function downloadArtifact(agentId: string, path: string): Promise<DownloadedArtifact> {
  validateArtifactPath(path);

  const apiKey = requireCursorKey();
  const download = await requestCursor<CursorArtifactDownloadResponse>(
    `/agents/${encodeURIComponent(agentId)}/artifacts/download?path=${encodeURIComponent(path)}`,
    apiKey,
  );
  const response = await fetch(download.url);

  if (!response.ok) {
    throw new Error(`Failed to download artifact: ${response.status} ${response.statusText}`);
  }

  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get("Content-Type") ?? mimeFromPath(path),
  };
}

export async function listCloudAgentsPage(apiKey: string): Promise<CursorAgentListResponse> {
  return requestCursor<CursorAgentListResponse>(
    "/agents?limit=100&includeArchived=true",
    apiKey,
  );
}

function getExtension(path: string): string {
  return path.split(".").at(-1)?.toLowerCase() ?? "";
}

async function listCloudAgents(apiKey: string): Promise<CursorAgentSummary[]> {
  const agents: CursorAgentSummary[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      includeArchived: "true",
      limit: "100",
    });

    if (cursor) {
      params.set("cursor", cursor);
    }

    const page = await requestCursor<CursorAgentListResponse>(`/agents?${params}`, apiKey);

    const artifactEligibleAgents = page.items.filter(agent => isWithinArtifactWindow(agent.createdAt));

    agents.push(
      ...artifactEligibleAgents.map(agent => ({
        agentId: agent.id,
        name: agent.name,
        createdAt: agent.createdAt,
      })),
    );
    cursor = page.nextCursor;
  } while (cursor);

  return agents;
}

async function listAgentMediaArtifacts(
  agentSummary: CursorAgentSummary,
  apiKey: string,
): Promise<GalleryArtifact[]> {
  try {
    const { items: artifacts } = await requestCursor<CursorArtifactListResponse>(
      `/agents/${encodeURIComponent(agentSummary.agentId)}/artifacts`,
      apiKey,
    );

    return artifacts.flatMap(artifact => {
      const kind = getMediaKind(artifact.path);

      if (!kind) {
        return [];
      }

      return [
        {
          agentId: agentSummary.agentId,
          agentName: agentSummary.name,
          path: artifact.path,
          sizeBytes: artifact.sizeBytes,
          updatedAt: artifact.updatedAt,
          kind,
        },
      ];
    });
  } catch (error) {
    if (isArtifactWindowError(error)) {
      return [];
    }

    console.warn(`Failed to list artifacts for ${agentSummary.agentId}:`, error);
    return [];
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const item = items[currentIndex];

      if (item !== undefined) {
        results[currentIndex] = await mapper(item);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

function validateArtifactPath(path: string): void {
  if (!path.startsWith("artifacts/")) {
    throw new Error("Artifact path must be under artifacts/.");
  }
}

function isWithinArtifactWindow(createdAt: string | undefined): boolean {
  if (!createdAt) {
    return true;
  }

  const createdAtDate = new Date(createdAt);

  if (Number.isNaN(createdAtDate.getTime())) {
    return true;
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - ARTIFACT_WINDOW_MONTHS);

  return createdAtDate >= cutoff;
}

function isArtifactWindowError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Artifacts are only available for agents created within the last 6 months");
}

async function requestCursor<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${CURSOR_API_BASE}${path}`, {
    headers: {
      Authorization: `Basic ${btoa(`${apiKey}:`)}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cursor API request failed: ${response.status} ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}
