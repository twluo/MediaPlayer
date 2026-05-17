<script setup lang="ts">
import { watch, onMounted } from "vue";
import { useMediaProviders } from "../composables/useMediaProviders";
import AlbumGrid from "../components/AlbumGrid.vue";

const { fetchAlbums, albums, albumsLoading, albumsError, enabledProviderIds } =
  useMediaProviders();

onMounted(fetchAlbums);
watch(enabledProviderIds, fetchAlbums);
</script>

<template>
  <AlbumGrid
    title="Albums"
    :albums="albums"
    :loading="albumsLoading"
    :error="albumsError"
  />
</template>
