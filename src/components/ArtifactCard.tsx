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
        className="group relative block aspect-video w-full cursor-pointer overflow-hidden bg-[#f0f0f0]"
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2.5 pb-2 pt-10 text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="min-w-0 truncate text-xs font-medium text-white" title={filename}>
            {filename}
          </p>
          <p
            className="truncate text-[11px] leading-tight text-white/80"
            title={artifact.agentName}
          >
            {artifact.agentName}
          </p>
        </div>
      </button>
    </article>
  );
}
