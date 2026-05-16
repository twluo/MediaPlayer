import { ref, watch } from "vue";
import type { Track } from "@/mediaProviders/MediaProvider";

export { formatDuration } from "../utils/format";

// ── Persistence helpers ──────────────────────────────────
const STORAGE_REPEAT = "media-player:repeatMode";
const STORAGE_SHUFFLE = "media-player:shuffleMode";
const STORAGE_VOLUME = "media-player:volume";

function readStorage<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T,
): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ── Singleton state ──────────────────────────────────
const playback = new Audio();
const currPlaylist = ref<Track[]>([]);
const orderedPlaylist = ref<Track[]>([]);
const currIndex = ref<number>(0);
const currTrack = ref<Track | undefined>(undefined);
const isPlaying = ref<boolean>(false);
const currentTime = ref<number>(0);
const duration = ref<number>(0);
const volumeValue = ref<number>(readStorage(STORAGE_VOLUME, 0.7, Number));
const muted = ref<boolean>(false);
const repeatMode = ref<"off" | "all" | "one">(
  readStorage(
    STORAGE_REPEAT,
    "off" as const,
    (v) => v as "off" | "all" | "one",
  ),
);
const shuffleMode = ref<boolean>(
  readStorage(STORAGE_SHUFFLE, false, (v) => v === "true"),
);

playback.preload = "metadata";
playback.volume = volumeValue.value;

// Persist preferences whenever they change
watch(repeatMode, (v) => localStorage.setItem(STORAGE_REPEAT, v));
watch(shuffleMode, (v) => localStorage.setItem(STORAGE_SHUFFLE, String(v)));
watch(volumeValue, (v) => localStorage.setItem(STORAGE_VOLUME, String(v)));
playback.addEventListener("play", () => {
  isPlaying.value = true;
});

playback.addEventListener("pause", () => {
  isPlaying.value = false;
});

playback.addEventListener("timeupdate", () => {
  currentTime.value = playback.currentTime;
});

playback.addEventListener("durationchange", () => {
  duration.value = Number.isFinite(playback.duration) ? playback.duration : 0;
});

playback.addEventListener("ended", nextSong);

function playSong(index: number) {
  if (!currPlaylist.value || !currPlaylist.value[index]) return;
  currIndex.value = index;
  currTrack.value = currPlaylist.value[index];
  playback.src = currTrack.value.streamUrl;
  playback.play();
}

function nextSong() {
  if (repeatMode.value === "one") {
    playback.currentTime = 0;
    playback.play();
  } else if (currIndex.value < currPlaylist.value.length - 1) {
    playSong(currIndex.value + 1);
  } else if (repeatMode.value === "all") {
    playSong(0);
  } else {
    currTrack.value = undefined;
    currPlaylist.value = [];
    playback.pause();
    playback.removeAttribute("src");
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
  }
}

export function useMediaPlayer() {
  function playAlbum(playlist: Track[], index: number = 0) {
    currPlaylist.value = playlist;
    orderedPlaylist.value = playlist;
    playSong(index);
    if (shuffleMode.value) {
      shufflePlaylist();
    }
  }

  function prevSong() {
    if (playback.currentTime > 3) {
      playback.currentTime = 0;
    } else {
      currIndex.value = Math.max(0, currIndex.value - 1);
      playSong(currIndex.value);
    }
  }

  function togglePlay() {
    if (!playback.src) {
      return;
    }
    if (playback.paused) {
      playback.play();
    } else {
      playback.pause();
    }
  }

  function seek(seconds: number) {
    if (!Number.isFinite(seconds)) return;
    playback.currentTime = Math.max(0, seconds);
  }

  function volumeChange(newVolume: number) {
    if (!Number.isFinite(newVolume)) return;
    playback.volume = newVolume;
    volumeValue.value = newVolume;
  }

  function mute() {
    playback.muted = !playback.muted;
    muted.value = playback.muted;
  }

  function toggleRepeat() {
    if (repeatMode.value === "off") repeatMode.value = "all";
    else if (repeatMode.value === "all") repeatMode.value = "one";
    else repeatMode.value = "off";
  }

  function toggleShuffle() {
    shuffleMode.value = !shuffleMode.value;
    if (currTrack.value === undefined) return;
    if (shuffleMode.value) {
      shufflePlaylist();
    } else {
      const id = currTrack.value.id;
      const index = orderedPlaylist.value.findIndex((track) => track.id === id);
      currPlaylist.value = orderedPlaylist.value;
      currIndex.value = index;
    }
  }

  function shufflePlaylist() {
    if (currTrack.value === undefined) return;
    const playlist = currPlaylist.value.slice();
    playlist.splice(currIndex.value, 1);
    playlist.sort(() => Math.random() - 0.5);
    currPlaylist.value = [currTrack.value].concat(playlist);
    currIndex.value = 0;
  }

  return {
    currTrack,
    currPlaylist,
    currIndex,
    isPlaying,
    currentTime,
    duration,
    playAlbum,
    playSong,
    togglePlay,
    seek,
    nextSong,
    prevSong,
    volumeValue,
    volumeChange,
    mute,
    muted,
    repeatMode,
    toggleRepeat,
    toggleShuffle,
    shuffleMode,
  };
}
