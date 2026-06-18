import type { GalleryArtifact } from "../types/artifacts";

interface ArtifactCardProps {
  artifact: GalleryArtifact;
}

export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const downloadUrl = getDownloadUrl(artifact);
  const filename = getFilename(artifact.path);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/20">
      <div className="flex aspect-square items-center justify-center bg-black/30">
        {artifact.kind === "image" ? (
          <img
            src={downloadUrl}
            alt={filename}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <video
            src={downloadUrl}
            controls
            preload="metadata"
            className="h-full w-full object-contain"
          />
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 text-left">
        <div>
          <h2 className="truncate text-sm font-semibold text-white" title={filename}>
            {filename}
          </h2>
          <p className="mt-1 truncate text-xs text-white/55" title={artifact.agentName}>
            {artifact.agentName}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs text-white/60">
          <div>
            <dt className="text-white/35">Size</dt>
            <dd>{formatBytes(artifact.sizeBytes)}</dd>
          </div>
          <div>
            <dt className="text-white/35">Updated</dt>
            <dd>{formatDate(artifact.updatedAt)}</dd>
          </div>
        </dl>

        <div className="flex gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-medium text-white/80 transition hover:border-white/25 hover:bg-white/10"
          >
            Open
          </a>
          <a
            href={downloadUrl}
            download={filename}
            className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-950 transition hover:bg-white/85"
          >
            Download
          </a>
        </div>
      </div>
    </article>
  );
}

function getDownloadUrl(artifact: GalleryArtifact): string {
  const params = new URLSearchParams({
    agentId: artifact.agentId,
    path: artifact.path,
  });

  return `/api/artifacts/download?${params.toString()}`;
}

function getFilename(path: string): string {
  return path.split("/").at(-1) || path;
}

function formatBytes(sizeBytes: number): string {
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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
