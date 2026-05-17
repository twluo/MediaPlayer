import { ref, watch, computed } from "vue";
import type {
  Album,
  MediaProvider,
  MediaProviderConfig,
} from "../mediaProviders/MediaProvider";
import {
  MediaProviderTypePlex,
  MediaProviderTypeNavidrome,
} from "../mediaProviders/MediaProvider";
import { NavidromeMediaProvider } from "../mediaProviders/NavidromeMediaProvider";
import { PlexMediaProvider } from "../mediaProviders/PlexMediaProvider";

const STORAGE_KEY = "media-player:providers";
const ALBUM_CACHE_KEY = "media-player:album-cache";
const ALBUM_LIST_CACHE_KEY = "media-player:album-list-cache";
const RECENT_ALBUMS_CACHE_KEY = "media-player:recent-albums-cache";

export type ProviderEntry = MediaProviderConfig & {
  enabled: boolean;
  instance?: MediaProvider;
};

function loadCache<V>(key: string): Map<string, V> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Map(JSON.parse(raw) as [string, V][]) : new Map();
  } catch {
    return new Map();
  }
}

function saveCache<V>(key: string, cache: Map<string, V>) {
  localStorage.setItem(key, JSON.stringify([...cache.entries()]));
}

const ALBUM_CACHE_MAX = 10;

function setAlbumCache(cache: Map<string, Album>, key: string, album: Album) {
  cache.delete(key);
  cache.set(key, album);
  if (cache.size > ALBUM_CACHE_MAX) {
    cache.delete(cache.keys().next().value!);
  }
  saveCache(ALBUM_CACHE_KEY, cache);
}

function load(): Map<string, ProviderEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries = raw ? (JSON.parse(raw) as ProviderEntry[]) : [];
    return new Map(entries.map((entry) => [entry.config.id, entry]));
  } catch {
    return new Map();
  }
}

function getInstance(entry: ProviderEntry): MediaProvider {
  if (entry.instance) return entry.instance;
  if (entry.type === MediaProviderTypeNavidrome) {
    const { id, url, username, password } = entry.config;
    entry.instance = new NavidromeMediaProvider(id, url, username, password);
  } else if (entry.type === MediaProviderTypePlex) {
    const { id, url, token } = entry.config;
    entry.instance = new PlexMediaProvider(id, url, token);
  } else {
    throw new Error("Invalid Entry");
  }
  return entry.instance;
}

// Module-level singleton — state is shared across all component instances
const providers = ref<Map<string, ProviderEntry>>(load());
const enabledProviders = computed(() =>
  [...providers.value.values()].filter((p) => p.enabled),
);

// Album detail cache — capped at ALBUM_CACHE_MAX entries (keyed "providerId:albumId")
const albumCache = loadCache<Album>(ALBUM_CACHE_KEY);

// Per-provider list caches — keyed by provider ID.
// Cleared when a provider is removed so the next fetch gets fresh data.
const albumListCache = loadCache<Album[]>(ALBUM_LIST_CACHE_KEY);
const recentAlbumsListCache = loadCache<Album[]>(RECENT_ALBUMS_CACHE_KEY);

// Reactive album lists
const albums = ref<Album[]>([]);
const albumsLoading = ref(false);
const albumsError = ref<string | null>(null);

// Reactive recent album lists
const recentAlbums = ref<Album[]>([]);
const recentAlbumsLoading = ref(false);
const recentAlbumsError = ref<string | null>(null);

// Cached promises for current inflight promises.
let albumsFetchPromise: Promise<void> | null = null;
let recentAlbumsFetchPromise: Promise<void> | null = null;

watch(
  providers,
  (newProviders) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...newProviders.values()], (key, value) =>
        key === "instance" ? undefined : value,
      ),
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
    albumListCache.delete(id);
    saveCache(ALBUM_LIST_CACHE_KEY, albumListCache);
    recentAlbumsListCache.delete(id);
    saveCache(RECENT_ALBUMS_CACHE_KEY, recentAlbumsListCache);
    for (const key of albumCache.keys()) {
      if (key.startsWith(`${id}:`)) albumCache.delete(key);
    }
    saveCache(ALBUM_CACHE_KEY, albumCache);
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

  function fetchAlbums(): Promise<void> {
    // If request already exists, return existing request.
    if (albumsFetchPromise) return albumsFetchPromise;

    albumsFetchPromise = (async () => {
      // If no provider is enabled, set albums to []
      if (enabledProviders.value.length === 0) {
        albums.value = [];
        return;
      }
      albumsError.value = null;

      // Get all the cached albums and display them, if no cached items, show loading circle
      const cachedAlbumLists = enabledProviders.value
        .map((e) => albumListCache.get(e.config.id))
        .filter((a) => a);
      if (cachedAlbumLists.length === 0) {
        albumsLoading.value = true;
      } else {
        albums.value = (cachedAlbumLists as Album[][])
          .flat()
          .filter((a) => a.artist !== undefined)
          .sort((a, b) =>
            a.artist === b.artist
              ? a.title.localeCompare(b.title)
              : a.artist.localeCompare(b.artist),
          );
      }

      // Refresh the cache in the background
      try {
        const results = await Promise.allSettled(
          enabledProviders.value.map((entry) =>
            getInstance(entry)
              .fetchAlbums()
              .then((freshAlbums) => {
                albumListCache.set(entry.config.id, freshAlbums);
                saveCache(ALBUM_LIST_CACHE_KEY, albumListCache);
                return freshAlbums;
              }),
          ),
        );
        albums.value = results
          .filter(
            (r): r is PromiseFulfilledResult<Album[]> =>
              r.status === "fulfilled",
          )
          .flatMap((r) => r.value)
          .filter((a) => a.artist !== undefined)
          .sort((a, b) =>
            a.artist === b.artist
              ? a.title.localeCompare(b.title)
              : a.artist.localeCompare(b.artist),
          );
      } catch (err) {
        albumsError.value =
          err instanceof Error ? err.message : "Something went wrong";
      } finally {
        albumsLoading.value = false;
      }
    })().finally(() => {
      albumsFetchPromise = null;
    });

    return albumsFetchPromise;
  }

  function fetchRecentAlbums(): Promise<void> {
    // If request already exists, return existing request.
    if (recentAlbumsFetchPromise) return recentAlbumsFetchPromise;

    recentAlbumsFetchPromise = (async () => {
      // If no provider is enabled, set albums to []
      if (enabledProviders.value.length === 0) {
        recentAlbums.value = [];
        return;
      }

      recentAlbumsError.value = null;

      // Get all the cached albums and display them, if no cached items, show loading circle
      const cachedRecentAlbumsList = enabledProviders.value
        .map((e) => recentAlbumsListCache.get(e.config.id))
        .filter((a) => a);

      if (cachedRecentAlbumsList.length === 0) {
        recentAlbumsLoading.value = true;
      } else {
        recentAlbums.value = (cachedRecentAlbumsList as Album[][])
          .flat()
          .filter((a) => a.artist !== undefined)
          .sort((a, b) => b.addedDate - a.addedDate)
          .slice(0, 50);
      }

      // Refresh the cache in the background
      try {
        const results = await Promise.allSettled(
          enabledProviders.value.map((entry) =>
            getInstance(entry)
              .fetchRecentAlbums()
              .then((freshAlbums) => {
                recentAlbumsListCache.set(entry.config.id, freshAlbums);
                saveCache(RECENT_ALBUMS_CACHE_KEY, recentAlbumsListCache);
                return freshAlbums;
              }),
          ),
        );
        recentAlbums.value = results
          .filter(
            (r): r is PromiseFulfilledResult<Album[]> =>
              r.status === "fulfilled",
          )
          .flatMap((r) => r.value)
          .filter((a) => a.artist !== undefined)
          .sort((a, b) => b.addedDate - a.addedDate)
          .slice(0, 50);
      } catch (err) {
        recentAlbumsError.value =
          err instanceof Error ? err.message : "Something went wrong";
      } finally {
        recentAlbumsLoading.value = false;
      }
    })().finally(() => {
      recentAlbumsFetchPromise = null;
    });

    return recentAlbumsFetchPromise;
  }

  async function fetchAlbum(
    providerId: string,
    albumId: string,
  ): Promise<Album> {
    const provider = providers.value.get(providerId);
    if (!provider) throw new Error("Invalid Provider");
    const cacheKey = `${providerId}:${albumId}`;
    const cached = albumCache.get(cacheKey);
    const refreshPromise = getInstance(provider)
      .fetchAlbum(albumId)
      .then((album) => {
        setAlbumCache(albumCache, cacheKey, album);
        return album;
      });
    if (cached) {
      refreshPromise.catch(() => {});
      return cached;
    }
    return refreshPromise;
  }

  return {
    providers,
    addProvider,
    removeProvider,
    toggleProvider,
    hasProviders,
    albums,
    albumsLoading,
    albumsError,
    fetchAlbums,
    recentAlbums,
    recentAlbumsLoading,
    recentAlbumsError,
    fetchRecentAlbums,
    fetchAlbum,
  };
}
