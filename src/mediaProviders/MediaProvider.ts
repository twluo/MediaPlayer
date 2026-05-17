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
  rawDuration: number;
  contentType: string;
  title: string;
  artist: string;
  duration: string;
  providerId: string;
  streamUrl: string;
  coverUrl: string;
  scrobbleUrl?: string;
}

export interface ScrobbleInput {
  track: Track;
  state: "stopped" | "playing" | "paused";
}

export const CLIENT_NAME = "BananaMediaPlayer";
export const CLIENT_ID = "0f9bd6f5-4632-46b0-b4ac-5bb16030eaa1";

export abstract class MediaProvider {
  id: string;
  baseUrl: string;
  clientId: string = CLIENT_NAME;

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

  abstract scrobble(input: ScrobbleInput): Promise<void>;
}
