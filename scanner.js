/**
 * Scanner - Core engine for checking static asset availability.
 *
 * Workflow:
 *   1. Fetch a version manifest (version.txt) listing version identifiers.
 *   2. For each version, fetch {version}-filelist.json containing compressed/uncompressed arrays.
 *   3. Build full asset URLs and batch-check them via HTTP HEAD/GET for 200 status.
 *
 * Usage:
 *   const scanner = new Scanner({ endpoint, batchSize, batchDelay, onProgress, onUrlError });
 *   const results = await scanner.run();
 *   scanner.abort();  // to cancel mid-scan
 */
class Scanner {
  constructor(options = {}) {
    this.endpoint = options.endpoint;
    this.batchSize = options.batchSize || 500;
    this.batchDelay = options.batchDelay || 100;
    this.onProgress = options.onProgress || (() => {});
    this.onUrlError = options.onUrlError || (() => {});
    this._aborted = false;
  }

  abort() {
    this._aborted = true;
  }

  get aborted() {
    return this._aborted;
  }

  async run() {
    this._aborted = false;
    const { baseUrl, versionPath, filelistPath } = this.endpoint;

    // Step 1: Fetch version list
    const versions = await this._fetchVersions(`${baseUrl}${versionPath}`);
    if (this._aborted) return this._emptyResult();

    // Step 2: Fetch file lists and build URLs
    let allUrls = [];
    let compressedCount = 0;
    let uncompressedCount = 0;

    for (const version of versions) {
      if (this._aborted) return this._emptyResult();

      const filelistUrl = `${baseUrl}${filelistPath}/${version}-filelist.json`;
      try {
        const data = await this._fetchJson(filelistUrl);
        const compressed = Array.isArray(data.compressed) ? data.compressed : [];
        const uncompressed = Array.isArray(data.uncompressed) ? data.uncompressed : [];

        compressedCount += compressed.length;
        uncompressedCount += uncompressed.length;

        compressed.forEach(item => allUrls.push(`${baseUrl}/${item}`));
        uncompressed.forEach(item => allUrls.push(`${baseUrl}/${item}`));
      } catch (err) {
        this.onUrlError({ url: filelistUrl, status: 0, error: err.message });
      }
    }

    // Step 3: Batch-check all URLs
    const results = await this._checkUrls(allUrls);
    results.compressedCount = compressedCount;
    results.uncompressedCount = uncompressedCount;

    return results;
  }

  async _fetchVersions(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch version file (HTTP ${response.status})`);
    }
    const text = await response.text();
    return text.split("\n").map(l => l.trim()).filter(Boolean);
  }

  async _fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch (HTTP ${response.status})`);
    }
    return response.json();
  }

  async _checkUrls(urls) {
    const successful = [];
    const failed = [];
    const total = urls.length;

    for (let i = 0; i < urls.length; i += this.batchSize) {
      if (this._aborted) break;

      const batch = urls.slice(i, i + this.batchSize);
      const promises = batch.map(url =>
        fetch(url)
          .then(res => ({ url, status: res.status, ok: res.status === 200 }))
          .catch(err => ({ url, status: 0, ok: false, error: err.message }))
      );

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.ok) {
          successful.push(result);
        } else {
          failed.push(result);
          this.onUrlError(result);
        }
      }

      this.onProgress({
        checked: Math.min(i + this.batchSize, total),
        total,
        successCount: successful.length,
        failCount: failed.length
      });

      if (i + this.batchSize < urls.length && !this._aborted) {
        await new Promise(r => setTimeout(r, this.batchDelay));
      }
    }

    return {
      total,
      successful,
      failed,
      successCount: successful.length,
      failCount: failed.length,
      compressedCount: 0,
      uncompressedCount: 0
    };
  }

  _emptyResult() {
    return {
      total: 0,
      successful: [],
      failed: [],
      successCount: 0,
      failCount: 0,
      compressedCount: 0,
      uncompressedCount: 0
    };
  }
}
