<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AlbumDetail from "../components/AlbumDetail.vue";

const route = useRoute();
const albumId = computed(() => String(route.params.albumId));
const providerId = computed(() => String(route.params.providerId));
const autoplay = computed(() => route.query.autoplay === "1");
</script>

<template>
  <AlbumDetail
    :key="`${providerId}-${albumId}`"
    :album-id="albumId"
    :provider-id="providerId"
    :autoplay="autoplay"
  />
</template>
