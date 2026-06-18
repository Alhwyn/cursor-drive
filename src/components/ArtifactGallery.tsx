import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApiErrorResponse,
  ArtifactListResponse,
  GalleryArtifact,
  MediaKind,
} from "../types/artifacts";
import { ArtifactCard } from "./ArtifactCard";

type Filter = "all" | MediaKind;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
];

export function ArtifactGallery() {
  const [artifacts, setArtifacts] = useState<GalleryArtifact[]>([]);
  const [cachedAt, setCachedAt] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const filteredArtifacts = useMemo(() => {
    if (filter === "all") {
      return artifacts;
    }

    return artifacts.filter(artifact => artifact.kind === filter);
  }, [artifacts, filter]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/45">
              Cursor Cloud Agent Artifacts
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Generated Asset Gallery
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/65">
              Browse image and video artifacts produced by your cloud agents. The API key stays on
              the Bun server while this page streams media through a local download proxy.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadArtifacts(true)}
            disabled={loading || refreshing}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {FILTERS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === option.id
                    ? "bg-white text-zinc-950"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="text-sm text-white/45">
            {cachedAt ? `Last scanned ${formatDate(cachedAt)}` : "Waiting for first scan"}
          </p>
        </div>
      </header>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <StatusCard title="Scanning cloud agents" body="Checking each agent for media artifacts." />
      ) : filteredArtifacts.length > 0 ? (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtifacts.map(artifact => (
            <ArtifactCard
              key={`${artifact.agentId}:${artifact.path}`}
              artifact={artifact}
            />
          ))}
        </section>
      ) : (
        <StatusCard
          title={artifacts.length === 0 ? "No media artifacts found" : "No matches for this filter"}
          body={
            artifacts.length === 0
              ? "Cloud agents without png, jpg, gif, webp, mp4, webm, or mov artifacts are hidden from this gallery."
              : "Try another filter to see the rest of your generated assets."
          }
        />
      )}
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-left text-red-100">
      <h2 className="font-semibold">Could not load artifacts</h2>
      <p className="mt-2 text-sm text-red-100/80">{message}</p>
    </section>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center shadow-xl shadow-black/20">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/60">{body}</p>
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
