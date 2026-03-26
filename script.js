const SUPABASE_URL = "https://qiomohedtrymxjswimgd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MRwULv_nrHkW7v15V5zY5A_qo0AgNuA";

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const greenSlider = document.getElementById("greenSlider");
  const ethicalSlider = document.getElementById("ethicalSlider");
  const greenValue = document.getElementById("greenValue");
  const ethicalValue = document.getElementById("ethicalValue");
  const typeFilter = document.getElementById("typeFilter");
  const sortFilter = document.getElementById("sortFilter");
  const matchCount = document.getElementById("matchCount");
  const avgGreen = document.getElementById("avgGreen");
  const avgEthical = document.getElementById("avgEthical");
  const results = document.getElementById("results");

  let instruments = [];

  function scoreLabel(score) {
    if (score >= 80) return "High";
    if (score >= 60) return "Good";
    if (score >= 40) return "Mixed";
    return "Low";
  }

  function syncSliderLabels() {
    greenValue.textContent = greenSlider.value;
    ethicalValue.textContent = ethicalSlider.value;
  }

  function dedupeLinks(links) {
    const seen = new Set();
    return links.filter((link) => {
      if (!link || !link.url) return false;
      const key = `${link.label}|${link.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function loadInstruments() {
    syncSliderLabels();
    results.innerHTML = '<div class="card no-results">Loading data from Supabase...</div>';

    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      SUPABASE_URL.includes("PASTE_YOUR") ||
      SUPABASE_PUBLISHABLE_KEY.includes("PASTE_YOUR")
    ) {
      results.innerHTML =
        '<div class="card no-results">Add your Supabase URL and Publishable Key in script.js first.</div>';
      return;
    }

    const endpoint =
      `${SUPABASE_URL}/rest/v1/instruments?select=` +
      encodeURIComponent(
        "ticker,name,type,exchange,green_score,ethical_score,green_source_label,green_source_url,ethical_source_label,ethical_source_url"
      ) +
      "&order=name.asc";

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase error ${response.status}: ${errorText}`);
      }

      const rows = await response.json();

      instruments = rows.map((row) => {
        const links = dedupeLinks([
          row.green_source_url
            ? {
                label: row.green_source_label || "Green source",
                url: row.green_source_url,
              }
            : null,
          row.ethical_source_url
            ? {
                label: row.ethical_source_label || "Ethical source",
                url: row.ethical_source_url,
              }
            : null,
        ]);

        const sourceBadges = [
          row.green_source_label || null,
          row.ethical_source_label || null,
        ].filter(Boolean);

        return {
          ticker: row.ticker || "",
          name: row.name || "",
          type: (row.type || "stock").toLowerCase(),
          exchange: row.exchange || "",
          green: Number(row.green_score || 0),
          ethical: Number(row.ethical_score || 0),
          sources: [...new Set(sourceBadges)],
          sourceLinks: links,
          notes:
            (row.type || "").toLowerCase() === "etf"
              ? "ETF score currently stored in the database. Later this can be calculated live from holdings."
              : "Company score loaded from the Supabase database.",
        };
      });

      render();
    } catch (error) {
      console.error(error);
      results.innerHTML = `
        <div class="card no-results">
          Could not load data from Supabase.<br /><br />
          <strong>Error:</strong> ${error.message}
        </div>
      `;
    }
  }

  function render() {
    syncSliderLabels();

    const q = searchInput.value.trim().toLowerCase();
    const greenMin = Number(greenSlider.value);
    const ethicalMin = Number(ethicalSlider.value);
    const kind = typeFilter.value;
    const sortBy = sortFilter.value;

    let filtered = instruments
      .filter((item) => kind === "all" || item.type === kind)
      .filter((item) => item.green >= greenMin && item.ethical >= ethicalMin)
      .filter((item) => {
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.ticker.toLowerCase().includes(q) ||
          item.exchange.toLowerCase().includes(q)
        );
      });

    filtered.sort((a, b) => {
      if (sortBy === "green_desc") return b.green - a.green;
      if (sortBy === "ethical_desc") return b.ethical - a.ethical;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      return (b.green + b.ethical) - (a.green + a.ethical);
    });

    matchCount.textContent = filtered.length;

    avgGreen.textContent = filtered.length
      ? Math.round(filtered.reduce((sum, item) => sum + item.green, 0) / filtered.length)
      : 0;

    avgEthical.textContent = filtered.length
      ? Math.round(filtered.reduce((sum, item) => sum + item.ethical, 0) / filtered.length)
      : 0;

    if (!filtered.length) {
      results.innerHTML =
        '<div class="card no-results">No companies or ETFs match your current filters. Try lowering the sliders.</div>';
      return;
    }

    results.innerHTML = filtered
      .map((item) => {
        const averageScore = (item.green + item.ethical) / 2;

        return `
          <article class="card instrument-card">
            <div class="top-row">
              <div>
                <h3 class="instrument-name">${item.name}</h3>
                <div class="meta">${item.ticker} • ${item.type.toUpperCase()} • ${item.exchange}</div>
              </div>
              <div class="status-badge">${scoreLabel(averageScore)}</div>
            </div>

            <div class="score-block">
              <div class="score-title">
                <span>Green</span>
                <strong>${Math.round(item.green)}/100</strong>
              </div>
              <div class="progress">
                <div class="progress-bar" style="width:${item.green}%"></div>
              </div>
            </div>

            <div class="score-block">
              <div class="score-title">
                <span>Ethical</span>
                <strong>${Math.round(item.ethical)}/100</strong>
              </div>
              <div class="progress">
                <div class="progress-bar" style="width:${item.ethical}%"></div>
              </div>
            </div>

            <div class="badge-row">
              ${item.sources.map((source) => `<span class="badge">${source}</span>`).join("")}
            </div>

            <div class="link-row">
              ${item.sourceLinks
                .map(
                  (link) =>
                    `<a href="${link.url}" target="_blank" rel="noreferrer">${link.label}</a>`
                )
                .join("")}
            </div>

            <div class="notes">${item.notes}</div>
          </article>
        `;
      })
      .join("");
  }

  searchInput.addEventListener("input", render);
  greenSlider.addEventListener("input", render);
  ethicalSlider.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  sortFilter.addEventListener("change", render);

  syncSliderLabels();
  loadInstruments();
});
