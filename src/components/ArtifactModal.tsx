import { useEffect } from "react";
import { createPortal } from "react-dom";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={filename}
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[#ececec] px-4 py-3">
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

        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f7f7f7] p-4">
          {artifact.kind === "image" ? (
            <img
              key={artifact.path}
              src={downloadUrl}
              alt={filename}
              className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
            />
          ) : (
            <video
              key={artifact.path}
              src={downloadUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
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
