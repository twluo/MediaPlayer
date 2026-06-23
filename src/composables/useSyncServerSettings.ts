import { ref, watch } from "vue";
import type { Track } from "../mediaProviders/MediaProvider";

const STORAGE_KEY = "media-player:sync-server-url";
const STORAGE_KEY_SYNC_SESSIONS = "media-player:sync-sessions-enabled";

export interface SyncServerSettings {
  url: string;
  validated: boolean;
  lastChecked: number | null;
}

export interface SessionData {
  playlist: Track[];
  currentIndex: number;
  currentTime: number;
  isPlaying: boolean;
  repeatMode: "off" | "all" | "one";
  shuffleMode: boolean;
  timestamp: number;
  deviceId?: string;
}

function load(): SyncServerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // If parsing fails, return default
  }
  return {
    url: "",
    validated: false,
    lastChecked: null,
  };
}

function save(settings: SyncServerSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const settings = ref<SyncServerSettings>(load());

// Load sync sessions preference from localStorage
const syncSessionsEnabled = ref<boolean>(
  localStorage.getItem(STORAGE_KEY_SYNC_SESSIONS) === "true",
);

watch(
  settings,
  (newSettings) => {
    save(newSettings);
  },
  { deep: true },
);

// Persist sync sessions preference
watch(syncSessionsEnabled, (value) => {
  localStorage.setItem(STORAGE_KEY_SYNC_SESSIONS, String(value));
});

export function useSyncServerSettings() {
  const validating = ref(false);
  const validationError = ref<string | null>(null);
  const validationSuccess = ref<string | null>(null);

  /**
   * Validates a URL format
   */
  function isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Validates the sync server URL by calling /health endpoint
   */
  async function validateUrl(url: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Trim and check if URL is empty
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return { success: false, error: "URL cannot be empty" };
    }

    // Validate URL format
    if (!isValidUrl(trimmedUrl)) {
      return {
        success: false,
        error: "Invalid URL format. Must start with http:// or https://",
      };
    }

    // Build health check URL
    let healthUrl: string;
    try {
      const urlObj = new URL(trimmedUrl);
      // Remove trailing slash if present
      const baseUrl = urlObj.origin + urlObj.pathname.replace(/\/$/, "");
      healthUrl = `${baseUrl}/health`;
      console.log(healthUrl);
    } catch {
      return { success: false, error: "Failed to construct health check URL" };
    }

    // Call the health endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for OK response (status 200-299)
      if (response.ok) {
        const text = await response.text();
        // Check if response contains "OK" (case-insensitive)
        if (text.toUpperCase().includes("OK")) {
          return { success: true };
        } else {
          return {
            success: false,
            error: `Health endpoint returned "${text}" instead of "OK"`,
          };
        }
      } else {
        return {
          success: false,
          error: `Health check failed with status ${response.status}`,
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          return {
            success: false,
            error: "Health check timed out after 10 seconds",
          };
        }
        return {
          success: false,
          error: `Network error: ${err.message}`,
        };
      }
      return { success: false, error: "Unknown error occurred" };
    }
  }

  /**
   * Sets and validates the sync server URL
   */
  async function setAndValidateUrl(url: string): Promise<boolean> {
    validating.value = true;
    validationError.value = null;
    validationSuccess.value = null;

    const result = await validateUrl(url);

    validating.value = false;

    if (result.success) {
      settings.value.url = url.trim();
      settings.value.validated = true;
      settings.value.lastChecked = Date.now();
      validationSuccess.value = "Sync server URL validated successfully!";
      setTimeout(() => {
        validationSuccess.value = null;
      }, 3000);
      return true;
    } else {
      validationError.value = result.error || "Validation failed";
      settings.value.validated = false;
      return false;
    }
  }

  /**
   * Sets the URL without validation (for clearing or manual edit)
   */
  function setUrl(url: string) {
    settings.value.url = url.trim();
    if (!url.trim()) {
      settings.value.validated = false;
      settings.value.lastChecked = null;
    }
  }

  /**
   * Clears the sync server URL
   */
  function clearUrl() {
    settings.value.url = "";
    settings.value.validated = false;
    settings.value.lastChecked = null;
    validationError.value = null;
    validationSuccess.value = null;
  }

  /**
   * Sends session data to the sync server for cross-device sync
   */
  async function saveSession(sessionData: SessionData): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Check if sync sessions is enabled
    if (!syncSessionsEnabled.value) {
      return { success: false, error: "Sync sessions is disabled" };
    }

    // Check if URL is validated
    if (!settings.value.validated || !settings.value.url) {
      return {
        success: false,
        error: "Sync server URL not configured or validated",
      };
    }

    // Build session endpoint URL
    let sessionUrl: string;
    try {
      const urlObj = new URL(settings.value.url);
      const baseUrl = urlObj.origin + urlObj.pathname.replace(/\/$/, "");
      sessionUrl = `${baseUrl}/session`;
    } catch {
      return { success: false, error: "Failed to construct session URL" };
    }

    // Send session data to server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true };
      } else {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          error: `Session save failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`,
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          return {
            success: false,
            error: "Session save timed out after 10 seconds",
          };
        }
        return {
          success: false,
          error: `Network error: ${err.message}`,
        };
      }
      return { success: false, error: "Unknown error occurred" };
    }
  }

  /**
   * Retrieves session data from the sync server
   */
  async function getSession(): Promise<{
    success: boolean;
    data?: SessionData;
    error?: string;
  }> {
    // Check if sync sessions is enabled
    if (!syncSessionsEnabled.value) {
      return { success: false, error: "Sync sessions is disabled" };
    }

    // Check if URL is validated
    if (!settings.value.validated || !settings.value.url) {
      return {
        success: false,
        error: "Sync server URL not configured or validated",
      };
    }

    // Build session endpoint URL
    let sessionUrl: string;
    try {
      const urlObj = new URL(settings.value.url);
      const baseUrl = urlObj.origin + urlObj.pathname.replace(/\/$/, "");
      sessionUrl = `${baseUrl}/session`;
    } catch {
      return { success: false, error: "Failed to construct session URL" };
    }

    // Get session data from server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(sessionUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          error: `Session retrieval failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`,
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          return {
            success: false,
            error: "Session retrieval timed out after 10 seconds",
          };
        }
        return {
          success: false,
          error: `Network error: ${err.message}`,
        };
      }
      return { success: false, error: "Unknown error occurred" };
    }
  }

  return {
    settings,
    syncSessionsEnabled,
    validating,
    validationError,
    validationSuccess,
    setAndValidateUrl,
    setUrl,
    clearUrl,
    isValidUrl,
    saveSession,
    getSession,
  };
}
