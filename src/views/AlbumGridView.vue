<script setup lang="ts">
import { watch, onMounted } from "vue";
import { useMediaProviders } from "../composables/useMediaProviders";
import AlbumGrid from "../components/AlbumGrid.vue";
import SearchPopup from "../components/SearchPopup.vue";

const { fetchAlbums, albums, albumsLoading, albumsError, providers } =
  useMediaProviders();

onMounted(fetchAlbums);
watch(providers, fetchAlbums, { deep: true });
</script>

<template>
  <AlbumGrid
    title="Albums"
    :albums="albums"
    :loading="albumsLoading"
    :error="albumsError"
  />
  <SearchPopup />
</template>
