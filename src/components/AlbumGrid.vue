<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useMediaProviders } from "../composables/useMediaProviders";
import type { Album } from "../mediaProviders/MediaProvider";
import AlbumCard from "./AlbumCard.vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    fetcher: () => Promise<Album[]>;
  }>(),
  { title: "Albums" },
);

const { hasProviders, providers } = useMediaProviders();

const albums = ref<Album[]>([]);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
let pendingFetch = false;

async function loadAlbums() {
  // Prevent overlapping concurrent fetches.
  if (pendingFetch) return;
  pendingFetch = true;
  loading.value = true;
  error.value = null;
  try {
    albums.value = await props.fetcher();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Something went wrong";
  } finally {
    loading.value = false;
    pendingFetch = false;
  }
}

onMounted(loadAlbums);

watch(providers, loadAlbums, { deep: true });
</script>

<template>
  <section class="album-grid-section">
    <h2 class="section-title">{{ props.title }}</h2>

    <div v-if="loading" class="state-message">Loading albums…</div>

    <div v-else-if="error" class="state-message error">{{ error }}</div>

    <div v-else-if="!hasProviders()" class="state-message">
      No media providers configured. Add one in
      <RouterLink to="/settings" class="settings-link">Settings</RouterLink>.
    </div>

    <div v-else-if="albums.length === 0" class="state-message">
      No albums found across your providers.
    </div>

    <div v-else class="album-grid">
      <AlbumCard v-for="album in albums" :key="album.id" :album="album" />
    </div>
  </section>
</template>

<style scoped>
.album-grid-section {
  padding: 12px 24px 24px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 20px 12px;
  letter-spacing: -0.02em;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

@media (max-width: 600px) {
  .album-grid-section {
    padding: 16px 10px;
  }

  .section-title {
    font-size: 1.2rem;
    margin-bottom: 12px;
  }

  .album-grid {
    grid-template-columns: repeat(3, 33%);
    gap: 6px;
  }
}

.state-message {
  margin: 48px auto;
  text-align: center;
  color: #b3b3b3;
  font-size: 0.95rem;
}

.state-message.error {
  color: #f15e6c;
}

.settings-link {
  color: #1db954;
  text-decoration: none;
}

.settings-link:hover {
  text-decoration: underline;
}
</style>
