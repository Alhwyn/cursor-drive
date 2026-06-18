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
        className={`overflow-hidden rounded-md border bg-white shadow-sm transition hover:border-[#c8c8c8] ${
          selected ? "border-[#888] ring-2 ring-[#888]/20" : "border-[#e0e0e0]"
        }`}
      >
        <button
          type="button"
          onClick={() => onOpen?.()}
          className="flex aspect-[4/3] w-full cursor-pointer items-center justify-center border-b border-[#ececec] bg-[#f7f7f7] transition hover:bg-[#f0f0f0]"
          aria-label={`Open ${filename}`}
        >
          {artifact.kind === "image" ? (
            <img
              src={downloadUrl}
              alt={filename}
              loading="lazy"
              className="pointer-events-none h-full w-full object-contain"
            />
          ) : (
            <video
              src={downloadUrl}
              preload="metadata"
              muted
              playsInline
              className="pointer-events-none h-full w-full object-contain"
            />
          )}
        </button>

        <div className="p-3 text-left">
          <p className="min-w-0 truncate text-xs text-[#1e1e1e]" title={filename}>
            {filename}
          </p>
        </div>
    </article>
  );
}
