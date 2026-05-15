import type { Album } from "./MediaProvider";
import { MediaProvider } from "./MediaProvider";

export interface PlexMediaProviderConfig {
  id: string;
  url: string;
  token: string;
}

export class PlexMediaProvider extends MediaProvider {
  constructor(id = "", baseUrl = "", token = "") {
    super(id, baseUrl, token);
  }

  private get headers(): Record<string, string> {
    return {
      "X-Plex-Token": this.token,
      Accept: "application/json",
    };
  }

  async fetchAlbums(): Promise<Album[]> {
    throw new Error("Not Implemented");
  }

  async fetchRecentAlbums(): Promise<Album[]> {
    throw new Error("Not Implemented");
  }

  async fetchAlbum(_id: string): Promise<Album> {
    throw new Error("Not Implemented");
  }
}
