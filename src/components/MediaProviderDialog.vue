<script setup lang="ts">
import { ref, computed } from "vue";
import type {
  MediaProviderType,
  MediaProviderConfig,
} from "../mediaProviders/MediaProvider";
import {
  MediaProviderTypePlex,
  MediaProviderTypeNavidrome,
} from "../mediaProviders/MediaProvider";

const props = defineProps<{ existingIds: string[] }>();

const emit = defineEmits<{
  close: [];
  connect: [config: MediaProviderConfig];
}>();

const step = ref<"pick" | "configure">("pick");
const selected = ref<MediaProviderType>(null);

const form = ref({ id: "" });
const navidrome = ref({ url: "", username: "", password: "" });
const plex = ref({ url: "", token: "" });

const idDuplicate = computed(
  () =>
    form.value.id.trim() !== "" &&
    props.existingIds.includes(form.value.id.trim()),
);

const canNext = computed(() => selected.value !== null);

const canConnect = computed(() => {
  if (idDuplicate.value || form.value.id.trim() === "") return false;
  if (selected.value === "plex")
    return plex.value.url.trim() !== "" && plex.value.token.trim() !== "";
  if (selected.value === "navidrome")
    return (
      navidrome.value.url.trim() !== "" &&
      navidrome.value.username.trim() !== "" &&
      navidrome.value.password.trim() !== ""
    );
  return false;
});

function pick(type: MediaProviderType) {
  selected.value = type;
}

function next() {
  if (canNext.value) step.value = "configure";
}

function back() {
  step.value = "pick";
}

function connect() {
  if (!selected.value || !canConnect.value) return;
  const base: MediaProviderConfig =
    selected.value === "plex"
      ? {
          type: MediaProviderTypePlex,
          config: {
            id: form.value.id.trim(),
            url: plex.value.url,
            token: plex.value.token,
          },
        }
      : {
          type: MediaProviderTypeNavidrome,
          config: {
            id: form.value.id.trim(),
            url: navidrome.value.url,
            username: navidrome.value.username,
            password: navidrome.value.password,
          },
        };
  emit("connect", base);
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div class="backdrop" @click="emit('close')" />

    <!-- Dialog box -->
    <div class="dialog" role="dialog" aria-modal="true">
      <!-- Header -->
      <div class="dialog-header">
        <button v-if="step === 'configure'" class="back-btn" @click="back">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path
              d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
            />
          </svg>
        </button>
        <h2 class="dialog-title">
          {{
            step === "pick"
              ? "Media Provider"
              : selected === "plex"
                ? "Connect to Plex"
                : "Connect to Navidrome"
          }}
        </h2>
        <button class="close-btn" aria-label="Close" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>

      <!-- Step 1: Pick -->
      <div v-if="step === 'pick'" class="dialog-body">
        <p class="dialog-hint">Choose a media server to connect to.</p>

        <div class="provider-list">
          <!-- Plex -->
          <button
            class="provider-card"
            :class="{ selected: selected === 'plex' }"
            @click="pick('plex')"
          >
            <span class="provider-icon plex-icon">P</span>
            <div class="provider-info">
              <span class="provider-name">Plex</span>
              <span class="provider-desc">
                Stream from your Plex Media Server
              </span>
            </div>
            <span class="check-ring">
              <svg
                v-if="selected === 'plex'"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          </button>

          <!-- Navidrome -->
          <button
            class="provider-card"
            :class="{ selected: selected === 'navidrome' }"
            @click="pick('navidrome')"
          >
            <span class="provider-icon navidrome-icon">N</span>
            <div class="provider-info">
              <span class="provider-name">Navidrome</span>
              <span class="provider-desc">
                Open-source self-hosted music server
              </span>
            </div>
            <span class="check-ring">
              <svg
                v-if="selected === 'navidrome'"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <!-- Step 2: Configure -->
      <div v-else class="dialog-body">
        <!-- Shared: Provider ID -->
        <div class="form-group">
          <label class="form-label">Provider ID</label>
          <input
            v-model="form.id"
            type="text"
            class="form-input"
            :class="{ 'input-error': idDuplicate && form.id.trim() }"
            placeholder="e.g. home-plex"
            autocomplete="off"
          />
          <p v-if="idDuplicate && form.id.trim()" class="form-warning">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            This ID is already in use. Choose a different one.
          </p>
        </div>

        <!-- Plex-specific fields -->
        <template v-if="selected === 'plex'">
          <div class="form-group">
            <label class="form-label">Server URL</label>
            <input
              v-model="plex.url"
              type="url"
              class="form-input"
              placeholder="http://192.168.1.10:32400"
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label class="form-label">
              Plex Token
              <a
                href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/"
                target="_blank"
                rel="noopener"
                class="form-link"
              >
                How do I find my token?
              </a>
            </label>
            <input
              v-model="plex.token"
              type="password"
              class="form-input"
              placeholder="xxxxxxxxxxxxxxxxxxxx"
              autocomplete="off"
            />
          </div>
        </template>

        <!-- Navidrome-specific fields -->
        <template v-else-if="selected === 'navidrome'">
          <div class="form-group">
            <label class="form-label">Server URL</label>
            <input
              v-model="navidrome.url"
              type="url"
              class="form-input"
              placeholder="https://music.example.com"
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input
              v-model="navidrome.username"
              type="text"
              class="form-input"
              placeholder="admin"
              autocomplete="username"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input
              v-model="navidrome.password"
              type="password"
              class="form-input"
              placeholder="Your Navidrome password"
              autocomplete="current-password"
            />
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button class="btn-ghost" @click="emit('close')">Cancel</button>
        <button
          v-if="step === 'pick'"
          class="btn-primary"
          :disabled="!canNext"
          @click="next"
        >
          Next
        </button>
        <button
          v-else
          class="btn-primary"
          :disabled="!canConnect"
          @click="connect"
        >
          Connect
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ───────────────────────────────── */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.7);
}

/* ── Dialog ─────────────────────────────────── */
.dialog {
  position: fixed;
  inset: 0;
  z-index: 310;
  margin: auto;
  width: min(480px, calc(100vw - 32px));
  height: fit-content;
  background: #1e1e1e;
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────── */
.dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 20px 0;
}

.dialog-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.back-btn,
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #b3b3b3;
  cursor: pointer;
  border-radius: 50%;
  transition:
    color 0.15s,
    background 0.15s;
  flex-shrink: 0;
}

.back-btn:hover,
.close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

/* ── Body ───────────────────────────────────── */
.dialog-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-hint {
  font-size: 0.875rem;
  color: #b3b3b3;
  margin: 0 0 4px;
}

/* ── Provider cards ─────────────────────────── */
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.provider-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.15);
}

.provider-card.selected {
  border-color: #1db954;
  background: rgba(29, 185, 84, 0.08);
}

.provider-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plex-icon {
  background: #e5a00d;
  color: #000;
}

.navidrome-icon {
  background: #3d6ce8;
  color: #fff;
}

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
}

.provider-desc {
  font-size: 0.8rem;
  color: #b3b3b3;
}

.check-ring {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1db954;
  flex-shrink: 0;
}

.provider-card.selected .check-ring {
  border-color: #1db954;
}

/* ── Form ───────────────────────────────────── */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
  color: #b3b3b3;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.form-link {
  font-size: 0.75rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: #1db954;
  text-decoration: none;
}

.form-link:hover {
  text-decoration: underline;
}

.form-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
  font-size: 0.9rem;
  padding: 10px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #555;
}

.form-input:focus {
  border-color: rgba(255, 255, 255, 0.35);
}

.form-input.input-error {
  border-color: #f59e0b;
}

.form-warning {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: #f59e0b;
  margin: 0;
}

/* ── Footer ─────────────────────────────────── */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-ghost {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #b3b3b3;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 8px 16px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.btn-ghost:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.btn-primary {
  background: #1db954;
  border: none;
  border-radius: 6px;
  color: #000;
  font-size: 0.875rem;
  font-weight: 700;
  padding: 8px 20px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #1ed760;
}

.btn-primary:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
