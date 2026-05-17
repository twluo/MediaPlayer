<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useMediaProviders } from "../composables/useMediaProviders";
import type { Album } from "../mediaProviders/MediaProvider";
import AlbumCard from "./AlbumCard.vue";

const PAGE_SIZE = 50;

const props = defineProps<{
  title?: string;
  albums: Album[];
  loading: boolean;
  error: string | null;
}>();

const { hasProviders } = useMediaProviders();

const displayCount = ref(PAGE_SIZE);
const endMarker = ref<HTMLElement | null>(null);

const visibleAlbums = computed(() => props.albums.slice(0, displayCount.value));
const hasMore = computed(() => displayCount.value < props.albums.length);

// Reset pagination whenever the album list is replaced (e.g. after a refresh)
watch(
  () => props.albums,
  () => {
    displayCount.value = PAGE_SIZE;
  },
);

let observer: IntersectionObserver | null = null;

function observeSentinel() {
  observer?.disconnect();
  if (!endMarker.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) displayCount.value += PAGE_SIZE;
    },
    { rootMargin: "200px" },
  );
  observer.observe(endMarker.value);
}

onMounted(observeSentinel);
watch(endMarker, observeSentinel);
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section class="album-grid-section">
    <h2 class="section-title">{{ title ?? "Albums" }}</h2>

    <div v-if="loading" class="state-message">Loading albums…</div>

    <div v-else-if="error" class="state-message error">{{ error }}</div>

    <div v-else-if="!hasProviders()" class="state-message">
      No media providers configured. Add one in
      <RouterLink to="/settings" class="settings-link">Settings</RouterLink>.
    </div>

    <div v-else-if="albums.length === 0" class="state-message">
      No albums found across your providers.
    </div>

    <template v-else>
      <div class="album-grid">
        <AlbumCard
          v-for="album in visibleAlbums"
          :key="album.id"
          :album="album"
        />
      </div>
      <div v-if="hasMore" ref="endMarker" class="endMarker" />
    </template>
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

.sentinel {
  height: 1px;
}
</style>
