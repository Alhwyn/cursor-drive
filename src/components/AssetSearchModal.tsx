import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { GalleryArtifact } from "../types/artifacts";
import {
  filterArtifactsByQuery,
  formatRelativeTime,
  getArtifactKey,
  getDownloadUrl,
  getFilename,
  getRepositoryName,
} from "../utils/artifacts";

interface AssetSearchModalProps {
  open: boolean;
  artifacts: GalleryArtifact[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (artifact: GalleryArtifact) => void;
  onClose: () => void;
}

export function AssetSearchModal({
  open,
  artifacts,
  query,
  onQueryChange,
  onSelect,
  onClose,
}: AssetSearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim();
  const results = useMemo(
    () => (normalizedQuery ? filterArtifactsByQuery(artifacts, query) : []),
    [artifacts, normalizedQuery, query],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, artifacts]);

  if (!open) {
    return null;
  }

  const selectArtifact = (artifact: GalleryArtifact) => {
    onSelect(artifact);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(current => Math.min(current + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(current => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const selected = results[activeIndex];
      if (selected) {
        event.preventDefault();
        selectArtifact(selected);
      }
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event);
    }
  };

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const focusableElements = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

    const first = focusableElements[0];
    const last = focusableElements.at(-1);

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:p-6 sm:pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search assets"
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 animate-modal-backdrop-in bg-black/60"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="animate-modal-panel-in relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="border-b border-[#ececec] p-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Search assets..."
            className="w-full rounded-lg border border-[#dcdcdc] bg-white px-3 py-2 text-[15px] text-[#1e1e1e] outline-none placeholder:text-[#8a8a8a] focus:border-[#b8b8b8]"
          />
        </div>

        <div className="sidebar-scroll max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {!normalizedQuery ? (
            <SearchEmptyState message="Type to search assets..." />
          ) : results.length === 0 ? (
            <SearchEmptyState message="No assets found" />
          ) : (
            <div className="space-y-1">
              {results.map((artifact, index) => (
                <SearchResultRow
                  key={getArtifactKey(artifact)}
                  artifact={artifact}
                  active={index === activeIndex}
                  onSelect={() => selectArtifact(artifact)}
                  onHover={() => setActiveIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SearchResultRow({
  artifact,
  active,
  onSelect,
  onHover,
}: {
  artifact: GalleryArtifact;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const downloadUrl = getDownloadUrl(artifact);
  const filename = getFilename(artifact.path);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition ${
        active ? "bg-[#f0f0f0]" : "hover:bg-[#f7f7f7]"
      }`}
    >
      <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-[#eeeeee]">
        {artifact.kind === "image" ? (
          <img
            src={downloadUrl}
            alt=""
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
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#1e1e1e]" title={filename}>
          {filename}
        </span>
        <span className="block truncate text-xs text-[#6f6f6f]" title={artifact.agentName}>
          {getRepositoryName(artifact)} · {artifact.agentName}
        </span>
      </span>
      <span className="shrink-0 text-xs text-[#a3a3a3]">
        {formatRelativeTime(artifact.updatedAt)}
      </span>
    </button>
  );
}

function SearchEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-36 items-center justify-center px-4 py-8 text-center text-sm text-[#8a8a8a]">
      {message}
    </div>
  );
}
