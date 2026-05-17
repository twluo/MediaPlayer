import { computed, ref, watch } from "vue";
import type { Track } from "../mediaProviders/MediaProvider";
import { useMediaProviders } from "./useMediaProviders";

export { formatDuration } from "../utils/format";

// ── Persistence helpers ──────────────────────────────────
const STORAGE_REPEAT = "media-player:repeatMode";
const STORAGE_SHUFFLE = "media-player:shuffleMode";
const STORAGE_VOLUME = "media-player:volume";

const { scrobble } = useMediaProviders();

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
const playbackTime = ref<number>(0);
const duration = ref<number>(0);
const listeningTime = ref(0);
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
const isContinuing = computed(
  () =>
    repeatMode.value !== "off" ||
    currIndex.value < currPlaylist.value.length - 1,
);
let listeningInterval: ReturnType<typeof setInterval> | null = null;

playback.preload = "metadata";
playback.volume = volumeValue.value;

// Persist preferences whenever they change
watch(repeatMode, (v) => localStorage.setItem(STORAGE_REPEAT, v));
watch(shuffleMode, (v) => localStorage.setItem(STORAGE_SHUFFLE, String(v)));
watch(volumeValue, (v) => localStorage.setItem(STORAGE_VOLUME, String(v)));

function resumeListeningTimer() {
  if (listeningInterval !== null) return;
  listeningInterval = setInterval(() => {
    listeningTime.value++;
    if (currTrack.value && listeningTime.value % 10 === 0) {
      scrobble(
        currTrack.value,
        "playing",
        playbackTime.value,
        listeningTime.value,
        isContinuing.value ? "1" : "0",
      );
    }
  }, 1000);
}

function pauseListeningTimer() {
  if (listeningInterval !== null) {
    clearInterval(listeningInterval);
    listeningInterval = null;
  }
}

playback.addEventListener("play", () => {
  isPlaying.value = true;
  resumeListeningTimer();
});

playback.addEventListener("pause", () => {
  isPlaying.value = false;
  pauseListeningTimer();
  if (currTrack.value) {
    scrobble(
      currTrack.value,
      "paused",
      playbackTime.value,
      listeningTime.value,
      isContinuing.value ? "1" : "0",
    );
  }
});

playback.addEventListener("timeupdate", () => {
  playbackTime.value = playback.currentTime;
  syncPositionState();
});

playback.addEventListener("durationchange", () => {
  duration.value = Number.isFinite(playback.duration) ? playback.duration : 0;
  syncPositionState();
});

playback.addEventListener("ended", nextSong);

function playSong(index: number) {
  if (!currPlaylist.value || !currPlaylist.value[index]) return;
  currIndex.value = index;
  currTrack.value = currPlaylist.value[index];
  playback.src = currTrack.value.streamUrl;
  playback.play();
}

function seek(seconds: number) {
  if (!Number.isFinite(seconds)) return;
  playback.currentTime = Math.max(0, seconds);
}

function nextSong() {
  if (currTrack.value) {
    scrobble(
      currTrack.value,
      "stopped",
      playbackTime.value,
      listeningTime.value,
      isContinuing.value ? "1" : "0",
    );
  }
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
    playbackTime.value = 0;
    duration.value = 0;
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

function syncPositionState() {
  if (!("mediaSession" in navigator)) return;
  const dur = playback.duration;
  if (!Number.isFinite(dur) || dur <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: dur,
      playbackRate: playback.playbackRate,
      position: Math.min(playback.currentTime, dur),
    });
  } catch {}
}

if ("mediaSession" in navigator) {
  // Playback controls forwarded from the OS / browser chrome.
  navigator.mediaSession.setActionHandler("play", () => playback.play());
  navigator.mediaSession.setActionHandler("pause", () => playback.pause());
  navigator.mediaSession.setActionHandler("previoustrack", prevSong);
  navigator.mediaSession.setActionHandler("nexttrack", nextSong);
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime != null) {
      seek(details.seekTime);
      syncPositionState();
    }
  });
}

watch(currTrack, (track) => {
  pauseListeningTimer();
  listeningTime.value = 0;
  if (!("mediaSession" in navigator)) return;
  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    artwork: track.coverUrl ? [{ src: track.coverUrl }] : [],
  });
});

watch(isPlaying, (playing) => {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.playbackState = playing ? "playing" : "paused";
});

export function useMediaPlayer() {
  function playAlbum(playlist: Track[], index: number = 0) {
    currPlaylist.value = playlist;
    orderedPlaylist.value = playlist;
    playSong(index);
    if (shuffleMode.value) {
      shufflePlaylist();
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
    for (let i = playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlist[i], playlist[j]] = [playlist[j]!, playlist[i]!];
    }
    currPlaylist.value = [currTrack.value].concat(playlist);
    currIndex.value = 0;
  }

  return {
    currTrack,
    currPlaylist,
    currIndex,
    isPlaying,
    currentTime: playbackTime,
    duration,
    listeningTime,
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
