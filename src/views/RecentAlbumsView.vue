<script setup lang="ts">
import { watch, onMounted } from "vue";
import { useMediaProviders } from "../composables/useMediaProviders";
import AlbumGrid from "../components/AlbumGrid.vue";

const {
  fetchRecentAlbums,
  recentAlbums,
  recentAlbumsLoading,
  recentAlbumsError,
  enabledProviderIds,
} = useMediaProviders();

onMounted(fetchRecentAlbums);
watch(enabledProviderIds, fetchRecentAlbums);
</script>

<template>
  <AlbumGrid
    title="Recently Added"
    :albums="recentAlbums"
    :loading="recentAlbumsLoading"
    :error="recentAlbumsError"
  />
</template>
