document.addEventListener("DOMContentLoaded", async () => {
  await Theme.init();

  const endpoints = await Storage.getEndpoints();
  const settings = await Storage.getSettings();

  const endpointSections = document.getElementById("endpointSections");
  const emptyState = document.getElementById("emptyState");
  const stopAllBtn = document.getElementById("stopAllBtn");
  const overallSuccess = document.getElementById("overallSuccess");
  const overallFailed = document.getElementById("overallFailed");
  const cycleInfo = document.getElementById("cycleInfo");
  const cycleCountdown = document.getElementById("cycleCountdown");
  const cycleCount = document.getElementById("cycleCount");

  if (endpoints.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  let stopped = false;
  let currentScanner = null;
  let cycleNumber = 1;
  let countdownTimer = null;

  // Build per-endpoint UI
  endpointSections.innerHTML = endpoints
    .map(
      (ep) => `
    <div class="monitor-endpoint" id="ep-${ep.id}">
      <div class="monitor-endpoint-header">
        <div class="monitor-endpoint-name">
          <span class="status-dot pending" id="dot-${ep.id}"></span>
          ${escapeHtml(ep.name)}
        </div>
        <span class="badge badge-neutral" id="badge-${ep.id}">Pending</span>
      </div>
      <div class="progress-bar mb-8">
        <div class="progress-fill" id="progress-${ep.id}" style="width: 0%"></div>
      </div>
      <div class="grid grid-3" style="gap: 12px;">
        <div class="stat-card stat-info">
          <div class="stat-value" style="font-size: 20px;" id="total-${ep.id}">0</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-value" style="font-size: 20px;" id="success-${ep.id}">0</div>
          <div class="stat-label">Success</div>
        </div>
        <div class="stat-card stat-error">
          <div class="stat-value" style="font-size: 20px;" id="failed-${ep.id}">0</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
      <div class="hidden" id="errors-${ep.id}" style="margin-top: 12px; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm);"></div>
    </div>`
    )
    .join("");

  stopAllBtn.classList.remove("hidden");

  stopAllBtn.addEventListener("click", () => {
    stopped = true;
    if (currentScanner) currentScanner.abort();
    if (countdownTimer) clearInterval(countdownTimer);
    stopAllBtn.classList.add("hidden");
    cycleInfo.classList.add("hidden");
  });

  // Start first cycle
  await runCycle();

  async function runCycle() {
    let totalSuccess = 0;
    let totalFailed = 0;

    cycleCount.textContent = `Cycle ${cycleNumber}`;

    // Reset all endpoint UIs at cycle start
    for (const ep of endpoints) {
      resetEndpointUI(ep.id);
    }

    for (const ep of endpoints) {
      if (stopped) return;

      const dot = document.getElementById(`dot-${ep.id}`);
      const badge = document.getElementById(`badge-${ep.id}`);
      const progress = document.getElementById(`progress-${ep.id}`);
      const totalEl = document.getElementById(`total-${ep.id}`);
      const successEl = document.getElementById(`success-${ep.id}`);
      const failedEl = document.getElementById(`failed-${ep.id}`);
      const errorsEl = document.getElementById(`errors-${ep.id}`);

      // Set running state
      dot.className = "status-dot running";
      badge.className = "badge badge-warning";
      badge.textContent = "Running";

      currentScanner = new Scanner({
        endpoint: ep,
        batchSize: settings.batchSize,
        batchDelay: settings.batchDelay,
        onProgress(p) {
          const pct = Math.round((p.checked / p.total) * 100);
          progress.style.width = pct + "%";
          totalEl.textContent = p.total.toLocaleString();
          successEl.textContent = p.successCount.toLocaleString();
          failedEl.textContent = p.failCount.toLocaleString();
        },
        onUrlError(result) {
          errorsEl.classList.remove("hidden");
          const item = document.createElement("div");
          item.className = "url-item";
          item.innerHTML = `<span class="status-code error">${result.status || "ERR"}</span>${escapeHtml(result.url || "")}`;
          errorsEl.appendChild(item);
        }
      });

      try {
        const results = await currentScanner.run();

        totalSuccess += results.successCount;
        totalFailed += results.failCount;

        overallSuccess.textContent = totalSuccess.toLocaleString();
        overallFailed.textContent = totalFailed.toLocaleString();

        const hasFails = results.failCount > 0;
        dot.className = `status-dot ${hasFails ? "error" : "completed"}`;
        badge.className = `badge ${hasFails ? "badge-error" : "badge-success"}`;
        badge.textContent = hasFails ? `${results.failCount} Failed` : "Passed";
        progress.className = `progress-fill ${hasFails ? "error" : "success"}`;
        progress.style.width = "100%";

        if (hasFails) {
          await Storage.addError(
            `${results.failCount} URL(s) failed in ${ep.name}`,
            ep.name
          );
          if (settings.notifications) {
            chrome.notifications.create({
              type: "basic",
              iconUrl: "icon-128.png",
              title: `Failed URLs: ${ep.name}`,
              message: `${results.failCount} URL(s) failed out of ${results.total}`,
              priority: 2
            });
          }
        }
      } catch (err) {
        dot.className = "status-dot error";
        badge.className = "badge badge-error";
        badge.textContent = "Error";
        progress.className = "progress-fill error";
        progress.style.width = "100%";
        await Storage.addError(`${ep.name}: ${err.message}`, ep.name);
      }
    }

    // Schedule next cycle
    if (!stopped) {
      cycleInfo.classList.remove("hidden");
      let remaining = settings.monitorInterval;
      cycleCountdown.textContent = formatSeconds(remaining);

      countdownTimer = setInterval(() => {
        remaining--;
        cycleCountdown.textContent = formatSeconds(remaining);

        if (remaining <= 0) {
          clearInterval(countdownTimer);
          cycleNumber++;
          runCycle();
        }
      }, 1000);
    }
  }

  function resetEndpointUI(id) {
    const dot = document.getElementById(`dot-${id}`);
    const badge = document.getElementById(`badge-${id}`);
    const progress = document.getElementById(`progress-${id}`);
    const totalEl = document.getElementById(`total-${id}`);
    const successEl = document.getElementById(`success-${id}`);
    const failedEl = document.getElementById(`failed-${id}`);
    const errorsEl = document.getElementById(`errors-${id}`);

    if (dot) dot.className = "status-dot pending";
    if (badge) { badge.className = "badge badge-neutral"; badge.textContent = "Pending"; }
    if (progress) { progress.style.width = "0%"; progress.className = "progress-fill"; }
    if (totalEl) totalEl.textContent = "0";
    if (successEl) successEl.textContent = "0";
    if (failedEl) failedEl.textContent = "0";
    if (errorsEl) { errorsEl.innerHTML = ""; errorsEl.classList.add("hidden"); }
  }
});
