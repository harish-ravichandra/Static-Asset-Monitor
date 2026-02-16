document.addEventListener("DOMContentLoaded", async () => {
  await Theme.init();

  // ---- Elements ----
  const endpointList = document.getElementById("endpointList");
  const emptyEndpoints = document.getElementById("emptyEndpoints");
  const addEndpointBtn = document.getElementById("addEndpointBtn");
  const endpointModal = document.getElementById("endpointModal");
  const modalTitle = document.getElementById("modalTitle");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const saveEndpointBtn = document.getElementById("saveEndpointBtn");
  const endpointForm = document.getElementById("endpointForm");

  const epId = document.getElementById("epId");
  const epName = document.getElementById("epName");
  const epBaseUrl = document.getElementById("epBaseUrl");
  const epVersionPath = document.getElementById("epVersionPath");
  const epFilelistPath = document.getElementById("epFilelistPath");

  const batchSizeInput = document.getElementById("batchSize");
  const batchDelayInput = document.getElementById("batchDelay");
  const monitorIntervalInput = document.getElementById("monitorInterval");
  const notificationsInput = document.getElementById("notifications");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");

  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");

  // ---- Load current settings ----
  const settings = await Storage.getSettings();
  batchSizeInput.value = settings.batchSize;
  batchDelayInput.value = settings.batchDelay;
  monitorIntervalInput.value = settings.monitorInterval;
  notificationsInput.checked = settings.notifications;

  // ---- Render endpoints ----
  await renderEndpoints();

  async function renderEndpoints() {
    const endpoints = await Storage.getEndpoints();

    if (endpoints.length === 0) {
      endpointList.innerHTML = "";
      emptyEndpoints.classList.remove("hidden");
      return;
    }

    emptyEndpoints.classList.add("hidden");
    endpointList.innerHTML = endpoints
      .map(
        (ep) => `
      <div class="card mb-16" style="display: flex; align-items: center; justify-content: space-between;">
        <div style="min-width: 0; flex: 1;">
          <div class="card-title">${escapeHtml(ep.name)}</div>
          <div class="card-subtitle">${escapeHtml(ep.baseUrl)}</div>
        </div>
        <div class="flex gap-8" style="flex-shrink: 0; margin-left: 16px;">
          <button class="btn btn-sm btn-secondary edit-ep" data-id="${ep.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-ep" data-id="${ep.id}">Delete</button>
        </div>
      </div>`
      )
      .join("");

    // Event listeners
    endpointList.querySelectorAll(".edit-ep").forEach((btn) => {
      btn.addEventListener("click", () => editEndpoint(btn.dataset.id));
    });

    endpointList.querySelectorAll(".delete-ep").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Delete this endpoint?")) {
          await Storage.removeEndpoint(btn.dataset.id);
          await renderEndpoints();
        }
      });
    });
  }

  // ---- Modal ----
  function openModal(isEdit) {
    modalTitle.textContent = isEdit ? "Edit Endpoint" : "Add Endpoint";
    endpointModal.classList.add("active");
  }

  function closeModal() {
    endpointModal.classList.remove("active");
    endpointForm.reset();
    epId.value = "";
  }

  addEndpointBtn.addEventListener("click", () => {
    epId.value = "";
    epName.value = "";
    epBaseUrl.value = "";
    epVersionPath.value = "";
    epFilelistPath.value = "";
    openModal(false);
  });

  closeModalBtn.addEventListener("click", closeModal);
  cancelModalBtn.addEventListener("click", closeModal);
  endpointModal.addEventListener("click", (e) => {
    if (e.target === endpointModal) closeModal();
  });

  async function editEndpoint(id) {
    const ep = await Storage.getEndpoint(id);
    if (!ep) return;

    epId.value = ep.id;
    epName.value = ep.name;
    epBaseUrl.value = ep.baseUrl;
    epVersionPath.value = ep.versionPath || "";
    epFilelistPath.value = ep.filelistPath || "";
    openModal(true);
  }

  saveEndpointBtn.addEventListener("click", async () => {
    if (!epName.value.trim() || !epBaseUrl.value.trim()) {
      alert("Name and Base URL are required.");
      return;
    }

    const data = {
      name: epName.value.trim(),
      baseUrl: epBaseUrl.value.trim().replace(/\/+$/, ""),
      versionPath: epVersionPath.value.trim() || "/version.txt",
      filelistPath: epFilelistPath.value.trim() || "/filelist"
    };

    if (epId.value) {
      await Storage.updateEndpoint(epId.value, data);
    } else {
      await Storage.addEndpoint(data);
    }

    closeModal();
    await renderEndpoints();
  });

  // ---- Save general settings ----
  saveSettingsBtn.addEventListener("click", async () => {
    await Storage.saveSettings({
      batchSize: parseInt(batchSizeInput.value) || 500,
      batchDelay: parseInt(batchDelayInput.value) || 100,
      monitorInterval: parseInt(monitorIntervalInput.value) || 300,
      notifications: notificationsInput.checked
    });

    const original = saveSettingsBtn.textContent;
    saveSettingsBtn.textContent = "Saved!";
    saveSettingsBtn.classList.remove("btn-primary");
    saveSettingsBtn.classList.add("btn-success");
    setTimeout(() => {
      saveSettingsBtn.textContent = original;
      saveSettingsBtn.classList.remove("btn-success");
      saveSettingsBtn.classList.add("btn-primary");
    }, 2000);
  });

  // ---- Export ----
  exportBtn.addEventListener("click", async () => {
    const json = await Storage.exportConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "static-asset-monitor-config.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // ---- Import ----
  importBtn.addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      await Storage.importConfig(text);
      await renderEndpoints();

      const newSettings = await Storage.getSettings();
      batchSizeInput.value = newSettings.batchSize;
      batchDelayInput.value = newSettings.batchDelay;
      monitorIntervalInput.value = newSettings.monitorInterval;
      notificationsInput.checked = newSettings.notifications;

      alert("Configuration imported successfully.");
    } catch (err) {
      alert("Failed to import: " + err.message);
    }

    importFile.value = "";
  });

  // ---- Auto-open modal if ?add=true ----
  const params = new URLSearchParams(window.location.search);
  if (params.get("add") === "true") {
    addEndpointBtn.click();
  }
});
