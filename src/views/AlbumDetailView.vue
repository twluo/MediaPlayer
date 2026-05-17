<script setup lang="ts">
import { useRoute } from "vue-router";
import AlbumDetail from "../components/AlbumDetail.vue";

const route = useRoute();
const albumId = String(route.params.albumId);
const providerId = String(route.params.providerId);
const autoplay = route.query.autoplay === "1";
</script>

<template>
  <AlbumDetail
    :album-id="albumId"
    :provider-id="providerId"
    :autoplay="autoplay"
  />
</template>
