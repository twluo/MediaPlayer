<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useMediaProviders } from "../composables/useMediaProviders";
import { useSearchState } from "../composables/useSearchState";

const { fetchAlbums, fetchRecentAlbums } = useMediaProviders();
const { isOpen, open } = useSearchState();
const route = useRoute();

const refreshFn = computed(() => {
  if (route.path === "/") return fetchAlbums;
  if (route.path === "/recent") return fetchRecentAlbums;
  return null;
});

const isRefreshing = ref(false);

async function handleRefresh() {
  if (isRefreshing.value || !refreshFn.value) return;
  isRefreshing.value = true;
  try {
    await refreshFn.value();
  } finally {
    isRefreshing.value = false;
  }
}
</script>

<template>
  <nav class="nav-pills">
    <button
      v-if="refreshFn"
      class="nav-pill refresh-btn"
      :class="{ refreshing: isRefreshing }"
      :disabled="isRefreshing"
      aria-label="Refresh library"
      @click="handleRefresh"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path
          d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
        />
      </svg>
    </button>

    <button
      v-if="route.path === '/'"
      class="nav-pill"
      :class="{ 'router-link-exact-active': isOpen }"
      aria-label="Search"
      @click="open"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path
          d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
        />
      </svg>
      <span class="pill-label">Search</span>
    </button>

    <RouterLink to="/" class="nav-pill">
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
      </svg>
      <span class="pill-label">Albums</span>
    </RouterLink>

    <RouterLink to="/recent" class="nav-pill">
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path
          d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm.01 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
        />
      </svg>
      <span class="pill-label">Recently Added</span>
    </RouterLink>

    <RouterLink to="/settings" class="nav-pill">
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path
          d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.01 7.01 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4a.484.484 0 0 0-.48.41l-.36 2.54a7.3 7.3 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.27.41.49.41h4c.22 0 .44-.17.47-.41l.36-2.54a7.3 7.3 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
        />
      </svg>
      <span class="pill-label">Settings</span>
    </RouterLink>
  </nav>

  <Transition name="fade">
    <button
      v-if="refreshFn"
      class="refresh-btn"
      :class="{ refreshing: isRefreshing }"
      :disabled="isRefreshing"
      aria-label="Refresh library"
      @click="handleRefresh"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path
          d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
        />
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.nav-pills {
  position: fixed;
  top: 16px;
  right: 20px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #b3b3b3;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  white-space: nowrap;
}

.nav-pill:hover {
  background: rgba(50, 50, 50, 0.9);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.15);
}

.nav-pill.router-link-exact-active {
  background: rgba(30, 30, 30, 0.95);
  color: #1db954;
  border-color: #1db954;
}

/* ── Refresh button ──────────────────────────────────── */
.refresh-btn {
  position: fixed;
  top: 16px;
  left: 20px;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #b3b3b3;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.refresh-btn:hover {
  background: rgba(50, 50, 50, 0.9);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.15);
}

.refresh-btn:disabled {
  cursor: default;
}

.refresh-btn svg {
  transition: transform 0.3s ease;
}

.refresh-btn.refreshing svg {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile: drop text labels, keep icon-only pills */
@media (max-width: 540px) {
  .pill-label {
    display: none;
  }

  .nav-pill {
    padding: 7px 10px;
  }
}
</style>
