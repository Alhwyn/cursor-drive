export type MediaKind = "image" | "video";
export type ArtifactSource = "cloud" | "local";

export interface GalleryArtifact {
  source?: ArtifactSource;
  agentId: string;
  agentName: string;
  repositoryName?: string;
  path: string;
  sizeBytes: number;
  updatedAt: string;
  kind: MediaKind;
}

export interface ArtifactListResponse {
  items: GalleryArtifact[];
  cachedAt?: string;
}

export interface ApiErrorResponse {
  error: string;
}
