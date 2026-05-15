<script setup lang="ts">
import { useMediaProviders } from "../composables/useMediaProviders";
import AlbumGrid from "../components/AlbumGrid.vue";

const { fetchAlbums } = useMediaProviders();
</script>

<template>
  <AlbumGrid title="Albums" :fetcher="fetchAlbums" />
</template>
