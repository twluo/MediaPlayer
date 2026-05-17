<script setup lang="ts">
import {
  computed,
  onMounted,
  onBeforeUnmount,
  ref,
  nextTick,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { useMediaProviders } from "../composables/useMediaProviders";
import { useSearchState } from "../composables/useSearchState";
import AlbumCard from "./AlbumCard.vue";

const { albums } = useMediaProviders();
const { query, isOpen, close } = useSearchState();
const route = useRoute();
const inputRef = ref<HTMLInputElement | null>(null);

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return albums.value.filter(
    (a) =>
      a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q),
  );
});

// Lock background scroll while popup is open by removing the scrollbar,
// have to add the difference to prevent the elements from shifting
watch(isOpen, (val) => {
  if (val) {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.documentElement.style.overflow = "hidden";
  } else {
    document.body.style.paddingRight = "";
    document.documentElement.style.overflow = "";
  }
});

// Close and reset when navigating away (e.g. clicking an album card)
watch(() => route.path, close);

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

watch(isOpen, (val) => {
  if (val) nextTick(() => inputRef.value?.focus());
});

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.paddingRight = "";
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop-fade">
      <div v-if="isOpen" class="backdrop" @click.self="close">
        <Transition name="popup-slide" appear>
          <div class="popup">
            <!-- Search bar -->
            <div class="search-bar">
              <button
                class="close-btn"
                aria-label="Close search"
                @click="close"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path
                    d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                  />
                </svg>
              </button>
              <input
                ref="inputRef"
                v-model="query"
                class="search-input"
                type="search"
                placeholder="Search albums or artists…"
                autocomplete="off"
                spellcheck="false"
                aria-label="Search"
              />
              <Transition name="fade">
                <button
                  v-if="query"
                  class="clear-btn"
                  aria-label="Clear search"
                  @click="query = ''"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="16"
                    height="16"
                  >
                    <path
                      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    />
                  </svg>
                </button>
              </Transition>
            </div>

            <!-- Results -->
            <div class="results">
              <div v-if="!query" class="state-message">
                Search across your entire library.
              </div>
              <div v-else-if="results.length === 0" class="state-message">
                No albums found for <em>"{{ query }}"</em>
              </div>
              <div v-else class="album-grid">
                <AlbumCard
                  v-for="album in results"
                  :key="`${album.providerId}:${album.id}`"
                  :album="album"
                />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80px;
  padding-bottom: 40px;
}

.popup {
  width: min(700px, calc(100vw - 32px));
  max-height: 100%;
  background: #161616;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
}

/* ── Search bar ──────────────────────────────── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: #b3b3b3;
  cursor: pointer;
  flex-shrink: 0;
  padding: 6px;
  transition:
    background 0.15s,
    color 0.15s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
  padding: 16px 0;
  min-width: 0;
}

.search-input::placeholder {
  color: #555;
}

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

/* ── Results ─────────────────────────────────── */
.results {
  overflow-y: auto;
  flex: 1;
  padding: 16px;
}

.state-message {
  text-align: center;
  padding: 40px 0;
  color: #6a6a6a;
  font-size: 0.9rem;
}

.state-message em {
  font-style: normal;
  color: #b3b3b3;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

/* ── Transitions ─────────────────────────────── */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.2s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.popup-slide-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.popup-slide-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Mobile ──────────────────────────────────── */
@media (max-width: 600px) {
  .backdrop {
    padding-top: 0;
    padding-bottom: 0;
    align-items: stretch;
  }

  .popup {
    width: 100%;
    max-height: 100%;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}
</style>
