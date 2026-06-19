import { downloadLocalAsset, listLocalGalleryAssets } from "../local/assets";
import type { ApiErrorResponse, ArtifactListResponse } from "../types/artifacts";

export async function listLocalAssetsHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const refresh = url.searchParams.get("refresh") === "true";
    const { items, cachedAt } = await listLocalGalleryAssets({ refresh });

    return Response.json({
      items,
      cachedAt,
    } satisfies ArtifactListResponse);
  } catch (error) {
    return jsonError(error);
  }
}

export async function downloadLocalAssetHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project");
    const assetPath = url.searchParams.get("path");

    if (!projectId || !assetPath) {
      return Response.json(
        { error: "project and path query parameters are required." } satisfies ApiErrorResponse,
        { status: 400 },
      );
    }

    const asset = await downloadLocalAsset(projectId, assetPath);
    const filename = asset.filename.replaceAll('"', "");

    return new Response(asset.file, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Type": asset.contentType,
      },
    });
  } catch (error) {
    return jsonError(error, error instanceof Error && isClientPathError(error) ? 400 : 500);
  }
}

function jsonError(error: unknown, status?: number): Response {
  const message = error instanceof Error ? error.message : "Unexpected server error.";

  console.error(error);

  return Response.json(
    {
      error: message,
    } satisfies ApiErrorResponse,
    { status: status ?? 500 },
  );
}

function isClientPathError(error: Error): boolean {
  return (
    error.message.includes("Invalid local project id") ||
    error.message.includes("Local asset path must") ||
    error.message.includes("not an AI-generated image output") ||
    error.message.includes("Local asset not found")
  );
}
