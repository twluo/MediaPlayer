import type { Album, Track, ScrobbleInput } from "./MediaProvider";
import { MediaProvider } from "./MediaProvider";
import { formatDuration } from "../utils/format";
import { baseHeaders } from "./PlexAuth";

export interface PlexMediaProviderConfig {
  id: string;
  url: string;
  token: string;
  serverName?: string;
}

export interface PlexScrobbleInput extends ScrobbleInput {
  continuing: "0" | "1";
  playbackTime: number;
}

export class PlexMediaProvider extends MediaProvider {
  token: string;

  constructor(id = "", baseUrl = "", token = "") {
    super(id, baseUrl);
    this.token = token;
  }

  private headers(): Record<string, string> {
    return baseHeaders(this.token);
  }

  private thumbUrl(thumb: string | undefined | null): string {
    if (!thumb) return "";
    return `${this.baseUrl}${thumb}?X-Plex-Token=${encodeURIComponent(this.token)}`;
  }

  private streamUrl(partKey: string | undefined | null): string {
    if (!partKey) return "";
    return `${this.baseUrl}${partKey}?X-Plex-Token=${encodeURIComponent(this.token)}`;
  }

  private mapAlbum(album: any): Album {
    return {
      id: String(album.ratingKey),
      title: album.title,
      artist: album.parentTitle,
      coverUrl: this.thumbUrl(album.thumb),
      genre: album.Genre?.[0]?.tag ?? "No Genre",
      year: album.year?.toString() ?? "????",
      providerId: this.id,
      addedDate: (album.addedAt ?? 0) * 1000,
    };
  }

  private mapTrack(song: any, fallbackCoverUrl: string): Track {
    return {
      id: String(song.ratingKey),
      albumId: String(song.parentRatingKey),
      trackNumber: song.index ?? 0,
      discNumber: song.parentIndex ?? 0,
      contentType: song.Media?.[0]?.audioCodec ?? "",
      title: song.title,
      artist: song.grandparentTitle ?? "???",
      duration: formatDuration((song.duration ?? 0) / 1000),
      rawDuration: (song.duration ?? 0) / 1000,
      streamUrl: this.streamUrl(song.Media?.[0]?.Part?.[0]?.key),
      coverUrl: fallbackCoverUrl,
      providerId: this.id,
    };
  }

  async fetchAlbums(): Promise<Album[]> {
    const data = await this.fetchJson(
      "/library/all?type=9&sort=artist.title:nullLast,album.title",
      this.headers(),
    );
    const albums = data?.MediaContainer?.Metadata || [];
    if (albums.length === 0) throw new Error("No Albums Fetched");
    return albums.map((album: any) => this.mapAlbum(album));
  }

  async fetchRecentAlbums(): Promise<Album[]> {
    const data = await this.fetchJson(
      "/library/all?type=9&sort=addedAt:desc,artist.title,album.title&limit=30",
      this.headers(),
    );
    const albums = data?.MediaContainer?.Metadata || [];
    if (albums.length === 0) throw new Error("No Albums Fetched");
    return albums.map((album: any) => this.mapAlbum(album));
  }

  async fetchAlbum(albumId: string): Promise<Album> {
    const data = await this.fetchJson(
      `/library/metadata/${albumId}/children`,
      this.headers(),
    );
    const mc = data?.MediaContainer;
    if (!mc) throw new Error("No Album Data");

    const coverUrl = mc.thumb
      ? this.thumbUrl(mc.thumb)
      : this.thumbUrl(mc.grandparentThumb);

    const album: Album = {
      id: albumId,
      title: mc.parentTitle,
      artist: mc.grandparentTitle,
      coverUrl,
      genre: mc.Genre?.[0]?.tag ?? "No Genre",
      year: mc.parentYear?.toString() ?? "????",
      providerId: this.id,
      addedDate: 0,
    };

    const songsData: any[] = mc.Metadata ?? [];
    album.tracks = songsData.map((song) => this.mapTrack(song, coverUrl));
    return album;
  }

  async scrobble(input: PlexScrobbleInput): Promise<void> {
    const query = new URLSearchParams({
      ratingKey: input.track.id,
      key: `/library/metadata/${input.track.id}`,
      state: input.state,
      playbackTime: Math.round(input.playbackTime * 1000.0).toString(), //sec to ms
      time: Math.round(input.playbackTime * 1000.0).toString(), //sec to ms
      duration: Math.round(
        (Number(input.track.rawDuration) || 0) * 1000.0,
      ).toString(),
      identifier: "com.plexapp.plugins.library",
    }).toString();

    await this.fetchJson(`/:/timeline?${query}`, this.headers());
  }
}
