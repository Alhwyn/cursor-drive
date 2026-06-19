import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { getArtifactFilename, getMediaKind, mimeFromPath } from "../cursor/artifacts";
import type { GalleryArtifact } from "../types/artifacts";

const CACHE_TTL_MS = 60_000;
const CURSOR_PROJECTS_ROOT = process.env.CURSOR_PROJECTS_ROOT ?? path.join(homedir(), ".cursor", "projects");

interface LocalAssetCache {
  items: GalleryArtifact[];
  cachedAt: string;
  expiresAt: number;
}

interface GeneratedAssetIndex {
  exactFilenames: Set<string>;
  derivativePrefixes: Set<string>;
}

interface TranscriptEntry {
  message?: {
    content?: unknown;
  };
}

interface GenerateImageToolUse {
  type: "tool_use";
  name: "GenerateImage";
  input: {
    filename?: string;
  };
}

export interface DownloadedLocalAsset {
  file: Bun.BunFile;
  filename: string;
  contentType: string;
}

let localAssetCache: LocalAssetCache | undefined;

export async function listLocalGalleryAssets(options?: {
  refresh?: boolean;
}): Promise<{ items: GalleryArtifact[]; cachedAt: string }> {
  if (!options?.refresh && localAssetCache && localAssetCache.expiresAt > Date.now()) {
    return {
      items: localAssetCache.items,
      cachedAt: localAssetCache.cachedAt,
    };
  }

  const projects = await listCursorProjectDirectories();
  const perProjectAssets = await Promise.all(projects.map(project => listProjectAssets(project)));
  const items = perProjectAssets
    .flat()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const cachedAt = new Date().toISOString();

  localAssetCache = {
    items,
    cachedAt,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return { items, cachedAt };
}

export async function downloadLocalAsset(projectId: string, assetPath: string): Promise<DownloadedLocalAsset> {
  await assertGeneratedLocalAsset(projectId, assetPath);

  const filePath = await resolveLocalAssetPath(projectId, assetPath);
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    throw new Error("Local asset not found.");
  }

  return {
    file,
    filename: getArtifactFilename(assetPath),
    contentType: mimeFromPath(assetPath),
  };
}

async function listCursorProjectDirectories(): Promise<string[]> {
  try {
    const entries = await readdir(CURSOR_PROJECTS_ROOT, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

async function listProjectAssets(projectId: string): Promise<GalleryArtifact[]> {
  const assetsDir = path.join(CURSOR_PROJECTS_ROOT, projectId, "assets");

  try {
    const generatedAssets = await buildGeneratedAssetIndex(projectId);
    if (generatedAssets.exactFilenames.size === 0) {
      return [];
    }

    const entries = await readdir(assetsDir, { withFileTypes: true });
    const assets = await Promise.all(
      entries
        .filter(entry => entry.isFile())
        .map(async entry => {
          if (!isGeneratedAssetFilename(entry.name, generatedAssets)) {
            return undefined;
          }

          const assetPath = `assets/${entry.name}`;
          const kind = getMediaKind(assetPath);

          if (!kind) {
            return undefined;
          }

          const fileStats = await stat(path.join(assetsDir, entry.name));

          return {
            source: "local",
            agentId: projectId,
            agentName: "Local assets",
            repositoryName: formatProjectName(projectId),
            path: assetPath,
            sizeBytes: fileStats.size,
            updatedAt: fileStats.mtime.toISOString(),
            kind,
          } satisfies GalleryArtifact;
        }),
    );

    return assets.filter((asset): asset is GalleryArtifact => asset !== undefined);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }

    console.warn(`Failed to list local assets for ${projectId}:`, error);
    return [];
  }
}

async function assertGeneratedLocalAsset(projectId: string, assetPath: string): Promise<void> {
  validateProjectId(projectId);
  validateAssetPath(assetPath);

  const generatedAssets = await buildGeneratedAssetIndex(projectId);
  const filename = getArtifactFilename(assetPath);

  if (!isGeneratedAssetFilename(filename, generatedAssets)) {
    throw new Error("Local asset is not an AI-generated image output.");
  }
}

async function buildGeneratedAssetIndex(projectId: string): Promise<GeneratedAssetIndex> {
  const transcriptFiles = await listTranscriptFiles(projectId);
  const exactFilenames = new Set<string>();
  const derivativePrefixes = new Set<string>();

  await Promise.all(
    transcriptFiles.map(async transcriptFile => {
      const content = await readFile(transcriptFile, "utf8");

      for (const line of content.split("\n")) {
        const filename = getGenerateImageFilename(line);

        if (!filename) {
          continue;
        }

        exactFilenames.add(filename);
        derivativePrefixes.add(getDerivativePrefix(filename));
      }
    }),
  );

  return {
    exactFilenames,
    derivativePrefixes,
  };
}

async function listTranscriptFiles(projectId: string): Promise<string[]> {
  const transcriptsDir = path.join(CURSOR_PROJECTS_ROOT, projectId, "agent-transcripts");

  try {
    return await listJsonlFiles(transcriptsDir);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

async function listJsonlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listJsonlFiles(entryPath);
      }

      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        return [entryPath];
      }

      return [];
    }),
  );

  return nested.flat();
}

function getGenerateImageFilename(line: string): string | undefined {
  if (!line.includes('"name":"GenerateImage"') || !line.includes('"filename"')) {
    return undefined;
  }

  try {
    const entry = JSON.parse(line) as TranscriptEntry;
    const content = entry.message?.content;

    if (!Array.isArray(content)) {
      return undefined;
    }

    for (const block of content) {
      if (!isGenerateImageToolUse(block)) {
        continue;
      }

      const filename = block.input.filename;

      if (filename) {
        return path.basename(filename);
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isGenerateImageToolUse(block: unknown): block is GenerateImageToolUse {
  if (typeof block !== "object" || block === null) {
    return false;
  }

  const maybeBlock = block as Partial<GenerateImageToolUse>;
  return (
    maybeBlock.type === "tool_use" &&
    maybeBlock.name === "GenerateImage" &&
    typeof maybeBlock.input === "object" &&
    maybeBlock.input !== null &&
    typeof maybeBlock.input.filename === "string"
  );
}

function isGeneratedAssetFilename(filename: string, generatedAssets: GeneratedAssetIndex): boolean {
  if (generatedAssets.exactFilenames.has(filename)) {
    return true;
  }

  return Array.from(generatedAssets.derivativePrefixes).some(prefix => filename.startsWith(prefix));
}

function getDerivativePrefix(filename: string): string {
  const extension = path.extname(filename);
  const stem = extension ? filename.slice(0, -extension.length) : filename;

  return `${stem}-`;
}

async function resolveLocalAssetPath(projectId: string, assetPath: string): Promise<string> {
  validateProjectId(projectId);
  validateAssetPath(assetPath);

  const projectsRoot = await realpath(CURSOR_PROJECTS_ROOT);
  const projectDir = path.resolve(projectsRoot, projectId);
  const assetsDir = path.resolve(projectDir, "assets");
  const relativeAssetPath = assetPath.slice("assets/".length);
  const resolvedPath = path.resolve(assetsDir, relativeAssetPath);

  if (!isPathWithin(resolvedPath, assetsDir)) {
    throw new Error("Local asset path must stay under the project assets directory.");
  }

  let realFilePath: string;
  try {
    realFilePath = await realpath(resolvedPath);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      throw new Error("Local asset not found.");
    }

    throw error;
  }

  if (!isPathWithin(realFilePath, assetsDir)) {
    throw new Error("Local asset path must stay under the project assets directory.");
  }

  return realFilePath;
}

function validateProjectId(projectId: string): void {
  if (!projectId || projectId.includes("/") || projectId.includes("\\") || projectId.includes("..")) {
    throw new Error("Invalid local project id.");
  }
}

function validateAssetPath(assetPath: string): void {
  if (!assetPath.startsWith("assets/") || path.isAbsolute(assetPath) || assetPath.includes("..")) {
    throw new Error("Local asset path must be under assets/.");
  }
}

function isPathWithin(candidate: string, parent: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function formatProjectName(projectId: string): string {
  const userProgrammingPrefix = /^Users-[^-]+-Programming-/;
  return projectId.replace(userProgrammingPrefix, "").replaceAll("-", " / ");
}

function isFileNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
