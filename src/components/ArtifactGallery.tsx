import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApiErrorResponse,
  ArtifactListResponse,
  GalleryArtifact,
  MediaKind,
} from "../types/artifacts";
import { formatDate, getArtifactKey, getFilename, getRepositoryKey, getRepositoryName } from "../utils/artifacts";
import { ArtifactCard } from "./ArtifactCard";
import { ArtifactModal } from "./ArtifactModal";
import { AssetsSidebar } from "./AssetsSidebar";
import { EmptyAssetsState } from "./EmptyAssetsState";

type Filter = "all" | MediaKind;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "image", label: "Media" },
  { id: "video", label: "Videos" },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadArtifacts = useCallback(async (refresh = false) => {
    setError(undefined);
    setRefreshing(refresh);

    if (!refresh) {
      setLoading(true);
    }

    try {
      const url = refresh ? "/api/artifacts?refresh=true" : "/api/artifacts";
      const response = await fetch(url);
      const data = (await response.json()) as ArtifactListResponse | ApiErrorResponse;

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Failed to load artifacts.");
      }

      if ("items" in data) {
        setArtifacts(data.items);
        setCachedAt(data.cachedAt);
      }
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

  const kindAndQueryFiltered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let items = filter === "all" ? artifacts : artifacts.filter(artifact => artifact.kind === filter);

    if (normalized) {
      items = items.filter(artifact => {
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

    return items;
  }, [artifacts, filter, query]);

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
        `artifact-${artifact.agentId}-${encodeURIComponent(artifact.path)}`,
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

  const closeModal = useCallback(() => {
    setModalArtifact(null);
  }, []);

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
            sidebarOpen ? "w-[260px]" : "w-[78px]"
          }`}
        >
          <AssetsSidebar
            artifacts={artifacts}
            filter={filter}
            loading={loading || refreshing}
            query={query}
            selectedRepositoryKey={selectedRepositoryKey}
            onFilterChange={setFilter}
            onQueryChange={setQuery}
            onSelect={handleSidebarSelect}
            onRepositorySelect={setSelectedRepositoryKey}
            collapsed={!sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(open => !open)}
          />
        </aside>

        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <section className="space-y-6 text-left">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#1e1e1e]">
                    {selectedRepositoryName ??
                      (filter === "all" ? "All assets" : filter === "image" ? "Media" : "Videos")}
                  </h1>
                  <p className="text-[15px] leading-6 text-[#6f6f6f]">
                    {cachedAt
                      ? `${filteredArtifacts.length} items · Last scanned ${formatDate(cachedAt)}`
                      : "Waiting for first scan"}
                  </p>
                </div>

                <div className="flex rounded-lg border border-[#e5e5e5] bg-[#f3f3f3] p-1 lg:hidden">
                  {FILTERS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilter(option.id)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        filter === option.id
                          ? "bg-white text-[#1e1e1e] shadow-sm"
                          : "text-[#6f6f6f] hover:text-[#1e1e1e]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {error ? <ErrorState message={error} /> : null}

              {loading ? (
                <StatusCard
                  title="Scanning cloud agents"
                  body="Checking recent agents for image and video artifacts."
                />
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
                      ? "Only image and video files under each agent's artifacts/ directory appear here."
                      : "Try another folder or search term."
                  }
                />
              )}
            </section>
          </div>
        </main>
      </div>

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

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-5 text-left text-red-900">
      <h2 className="font-semibold">Could not load artifacts</h2>
      <p className="mt-2 text-sm text-red-800/80">{message}</p>
    </section>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-xl border border-[#e5e5e5] bg-[#f9f9f9] p-10 text-center">
      <h2 className="text-xl font-semibold text-[#1e1e1e]">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6f6f6f]">{body}</p>
    </section>
  );
}
