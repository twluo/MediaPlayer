<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { Album, Track } from "../mediaProviders/MediaProvider";
import { useMediaProviders } from "../composables/useMediaProviders";
import { useMediaPlayer } from "../composables/useMediaPlayer";

const props = defineProps<{ albumId: string; providerId: string }>();

const { playAlbum, currTrack, isPlaying } = useMediaPlayer();
const { fetchAlbum } = useMediaProviders();
const router = useRouter();

const album = ref<Album | null>(null);
const tracks = ref<Track[]>([]);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const albumData = await fetchAlbum(props.providerId, props.albumId);
    album.value = albumData;
    tracks.value = albumData.tracks || [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Something went wrong";
  } finally {
    loading.value = false;
  }
});

async function playSong(trackId: string) {
  const trackIndex = tracks.value.findIndex((track) => track.id === trackId);
  if (trackIndex === -1) throw new Error("Track not found");
  playAlbum(tracks.value, trackIndex);
}

/** Tracks grouped by disc number, sorted by disc then track number. */
const groupedTracks = computed(() => {
  const groups: { disc: number; tracks: Track[] }[] = [];
  for (const track of tracks.value) {
    const disc = track.discNumber ?? 1;
    let group = groups.find((g) => g.disc === disc);
    if (!group) {
      group = { disc, tracks: [] };
      groups.push(group);
    }
    group.tracks.push(track);
  }
  groups.sort((a, b) => a.disc - b.disc);
  return groups;
});

const hasMultipleDiscs = computed(() => groupedTracks.value.length > 1);
</script>

<template>
  <div class="detail-page">
    <button class="back-btn" @click="router.back()">
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path
          d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
        />
      </svg>
      Back
    </button>

    <div v-if="loading" class="state-message">Loading…</div>
    <div v-else-if="error" class="state-message error">{{ error }}</div>

    <div v-else-if="album" class="content">
      <!-- Hero -->
      <aside class="hero">
        <img
          :src="album.coverUrl"
          :alt="`${album.title} cover`"
          class="cover"
        />
        <div class="meta">
          <p class="label">Album</p>
          <h1 class="title">{{ album.title }}</h1>
          <p class="artist">{{ album.artist }}</p>
          <p class="sub">
            {{ album.year }} &middot; {{ album.genre }} &middot;
            {{ tracks.length }} tracks
          </p>
        </div>
      </aside>

      <!-- Track list -->
      <section class="track-list">
        <div class="track-list-header">
          <span class="col-num">#</span>
          <span class="col-title">Title</span>
          <span class="col-duration">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path
                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm.01 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
              />
            </svg>
          </span>
        </div>

        <ol class="tracks">
          <template v-for="group in groupedTracks" :key="group.disc">
            <!-- Disc separator (only for multi-disc albums) -->
            <li
              v-if="hasMultipleDiscs"
              class="disc-separator"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="15"
                height="15"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                />
              </svg>
              <span>Disc {{ group.disc }}</span>
            </li>

            <li
              v-for="track in group.tracks"
              :key="track.id"
              class="track-row"
              :class="{ 'is-current': track.id === currTrack?.id }"
              @click="playSong(track.id)"
            >
              <span class="col-num">
                <div
                  v-if="track.id === currTrack?.id"
                  class="eq-bars"
                  :class="{ paused: !isPlaying }"
                >
                  <span class="eq-bar" />
                  <span class="eq-bar" />
                  <span class="eq-bar" />
                </div>
                <span v-else class="track-num">{{ track.trackNumber }}</span>
                <svg
                  class="play-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span class="col-title">
                <span class="track-title">{{ track.title }}</span>
                <span class="track-artist">{{ track.artist }}</span>
              </span>
              <span class="col-duration">{{ track.duration }}</span>
            </li>
          </template>
        </ol>
      </section>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #b3b3b3;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 6px 0;
  margin-bottom: 32px;
  transition: color 0.15s;
}

.back-btn:hover {
  color: #fff;
}

/* Hero */
.content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.hero {
  display: flex;
  gap: 32px;
  align-items: flex-end;
}

.cover {
  width: 220px;
  height: 220px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #b3b3b3;
  margin: 0;
}

.title {
  font-size: clamp(1.8rem, 5vw, 3.5rem);
  font-weight: 800;
  color: #fff;
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.artist {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.sub {
  font-size: 0.85rem;
  color: #b3b3b3;
  margin: 0;
}

/* Track list */
.track-list-header {
  display: grid;
  grid-template-columns: 40px 1fr 60px;
  align-items: center;
  padding: 0 16px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #6a6a6a;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.col-num {
  text-align: center;
}

.col-duration {
  text-align: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.tracks {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* ── Disc separator ─────────────────────────── */
.disc-separator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 16px 6px;
  color: #b3b3b3;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  user-select: none;
  pointer-events: none;
}

.disc-separator:not(:first-child) {
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.disc-separator svg {
  flex-shrink: 0;
  opacity: 0.6;
}

.track-row {
  display: grid;
  grid-template-columns: 40px 1fr 60px;
  align-items: center;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.track-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.track-row .col-num {
  position: relative;
  color: #b3b3b3;
  font-size: 0.9rem;
}

.track-row .track-num {
  display: block;
}

.track-row .play-icon {
  display: none;
  color: #fff;
}

.track-row:hover .track-num {
  display: none;
}

.track-row:hover .play-icon {
  display: block;
}

/* ── Equalizer bars ──────────────────────────── */
.eq-bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 16px;
  width: 16px;
}

.eq-bar {
  width: 3px;
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
  height: 4px;
}

@keyframes eq {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}

/* On hover, hide bars and show play icon for the current row too */
.track-row.is-current:hover .eq-bars {
  display: none;
}

.track-row.is-current:hover .play-icon {
  display: block;
}

.track-row .col-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.track-title {
  font-size: 0.95rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-row.is-current .track-title {
  color: #1db954;
}

.track-artist {
  font-size: 0.78rem;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-row .col-duration {
  font-size: 0.85rem;
  color: #b3b3b3;
  font-variant-numeric: tabular-nums;
}

/* States */
.state-message {
  margin: 80px auto;
  text-align: center;
  color: #b3b3b3;
  font-size: 0.95rem;
}

.state-message.error {
  color: #f15e6c;
}

/* Responsive */
@media (max-width: 560px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .cover {
    width: 160px;
    height: 160px;
  }
}
</style>
