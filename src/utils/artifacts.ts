import type { GalleryArtifact } from "../types/artifacts";

export function getArtifactKey(artifact: GalleryArtifact): string {
  return `${getArtifactSource(artifact)}:${artifact.agentId}:${artifact.path}`;
}

export function getRepositoryKey(artifact: GalleryArtifact): string {
  return `${getArtifactSource(artifact)}:${artifact.repositoryName ?? artifact.agentId}`;
}

export function getRepositoryName(artifact: GalleryArtifact): string {
  return artifact.repositoryName ?? artifact.agentName;
}

export function getFilename(path: string): string {
  return path.split("/").at(-1) || path;
}

export function getDownloadUrl(artifact: GalleryArtifact): string {
  if (getArtifactSource(artifact) === "local") {
    const params = new URLSearchParams({
      project: artifact.agentId,
      path: artifact.path,
    });

    return `/api/local-assets/download?${params.toString()}`;
  }

  const params = new URLSearchParams({
    agentId: artifact.agentId,
    path: artifact.path,
  });

  return `/api/artifacts/download?${params.toString()}`;
}

export function getArtifactSource(artifact: GalleryArtifact): NonNullable<GalleryArtifact["source"]> {
  return artifact.source ?? "cloud";
}

export function matchesArtifactQuery(artifact: GalleryArtifact, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const filename = getFilename(artifact.path).toLowerCase();
  const agentName = artifact.agentName.toLowerCase();
  const repositoryName = artifact.repositoryName?.toLowerCase() ?? "";

  return (
    filename.includes(normalized) ||
    agentName.includes(normalized) ||
    repositoryName.includes(normalized)
  );
}

export function filterArtifactsByQuery(
  artifacts: GalleryArtifact[],
  query: string,
): GalleryArtifact[] {
  return artifacts.filter(artifact => matchesArtifactQuery(artifact, query));
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo`;
  }

  const years = Math.floor(months / 12);
  return `${years}y`;
}

export function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
