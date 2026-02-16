document.addEventListener("DOMContentLoaded", async () => {
  await Theme.init();

  const endpointGrid = document.getElementById("endpointGrid");
  const emptyState = document.getElementById("emptyState");
  const monitorAllBtn = document.getElementById("monitorAllBtn");
  const errorList = document.getElementById("errorList");
  const clearErrorsBtn = document.getElementById("clearErrorsBtn");

  // ---- Endpoints ----
  const endpoints = await Storage.getEndpoints();

  if (endpoints.length === 0) {
    endpointGrid.classList.add("hidden");
    monitorAllBtn.classList.add("hidden");
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    endpointGrid.innerHTML = endpoints
      .map(
        (ep) => `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${escapeHtml(ep.name)}</div>
            <div class="card-subtitle">${escapeHtml(ep.baseUrl)}</div>
          </div>
          <span class="badge badge-neutral">Ready</span>
        </div>
        <div class="card-actions">
          <a href="scan.html?id=${ep.id}" class="btn btn-sm btn-primary">Scan</a>
        </div>
      </div>`
      )
      .join("");
  }

  // ---- Errors ----
  const errors = await Storage.getErrors();

  if (errors.length > 0) {
    errorList.innerHTML = errors
      .slice(0, 50)
      .map(
        (err) => `
      <div class="error-item">
        <span class="error-time">${formatTime(err.timestamp)}</span>
        <div>
          <div class="error-message">${escapeHtml(err.message)}</div>
          ${err.source ? `<div class="error-source">${escapeHtml(err.source)}</div>` : ""}
        </div>
      </div>`
      )
      .join("");
  }

  clearErrorsBtn.addEventListener("click", async () => {
    await Storage.clearErrors();
    errorList.innerHTML =
      '<p class="text-muted text-center" style="padding: 32px;">No errors recorded.</p>';
  });
});
