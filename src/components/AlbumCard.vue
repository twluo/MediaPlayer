<script setup lang="ts">
import { ref, computed } from "vue";
import type { Album } from "../mediaProviders/MediaProvider";
import { useMediaPlayer } from "../composables/useMediaPlayer";
import { useMediaProviders } from "../composables/useMediaProviders";

const { playAlbum, currTrack, isPlaying, togglePlay } = useMediaPlayer();
const { fetchAlbum } = useMediaProviders();

const props = defineProps<{ album: Album }>();

/** True when the currently loaded playlist comes from this album. */
const isCurrentAlbum = computed(
  () =>
    !!currTrack.value &&
    currTrack.value.albumId === props.album.id &&
    currTrack.value.providerId === props.album.providerId,
);

const fetchError = ref<boolean>(false);

async function handlePlayClick(e: MouseEvent) {
  e.preventDefault();
  if (isCurrentAlbum.value) {
    togglePlay();
    return;
  }
  try {
    const albumData = await fetchAlbum(props.album.providerId, props.album.id);
    if (!albumData.tracks?.length) throw new Error("Album has no tracks");
    playAlbum(albumData.tracks);
  } catch {
    fetchError.value = true;
    setTimeout(() => {
      fetchError.value = false;
    }, 2500);
  }
}
</script>

<template>
  <RouterLink
    :to="`/albums/${album.providerId}/${album.id}`"
    class="album-card-link"
  >
    <article class="album-card">
      <div class="cover-wrap">
        <img
          :src="album.coverUrl"
          :alt="`${album.title} cover`"
          class="cover"
          loading="lazy"
        />
        <button
          class="play-btn"
          :class="{ active: isCurrentAlbum, error: fetchError }"
          :aria-label="isCurrentAlbum && isPlaying ? 'Pause' : 'Play'"
          @click="handlePlayClick"
        >
          <svg
            v-if="isCurrentAlbum && isPlaying"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="28"
            height="28"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="currentColor"
            width="28"
            height="28"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
      <div class="info">
        <p class="title" :title="album.title">
          <span
            v-if="isCurrentAlbum"
            class="eq-bars"
            :class="{ paused: !isPlaying }"
          >
            <span class="eq-bar" />
            <span class="eq-bar" />
            <span class="eq-bar" />
          </span>
          <span class="title-text">{{ album.title }}</span>
        </p>
        <p class="artist">{{ album.artist }}</p>
        <p class="meta">{{ album.year }} &middot; {{ album.genre }}</p>
      </div>
    </article>
  </RouterLink>
</template>

<style scoped>
.album-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
}

.album-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  border-radius: 8px;
  padding: 12px;
  transition: background 0.2s;
}

.album-card:hover {
  background: rgba(255, 255, 255, 0.06);
}

.cover-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.album-card:hover .cover {
  transform: scale(1.04);
}

.play-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #1db954;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.album-card:hover .play-btn {
  opacity: 1;
  transform: translateY(0);
}

.play-btn:hover {
  background: #1ed760;
  transform: scale(1.06) translateY(0);
}

.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  font-size: 0.95rem;
  color: #fff;
  margin: 0;
  overflow: hidden;
}

.title-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* ── Equalizer bars ──────────────────────────── */
.eq-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.eq-bar {
  width: 2px;
  border-radius: 1px;
  background: #1db954;
  animation: eq 0.9s ease-in-out infinite;
  transition: height 0.2s ease;
}

.eq-bar:nth-child(2) {
  animation-delay: 0.15s;
}
.eq-bar:nth-child(3) {
  animation-delay: 0.3s;
}

.eq-bars.paused .eq-bar {
  animation: none;
  height: 3px;
}

@keyframes eq {
  0%,
  100% {
    height: 3px;
  }
  50% {
    height: 12px;
  }
}

.artist {
  font-size: 0.85rem;
  color: #b3b3b3;
  margin: 0;
}

.meta {
  font-size: 0.75rem;
  color: #6a6a6a;
  margin: 0;
}
.play-btn.error {
  background: #f15e6c;
}
</style>
