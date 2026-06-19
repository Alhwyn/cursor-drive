import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApiErrorResponse,
  ArtifactListResponse,
  ArtifactSource,
  GalleryArtifact,
  MediaKind,
} from "../types/artifacts";
import {
  filterArtifactsByQuery,
  formatDate,
  getArtifactKey,
  getArtifactSource,
  getRepositoryKey,
  getRepositoryName,
} from "../utils/artifacts";
import { ArtifactCard } from "./ArtifactCard";
import { ArtifactModal } from "./ArtifactModal";
import { AssetSearchModal } from "./AssetSearchModal";
import { AssetsSidebar } from "./AssetsSidebar";
import { EmptyAssetsState } from "./EmptyAssetsState";
import { PageTitle } from "./PageTitle";

type Filter = "all" | MediaKind;
type SourceFilter = "all" | ArtifactSource;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "image", label: "Media" },
  { id: "video", label: "Videos" },
];

const SOURCE_FILTERS: Array<{ id: SourceFilter; label: string }> = [
  { id: "all", label: "All sources" },
  { id: "cloud", label: "Cloud" },
  { id: "local", label: "Local" },
];

export function ArtifactGallery() {
  const [artifacts, setArtifacts] = useState<GalleryArtifact[]>([]);
  const [cachedAt, setCachedAt] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [modalArtifact, setModalArtifact] = useState<GalleryArtifact | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRepositoryKey, setSelectedRepositoryKey] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const loadArtifacts = useCallback(async (refresh = false) => {
    setError(undefined);
    setRefreshing(refresh);

    if (!refresh) {
      setLoading(true);
    }

    try {
      const query = refresh ? "?refresh=true" : "";
      const results = await Promise.allSettled([
        fetchArtifactList(`/api/artifacts${query}`),
        fetchArtifactList(`/api/local-assets${query}`),
      ]);
      const items: GalleryArtifact[] = [];
      const cachedAts: string[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          items.push(...result.value.items);
          if (result.value.cachedAt) {
            cachedAts.push(result.value.cachedAt);
          }
        } else {
          errors.push(result.reason instanceof Error ? result.reason.message : "Failed to load artifacts.");
        }
      }

      if (items.length === 0 && errors.length === results.length) {
        throw new Error(errors.join(" "));
      }

      if (errors.length > 0) {
        console.warn("Some asset sources failed to load:", errors);
      }

      setArtifacts(items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      setCachedAt(cachedAts.sort((left, right) => right.localeCompare(left))[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load artifacts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  const searchableArtifacts = useMemo(() => {
    let items = sourceFilter === "all"
      ? artifacts
      : artifacts.filter(artifact => getArtifactSource(artifact) === sourceFilter);

    return filter === "all" ? items : items.filter(artifact => artifact.kind === filter);
  }, [artifacts, filter, sourceFilter]);

  const kindAndQueryFiltered = useMemo(() => {
    return filterArtifactsByQuery(searchableArtifacts, query);
  }, [query, searchableArtifacts]);

  const filteredArtifacts = useMemo(() => {
    if (!selectedRepositoryKey) {
      return kindAndQueryFiltered;
    }

    return kindAndQueryFiltered.filter(
      artifact => getRepositoryKey(artifact) === selectedRepositoryKey,
    );
  }, [kindAndQueryFiltered, selectedRepositoryKey]);

  const selectedRepositoryName = useMemo(() => {
    if (!selectedRepositoryKey) {
      return null;
    }

    const match = artifacts.find(artifact => getRepositoryKey(artifact) === selectedRepositoryKey);
    return match ? getRepositoryName(match) : null;
  }, [artifacts, selectedRepositoryKey]);

  const scrollToArtifact = useCallback((artifact: GalleryArtifact) => {
    setSelectedId(getArtifactKey(artifact));

    requestAnimationFrame(() => {
      const element = document.getElementById(
        `artifact-${encodeURIComponent(getArtifactKey(artifact))}`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const modalIndex = useMemo(() => {
    if (!modalArtifact) {
      return -1;
    }

    const key = getArtifactKey(modalArtifact);
    return filteredArtifacts.findIndex(artifact => getArtifactKey(artifact) === key);
  }, [modalArtifact, filteredArtifacts]);

  const openModal = useCallback(
    (artifact: GalleryArtifact) => {
      setModalArtifact(artifact);
      scrollToArtifact(artifact);
    },
    [scrollToArtifact],
  );

  const handleSidebarSelect = useCallback(
    (artifact: GalleryArtifact) => {
      setFilter(artifact.kind);
      setSelectedRepositoryKey(getRepositoryKey(artifact));
      openModal(artifact);
    },
    [openModal],
  );

  const handleSourceFilterChange = useCallback((source: SourceFilter) => {
    setSourceFilter(source);
    setSelectedRepositoryKey(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalArtifact(null);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
  }, []);

  const handleSearchSelect = useCallback(
    (artifact: GalleryArtifact) => {
      handleSidebarSelect(artifact);
      setSearchOpen(false);
      setQuery("");
    },
    [handleSidebarSelect],
  );

  const goToPrevious = useCallback(() => {
    if (modalIndex <= 0) {
      return;
    }

    const previous = filteredArtifacts[modalIndex - 1];
    if (previous) {
      setModalArtifact(previous);
      scrollToArtifact(previous);
    }
  }, [filteredArtifacts, modalIndex, scrollToArtifact]);

  const goToNext = useCallback(() => {
    if (modalIndex < 0 || modalIndex >= filteredArtifacts.length - 1) {
      return;
    }

    const next = filteredArtifacts[modalIndex + 1];
    if (next) {
      setModalArtifact(next);
      scrollToArtifact(next);
    }
  }, [filteredArtifacts, modalIndex, scrollToArtifact]);

  return (
    <div className="flex h-screen flex-col bg-[#f3f3f3] text-[#1e1e1e]">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`hidden shrink-0 border-r border-[#e0e0e0] lg:block ${
            sidebarOpen ? "w-[260px]" : "w-[52px]"
          }`}
        >
          <AssetsSidebar
            artifacts={artifacts}
            filter={filter}
            loading={loading || refreshing}
            query={query}
            selectedRepositoryKey={selectedRepositoryKey}
            sourceFilter={sourceFilter}
            onOpenSearch={openSearch}
            onSelect={handleSidebarSelect}
            onRepositorySelect={setSelectedRepositoryKey}
            onSourceFilterChange={handleSourceFilterChange}
            collapsed={!sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(open => !open)}
          />
        </aside>

        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <section className="space-y-6 text-left">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <PageTitle>
                    {selectedRepositoryName ??
                      (filter === "all" ? "All assets" : filter === "image" ? "Media" : "Videos")}
                  </PageTitle>
                  <p className="text-[15px] leading-6 text-[#6f6f6f]">
                    {cachedAt
                      ? `${filteredArtifacts.length} items · Last scanned ${formatDate(cachedAt)}`
                      : "Waiting for first scan"}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:hidden">
                  <button
                    type="button"
                    onClick={openSearch}
                    className="inline-flex items-center justify-center rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm font-medium text-[#1e1e1e] shadow-sm transition hover:bg-[#f7f7f7]"
                  >
                    Search assets
                  </button>
                  <SegmentedControl
                    options={SOURCE_FILTERS}
                    value={sourceFilter}
                    onChange={handleSourceFilterChange}
                  />
                  <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
                </div>
              </div>

              {error ? <ErrorState message={error} /> : null}

              {loading ? (
                <GallerySkeleton />
              ) : filteredArtifacts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredArtifacts.map(artifact => (
                    <ArtifactCard
                      key={getArtifactKey(artifact)}
                      artifact={artifact}
                      selected={selectedId === getArtifactKey(artifact)}
                      onOpen={() => openModal(artifact)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyAssetsState
                  subtitle={
                    artifacts.length === 0
                      ? "Cloud artifacts and local Cursor images under ~/.cursor/projects/*/assets/ appear here."
                      : "Try another folder or search term."
                  }
                />
              )}
            </section>
          </div>
        </main>
      </div>

      <AssetSearchModal
        open={searchOpen}
        artifacts={searchableArtifacts}
        query={query}
        onQueryChange={setQuery}
        onSelect={handleSearchSelect}
        onClose={closeSearch}
      />

      {modalArtifact ? (
        <ArtifactModal
          artifact={modalArtifact}
          open
          onClose={closeModal}
          onPrevious={modalIndex > 0 ? goToPrevious : undefined}
          onNext={
            modalIndex >= 0 && modalIndex < filteredArtifacts.length - 1 ? goToNext : undefined
          }
        />
      ) : null}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Loading assets"
      aria-busy="true"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <article className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#f9f9f9]">
      <div className="relative aspect-video overflow-hidden bg-[#eeeeee]">
        <div className="absolute inset-0 animate-modal-skeleton-shimmer bg-gradient-to-r from-[#eeeeee] via-[#f7f7f7] to-[#eeeeee] bg-[length:200%_100%]" />
      </div>
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 rounded bg-[#e8e8e8]" />
        <div className="h-2.5 w-1/2 rounded bg-[#eeeeee]" />
      </div>
    </article>
  );
}

async function fetchArtifactList(url: string): Promise<ArtifactListResponse> {
  const response = await fetch(url);
  const data = (await response.json()) as ArtifactListResponse | ApiErrorResponse;

  if (!response.ok) {
    throw new Error("error" in data ? data.error : "Failed to load artifacts.");
  }

  if (!("items" in data)) {
    throw new Error("Failed to load artifacts.");
  }

  return data;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[#e5e5e5] bg-[#f3f3f3] p-1">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === option.id
              ? "bg-white text-[#1e1e1e] shadow-sm"
              : "text-[#6f6f6f] hover:text-[#1e1e1e]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-5 text-left text-red-900">
      <h2 className="font-semibold">Could not load artifacts</h2>
      <p className="mt-2 text-sm text-red-800/80">{message}</p>
    </section>
  );
}

