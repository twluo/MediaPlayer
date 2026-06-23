<script setup lang="ts">
import { ref, watch } from "vue";
import MediaProviderDialog from "../components/MediaProviderDialog.vue";
import type { MediaProviderConfig } from "../mediaProviders/MediaProvider";
import { useMediaProviders } from "../composables/useMediaProviders";
import { useSyncServerSettings } from "../composables/useSyncServerSettings";

const {
  providers,
  addProvider,
  removeProvider,
  toggleProvider,
  exportProviders,
  importProviders,
} = useMediaProviders();

const showProviderDialog = ref<boolean>(false);
const showExportDialog = ref<boolean>(false);
const showImportDialog = ref<boolean>(false);
const exportedJson = ref<string>("");
const importJson = ref<string>("");
const importError = ref<string | null>(null);
const importSuccess = ref<string | null>(null);

const cloudExporting = ref(false);
const cloudImporting = ref(false);
const syncSessions = ref(false);

const {
  settings: syncServerSettings,
  validating,
  validationError,
  validationSuccess,
  setAndValidateUrl,
  setUrl,
  clearUrl,
} = useSyncServerSettings();

const tempSyncServerUrl = ref<string>(syncServerSettings.value.url);
let validationTimeout: ReturnType<typeof setTimeout> | null = null;

function onProviderConnect(config: MediaProviderConfig) {
  addProvider(config);
  showProviderDialog.value = false;
}

function handleExport() {
  try {
    exportedJson.value = exportProviders();
    showExportDialog.value = true;
  } catch (err) {
    console.error("Export failed:", err);
  }
}

function copyToClipboard() {
  navigator.clipboard.writeText(exportedJson.value).then(
    () => {
      importSuccess.value = "Copied to clipboard!";
      showExportDialog.value = false;
      setTimeout(() => {
        importSuccess.value = null;
      }, 2000);
    },
    (err) => {
      console.error("Failed to copy:", err);
    },
  );
}

function handleImport() {
  importJson.value = "";
  showImportDialog.value = true;
  importError.value = null;
}

function executeImport() {
  if (!importJson.value.trim()) {
    importError.value = "Please paste JSON data";
    return;
  }

  const result = importProviders(importJson.value);

  if (result.success) {
    importSuccess.value = `Successfully imported ${result.count} provider(s)`;
    importError.value = null;
    showImportDialog.value = false;
    importJson.value = "";
    setTimeout(() => {
      importSuccess.value = null;
    }, 3000);
  } else {
    importError.value = result.error || "Import failed";
  }
}

async function handleExportToCloud() {
  if (!syncServerSettings.value.validated || !syncServerSettings.value.url) {
    importError.value = "Sync server URL must be validated first";
    return;
  }

  cloudExporting.value = true;
  importError.value = null;
  importSuccess.value = null;

  try {
    const jsonData = exportProviders();
    const url = `${syncServerSettings.value.url}/servers`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: jsonData,
    });

    if (!response.ok) {
      throw new Error(`Export failed with status ${response.status}`);
    }

    importSuccess.value = "Successfully exported providers to cloud!";
    setTimeout(() => {
      importSuccess.value = null;
    }, 3000);
  } catch (err) {
    importError.value =
      err instanceof Error
        ? `Cloud export failed: ${err.message}`
        : "Cloud export failed";
    console.error("Cloud export error:", err);
  } finally {
    cloudExporting.value = false;
  }
}

async function handleImportFromCloud() {
  if (!syncServerSettings.value.validated || !syncServerSettings.value.url) {
    importError.value = "Sync server URL must be validated first";
    return;
  }

  cloudImporting.value = true;
  importError.value = null;
  importSuccess.value = null;

  try {
    const url = `${syncServerSettings.value.url}/servers`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Import failed with status ${response.status}`);
    }

    const jsonData = await response.text();
    const result = importProviders(jsonData);

    if (result.success) {
      importSuccess.value = `Successfully imported ${result.count} provider(s) from cloud!`;
      setTimeout(() => {
        importSuccess.value = null;
      }, 3000);
    } else {
      importError.value = result.error || "Import failed";
    }
  } catch (err) {
    importError.value =
      err instanceof Error
        ? `Cloud import failed: ${err.message}`
        : "Cloud import failed";
    console.error("Cloud import error:", err);
  } finally {
    cloudImporting.value = false;
  }
}

async function handleValidateUrl() {
  // Cancel any pending validation timeout
  if (validationTimeout) {
    clearTimeout(validationTimeout);
    validationTimeout = null;
  }
  await setAndValidateUrl(tempSyncServerUrl.value);
}

function extractPort(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.port || (urlObj.protocol === "https:" ? "443" : "80");
  } catch {
    return null;
  }
}

// Watch for changes in the URL input with debouncing
watch(tempSyncServerUrl, (newUrl, oldUrl) => {
  // Clear any existing timeout
  if (validationTimeout) {
    clearTimeout(validationTimeout);
    validationTimeout = null;
  }

  // Don't validate if empty or same as saved URL
  if (!newUrl.trim() || newUrl.trim() === syncServerSettings.value.url) {
    return;
  }

  // Check if port has changed
  const newPort = extractPort(newUrl);
  const oldPort = extractPort(oldUrl);

  // If port changed, validate immediately
  if (newPort && oldPort && newPort !== oldPort) {
    setAndValidateUrl(newUrl);
    return;
  }

  // Otherwise, debounce validation for 1 second
  validationTimeout = setTimeout(() => {
    if (newUrl.trim() && newUrl.trim() !== syncServerSettings.value.url) {
      setAndValidateUrl(newUrl);
    }
  }, 1000);
});

function handleClearUrl() {
  tempSyncServerUrl.value = "";
  clearUrl();
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString();
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

      <div class="provider-actions">
        <button class="add-provider-btn" @click="showProviderDialog = true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Provider
        </button>
        <button
          class="import-export-btn"
          :disabled="providers.size === 0"
          @click="handleExport"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
          </svg>
          Export
        </button>
        <button class="import-export-btn" @click="handleImport">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          Import
        </button>
      </div>

      <!-- Cloud Export/Import Buttons (only show when server URL is validated) -->
      <div
        v-if="syncServerSettings.validated"
        class="provider-actions cloud-actions"
      >
        <button
          class="cloud-btn"
          :disabled="providers.size === 0 || cloudExporting"
          @click="handleExportToCloud"
        >
          <svg
            v-if="!cloudExporting"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path
              d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
            />
          </svg>
          <svg
            v-else
            class="spinner"
            viewBox="0 0 24 24"
            fill="none"
            width="16"
            height="16"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="60"
              stroke-dashoffset="45"
            />
          </svg>
          {{ cloudExporting ? "Exporting..." : "Export to Cloud" }}
        </button>
        <button
          class="cloud-btn"
          :disabled="cloudImporting"
          @click="handleImportFromCloud"
        >
          <svg
            v-if="!cloudImporting"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path
              d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"
            />
          </svg>
          <svg
            v-else
            class="spinner"
            viewBox="0 0 24 24"
            fill="none"
            width="16"
            height="16"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="60"
              stroke-dashoffset="45"
            />
          </svg>
          {{ cloudImporting ? "Importing..." : "Import from Cloud" }}
        </button>
      </div>

      <div v-if="importSuccess" class="status-message success">
        {{ importSuccess }}
      </div>
      <div v-if="importError" class="status-message error">
        {{ importError }}
      </div>
    </section>

    <MediaProviderDialog
      v-if="showProviderDialog"
      :existing-ids="Array.from(providers.keys())"
      @close="showProviderDialog = false"
      @connect="onProviderConnect"
    />

    <!-- Export Dialog -->
    <div
      v-if="showExportDialog"
      class="dialog-overlay"
      @click="showExportDialog = false"
    >
      <div class="dialog export-dialog" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">Export Providers</h3>
          <button
            class="dialog-close"
            aria-label="Close"
            @click="showExportDialog = false"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
        <p class="dialog-description">
          Copy the JSON below to back up your media provider configurations.
        </p>
        <textarea
          class="export-textarea"
          :value="exportedJson"
          readonly
          @click="($event.target as HTMLTextAreaElement).select()"
        />
        <div class="dialog-actions">
          <button
            class="dialog-button secondary"
            @click="showExportDialog = false"
          >
            Close
          </button>
          <button class="dialog-button primary" @click="copyToClipboard">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
              />
            </svg>
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>

    <!-- Import Dialog -->
    <div
      v-if="showImportDialog"
      class="dialog-overlay"
      @click="showImportDialog = false"
    >
      <div class="dialog import-dialog" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">Import Providers</h3>
          <button
            class="dialog-close"
            aria-label="Close"
            @click="showImportDialog = false"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
        <p class="dialog-description">
          Paste your exported JSON configuration below to import providers.
        </p>
        <textarea
          v-model="importJson"
          class="export-textarea"
          placeholder="Paste JSON here..."
        />
        <div v-if="importError" class="dialog-error">
          {{ importError }}
        </div>
        <div class="dialog-actions">
          <button
            class="dialog-button secondary"
            @click="showImportDialog = false"
          >
            Cancel
          </button>
          <button class="dialog-button primary" @click="executeImport">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Import
          </button>
        </div>
      </div>
    </div>

    <!-- Sync Server URL -->
    <section class="section">
      <h2 class="section-title">Sync Server URL</h2>
      <p class="section-description">
        Configure a sync server URL for syncing purposes.
      </p>

      <div class="sync-server-form">
        <div class="input-group">
          <div class="input-wrapper">
            <input
              v-model="tempSyncServerUrl"
              type="url"
              class="url-input"
              placeholder="https://example.com/api"
              :disabled="validating"
            />
            <svg
              v-if="validating"
              class="input-spinner"
              viewBox="0 0 24 24"
              fill="none"
              width="18"
              height="18"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-dasharray="60"
                stroke-dashoffset="45"
              />
            </svg>
          </div>
          <button
            class="validate-btn"
            :disabled="validating || !tempSyncServerUrl.trim()"
            @click="handleValidateUrl"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Validate
          </button>
          <button
            v-if="syncServerSettings.url"
            class="clear-btn"
            :disabled="validating"
            @click="handleClearUrl"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
            Clear
          </button>
        </div>

        <div v-if="syncServerSettings.validated" class="status-badge validated">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
          <span>Validated</span>
          <span class="status-date">
            (Last checked: {{ formatDate(syncServerSettings.lastChecked) }})
          </span>
        </div>

        <!-- Sync Sessions Toggle (only show when validated) -->
        <div v-if="syncServerSettings.validated" class="sync-toggle-section">
          <div class="setting-row">
            <div class="setting-label-group">
              <label class="setting-label">Sync Sessions</label>
              <span class="setting-hint">
                Automatically sync playback sessions to the cloud server
              </span>
            </div>
            <button
              class="toggle"
              :class="{ on: syncSessions }"
              :aria-pressed="syncSessions"
              @click="syncSessions = !syncSessions"
            >
              <span class="toggle-thumb" />
            </button>
          </div>
        </div>

        <div v-if="validationSuccess" class="status-message success">
          {{ validationSuccess }}
        </div>
        <div v-if="validationError" class="status-message error">
          {{ validationError }}
        </div>
      </div>
    </section>

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

.setting-label-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.provider-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
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
}

.add-provider-btn:hover {
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
}

.import-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #b3b3b3;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 7px 14px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.import-export-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.import-export-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cloud-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.cloud-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #b3b3b3;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 7px 14px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.cloud-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.cloud-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.status-message {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-message.success {
  background: rgba(29, 185, 84, 0.15);
  color: #1db954;
  border: 1px solid rgba(29, 185, 84, 0.3);
}

.status-message.error {
  background: rgba(241, 94, 108, 0.15);
  color: #f15e6c;
  border: 1px solid rgba(241, 94, 108, 0.3);
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

/* Export Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dialog-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #6a6a6a;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.dialog-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.dialog-description {
  padding: 16px 24px 12px;
  font-size: 0.875rem;
  color: #b3b3b3;
  margin: 0;
  line-height: 1.5;
}

.export-textarea {
  flex: 1;
  margin: 0 24px;
  padding: 12px;
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  min-height: 200px;
  max-height: 400px;
}

.export-textarea::placeholder {
  color: #4a4a4a;
}

.export-textarea:focus {
  border-color: rgba(255, 255, 255, 0.25);
}

.dialog-error {
  margin: 0 24px;
  padding: 10px 12px;
  background: rgba(241, 94, 108, 0.15);
  border: 1px solid rgba(241, 94, 108, 0.3);
  border-radius: 6px;
  color: #f15e6c;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.4;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  padding: 16px 24px 20px;
  justify-content: flex-end;
}

.dialog-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    opacity 0.15s;
  border: none;
}

.dialog-button.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #b3b3b3;
}

.dialog-button.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.dialog-button.primary {
  background: #1db954;
  color: #fff;
}

.dialog-button.primary:hover {
  background: #1ed760;
}

/* Sync Server Styles */
.section-description {
  margin: -4px 0 16px;
  font-size: 0.875rem;
  color: #b3b3b3;
  line-height: 1.5;
}

.section-description code {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
  font-size: 0.85em;
  color: #1db954;
}

.sync-server-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.url-input {
  flex: 1;
  width: 100%;
  padding: 10px 14px;
  padding-right: 40px; /* Space for spinner */
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 0.875rem;
  font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
  outline: none;
  transition: border-color 0.15s;
}

.url-input::placeholder {
  color: #4a4a4a;
}

.url-input:focus {
  border-color: rgba(255, 255, 255, 0.25);
}

.url-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-spinner {
  position: absolute;
  right: 12px;
  color: #1db954;
  animation: spin 1s linear infinite;
  pointer-events: none;
}

.validate-btn,
.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition:
    background 0.15s,
    opacity 0.15s;
  white-space: nowrap;
}

.validate-btn {
  background: #1db954;
  color: #fff;
}

.validate-btn:hover:not(:disabled) {
  background: #1ed760;
}

.validate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #b3b3b3;
}

.clear-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.validated {
  background: rgba(29, 185, 84, 0.15);
  border: 1px solid rgba(29, 185, 84, 0.3);
  color: #1db954;
}

.status-date {
  color: #b3b3b3;
  font-weight: 400;
  font-size: 0.75rem;
}

.sync-toggle-section {
  margin-top: 16px;
}
</style>
