import type { PlexMediaProviderConfig } from "./PlexMediaProvider";
import type { NavidromeMediaProviderConfig } from "./NavidromeMediaProvider";

export const MediaProviderTypePlex = "plex";
export const MediaProviderTypeNavidrome = "navidrome";
export type MediaProviderType = "plex" | "navidrome" | null;

export type MediaProviderConfig =
  | { config: PlexMediaProviderConfig; type: "plex" }
  | { config: NavidromeMediaProviderConfig; type: "navidrome" };

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: string;
  genre: string;
  coverUrl: string;
  tracks?: Track[];
  providerId: string;
  addedDate: EpochTimeStamp;
}

export interface Track {
  id: string;
  albumId: string;
  trackNumber: number;
  discNumber: number;
  contentType: string;
  title: string;
  artist: string;
  duration: string;
  providerId: string;
  streamUrl: string;
  coverUrl: string;
  scrobbleUrl?: string;
}

export abstract class MediaProvider {
  id: string;
  baseUrl: string;

  constructor(id = "", baseUrl = "") {
    this.id = id;
    this.baseUrl = baseUrl;
  }

  async fetchJson(url: string, headers: Record<string, string> = {}) {
    const res = await fetch(`${this.baseUrl}${url}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async fetchImageBlob(url: string, headers: Record<string, string> = {}) {
    const res = await fetch(`${this.baseUrl}${url}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }

  abstract fetchAlbums(): Promise<Album[]>;

  abstract fetchRecentAlbums(): Promise<Album[]>;

  abstract fetchAlbum(id: string): Promise<Album>;
}
