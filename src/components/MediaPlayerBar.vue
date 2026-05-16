<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useMediaPlayer, formatDuration } from "../composables/useMediaPlayer";
import QueuePopup from "./QueuePopup.vue";

const {
  isPlaying,
  togglePlay,
  currTrack,
  currPlaylist,
  currIndex,
  playSong,
  currentTime,
  duration,
  seek,
  nextSong,
  prevSong,
  volumeChange,
  volumeValue,
  mute,
  muted,
  repeatMode,
  toggleRepeat,
  toggleShuffle,
  shuffleMode,
} = useMediaPlayer();

/** 0–100 fill percentage */
const trackProgressPct = computed(() =>
  duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
);

function onScrub(e: Event) {
  seek(Number((e.target as HTMLInputElement).value));
}

function onVolumeChange(e: Event) {
  volumeChange(Number((e.target as HTMLInputElement).value));
}

// ── Queue popup ───────────────────────────────
const showQueue = ref<boolean>(false);

// ── Mobile expanded panel ──────────────────────
const expanded = ref<boolean>(false);
const playerBarEl = ref<HTMLElement | null>(null);
const playerBarH = ref(88);
let barObserver: ResizeObserver | null = null;

function openExpanded() {
  if (window.innerWidth <= 640) expanded.value = !expanded.value;
}

let savedScrollY = 0;

watch(expanded, (val) => {
  if (val) {
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = "100%";
  } else {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, savedScrollY);
  }
});
const queueWrapperEl = ref<HTMLElement | null>(null);

function handleDocClick(e: MouseEvent) {
  if (
    showQueue.value &&
    queueWrapperEl.value &&
    !queueWrapperEl.value.contains(e.target as Node)
  ) {
    showQueue.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleDocClick);
  if (playerBarEl.value) {
    playerBarH.value = playerBarEl.value.offsetHeight;
    barObserver = new ResizeObserver(() => {
      playerBarH.value = playerBarEl.value?.offsetHeight ?? playerBarH.value;
    });
    barObserver.observe(playerBarEl.value);
  }
});
onUnmounted(() => {
  document.removeEventListener("click", handleDocClick);
  barObserver?.disconnect();
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
});
</script>

<template>
  <div class="player-bar" ref="playerBarEl">
    <!-- Left: track info (tap to expand on mobile) -->
    <div class="track-info" @click="openExpanded">
      <div class="track-art">
        <svg
          v-if="currTrack === undefined"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20"
          height="20"
          class="track-art-placeholder-icon"
        >
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
        </svg>
        <img
          v-else
          :src="currTrack.coverUrl"
          :alt="`${currTrack.title} cover`"
          class="cover"
          width="56"
          height="56"
        />
      </div>
      <div class="track-meta">
        <span class="track-name">
          {{ currTrack?.title || "No track playing" }}
        </span>
        <span class="track-artist">
          {{ currTrack?.artist || "-" }}
        </span>
      </div>
    </div>

    <!-- Center: playback controls -->
    <div class="control-row">
      <button
        class="icon-btn shuffle-btn"
        @click="toggleShuffle"
        :class="{ active: shuffleMode }"
        :aria-label="shuffleMode ? `Shuffle` : `Ordered`"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path
            d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
          />
        </svg>
      </button>

      <button class="icon-btn" aria-label="Previous" @click="prevSong">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>
      </button>

      <button
        class="play-btn"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        @click="togglePlay"
      >
        <svg
          v-if="isPlaying"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="22"
          height="22"
        >
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="currentColor"
          width="22"
          height="22"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <button class="icon-btn" aria-label="Next" @click="nextSong">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>

      <button
        class="icon-btn repeat-btn"
        :class="{ active: repeatMode !== 'off' }"
        :aria-label="
          repeatMode === 'one'
            ? 'Repeat one'
            : repeatMode === 'all'
              ? 'Repeat all'
              : 'Repeat'
        "
        @click="toggleRepeat"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path
            d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
          />
        </svg>
        <span v-if="repeatMode === 'one'" class="repeat-one-badge">1</span>
      </button>
    </div>

    <!-- Right: volume + extras -->
    <div class="extras">
      <div class="queue-wrapper" ref="queueWrapperEl">
        <button
          class="icon-btn"
          :class="{ active: showQueue }"
          aria-label="Queue"
          @click="showQueue = !showQueue"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path
              d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"
            />
          </svg>
        </button>
        <QueuePopup
          v-if="showQueue"
          :playlist="currPlaylist"
          :current-index="currIndex"
          :is-playing="isPlaying"
          @jump-to="
            (i) => {
              playSong(i);
            }
          "
        />
      </div>

      <div class="volume">
        <button
          class="icon-btn"
          :aria-label="muted ? 'Unmute' : 'Mute'"
          @click="mute"
        >
          <!-- Muted -->
          <svg
            v-if="muted"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path
              d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
            />
          </svg>
          <!-- Volume 0 -->
          <svg
            v-else-if="volumeValue === 0"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path d="M7 9v6h4l5 5V4l-5 5H7z" />
          </svg>
          <!-- Low volume -->
          <svg
            v-else-if="volumeValue <= 0.5"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path
              d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"
            />
          </svg>
          <!-- High volume -->
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
            />
          </svg>
        </button>
        <input
          type="range"
          class="volume-track"
          min="0"
          :max="1"
          step="any"
          :value="volumeValue"
          :style="{ '--pct': volumeValue * 100 + '%' }"
          aria-label="Volume"
          @input="onVolumeChange"
        />
      </div>
    </div>

    <!-- Seek bar: center column on desktop, full width on mobile -->
    <div class="progress-row">
      <span class="time">{{
        currTrack === undefined ? "0:00" : formatDuration(currentTime)
      }}</span>
      <input
        type="range"
        class="progress-track"
        min="0"
        :max="duration || 100"
        step="any"
        :value="currentTime"
        :style="{ '--pct': trackProgressPct + '%' }"
        aria-label="Seek"
        @input="onScrub"
      />
      <span class="time end">{{ formatDuration(duration) }}</span>
    </div>

    <!-- Mobile queue sheet -->
    <Transition name="sheet-up">
      <div v-if="expanded" class="queue-sheet">
        <div class="sheet-header" @click="expanded = false">
          <button
            class="icon-btn"
            :class="{ active: shuffleMode }"
            :aria-label="shuffleMode ? 'Shuffle on' : 'Shuffle off'"
            @click="toggleShuffle"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path
                d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
              />
            </svg>
          </button>
          <span class="sheet-label">Queue</span>
          <button
            class="icon-btn repeat-btn"
            :class="{ active: repeatMode !== 'off' }"
            :aria-label="
              repeatMode === 'one'
                ? 'Repeat one'
                : repeatMode === 'all'
                  ? 'Repeat all'
                  : 'Repeat off'
            "
            @click="toggleRepeat"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path
                d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
              />
            </svg>
            <span v-if="repeatMode === 'one'" class="repeat-one-badge">1</span>
          </button>
        </div>

        <ul class="sheet-track-list">
          <li
            v-for="(track, index) in currPlaylist"
            :key="track.id"
            class="sheet-track-row"
            :class="{ 'is-current': index === currIndex }"
            @click="
              playSong(index);
              expanded = false;
            "
          >
            <div class="sheet-track-meta">
              <span class="sheet-title-row">
                <div
                  v-if="index === currIndex"
                  class="eq-bars"
                  :class="{ paused: !isPlaying }"
                >
                  <span class="eq-bar" />
                  <span class="eq-bar" />
                  <span class="eq-bar" />
                </div>
                <span class="sheet-tl-title">{{ track.title }}</span>
              </span>
              <span class="sheet-tl-artist">{{ track.artist }}</span>
            </div>
            <span class="sheet-tl-duration">{{ track.duration }}</span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>

  <div v-if="expanded" class="sheet-backdrop" @click="expanded = false" />
</template>

<style scoped>
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: 88px;
  background: #181818;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 480px) minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  grid-template-areas:
    "track  controls  extras"
    "track  progress  extras";
  padding: 0 16px;
  column-gap: 16px;
}

/* ── Shared icon button ──────────────────────── */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #b3b3b3;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.icon-btn:hover {
  color: #fff;
}

/* ── Left: track info ────────────────────────── */
.track-info {
  grid-area: track;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.track-art {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  background: #2a2a2a;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-art-placeholder-icon {
  color: #555;
}

.track-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.track-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.75rem;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Center: controls ────────────────────────── */
.control-row {
  grid-area: controls;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 10px;
}

.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #fff;
  color: #000;
  cursor: pointer;
  transition:
    transform 0.1s,
    background 0.15s;
  flex-shrink: 0;
}

.play-btn:hover {
  transform: scale(1.06);
  background: #e0e0e0;
}

.progress-row {
  grid-area: progress;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding-bottom: 10px;
}

.time {
  font-size: 0.7rem;
  color: #b3b3b3;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  width: 32px;
}

.time.end {
  text-align: right;
}

/* ── Progress bar (input[type=range]) ───────── */
.progress-track {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  border-radius: 2px;
  /* gradient paints the filled portion; --pct is set by Vue */
  background: linear-gradient(
    to right,
    #fff var(--pct, 0%),
    #3a3a3a var(--pct, 0%)
  );
  cursor: pointer;
  outline: none;
  border: none;
  padding: 0;
  margin: 0;
}

.progress-track:hover {
  background: linear-gradient(
    to right,
    #1db954 var(--pct, 0%),
    #3a3a3a var(--pct, 0%)
  );
}

/* Webkit: transparent track so the element background shows through */
.progress-track::-webkit-slider-runnable-track {
  background: transparent;
  height: 4px;
  border-radius: 2px;
}

.progress-track::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
  margin-top: -4px; /* centre on the 4px track */
}

.progress-track:hover::-webkit-slider-thumb {
  opacity: 1;
}

/* Firefox track */
.progress-track::-moz-range-track {
  background: #3a3a3a;
  height: 4px;
  border-radius: 2px;
}

/* Firefox filled portion */
.progress-track::-moz-range-progress {
  background: #fff;
  height: 4px;
  border-radius: 2px;
}

.progress-track:hover::-moz-range-progress {
  background: #1db954;
}

.progress-track::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
}

.progress-track:hover::-moz-range-thumb {
  opacity: 1;
}

/* ── Right: extras ───────────────────────────── */
.extras {
  grid-area: extras;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.queue-wrapper {
  position: relative;
}

.icon-btn.active {
  color: #1db954;
}

.repeat-btn {
  position: relative;
}

.repeat-one-badge {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1;
  color: #1db954;
  pointer-events: none;
}

.volume {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Volume bar (input[type=range]) ─────────── */
.volume-track {
  -webkit-appearance: none;
  appearance: none;
  width: 90px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    #fff var(--pct, 0%),
    #3a3a3a var(--pct, 0%)
  );
  cursor: pointer;
  outline: none;
  border: none;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
}

.volume-track:hover {
  background: linear-gradient(
    to right,
    #1db954 var(--pct, 0%),
    #3a3a3a var(--pct, 0%)
  );
}

.volume-track::-webkit-slider-runnable-track {
  background: transparent;
  height: 4px;
  border-radius: 2px;
}

.volume-track::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
  margin-top: -4px;
}

.volume-track:hover::-webkit-slider-thumb {
  opacity: 1;
}

.volume-track::-moz-range-track {
  background: #3a3a3a;
  height: 4px;
  border-radius: 2px;
}

.volume-track::-moz-range-progress {
  background: #fff;
  height: 4px;
  border-radius: 2px;
}

.volume-track:hover::-moz-range-progress {
  background: #1db954;
}

.volume-track::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
}

.volume-track:hover::-moz-range-thumb {
  opacity: 1;
}

/* ── Mobile queue sheet ────────────────────── */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 198;
}

.queue-sheet {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 55vh;
  background: #1e1e1e;
  border-radius: 12px 12px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-up-enter-active,
.sheet-up-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-up-enter-from,
.sheet-up-leave-to {
  transform: translateY(100%);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sheet-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #b3b3b3;
}

.sheet-header .icon-btn {
  color: #b3b3b3;
  padding: 6px;
}
.sheet-header .icon-btn.active {
  color: #1db954;
}
/* color is state-only — no hover/press changes */
.sheet-header .icon-btn:not(.active):hover,
.sheet-header .icon-btn:not(.active):active {
  color: #b3b3b3;
}

.sheet-track-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 4px 8px 8px;
  scrollbar-width: thin;
  scrollbar-color: #444 transparent;
}

.sheet-track-list::-webkit-scrollbar {
  width: 4px;
}
.sheet-track-list::-webkit-scrollbar-track {
  background: transparent;
}
.sheet-track-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 2px;
}

.sheet-track-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.1s;
}
.sheet-track-row:active {
  background: rgba(255, 255, 255, 0.07);
}
.sheet-track-row.is-current {
  background: rgba(255, 255, 255, 0.1);
}

.sheet-track-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sheet-title-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}

.sheet-tl-title {
  font-size: 0.875rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.is-current .sheet-tl-title {
  color: #1db954;
}

.sheet-tl-artist {
  font-size: 0.75rem;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sheet-tl-duration {
  font-size: 0.75rem;
  color: #b3b3b3;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* eq bars */
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
  animation: eq-sheet 0.9s ease-in-out infinite;
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

@keyframes eq-sheet {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}

/* cursor hint for track-info on mobile */
@media (max-width: 640px) {
  .track-info {
    cursor: pointer;
  }
}

/* ── Mobile (≤ 640px) ───────────────────────── */
@media (max-width: 640px) {
  .player-bar {
    height: auto;
    padding: 0;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas:
      "progress progress"
      "track    controls";
    column-gap: 0;
  }

  .progress-row {
    padding: 6px 16px 4px;
  }

  .time {
    display: none;
  }

  .track-info {
    padding: 6px 12px 10px;
  }

  .track-art {
    width: 40px;
    height: 40px;
  }

  .track-art .cover {
    width: 40px;
    height: 40px;
  }

  .control-row {
    padding: 6px 12px 10px;
    padding-top: 6px;
    justify-content: flex-end;
    gap: 4px;
  }

  .control-row .shuffle-btn,
  .control-row .repeat-btn {
    display: none;
  }

  .extras {
    display: none;
  }
}
</style>
