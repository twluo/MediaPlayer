<script setup lang="ts">
import { ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

const isOpen = ref<boolean>(false);
const route = useRoute();

// Close automatically whenever the route changes
watch(
  () => route.path,
  () => {
    isOpen.value = false;
  },
);
</script>

<template>
  <!-- Hamburger button -->
  <button
    class="hamburger"
    :class="{ open: isOpen }"
    aria-label="Toggle menu"
    @click="isOpen = !isOpen"
  >
    <span />
    <span />
    <span />
  </button>

  <!-- Backdrop -->
  <Transition name="fade">
    <div v-if="isOpen" class="backdrop" @click="isOpen = false" />
  </Transition>

  <!-- Sidebar -->
  <Transition name="slide">
    <nav v-if="isOpen" class="sidebar">
      <p class="sidebar-heading">Menu</p>

      <ul class="nav-list">
        <li>
          <RouterLink to="/" class="nav-item">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
            Albums
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/recent" class="nav-item">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path
                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm.01 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
              />
            </svg>
            Recently Added
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/settings" class="nav-item">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.01 7.01 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4a.484.484 0 0 0-.48.41l-.36 2.54a7.3 7.3 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.27.41.49.41h4c.22 0 .44-.17.47-.41l.36-2.54a7.3 7.3 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
              />
            </svg>
            Settings
          </RouterLink>
        </li>
      </ul>
    </nav>
  </Transition>
</template>

<style scoped>
/* ── Hamburger ─────────────────────────────────────── */
.hamburger {
  position: fixed;
  top: 18px;
  left: 20px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
}

.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: #fff;
  border-radius: 2px;
  transform-origin: center;
  transition:
    transform 0.25s ease,
    opacity 0.2s ease;
}

/* Animate to × */
.hamburger.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.hamburger.open span:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}
.hamburger.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ── Backdrop ──────────────────────────────────────── */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.55);
}

/* ── Sidebar ───────────────────────────────────────── */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 150;
  width: 240px;
  background: #181818;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
}

.sidebar-heading {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #6a6a6a;
  margin: 48px 0 12px 12px;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  color: #b3b3b3;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition:
    background 0.15s,
    color 0.15s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.nav-item.router-link-exact-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

/* ── Transitions ───────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
