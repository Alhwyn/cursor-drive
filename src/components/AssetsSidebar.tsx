import { useMemo, useState, type ReactNode } from "react";
import type { GalleryArtifact, MediaKind } from "../types/artifacts";
import { formatRelativeTime, getArtifactKey, getFilename } from "../utils/artifacts";

type Filter = "all" | MediaKind;

interface AssetsSidebarProps {
  artifacts: GalleryArtifact[];
  filter: Filter;
  loading?: boolean;
  query: string;
  selectedId: string | null;
  onFilterChange: (filter: Filter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (artifact: GalleryArtifact) => void;
  onRefresh?: () => void;
  onToggleSidebar?: () => void;
}

const FOLDER_PREVIEW_LIMIT = 12;

export function AssetsSidebar({
  artifacts,
  filter,
  loading,
  query,
  selectedId,
  onFilterChange,
  onQueryChange,
  onSelect,
  onRefresh,
  onToggleSidebar,
}: AssetsSidebarProps) {
  const [expanded, setExpanded] = useState({ media: true, videos: true });
  const [showAll, setShowAll] = useState({ media: false, videos: false });

  const mediaItems = useMemo(
    () => artifacts.filter(artifact => artifact.kind === "image"),
    [artifacts],
  );
  const videoItems = useMemo(
    () => artifacts.filter(artifact => artifact.kind === "video"),
    [artifacts],
  );

  const filteredMedia = useMemo(
    () => filterItems(mediaItems, query),
    [mediaItems, query],
  );
  const filteredVideos = useMemo(
    () => filterItems(videoItems, query),
    [videoItems, query],
  );

  return (
    <div className="flex h-full flex-col bg-[#f3f3f3] text-[13px] text-[#1e1e1e]">
      <div className="flex shrink-0 items-center px-2.5 py-2">
        <div className="flex items-center gap-0.5">
          <ToolbarButton label="Toggle sidebar" onClick={onToggleSidebar}>
            <SidebarIcon />
          </ToolbarButton>
          <ToolbarButton label="Search assets">
            <SearchIcon />
          </ToolbarButton>
        </div>
      </div>

      <div className="px-2 pb-1">
        <input
          type="search"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Search assets..."
          className="w-full rounded-md border border-[#dcdcdc] bg-white px-2.5 py-1.5 text-[13px] text-[#1e1e1e] placeholder:text-[#8a8a8a] outline-none focus:border-[#b8b8b8]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[11px] font-medium tracking-wide text-[#8a8a8a]">Assets</span>
          <div className="flex items-center gap-0.5">
            <ToolbarButton label="Show all" onClick={() => onFilterChange("all")}>
              <FilterIcon active={filter === "all"} />
            </ToolbarButton>
            <ToolbarButton label="Refresh" onClick={onRefresh} disabled={loading}>
              <RefreshIcon spinning={loading} />
            </ToolbarButton>
          </div>
        </div>

        <FolderSection
          title="Media"
          count={filteredMedia.length}
          expanded={expanded.media}
          active={filter === "image"}
          onToggle={() => setExpanded(current => ({ ...current, media: !current.media }))}
          onHeaderClick={() => onFilterChange("image")}
        >
          {filteredMedia.length === 0 ? (
            <EmptyRow label={loading ? "Scanning..." : "No images yet"} />
          ) : (
            <>
              {visibleItems(filteredMedia, showAll.media).map(artifact => (
                <AssetRow
                  key={getArtifactKey(artifact)}
                  artifact={artifact}
                  selected={selectedId === getArtifactKey(artifact)}
                  onSelect={() => onSelect(artifact)}
                />
              ))}
              {filteredMedia.length > FOLDER_PREVIEW_LIMIT ? (
                <MoreRow
                  expanded={showAll.media}
                  remaining={filteredMedia.length - FOLDER_PREVIEW_LIMIT}
                  onClick={() => setShowAll(current => ({ ...current, media: !current.media }))}
                />
              ) : null}
            </>
          )}
        </FolderSection>

        <FolderSection
          title="Videos"
          count={filteredVideos.length}
          expanded={expanded.videos}
          active={filter === "video"}
          onToggle={() => setExpanded(current => ({ ...current, videos: !current.videos }))}
          onHeaderClick={() => onFilterChange("video")}
        >
          {filteredVideos.length === 0 ? (
            <EmptyRow label={loading ? "Scanning..." : "No videos yet"} />
          ) : (
            <>
              {visibleItems(filteredVideos, showAll.videos).map(artifact => (
                <AssetRow
                  key={getArtifactKey(artifact)}
                  artifact={artifact}
                  selected={selectedId === getArtifactKey(artifact)}
                  onSelect={() => onSelect(artifact)}
                />
              ))}
              {filteredVideos.length > FOLDER_PREVIEW_LIMIT ? (
                <MoreRow
                  expanded={showAll.videos}
                  remaining={filteredVideos.length - FOLDER_PREVIEW_LIMIT}
                  onClick={() => setShowAll(current => ({ ...current, videos: !current.videos }))}
                />
              ) : null}
            </>
          )}
        </FolderSection>
      </div>
    </div>
  );
}

function FolderSection({
  title,
  count,
  expanded,
  active,
  children,
  onToggle,
  onHeaderClick,
}: {
  title: string;
  count: number;
  expanded: boolean;
  active: boolean;
  children: ReactNode;
  onToggle: () => void;
  onHeaderClick: () => void;
}) {
  return (
    <section className="mb-1">
      <div
        className={`group flex w-full items-center gap-1 rounded-md px-1.5 py-1 ${
          active ? "bg-[#e8e8e8]" : "hover:bg-[#ebebeb]"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="grid size-5 shrink-0 place-items-center rounded text-[#6f6f6f] hover:bg-[#dedede]"
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
        >
          <ChevronDownIcon className={expanded ? "" : "-rotate-90"} />
        </button>
        <button
          type="button"
          onClick={onHeaderClick}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <FolderIcon />
          <span className="truncate font-normal text-[#1e1e1e]">{title}</span>
          <span className="ml-auto shrink-0 text-[11px] text-[#8a8a8a]">{count}</span>
        </button>
      </div>

      {expanded ? <div className="mt-0.5 space-y-px pl-3">{children}</div> : null}
    </section>
  );
}

function AssetRow({
  artifact,
  selected,
  onSelect,
}: {
  artifact: GalleryArtifact;
  selected: boolean;
  onSelect: () => void;
}) {
  const filename = getFilename(artifact.path);

  return (
    <button
      type="button"
      onClick={onSelect}
      title={filename}
      className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition ${
        selected ? "bg-[#e4e4e4]" : "hover:bg-[#ebebeb]"
      }`}
    >
      <span className="shrink-0 text-[#6f6f6f]">
        {artifact.kind === "video" ? <VideoIcon /> : <ImageIcon />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[#1e1e1e]">{filename}</span>
      <span className="shrink-0 text-[11px] text-[#8a8a8a]">
        {formatRelativeTime(artifact.updatedAt)}
      </span>
    </button>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="px-2 py-1 text-[12px] text-[#8a8a8a]">{label}</p>;
}

function MoreRow({
  expanded,
  remaining,
  onClick,
}: {
  expanded: boolean;
  remaining: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 text-left text-[12px] text-[#6f6f6f] hover:text-[#1e1e1e]"
    >
      {expanded ? "Show less" : `More (${remaining})`}
    </button>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-md text-[#6f6f6f] transition hover:bg-[#e8e8e8] hover:text-[#1e1e1e] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function visibleItems(items: GalleryArtifact[], showAll: boolean): GalleryArtifact[] {
  if (showAll) {
    return items;
  }

  return items.slice(0, FOLDER_PREVIEW_LIMIT);
}

function filterItems(items: GalleryArtifact[], query: string): GalleryArtifact[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter(artifact => {
    const filename = getFilename(artifact.path).toLowerCase();
    const agentName = artifact.agentName.toLowerCase();
    return filename.includes(normalized) || agentName.includes(normalized);
  });
}

export function SidebarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6.5" y="3" width="7.5" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 4h11M4.5 8h7M6.5 12h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={active ? 1 : 0.75}
      />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={spinning ? "animate-spin" : undefined}
    >
      <path
        d="M12.5 8a4.5 4.5 0 1 1-1.3-3.2M12.5 3.5V7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`transition-transform ${className}`}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 5.5A1 1 0 0 1 3.5 4.5H6l1 1.5h5.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="6" cy="7" r="1" fill="currentColor" />
      <path d="M3.5 11l3-2.5 2 1.5 2.5-2 2 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <path d="M10.5 6.5l3-1.5v5.5l-3-1.5V6.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
