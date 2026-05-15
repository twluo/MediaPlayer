<script setup lang="ts">
import { useMediaProviders } from '../composables/useMediaProviders'
import AlbumGrid from '../components/AlbumGrid.vue'

const { fetchRecentAlbums } = useMediaProviders()
</script>

<template>
  <AlbumGrid title="Recently Added" :fetcher="fetchRecentAlbums" />
</template>
