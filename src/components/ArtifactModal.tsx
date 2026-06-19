import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import cursorCube from "../assets/cursor-cube.png";
import type { GalleryArtifact } from "../types/artifacts";
import { getDownloadUrl, getFilename } from "../utils/artifacts";

interface ArtifactModalProps {
  artifact: GalleryArtifact;
  open: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function ArtifactModal({ artifact, open, onClose, onPrevious, onNext }: ArtifactModalProps) {
  const downloadUrl = getDownloadUrl(artifact);
  const filename = getFilename(artifact.path);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [artifact.agentId, artifact.path, downloadUrl]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowLeft" && onPrevious) {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (event.key === "ArrowRight" && onNext) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, onClose, onPrevious, onNext]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={filename}
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 animate-modal-backdrop-in bg-black/60"
        onClick={onClose}
      />

      <div
        className="animate-modal-panel-in relative flex w-full max-w-4xl max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[#ececec] px-4 py-2.5">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#1e1e1e]" title={filename}>
            {filename}
          </p>

          <div className="flex shrink-0 items-center gap-1">
            <a
              href={downloadUrl}
              download={filename}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6f6f6f] transition hover:bg-[#f3f3f3] hover:text-[#1e1e1e]"
              aria-label={`Download ${filename}`}
            >
              <DownloadIcon />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6f6f6f] transition hover:bg-[#f3f3f3] hover:text-[#1e1e1e]"
              aria-label="Close preview"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="relative h-[min(55vh,480px)] min-h-[200px] shrink-0 bg-[#111]">
          {!loaded ? <ModalMediaSkeleton /> : null}

          <div
            className={`absolute inset-0 transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          >
            {artifact.kind === "image" ? (
              <img
                key={artifact.path}
                src={downloadUrl}
                alt={filename}
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                ref={node => {
                  if (node?.complete) {
                    setLoaded(true);
                  }
                }}
                className="h-full w-full object-contain"
              />
            ) : (
              <video
                key={artifact.path}
                src={downloadUrl}
                controls
                autoPlay
                playsInline
                onLoadedData={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ModalMediaSkeleton() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#1a1a1a]"
      aria-hidden="true"
    >
      <div className="animate-modal-skeleton-shimmer absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] bg-[length:200%_100%]" />
      <img src={cursorCube} alt="" className="relative h-20 w-20 opacity-30" />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5v7M5.5 7 8 9.5 10.5 7M3.5 12.5h9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
