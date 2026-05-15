<script setup lang="ts">
import type { Track } from "@/mediaProviders/MediaProvider";

const props = defineProps<{
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
}>();

const emit = defineEmits<{
  jumpTo: [index: number];
}>();
</script>

<template>
  <div class="queue-popup" role="dialog" aria-label="Queue">
    <h3 class="queue-title">Queue</h3>
    <ul class="track-list">
      <li
        v-for="(track, index) in playlist"
        :key="track.id"
        class="track-row"
        :class="{ 'is-current': index === currentIndex }"
        @click="emit('jumpTo', index)"
      >
        <div class="track-meta">
          <span class="track-title-row">
            <div
              v-if="index === currentIndex"
              class="eq-bars"
              :class="{ paused: !isPlaying }"
            >
              <span class="eq-bar" />
              <span class="eq-bar" />
              <span class="eq-bar" />
            </div>
            <span class="track-title">{{ track.title }}</span>
          </span>
          <span class="track-artist">{{ track.artist }}</span>
        </div>

        <span class="track-duration">{{ track.duration }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.queue-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: 340px;
  max-height: 420px;
  background: #282828;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
}

.queue-title {
  flex-shrink: 0;
  padding: 12px 16px 8px;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #b3b3b3;
}

/* ── Track list ──────────────────────────────── */
.track-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0 8px 8px;
  scrollbar-width: thin;
  scrollbar-color: #555 transparent;
}

.track-list::-webkit-scrollbar {
  width: 4px;
}

.track-list::-webkit-scrollbar-track {
  background: transparent;
}

.track-list::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 2px;
}

/* ── Track row ───────────────────────────────── */
.track-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}

.track-row:hover {
  background: rgba(255, 255, 255, 0.07);
}

.track-row.is-current {
  background: rgba(255, 255, 255, 0.1);
}

/* ── Equalizer bars ──────────────────────────── */
.eq-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
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

/* ── Track info ──────────────────────────────── */
.track-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.track-title-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}

.track-title {
  font-size: 0.875rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.is-current .track-title {
  color: #1db954;
}

.track-artist {
  font-size: 0.75rem;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-duration {
  font-size: 0.75rem;
  color: #b3b3b3;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
</style>
