<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Album } from "../mediaProviders/MediaProvider";
import { useMediaProviders } from "../composables/useMediaProviders";
import AlbumCard from "../components/AlbumCard.vue";

const { fetchAlbums } = useMediaProviders();

const query = ref<string>("");
const allAlbums = ref<Album[]>([]);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    allAlbums.value = await fetchAlbums();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Something went wrong";
  } finally {
    loading.value = false;
  }
});

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return allAlbums.value.filter(
    (album) =>
      album.title.toLowerCase().includes(q) ||
      album.artist.toLowerCase().includes(q),
  );
});
</script>

<template>
  <div class="search-page">
    <!-- ── Search bar ─────────────────────────────────── -->
    <div class="search-bar-wrap">
      <div class="search-bar">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="18"
          height="18"
          aria-hidden="true"
        >
          <path
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>

        <input
          v-model="query"
          class="search-input"
          type="search"
          placeholder="Search albums or artists…"
          autocomplete="off"
          spellcheck="false"
          autofocus
          aria-label="Search"
        />

        <Transition name="fade">
          <button
            v-if="query"
            class="clear-btn"
            aria-label="Clear search"
            @click="query = ''"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </Transition>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────── -->
    <div v-if="loading" class="state-message">
      <div class="spinner" />
      Loading your library…
    </div>

    <!-- ── Error ──────────────────────────────────────── -->
    <div v-else-if="error" class="state-message error">{{ error }}</div>

    <!-- ── Idle (nothing typed yet) ──────────────────── -->
    <div v-else-if="!query" class="idle-state">
      <div class="idle-icon-wrap">
        <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
          <path
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
      </div>
      <p class="idle-title">Search your library</p>
      <p class="idle-hint">
        Find albums and artists across all your providers.
      </p>
    </div>

    <!-- ── No results ─────────────────────────────────── -->
    <div v-else-if="results.length === 0" class="state-message">
      No albums found for <em>"{{ query }}"</em>
    </div>

    <!-- ── Results grid ───────────────────────────────── -->
    <div v-else class="album-grid">
      <AlbumCard
        v-for="album in results"
        :key="`${album.providerId}:${album.id}`"
        :album="album"
      />
    </div>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* ── Search bar ──────────────────────────────────────── */
.search-bar-wrap {
  position: sticky;
  top: 60px;
  z-index: 100;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1e1e1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0 16px;
  transition: border-color 0.15s;
}

.search-bar:focus-within {
  border-color: rgba(255, 255, 255, 0.3);
}

.search-icon {
  color: #6a6a6a;
  flex-shrink: 0;
  transition: color 0.15s;
}

.search-bar:focus-within .search-icon {
  color: #b3b3b3;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
  padding: 14px 0;
  min-width: 0;
}

.search-input::placeholder {
  color: #555;
}

/* hide the browser's native clear button — we supply our own */
.search-input::-webkit-search-cancel-button {
  display: none;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  color: #b3b3b3;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* ── Shared state messages ───────────────────────────── */
.state-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: #6a6a6a;
  font-size: 0.9rem;
}

.state-message em {
  font-style: normal;
  color: #b3b3b3;
}

.state-message.error {
  color: #f15e6c;
}

/* ── Loading spinner ─────────────────────────────────── */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #1db954;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  flex-shrink: 0;
}

/* ── Idle state ──────────────────────────────────────── */
.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
  text-align: center;
}

.idle-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  margin-bottom: 8px;
}

.idle-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.idle-hint {
  font-size: 0.875rem;
  color: #6a6a6a;
  margin: 0;
}

/* ── Results grid ────────────────────────────────────── */
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

/* ── Transitions ─────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 600px) {
  .search-page {
    padding: 16px 12px 32px;
    gap: 24px;
  }

  .search-bar-wrap {
    top: 52px;
  }

  .search-input {
    font-size: 0.95rem;
    padding: 12px 0;
  }

  .idle-state {
    padding: 60px 0;
  }

  .album-grid {
    grid-template-columns: repeat(3, 33%);
    gap: 6px;
  }
}
</style>
