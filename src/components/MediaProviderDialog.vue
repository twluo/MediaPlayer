<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import type {
  MediaProviderType,
  MediaProviderConfig,
} from "../mediaProviders/MediaProvider";
import {
  MediaProviderTypePlex,
  MediaProviderTypeNavidrome,
} from "../mediaProviders/MediaProvider";
import {
  requestPin,
  buildAuthUrl,
  pollForToken,
  fetchServers,
  pickBestConnection,
} from "../mediaProviders/PlexHelper";
import type { PlexServer } from "../mediaProviders/PlexHelper";

const props = defineProps<{ existingIds: string[] }>();

const emit = defineEmits<{
  close: [];
  connect: [config: MediaProviderConfig];
}>();

// ── Dialog step ──────────────────────────────────────────────
const step = ref<"pick" | "configure">("pick");
const selected = ref<MediaProviderType>(null);

// ── Shared form ──────────────────────────────────────────────
const form = ref({ id: "" });

// ── Navidrome ────────────────────────────────────────────────
const navidrome = ref({ url: "", username: "", password: "" });

// ── Plex OAuth state ─────────────────────────────────────────
type PlexAuthStep = "idle" | "polling" | "selecting" | "error";
const plexStep = ref<PlexAuthStep>("idle");
const plexServers = ref<PlexServer[]>([]);
const plexSelected = ref<PlexServer | null>(null);
const plexError = ref<string>("");
const plexFallbackUrl = ref<string>(""); // shown if window.open was blocked
let plexAbort: AbortController | null = null;

// ── Computed ─────────────────────────────────────────────────
const idDuplicate = computed(
  () =>
    form.value.id.trim() !== "" &&
    props.existingIds.includes(form.value.id.trim()),
);

const canNext = computed(() => selected.value !== null);

const canConnect = computed(() => {
  if (idDuplicate.value || form.value.id.trim() === "") return false;
  if (selected.value === "plex")
    return plexStep.value === "selecting" && plexSelected.value !== null;
  if (selected.value === "navidrome")
    return (
      navidrome.value.url.trim() !== "" &&
      navidrome.value.username.trim() !== "" &&
      navidrome.value.password.trim() !== ""
    );
  return false;
});

// ── Navigation ───────────────────────────────────────────────
function pick(type: MediaProviderType) {
  selected.value = type;
}

function next() {
  if (canNext.value) step.value = "configure";
}

function back() {
  abortPlexAuth();
  resetPlexState();
  step.value = "pick";
}

// ── Plex helpers ─────────────────────────────────────────────
function resetPlexState() {
  plexStep.value = "idle";
  plexServers.value = [];
  plexSelected.value = null;
  plexError.value = "";
  plexFallbackUrl.value = "";
}

function abortPlexAuth() {
  plexAbort?.abort();
  plexAbort = null;
}

async function startPlexAuth() {
  abortPlexAuth();
  resetPlexState();
  plexStep.value = "polling";
  plexAbort = new AbortController();

  try {
    const pin = await requestPin();
    const authUrl = buildAuthUrl(pin.code);
    const popup = window.open(authUrl, "_blank");
    if (!popup) plexFallbackUrl.value = authUrl; // popup blocked

    const token = await pollForToken(pin.id, plexAbort.signal, pin.expiresAt);

    const servers = await fetchServers(token);
    plexServers.value = servers;

    if (servers.length === 0) {
      plexError.value = "No Plex Media Servers found on your account.";
      plexStep.value = "error";
    } else {
      if (servers.length === 1) plexSelected.value = servers[0] ?? null;
      plexStep.value = "selecting";
    }
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e?.name === "AbortError") {
      plexStep.value = "idle";
    } else {
      plexError.value =
        e?.message ?? "Authentication failed. Please try again.";
      plexStep.value = "error";
    }
  }
}

function cancelPlexAuth() {
  abortPlexAuth();
  plexStep.value = "idle";
}

// ── Connect ──────────────────────────────────────────────────
function connect() {
  if (!selected.value || !canConnect.value) return;

  if (selected.value === "plex" && plexSelected.value) {
    emit("connect", {
      type: MediaProviderTypePlex,
      config: {
        id: form.value.id.trim(),
        url: pickBestConnection(plexSelected.value),
        token: plexSelected.value.token,
        serverName: plexSelected.value.name,
      },
    });
    return;
  }

  if (selected.value === "navidrome") {
    emit("connect", {
      type: MediaProviderTypeNavidrome,
      config: {
        id: form.value.id.trim(),
        url: navidrome.value.url,
        username: navidrome.value.username,
        password: navidrome.value.password,
      },
    });
  }
}

// ── Cleanup ──────────────────────────────────────────────────
onBeforeUnmount(() => {
  abortPlexAuth();
});
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

        <!-- Plex-specific: OAuth flow -->
        <template v-if="selected === 'plex'">
          <!-- idle: short description -->
          <p v-if="plexStep === 'idle'" class="dialog-hint plex-hint">
            Click <strong>Sign in with Plex</strong> to open Plex in a new tab.
            Once you approve access, return here to pick your server.
          </p>

          <!-- polling: waiting for the user to approve in the new tab -->
          <div v-else-if="plexStep === 'polling'" class="plex-waiting">
            <div class="spinner" />
            <div class="plex-waiting-body">
              <p class="plex-waiting-text">Waiting for Plex authorization…</p>
              <p class="plex-waiting-hint">
                A Plex sign-in page has opened in a new tab. Approve the request
                there, then return to this window.
              </p>
              <a
                v-if="plexFallbackUrl"
                :href="plexFallbackUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="form-link"
              >
                No tab opened? Click here to authorize.
              </a>
            </div>
          </div>

          <!-- selecting: authenticated, pick a server -->
          <template v-else-if="plexStep === 'selecting'">
            <div class="plex-authed">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="15"
                height="15"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Signed in with Plex
            </div>

            <div class="form-group">
              <label class="form-label">Select a Server</label>
              <div class="server-list">
                <button
                  v-for="server in plexServers"
                  :key="server.clientIdentifier"
                  class="server-card"
                  :class="{
                    selected:
                      plexSelected?.clientIdentifier ===
                      server.clientIdentifier,
                  }"
                  @click="plexSelected = server"
                >
                  <div class="server-info">
                    <span class="server-name">{{ server.name }}</span>
                  </div>
                  <span class="check-ring">
                    <svg
                      v-if="
                        plexSelected?.clientIdentifier ===
                        server.clientIdentifier
                      "
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="14"
                      height="14"
                    >
                      <path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </template>

          <!-- error -->
          <div v-else-if="plexStep === 'error'" class="plex-error">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              width="18"
              height="18"
              class="plex-error-icon"
            >
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            <span class="plex-error-text">{{ plexError }}</span>
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

        <!-- Step 1: pick -->
        <button
          v-if="step === 'pick'"
          class="btn-primary"
          :disabled="!canNext"
          @click="next"
        >
          Next
        </button>

        <!-- Step 2: Navidrome -->
        <button
          v-else-if="selected === 'navidrome'"
          class="btn-primary"
          :disabled="!canConnect"
          @click="connect"
        >
          Connect
        </button>

        <!-- Step 2: Plex — footer button varies by auth state -->
        <template v-else-if="selected === 'plex'">
          <!-- idle: start the OAuth flow -->
          <button
            v-if="plexStep === 'idle'"
            class="btn-primary btn-plex"
            :disabled="idDuplicate || form.id.trim() === ''"
            @click="startPlexAuth"
          >
            <span class="plex-btn-icon">P</span>
            Sign in with Plex
          </button>

          <!-- polling: waiting; let them cancel -->
          <button
            v-else-if="plexStep === 'polling'"
            class="btn-ghost"
            @click="cancelPlexAuth"
          >
            Cancel auth
          </button>

          <!-- selecting: ready to connect -->
          <button
            v-else-if="plexStep === 'selecting'"
            class="btn-primary"
            :disabled="!canConnect"
            @click="connect"
          >
            Connect
          </button>

          <!-- error: let them retry -->
          <button
            v-else-if="plexStep === 'error'"
            class="btn-primary btn-plex"
            :disabled="idDuplicate || form.id.trim() === ''"
            @click="startPlexAuth"
          >
            <span class="plex-btn-icon">P</span>
            Try again
          </button>
        </template>
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

/* ── Plex sign-in button ────────────────────────────────── */
.btn-plex {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #e5a00d;
  color: #000;
}

.btn-plex:hover:not(:disabled) {
  background: #f0ad1a;
}

.plex-btn-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 0.75rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Plex idle hint ──────────────────────────────────────── */
.plex-hint {
  margin: 0;
}

/* ── Plex polling / waiting ─────────────────────────────── */
.plex-waiting {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.plex-waiting-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plex-waiting-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.plex-waiting-hint {
  font-size: 0.8rem;
  color: #b3b3b3;
  margin: 0;
  line-height: 1.45;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: #e5a00d;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Plex authenticated badge ───────────────────────────── */
.plex-authed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1db954;
  padding: 5px 10px;
  background: rgba(29, 185, 84, 0.1);
  border: 1px solid rgba(29, 185, 84, 0.25);
  border-radius: 20px;
  width: fit-content;
}

/* ── Server list ─────────────────────────────────────────── */
.server-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.server-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.server-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.15);
}

.server-card.selected {
  border-color: #1db954;
  background: rgba(29, 185, 84, 0.08);
}

.server-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.server-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
}

.server-url {
  font-size: 0.75rem;
  color: #6a6a6a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Plex error ──────────────────────────────────────────── */
.plex-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(241, 94, 108, 0.08);
  border: 1px solid rgba(241, 94, 108, 0.25);
  border-radius: 8px;
}

.plex-error-icon {
  color: #f15e6c;
  flex-shrink: 0;
  margin-top: 1px;
}

.plex-error-text {
  font-size: 0.85rem;
  color: #f89098;
  line-height: 1.45;
}
</style>
