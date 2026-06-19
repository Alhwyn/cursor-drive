import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import type { ArtifactSource, GalleryArtifact, MediaKind } from "../types/artifacts";
import {
  formatRelativeTime,
  getArtifactKey,
  getDownloadUrl,
  getFilename,
  getRepositoryKey,
} from "../utils/artifacts";

type Filter = "all" | MediaKind;
type SourceFilter = "all" | ArtifactSource;

interface ContextGroup {
  contextKey: string;
  contextName: string;
  items: GalleryArtifact[];
}

interface RepositoryGroup {
  groupKey: string;
  repositoryName: string;
  contexts: ContextGroup[];
  itemCount: number;
}

interface AssetsSidebarProps {
  artifacts: GalleryArtifact[];
  filter: Filter;
  loading?: boolean;
  query: string;
  selectedRepositoryKey: string | null;
  sourceFilter: SourceFilter;
  onQueryChange: (query: string) => void;
  onSelect: (artifact: GalleryArtifact) => void;
  onRepositorySelect: (repositoryKey: string | null) => void;
  onSourceFilterChange: (source: SourceFilter) => void;
  onToggleSidebar?: () => void;
  collapsed?: boolean;
}

const FOLDER_PREVIEW_LIMIT = 12;
const PREVIEW_WIDTH = 220;
const PREVIEW_PADDING = 16;
const PREVIEW_MEDIA_WIDTH = PREVIEW_WIDTH - PREVIEW_PADDING;
const PREVIEW_MEDIA_MIN_HEIGHT = 72;
const PREVIEW_MEDIA_MAX_HEIGHT = 160;
const PREVIEW_MEDIA_DEFAULT_HEIGHT = Math.round((PREVIEW_MEDIA_WIDTH * 9) / 16);
const PREVIEW_OFFSET = 12;
const PREVIEW_VIEWPORT_PADDING = 8;

export function AssetsSidebar({
  artifacts,
  filter,
  loading,
  query,
  selectedRepositoryKey,
  sourceFilter,
  onQueryChange,
  onSelect,
  onRepositorySelect,
  onSourceFilterChange,
  onToggleSidebar,
  collapsed = false,
}: AssetsSidebarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});
  const [showAllContexts, setShowAllContexts] = useState<Record<string, boolean>>({});
  const [hoveredArtifact, setHoveredArtifact] = useState<GalleryArtifact | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const hoverClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPreview = (artifact: GalleryArtifact, position?: { x: number; y: number }) => {
    if (hoverClearTimeoutRef.current) {
      clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = null;
    }

    setHoveredArtifact(artifact);
    if (position) {
      setPreviewPosition(position);
    }
  };

  const scheduleHidePreview = () => {
    if (hoverClearTimeoutRef.current) {
      clearTimeout(hoverClearTimeoutRef.current);
    }

    hoverClearTimeoutRef.current = setTimeout(() => {
      setHoveredArtifact(null);
      setPreviewPosition(null);
      hoverClearTimeoutRef.current = null;
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (hoverClearTimeoutRef.current) {
        clearTimeout(hoverClearTimeoutRef.current);
      }
    };
  }, []);

  const filteredArtifacts = useMemo(() => {
    let items = sourceFilter === "all"
      ? artifacts
      : artifacts.filter(artifact => (artifact.source ?? "cloud") === sourceFilter);
    items =
      filter === "all" ? items : items.filter(artifact => artifact.kind === filter);

    return filterItems(items, query);
  }, [artifacts, filter, query, sourceFilter]);

  const repositoryGroups = useMemo(() => groupByRepository(filteredArtifacts), [filteredArtifacts]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(current => ({
      ...current,
      [groupKey]: !(current[groupKey] ?? true),
    }));
  };

  const toggleContext = (contextKey: string) => {
    setExpandedContexts(current => ({
      ...current,
      [contextKey]: !(current[contextKey] ?? true),
    }));
  };

  const isExpanded = (groupKey: string) => expandedGroups[groupKey] ?? true;
  const isContextExpanded = (contextKey: string) => expandedContexts[contextKey] ?? true;

  const openSearch = () => {
    setSearchOpen(true);
  };

  useEffect(() => {
    if (searchOpen && !collapsed) {
      searchRef.current?.focus();
    }
  }, [searchOpen, collapsed]);

  return (
    <div className="flex h-full flex-col bg-[#f3f3f3] text-[13px] font-normal text-[#1e1e1e]">
      <div
        className={`flex w-full shrink-0 ${
          collapsed ? "flex-col items-center px-1 py-2" : "items-center px-2.5 py-2"
        }`}
      >
        <div
          className={`flex w-full ${
            collapsed ? "flex-col items-center gap-0.5" : "flex-row items-center gap-0.5"
          }`}
        >
          <ToolbarButton label="Toggle sidebar" onClick={onToggleSidebar}>
            <SidebarIcon />
          </ToolbarButton>
          <ToolbarButton
            label="Search assets"
            active={searchOpen}
            onClick={() => {
              if (collapsed) {
                onToggleSidebar?.();
              }
              openSearch();
            }}
          >
            <SearchIcon />
          </ToolbarButton>
        </div>
      </div>

      {collapsed ? null : (
        <>
      {searchOpen ? (
        <div className="px-2 pb-1">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") {
                event.preventDefault();
                setSearchOpen(false);
                searchRef.current?.blur();
              }
            }}
            placeholder="Search assets..."
            className="w-full rounded-md border border-[#dcdcdc] bg-white px-2.5 py-1.5 text-[13px] text-[#1e1e1e] placeholder:text-[#8a8a8a] outline-none focus:border-[#b8b8b8]"
          />
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <div className="sidebar-scroll h-full min-h-0 overflow-y-auto px-1.5 pb-3">
        <div className="px-1.5 py-1">
          <span className="text-[13px] font-medium text-[#1e1e1e]">Workspaces</span>
        </div>

        <div className="mb-1 flex gap-0.5 px-1">
          {(
            [
              { id: "all", label: "All" },
              { id: "cloud", label: "Cloud" },
              { id: "local", label: "Local" },
            ] as const
          ).map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSourceFilterChange(option.id)}
              className={`rounded px-1.5 py-0.5 text-[11px] transition ${
                sourceFilter === option.id
                  ? "bg-[#e0e0e0] text-[#1e1e1e]"
                  : "text-[#8a8a8a] hover:text-[#1e1e1e]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {repositoryGroups.length === 0 ? (
          <EmptyRow label={loading ? "Scanning..." : "No assets yet"} />
        ) : (
          <div className="space-y-0.5">
            {repositoryGroups.map(group => (
              <WorkspaceRepository
                key={group.groupKey}
                name={group.repositoryName}
                expanded={isExpanded(group.groupKey)}
                active={selectedRepositoryKey === group.groupKey}
                onToggle={() => toggleGroup(group.groupKey)}
                onSelect={() =>
                  onRepositorySelect(
                    selectedRepositoryKey === group.groupKey ? null : group.groupKey,
                  )
                }
              >
                {group.contexts.map(context => {
                  const contextKey = `${group.groupKey}:${context.contextKey}`;

                  return (
                    <WorkspaceContext
                      key={contextKey}
                      name={context.contextName}
                      count={context.items.length}
                      expanded={isContextExpanded(contextKey)}
                      onToggle={() => toggleContext(contextKey)}
                    >
                      {visibleItems(context.items, showAllContexts[contextKey] ?? false).map(
                        artifact => (
                          <WorkspaceFileRow
                            key={getArtifactKey(artifact)}
                            artifact={artifact}
                            onSelect={() => onSelect(artifact)}
                            onHover={position => showPreview(artifact, position)}
                            onHoverEnd={scheduleHidePreview}
                          />
                        ),
                      )}
                      {context.items.length > FOLDER_PREVIEW_LIMIT ? (
                        <MoreRow
                          expanded={showAllContexts[contextKey] ?? false}
                          remaining={context.items.length - FOLDER_PREVIEW_LIMIT}
                          onClick={() =>
                            setShowAllContexts(current => ({
                              ...current,
                              [contextKey]: !current[contextKey],
                            }))
                          }
                        />
                      ) : null}
                    </WorkspaceContext>
                  );
                })}
              </WorkspaceRepository>
            ))}
          </div>
        )}
        </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#f3f3f3] via-[#f3f3f3]/80 to-transparent"
            aria-hidden="true"
          />
        </div>

      </div>

      {hoveredArtifact && previewPosition
        ? createPortal(
            <SidebarMediaPreview
              artifact={hoveredArtifact}
              cursorX={previewPosition.x}
              cursorY={previewPosition.y}
              onHover={() => showPreview(hoveredArtifact)}
              onHoverEnd={scheduleHidePreview}
            />,
            document.body,
          )
        : null}
        </>
      )}
    </div>
  );
}

function WorkspaceRepository({
  name,
  expanded,
  active,
  children,
  onToggle,
  onSelect,
}: {
  name: string;
  expanded: boolean;
  active: boolean;
  children: ReactNode;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <section>
      <div
        className={`flex items-center gap-0.5 rounded-md pr-1 ${
          active ? "bg-[#e4e4e4]" : "hover:bg-[#ebebeb]"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="grid size-6 shrink-0 place-items-center text-[#8a8a8a]"
          aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
        >
          <ChevronDownIcon className={expanded ? "" : "-rotate-90"} />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
        >
          <FolderIcon />
          <span className="truncate text-[13px] text-[#1e1e1e]">{name}</span>
        </button>
      </div>

      {expanded ? <div className="pb-0.5">{children}</div> : null}
    </section>
  );
}

function WorkspaceContext({
  name,
  count,
  expanded,
  children,
  onToggle,
}: {
  name: string;
  count: number;
  expanded: boolean;
  children: ReactNode;
  onToggle: () => void;
}) {
  return (
    <section className="pl-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1 rounded-md py-0.5 pr-2 pl-1 text-left hover:bg-[#ebebeb]"
      >
        <span className="grid size-6 shrink-0 place-items-center text-[#8a8a8a]">
          <ChevronDownIcon className={expanded ? "" : "-rotate-90"} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#6f6f6f]">{name}</span>
        <span className="shrink-0 text-[11px] text-[#a3a3a3]">{count}</span>
      </button>

      {expanded ? <div className="pl-4">{children}</div> : null}
    </section>
  );
}

function WorkspaceFileRow({
  artifact,
  onSelect,
  onHover,
  onHoverEnd,
}: {
  artifact: GalleryArtifact;
  onSelect: () => void;
  onHover?: (position: { x: number; y: number }) => void;
  onHoverEnd?: () => void;
}) {
  const filename = getFilename(artifact.path);

  const reportHoverPosition = (event: MouseEvent<HTMLButtonElement>) => {
    onHover?.({ x: event.clientX, y: event.clientY });
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={reportHoverPosition}
      onMouseMove={reportHoverPosition}
      onMouseLeave={onHoverEnd}
      onFocus={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        onHover?.({ x: rect.right, y: rect.top + rect.height / 2 });
      }}
      onBlur={onHoverEnd}
      title={filename}
      className="flex w-full items-center gap-2 rounded-md py-0.5 pr-2 pl-1 text-left font-normal transition hover:bg-[#ebebeb]"
    >
      <span className="min-w-0 flex-1 truncate text-[12px] font-normal text-[#6f6f6f]">{filename}</span>
      <span className="shrink-0 text-[11px] text-[#a3a3a3]">
        {formatRelativeTime(artifact.updatedAt)}
      </span>
    </button>
  );
}

function getMediaAspectRatio(target: HTMLImageElement | HTMLVideoElement): number | null {
  const width = target instanceof HTMLVideoElement ? target.videoWidth : target.naturalWidth;
  const height = target instanceof HTMLVideoElement ? target.videoHeight : target.naturalHeight;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return width / height;
}

function getPreviewMediaHeight(aspectRatio: number | null): number {
  if (!aspectRatio) {
    return PREVIEW_MEDIA_DEFAULT_HEIGHT;
  }

  return Math.round(
    Math.min(
      PREVIEW_MEDIA_MAX_HEIGHT,
      Math.max(PREVIEW_MEDIA_MIN_HEIGHT, PREVIEW_MEDIA_WIDTH / aspectRatio),
    ),
  );
}

function SidebarMediaPreview({
  artifact,
  cursorX,
  cursorY,
  onHover,
  onHoverEnd,
}: {
  artifact: GalleryArtifact;
  cursorX: number;
  cursorY: number;
  onHover: () => void;
  onHoverEnd: () => void;
}) {
  const previewRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const downloadUrl = getDownloadUrl(artifact);
  const filename = getFilename(artifact.path);
  const mediaHeight = getPreviewMediaHeight(mediaAspectRatio);

  useEffect(() => {
    setMediaAspectRatio(null);
  }, [artifact.agentId, artifact.path, artifact.source]);

  const handleMediaLoad = (event: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
    const aspectRatio = getMediaAspectRatio(event.currentTarget);
    if (aspectRatio) {
      setMediaAspectRatio(aspectRatio);
    }
  };

  useLayoutEffect(() => {
    const preview = previewRef.current;
    if (!preview) {
      return;
    }

    const rect = preview.getBoundingClientRect();
    let left = cursorX + PREVIEW_OFFSET;
    let top = cursorY + PREVIEW_OFFSET;

    if (left + rect.width + PREVIEW_VIEWPORT_PADDING > window.innerWidth) {
      left = cursorX - rect.width - PREVIEW_OFFSET;
    }

    if (top + rect.height + PREVIEW_VIEWPORT_PADDING > window.innerHeight) {
      top = cursorY - rect.height - PREVIEW_OFFSET;
    }

    left = Math.max(
      PREVIEW_VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - rect.width - PREVIEW_VIEWPORT_PADDING),
    );
    top = Math.max(
      PREVIEW_VIEWPORT_PADDING,
      Math.min(top, window.innerHeight - rect.height - PREVIEW_VIEWPORT_PADDING),
    );

    setPosition({ left, top });
  }, [cursorX, cursorY, artifact.agentId, artifact.path, artifact.source, mediaHeight]);

  return (
    <section
      ref={previewRef}
      className="pointer-events-auto fixed z-50 w-[220px] rounded-md border border-[#e0e0e0] bg-[#f3f3f3] p-2 shadow-lg"
      style={{ left: position.left, top: position.top, width: PREVIEW_WIDTH }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      <div
        className="relative w-full overflow-hidden rounded-md border border-[#e0e0e0]"
        style={{ height: mediaHeight }}
      >
        {artifact.kind === "image" ? (
          <img
            src={downloadUrl}
            alt={filename}
            onLoad={handleMediaLoad}
            className="size-full object-cover object-center"
          />
        ) : (
          <video
            src={downloadUrl}
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={handleMediaLoad}
            className="size-full object-cover object-center"
          />
        )}
      </div>
      <p className="mt-1.5 truncate px-0.5 text-[11px] text-[#6f6f6f]" title={filename}>
        {filename}
      </p>
    </section>
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
      className="py-0.5 pl-1 text-left text-[11px] text-[#a3a3a3] hover:text-[#6f6f6f]"
    >
      {expanded ? "Show less" : "More"}
    </button>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
  disabled,
  active,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-7 place-items-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "bg-[#e4e4e4] text-[#1e1e1e]"
          : "text-[#6f6f6f] hover:bg-[#e8e8e8] hover:text-[#1e1e1e]"
      }`}
    >
      {children}
    </button>
  );
}

function groupByRepository(artifacts: GalleryArtifact[]): RepositoryGroup[] {
  const groups = new Map<string, RepositoryGroup>();

  for (const artifact of artifacts) {
    const groupKey = getRepositoryKey(artifact);
    const repositoryName = artifact.repositoryName ?? artifact.agentName;

    let repository = groups.get(groupKey);
    if (!repository) {
      repository = {
        groupKey,
        repositoryName,
        contexts: [],
        itemCount: 0,
      };
      groups.set(groupKey, repository);
    }

    repository.itemCount += 1;

    let context = repository.contexts.find(entry => entry.contextKey === artifact.agentId);
    if (!context) {
      context = {
        contextKey: artifact.agentId,
        contextName: artifact.agentName,
        items: [],
      };
      repository.contexts.push(context);
    }

    context.items.push(artifact);
  }

  for (const repository of groups.values()) {
    repository.contexts.sort((left, right) =>
      left.contextName.localeCompare(right.contextName),
    );
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.repositoryName.localeCompare(right.repositoryName),
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
    const repositoryName = artifact.repositoryName?.toLowerCase() ?? "";
    return (
      filename.includes(normalized) ||
      agentName.includes(normalized) ||
      repositoryName.includes(normalized)
    );
  });
}

export function SidebarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="2.25"
        y="3.25"
        width="11.5"
        height="9.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M5.75 3.25v9.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
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
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[#8a8a8a]">
      <path
        d="M2.5 5.5A1 1 0 0 1 3.5 4.5H6l1 1.5h5.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
