document.addEventListener("DOMContentLoaded", async () => {
  await Theme.init();

  const params = new URLSearchParams(window.location.search);
  const endpointId = params.get("id");

  if (!endpointId) {
    window.location.href = "dashboard.html";
    return;
  }

  const endpoint = await Storage.getEndpoint(endpointId);
  if (!endpoint) {
    window.location.href = "dashboard.html";
    return;
  }

  const settings = await Storage.getSettings();

  // UI elements
  const endpointName = document.getElementById("endpointName");
  const scanTitle = document.getElementById("scanTitle");
  const scanUrl = document.getElementById("scanUrl");
  const startScanBtn = document.getElementById("startScanBtn");
  const stopScanBtn = document.getElementById("stopScanBtn");
  const progressSection = document.getElementById("progressSection");
  const progressText = document.getElementById("progressText");
  const progressPercent = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");
  const statTotal = document.getElementById("statTotal");
  const statSuccess = document.getElementById("statSuccess");
  const statFailed = document.getElementById("statFailed");
  const statCompressed = document.getElementById("statCompressed");
  const failedSection = document.getElementById("failedSection");
  const failedCount = document.getElementById("failedCount");
  const failedList = document.getElementById("failedList");

  endpointName.textContent = endpoint.name;
  scanTitle.textContent = endpoint.name;
  scanUrl.textContent = endpoint.baseUrl;

  let scanner = null;

  startScanBtn.addEventListener("click", async () => {
    // Toggle buttons
    startScanBtn.classList.add("hidden");
    stopScanBtn.classList.remove("hidden");
    progressSection.classList.remove("hidden");
    failedSection.classList.add("hidden");
    failedList.innerHTML = "";

    // Reset stats
    statTotal.textContent = "0";
    statSuccess.textContent = "0";
    statFailed.textContent = "0";
    statCompressed.textContent = "0 / 0";
    progressFill.style.width = "0%";
    progressFill.className = "progress-fill";
    progressPercent.textContent = "0%";
    progressText.textContent = "Fetching version data...";

    scanner = new Scanner({
      endpoint,
      batchSize: settings.batchSize,
      batchDelay: settings.batchDelay,
      onProgress(progress) {
        const pct = Math.round((progress.checked / progress.total) * 100);
        progressFill.style.width = pct + "%";
        progressPercent.textContent = pct + "%";
        progressText.textContent = `Checked ${progress.checked.toLocaleString()} of ${progress.total.toLocaleString()} URLs`;
        statTotal.textContent = progress.total.toLocaleString();
        statSuccess.textContent = progress.successCount.toLocaleString();
        statFailed.textContent = progress.failCount.toLocaleString();
      },
      onUrlError(result) {
        failedSection.classList.remove("hidden");
        const item = document.createElement("div");
        item.className = "url-item";
        item.innerHTML = `<span class="status-code error">${result.status || "ERR"}</span>${escapeHtml(result.url)}`;
        failedList.appendChild(item);
      }
    });

    try {
      const results = await scanner.run();

      // Final stats
      statTotal.textContent = results.total.toLocaleString();
      statSuccess.textContent = results.successCount.toLocaleString();
      statFailed.textContent = results.failCount.toLocaleString();
      statCompressed.textContent = `${results.compressedCount.toLocaleString()} / ${results.uncompressedCount.toLocaleString()}`;
      failedCount.textContent = results.failCount;

      progressText.textContent = scanner.aborted ? "Scan stopped" : "Scan complete";
      progressFill.className = `progress-fill ${results.failCount > 0 ? "error" : "success"}`;
      progressFill.style.width = "100%";

      // Notification + error log on failures
      if (results.failCount > 0) {
        await Storage.addError(
          `${results.failCount} URL(s) failed in ${endpoint.name}`,
          endpoint.name
        );
        if (settings.notifications) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon-128.png",
            title: `Scan Complete: ${endpoint.name}`,
            message: `${results.failCount} URL(s) failed out of ${results.total}`,
            priority: 2
          });
        }
      }
    } catch (err) {
      progressText.textContent = `Error: ${err.message}`;
      progressFill.className = "progress-fill error";
      progressFill.style.width = "100%";
      await Storage.addError(err.message, endpoint.name);
    }

    startScanBtn.classList.remove("hidden");
    stopScanBtn.classList.add("hidden");
  });

  stopScanBtn.addEventListener("click", () => {
    if (scanner) scanner.abort();
    startScanBtn.classList.remove("hidden");
    stopScanBtn.classList.add("hidden");
  });
});
