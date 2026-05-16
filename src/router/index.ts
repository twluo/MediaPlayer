import { createRouter, createWebHashHistory } from "vue-router";
import AlbumGridView from "../views/AlbumGridView.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: AlbumGridView,
    },
    {
      path: "/albums/:providerId/:albumId",
      component: () => import("../views/AlbumDetailView.vue"),
    },
    {
      path: "/search",
      component: () => import("../views/SearchView.vue"),
    },
    {
      path: "/recent",
      component: () => import("../views/RecentAlbumsView.vue"),
    },
    {
      path: "/settings",
      component: () => import("../views/SettingsView.vue"),
    },
  ],
});
