import type { Album, Track } from "./MediaProvider";
import { MediaProvider } from "./MediaProvider";
import { formatDuration } from "../utils/format";
import { Md5 } from "ts-md5";

interface SubsonicAlbum {
  id: string;
  name: string;
  artist: string;
  genre: string;
  releaseDate: { year: number };
  originalReleaseDate: { year: number };
  created: string;
  song?: SubsonicSong[];
}

interface SubsonicSong {
  id: string;
  albumId: string;
  track: number;
  discNumber: number;
  contentType: string;
  title: string;
  artist: string;
  duration: number;
}

export interface NavidromeMediaProviderConfig {
  id: string;
  url: string;
  username: string;
  password: string;
}

function randomSalt(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

export class NavidromeMediaProvider extends MediaProvider {
  user: string;
  password: string;
  clientId: string = "bananaMediaPlayer";
  version: string = "1.16.1";

  constructor(id = "", baseUrl = "", user = "", password = "") {
    super(id, baseUrl);
    this.user = user;
    this.password = password;
  }

  private authParams() {
    const salt = randomSalt();
    const token = Md5.hashStr(this.password + salt);
    return `u=${this.user}&v=${this.version}&c=${this.clientId}&s=${salt}&t=${token}`;
  }

  private processAlbum(album: SubsonicAlbum): Album {
    return {
      id: album.id,
      title: album.name,
      artist: album.artist,
      coverUrl: `${this.baseUrl}/rest/getCoverArt?${this.authParams()}&id=${album.id}`,
      genre: album.genre || "Unknown Genre",
      year:
        (
          album.releaseDate?.year ?? album.originalReleaseDate?.year
        )?.toString() ?? "????",
      providerId: this.id,
      addedDate: Date.parse(album.created),
    };
  }

  private processSong(song: SubsonicSong): Track {
    return {
      id: song.id,
      albumId: song.albumId,
      trackNumber: song.track ?? 0,
      discNumber: song.discNumber ?? 0,
      contentType: song.contentType,
      title: song.title,
      artist: song.artist ?? "???",
      duration: formatDuration(song.duration),
      streamUrl: `${this.baseUrl}/rest/stream?${this.authParams()}&id=${song.id}`,
      coverUrl: `${this.baseUrl}/rest/getCoverArt?${this.authParams()}&id=${song.id}&size=128`,
      providerId: this.id,
    };
  }

  async fetchAlbums(): Promise<Album[]> {
    const data = await this.fetchJson(
      `/rest/getAlbumList2?${this.authParams()}&type=alphabeticalByArtist&size=500&f=json`,
    );
    const albums = data["subsonic-response"]?.albumList2?.album || [];
    if (albums.length === 0) throw new Error("No Albums Fetched");
    return albums.map((album: SubsonicAlbum) => this.processAlbum(album));
  }

  async fetchRecentAlbums(): Promise<Album[]> {
    const data = await this.fetchJson(
      `/rest/getAlbumList2?${this.authParams()}&type=newest&size=50&f=json`,
    );
    const albums = data["subsonic-response"]?.albumList2?.album || [];
    if (albums.length === 0) throw new Error("No Albums Fetched");
    return albums.map((album: SubsonicAlbum) => this.processAlbum(album));
  }

  async fetchAlbum(id: string): Promise<Album> {
    const data = await this.fetchJson(
      `/rest/getAlbum?${this.authParams()}&id=${id}&f=json`,
    );
    const albumData = data["subsonic-response"]?.album;
    if (!albumData) throw new Error("Album not found");
    const album: Album = this.processAlbum(albumData);
    const songs: SubsonicSong[] = albumData.song ?? [];
    if (songs.length === 0) throw new Error("No Songs Fetched");
    const tracks: Track[] = songs.map((song) => this.processSong(song));
    album.tracks = tracks;
    return album;
  }
}
