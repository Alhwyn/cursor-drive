import type { GalleryArtifact } from "../types/artifacts";
import { getDownloadUrl, getFilename } from "../utils/artifacts";

interface ArtifactCardProps {
  artifact: GalleryArtifact;
  selected?: boolean;
  onOpen?: () => void;
}

export function ArtifactCard({ artifact, selected = false, onOpen }: ArtifactCardProps) {
  const downloadUrl = getDownloadUrl(artifact);
  const filename = getFilename(artifact.path);

  return (
    <article
      id={`artifact-${artifact.agentId}-${encodeURIComponent(artifact.path)}`}
      className={`overflow-hidden rounded-xl border bg-[#f9f9f9] transition hover:border-[#d4d4d4] ${
        selected ? "border-[#a3a3a3] ring-2 ring-[#a3a3a3]/15" : "border-[#e5e5e5]"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen?.()}
        className="relative block aspect-video w-full cursor-pointer overflow-hidden bg-[#f0f0f0] transition hover:opacity-95"
        aria-label={`Open ${filename}`}
      >
        {artifact.kind === "image" ? (
          <img
            src={downloadUrl}
            alt={filename}
            loading="lazy"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <video
            src={downloadUrl}
            preload="metadata"
            muted
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}
      </button>

      <div className="border-t border-[#ececec] px-2.5 py-1.5 text-left">
        <p className="min-w-0 truncate text-xs font-medium text-[#1e1e1e]" title={filename}>
          {filename}
        </p>
        <p className="truncate text-[11px] leading-tight text-[#8a8a8a]" title={artifact.agentName}>
          {artifact.agentName}
        </p>
      </div>
    </article>
  );
}
