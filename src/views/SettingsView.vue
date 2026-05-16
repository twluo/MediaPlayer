<script setup lang="ts">
import { ref } from "vue";
import MediaProviderDialog from "../components/MediaProviderDialog.vue";
import type { MediaProviderConfig } from "../mediaProviders/MediaProvider";
import { useMediaProviders } from "../composables/useMediaProviders";

const { providers, addProvider, removeProvider, toggleProvider } =
  useMediaProviders();

const showProviderDialog = ref<boolean>(false);

function onProviderConnect(config: MediaProviderConfig) {
  addProvider(config);
  showProviderDialog.value = false;
}
</script>

<template>
  <div class="settings-page">
    <h1 class="page-title">Settings</h1>

    <!-- Media Providers -->
    <section class="section">
      <h2 class="section-title">Media Providers</h2>

      <ul v-if="providers.size" class="provider-list">
        <li
          v-for="[k, p] in providers"
          :key="k"
          class="provider-item"
          :class="{ disabled: !p.enabled }"
        >
          <span class="provider-badge" :class="p.type">{{
            p.type === "plex" ? "P" : "N"
          }}</span>
          <div class="provider-item-info">
            <span class="provider-item-name">{{
              p.type === "plex" ? "Plex" : "Navidrome"
            }}</span>
            <span class="provider-item-id">{{ p.config.id }}</span>
            <span class="provider-item-url">{{
              p.type === "plex" && p.config.serverName
                ? p.config.serverName
                : p.config.url
            }}</span>
          </div>
          <div class="provider-item-actions">
            <button
              class="toggle"
              :class="{ on: p.enabled }"
              :aria-pressed="p.enabled"
              :aria-label="p.enabled ? 'Disable provider' : 'Enable provider'"
              @click="toggleProvider(p.config.id)"
            >
              <span class="toggle-thumb" />
            </button>
            <button
              class="remove-btn"
              aria-label="Remove provider"
              @click="removeProvider(p.config.id)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path
                  d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                />
              </svg>
            </button>
          </div>
        </li>
      </ul>

      <p v-else class="provider-empty">No providers configured.</p>

      <button class="add-provider-btn" @click="showProviderDialog = true">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        Add Provider
      </button>
    </section>

    <MediaProviderDialog
      v-if="showProviderDialog"
      :existing-ids="Array.from(providers.keys())"
      @close="showProviderDialog = false"
      @connect="onProviderConnect"
    />

    <!-- About -->
    <section class="section">
      <h2 class="section-title">About</h2>
      <div class="about-card">
        <p class="about-name">Media Player</p>
        <p class="about-version">Version 0.0.0</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 36px;
  letter-spacing: -0.02em;
}

/* Section */
.section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6a6a6a;
  margin: 0 0 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* Row */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.95rem;
  color: #fff;
}

.setting-hint {
  font-size: 0.8rem;
  color: #6a6a6a;
}

/* Select */
.select {
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 0.875rem;
  padding: 6px 10px;
  cursor: pointer;
  outline: none;
  flex-shrink: 0;
}

.select:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

/* Slider */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 120px;
  height: 4px;
  border-radius: 2px;
  background: #3a3a3a;
  outline: none;
  cursor: pointer;
  flex-shrink: 0;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}

/* Toggle */
.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: #3a3a3a;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
  padding: 0;
}

.toggle.on {
  background: #1db954;
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.toggle.on .toggle-thumb {
  transform: translateX(20px);
}

/* Provider list */
.provider-list {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transition: opacity 0.2s;
}

.provider-item.disabled {
  opacity: 0.45;
}

.provider-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.provider-badge.plex {
  background: #e5a00d;
  color: #000;
}

.provider-badge.navidrome {
  background: #3d6ce8;
  color: #fff;
}

.provider-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-item-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
}

.provider-item-id {
  font-size: 0.75rem;
  font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
  color: #b3b3b3;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  padding: 1px 5px;
  width: fit-content;
}

.provider-item-url {
  font-size: 0.78rem;
  color: #6a6a6a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #6a6a6a;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.remove-btn:hover {
  background: rgba(241, 94, 108, 0.15);
  color: #f15e6c;
}

.provider-empty {
  font-size: 0.875rem;
  color: #6a6a6a;
  margin: 4px 0 10px;
}

.add-provider-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  color: #b3b3b3;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 7px 14px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
  margin-top: 2px;
}

.add-provider-btn:hover {
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
}

/* About */
.about-card {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.about-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.about-version {
  font-size: 0.85rem;
  color: #6a6a6a;
  margin: 0;
}
</style>
