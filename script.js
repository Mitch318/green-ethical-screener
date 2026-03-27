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

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: "application/json",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

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

  function prettyGroup(group) {
    return String(group || "other")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function dedupeByKey(items, keyFn) {
    const seen = new Set();
    return items.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchTable(tableName, selectClause, extraQuery = "") {
    const endpoint =
      `${SUPABASE_URL}/rest/v1/${tableName}?select=${encodeURIComponent(selectClause)}` +
      extraQuery;

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${tableName} ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async function loadData() {
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

    try {
      const [instrumentRows, profileRows, sourceRows, holdingRows] = await Promise.all([
        fetchTable(
          "instruments",
          "id,ticker,name,type,exchange,green_score,ethical_score,green_source_label,green_source_url,ethical_source_label,ethical_source_url",
          "&order=name.asc"
        ),
        fetchTable(
          "instrument_profiles",
          "instrument_id,short_synopsis,sector,industry,country,website_url,issuer_url,updated_at"
        ),
        fetchTable(
          "instrument_sources",
          "instrument_id,source_group,source_label,source_url,raw_value,normalized_score,notes,as_of_date",
          "&order=source_group.asc"
        ),
        fetchTable(
          "etf_holdings",
          "etf_instrument_id,holding_instrument_id,weight,as_of_date,source_label,source_url",
          "&order=weight.desc"
        ),
      ]);

      const instrumentsById = new Map(instrumentRows.map((row) => [row.id, row]));

      const profilesByInstrumentId = new Map();
      profileRows.forEach((row) => {
        profilesByInstrumentId.set(row.instrument_id, row);
      });

      const sourcesByInstrumentId = new Map();
      sourceRows.forEach((row) => {
        if (!sourcesByInstrumentId.has(row.instrument_id)) {
          sourcesByInstrumentId.set(row.instrument_id, []);
        }
        sourcesByInstrumentId.get(row.instrument_id).push(row);
      });

      const holdingsByEtfId = new Map();
      holdingRows.forEach((row) => {
        if (!holdingsByEtfId.has(row.etf_instrument_id)) {
          holdingsByEtfId.set(row.etf_instrument_id, []);
        }
        holdingsByEtfId.get(row.etf_instrument_id).push(row);
      });

      instruments = instrumentRows.map((row) => {
        const profile = profilesByInstrumentId.get(row.id) || null;
        const tableSources = sourcesByInstrumentId.get(row.id) || [];
        const legacySources = [];

        if (row.green_source_label && row.green_source_url) {
          legacySources.push({
            source_group: "green",
            source_label: row.green_source_label,
            source_url: row.green_source_url,
            raw_value: null,
            normalized_score: row.green_score,
            notes: "Legacy green source from instruments table",
            as_of_date: null,
          });
        }

        if (row.ethical_source_label && row.ethical_source_url) {
          legacySources.push({
            source_group: "ethical",
            source_label: row.ethical_source_label,
            source_url: row.ethical_source_url,
            raw_value: null,
            normalized_score: row.ethical_score,
            notes: "Legacy ethical source from instruments table",
            as_of_date: null,
          });
        }

        const allSources = dedupeByKey(
          [...tableSources, ...legacySources],
          (s) => `${s.source_group}|${s.source_label}|${s.source_url}`
        );

        const sourceGroups = [...new Set(allSources.map((s) => prettyGroup(s.source_group)))];

        const holdings = (holdingsByEtfId.get(row.id) || []).map((holding) => {
          const target = instrumentsById.get(holding.holding_instrument_id);
          return {
            ticker: target?.ticker || "Unknown",
            name: target?.name || "Unknown holding",
            weight: Number(holding.weight || 0),
            asOfDate: holding.as_of_date || "",
            sourceLabel: holding.source_label || "",
            sourceUrl: holding.source_url || "",
          };
        });

        const websiteLinks = [];
        if (profile?.website_url) {
          websiteLinks.push({
            source_group: "profile",
            source_label: "Company website",
            source_url: profile.website_url,
            raw_value: null,
            normalized_score: null,
            notes: null,
            as_of_date: null,
          });
        }
        if (profile?.issuer_url) {
          websiteLinks.push({
            source_group: "profile",
            source_label: "Issuer website",
            source_url: profile.issuer_url,
            raw_value: null,
            normalized_score: null,
            notes: null,
            as_of_date: null,
          });
        }

        const mergedSources = dedupeByKey(
          [...allSources, ...websiteLinks],
          (s) => `${s.source_group}|${s.source_label}|${s.source_url}`
        );

        return {
          id: row.id,
          ticker: row.ticker || "",
          name: row.name || "",
          type: String(row.type || "stock").toLowerCase(),
          exchange: row.exchange || "",
          green: Number(row.green_score || 0),
          ethical: Number(row.ethical_score || 0),
          synopsis:
            profile?.short_synopsis ||
            (String(row.type || "").toLowerCase() === "etf"
              ? "No ETF synopsis added yet."
              : "No company synopsis added yet."),
          sector: profile?.sector || "",
          industry: profile?.industry || "",
          country: profile?.country || "",
          sources: mergedSources,
          sourceGroups,
          holdings,
        };
      });

      render();
    } catch (error) {
      console.error(error);
      results.innerHTML = `
        <div class="card no-results">
          Could not load data from Supabase.<br /><br />
          <strong>Error:</strong> ${escapeHtml(error.message)}
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
          item.exchange.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q) ||
          item.industry.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q)
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

        const metaBits = [item.exchange, item.sector, item.industry, item.country].filter(Boolean);

        const groupedSources = item.sources.reduce((acc, src) => {
          const key = prettyGroup(src.source_group);
          if (!acc[key]) acc[key] = [];
          acc[key].push(src);
          return acc;
        }, {});

        const sourceGroupsHtml = Object.entries(groupedSources)
          .map(([groupName, entries]) => {
            const uniqueEntries = dedupeByKey(
              entries,
              (s) => `${s.source_label}|${s.source_url}|${s.notes}|${s.raw_value}`
            );

            return `
              <div class="source-group-block">
                <div class="section-subtitle">${escapeHtml(groupName)}</div>
                <div class="source-link-list">
                  ${uniqueEntries
                    .map((src) => {
                      const extraParts = [
                        src.raw_value ? `Raw: ${escapeHtml(src.raw_value)}` : "",
                        src.normalized_score != null ? `Score: ${escapeHtml(src.normalized_score)}` : "",
                        src.as_of_date ? `As of: ${escapeHtml(src.as_of_date)}` : "",
                        src.notes ? escapeHtml(src.notes) : "",
                      ].filter(Boolean);

                      return `
                        <div class="source-link-item">
                          <a href="${escapeHtml(src.source_url)}" target="_blank" rel="noreferrer">
                            ${escapeHtml(src.source_label)}
                          </a>
                          ${extraParts.length ? `<div class="source-extra">${extraParts.join(" • ")}</div>` : ""}
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            `;
          })
          .join("");

        const holdingsPreview =
          item.type === "etf" && item.holdings.length
            ? `
              <div class="section-block">
                <div class="section-title">Top holdings preview</div>
                <div class="holding-list">
                  ${item.holdings
                    .slice(0, 6)
                    .map(
                      (holding) => `
                        <div class="holding-row">
                          <div class="holding-left">
                            <strong>${escapeHtml(holding.ticker)}</strong>
                            <span>${escapeHtml(holding.name)}</span>
                          </div>
                          <div class="holding-right">${Math.round(holding.weight * 100) / 100}%</div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </div>
            `
            : item.type === "etf"
            ? `
              <div class="section-block">
                <div class="section-title">Top holdings preview</div>
                <div class="muted-small">No ETF holdings added yet.</div>
              </div>
            `
            : "";

        return `
          <article class="card instrument-card">
            <div class="top-row">
              <div>
                <h3 class="instrument-name">${escapeHtml(item.name)}</h3>
                <div class="meta">${escapeHtml(item.ticker)} • ${escapeHtml(item.type.toUpperCase())}</div>
              </div>
              <div class="status-badge">${escapeHtml(scoreLabel(averageScore))}</div>
            </div>

            ${metaBits.length ? `<div class="meta meta-secondary">${escapeHtml(metaBits.join(" • "))}</div>` : ""}

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

            ${
              item.sourceGroups.length
                ? `<div class="badge-row">${item.sourceGroups
                    .map((group) => `<span class="badge">${escapeHtml(group)}</span>`)
                    .join("")}</div>`
                : ""
            }

            <div class="section-block">
              <div class="section-title">Synopsis</div>
              <div class="notes">${escapeHtml(item.synopsis)}</div>
            </div>

            ${holdingsPreview}

            <div class="section-block">
              <div class="section-title">Supporting data</div>
              ${sourceGroupsHtml || '<div class="muted-small">No supporting sources added yet.</div>'}
            </div>
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
  loadData();
});
