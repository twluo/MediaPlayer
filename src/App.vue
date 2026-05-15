<script setup lang="ts">
import AppNav from "./components/AppNav.vue";
import MediaPlayerBar from "./components/MediaPlayerBar.vue";
</script>

<template>
  <div class="app">
    <AppNav />
    <RouterView />
    <MediaPlayerBar />
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  overflow-x: hidden;
}

body {
  margin: 0;
  overflow-x: hidden;
  background: #121212;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color: #fff;
  min-height: 100vh;
}

.app {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 52px 16px 104px;
}
</style>
