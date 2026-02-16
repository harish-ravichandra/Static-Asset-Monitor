/**
 * Storage - Centralized Chrome storage management for endpoints,
 * errors, theme, and settings.
 */
const Storage = {
  KEYS: {
    ENDPOINTS: "sam_endpoints",
    ERRORS: "sam_errors",
    THEME: "sam_theme",
    SETTINGS: "sam_settings"
  },

  DEFAULT_SETTINGS: {
    batchSize: 500,
    batchDelay: 100,
    monitorInterval: 300,
    notifications: true
  },

  // ---- Endpoints ----

  async getEndpoints() {
    return new Promise(resolve => {
      chrome.storage.local.get([this.KEYS.ENDPOINTS], data => {
        resolve(data[this.KEYS.ENDPOINTS] || []);
      });
    });
  },

  async saveEndpoints(endpoints) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [this.KEYS.ENDPOINTS]: endpoints }, resolve);
    });
  },

  async getEndpoint(id) {
    const endpoints = await this.getEndpoints();
    return endpoints.find(e => e.id === id) || null;
  },

  async addEndpoint(endpoint) {
    const endpoints = await this.getEndpoints();
    endpoint.id = crypto.randomUUID();
    endpoints.push(endpoint);
    await this.saveEndpoints(endpoints);
    return endpoint;
  },

  async updateEndpoint(id, updates) {
    const endpoints = await this.getEndpoints();
    const index = endpoints.findIndex(e => e.id === id);
    if (index !== -1) {
      endpoints[index] = { ...endpoints[index], ...updates };
      await this.saveEndpoints(endpoints);
    }
  },

  async removeEndpoint(id) {
    const endpoints = await this.getEndpoints();
    await this.saveEndpoints(endpoints.filter(e => e.id !== id));
  },

  // ---- Errors ----

  async getErrors() {
    return new Promise(resolve => {
      chrome.storage.local.get([this.KEYS.ERRORS], data => {
        resolve(data[this.KEYS.ERRORS] || []);
      });
    });
  },

  async addError(message, source) {
    const errors = await this.getErrors();
    errors.unshift({ message, source, timestamp: Date.now() });
    if (errors.length > 200) errors.length = 200;
    return new Promise(resolve => {
      chrome.storage.local.set({ [this.KEYS.ERRORS]: errors }, resolve);
    });
  },

  async clearErrors() {
    return new Promise(resolve => {
      chrome.storage.local.remove([this.KEYS.ERRORS], resolve);
    });
  },

  // ---- Theme ----

  async getTheme() {
    return new Promise(resolve => {
      chrome.storage.local.get([this.KEYS.THEME], data => {
        resolve(data[this.KEYS.THEME] || "light");
      });
    });
  },

  async setTheme(theme) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [this.KEYS.THEME]: theme }, resolve);
    });
  },

  // ---- Settings ----

  async getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get([this.KEYS.SETTINGS], data => {
        resolve({ ...this.DEFAULT_SETTINGS, ...(data[this.KEYS.SETTINGS] || {}) });
      });
    });
  },

  async saveSettings(settings) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [this.KEYS.SETTINGS]: settings }, resolve);
    });
  },

  // ---- Import / Export ----

  async exportConfig() {
    const endpoints = await this.getEndpoints();
    const settings = await this.getSettings();
    return JSON.stringify({ endpoints, settings }, null, 2);
  },

  async importConfig(json) {
    const data = JSON.parse(json);
    if (data.endpoints) await this.saveEndpoints(data.endpoints);
    if (data.settings) await this.saveSettings(data.settings);
  }
};

// ---- Shared Utilities ----

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
