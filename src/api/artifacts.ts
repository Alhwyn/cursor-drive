import {
  downloadArtifact,
  getArtifactFilename,
  listCloudAgentsPage,
  listAllGalleryArtifacts,
  mimeFromPath,
} from "../cursor/artifacts";
import { CursorConfigurationError, requireCursorKey } from "../cursor/client";
import type { ApiErrorResponse, ArtifactListResponse } from "../types/artifacts";

export async function listArtifactsHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const refresh = url.searchParams.get("refresh") === "true";
    const { items, cachedAt } = await listAllGalleryArtifacts({ refresh });

    return Response.json({
      items,
      cachedAt,
    } satisfies ArtifactListResponse);
  } catch (error) {
    return jsonError(error);
  }
}

export async function downloadArtifactHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const path = url.searchParams.get("path");

    if (!agentId || !path) {
      return Response.json(
        { error: "agentId and path query parameters are required." } satisfies ApiErrorResponse,
        { status: 400 },
      );
    }

    const artifact = await downloadArtifact(agentId, path);
    const filename = getArtifactFilename(path).replaceAll('"', "");

    return new Response(artifact.body, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Type": artifact.contentType || mimeFromPath(path),
      },
    });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("artifacts/") ? 400 : 500);
  }
}

export async function listAgentsHandler(): Promise<Response> {
  try {
    const apiKey = requireCursorKey();
    const page = await listCloudAgentsPage(apiKey);

    return Response.json(page);
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown, status?: number): Response {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const responseStatus = status ?? (error instanceof CursorConfigurationError ? 503 : 500);

  console.error(error);

  return Response.json(
    {
      error: message,
    } satisfies ApiErrorResponse,
    { status: responseStatus },
  );
}
