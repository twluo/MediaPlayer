import { ref, watch } from "vue";
import type {
  Album,
  MediaProviderConfig,
} from "../mediaProviders/MediaProvider";
import {
  MediaProviderTypePlex,
  MediaProviderTypeNavidrome,
} from "../mediaProviders/MediaProvider";
import { NavidromeMediaProvider } from "../mediaProviders/NavidromeMediaProvider";
import { PlexMediaProvider } from "../mediaProviders/PlexMediaProvider";

const STORAGE_KEY = "media-player:providers";

export type ProviderEntry = MediaProviderConfig & { enabled: boolean };

function load(): Map<string, ProviderEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries = raw ? (JSON.parse(raw) as ProviderEntry[]) : [];
    return new Map(entries.map((entry) => [entry.config.id, entry]));
  } catch {
    return new Map();
  }
}

function instantiate(entry: ProviderEntry) {
  if (entry.type === MediaProviderTypeNavidrome) {
    const { id, url, username, password } = entry.config;
    return new NavidromeMediaProvider(id, url, username, password);
  } else if (entry.type === MediaProviderTypePlex) {
    const { id, url, token } = entry.config;
    return new PlexMediaProvider(id, url, token);
  } else {
    throw new Error("Invalid Entry");
  }
}

// Module-level singleton — state is shared across all component instances
const providers = ref<Map<string, ProviderEntry>>(load());

// Module-level album cache
const albumCache = new Map<string, Album>();

watch(
  providers,
  (newProviders) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...newProviders.values()]),
    );
  },
  { deep: true },
);

export function useMediaProviders() {
  function addProvider(entry: MediaProviderConfig) {
    if (entry === undefined) {
      return;
    }
    providers.value.set(entry.config.id, { ...entry, enabled: true });
  }

  function removeProvider(id: string) {
    providers.value.delete(id);
    for (const key of albumCache.keys()) {
      if (key.startsWith(`${id}:`)) albumCache.delete(key);
    }
  }

  function toggleProvider(id: string) {
    if (providers.value.has(id)) {
      const provider = providers.value.get(id);
      if (provider) provider.enabled = !provider.enabled;
    }
  }

  function hasProviders() {
    return providers.value.size !== 0;
  }

  async function fetchAlbums(
    providerId: string | undefined = undefined,
  ): Promise<Album[]> {
    if (providerId === undefined) {
      const enabled: ProviderEntry[] = [];
      providers.value.forEach((provider) => {
        if (provider.enabled) enabled.push(provider);
      });
      if (enabled.length === 0) return [];
      const results = await Promise.allSettled(
        enabled.map((entry) => instantiate(entry).fetchAlbums()),
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<Album[]> => r.status === "fulfilled",
        )
        .flatMap((r) => r.value)
        .filter((r) => r.artist !== undefined)
        .sort((a, b) => a.artist.localeCompare(b.artist));
    } else {
      const provider = providers.value.get(providerId);
      if (provider) {
        return await instantiate(provider).fetchAlbums();
      }
      return [];
    }
  }

  async function fetchRecentAlbums(): Promise<Album[]> {
    const enabled: ProviderEntry[] = [];
    providers.value.forEach((provider) => {
      if (provider.enabled) enabled.push(provider);
    });
    if (enabled.length === 0) return [];
    const results = await Promise.allSettled(
      enabled.map((entry) => instantiate(entry).fetchRecentAlbums()),
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<Album[]> => r.status === "fulfilled",
      )
      .flatMap((r) => r.value)
      .filter((r) => r.artist !== undefined)
      .sort((a, b) => b.addedDate - a.addedDate)
      .slice(0, 50);
  }

  async function fetchAlbum(
    providerId: string,
    albumId: string,
  ): Promise<Album> {
    const provider = providers.value.get(providerId);
    if (!provider) throw new Error("Invalid Provider");
    const cacheKey = `${providerId}:${albumId}`;
    const cached = albumCache.get(cacheKey);
    if (cached) return cached;
    const album = await instantiate(provider).fetchAlbum(albumId);
    albumCache.set(cacheKey, album);
    return album;
  }

  return {
    providers,
    addProvider,
    removeProvider,
    toggleProvider,
    hasProviders,
    fetchAlbums,
    fetchRecentAlbums,
    fetchAlbum,
  };
}
