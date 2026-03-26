const companyScores = {
  MSFT: {
    name: "Microsoft",
    ticker: "MSFT",
    type: "stock",
    exchange: "NASDAQ",
    green: 82,
    ethical: 74,
    sources: ["CDP", "WBA/CHRB", "Sanctions/Exclusions"],
    sourceLinks: [
      { label: "CDP scores", url: "https://www.cdp.net/en/data/scores" },
      { label: "Corporate Human Rights Benchmark", url: "https://www.worldbenchmarkingalliance.org/benchmark/corporate-human-rights-benchmark" },
      { label: "OFAC sanctions lists", url: "https://ofac.treasury.gov/sanctions-list-service" }
    ],
    notes: "Strong disclosure; moderate governance and supply-chain watch items."
  },
  NEE: {
    name: "NextEra Energy",
    ticker: "NEE",
    type: "stock",
    exchange: "NYSE",
    green: 88,
    ethical: 69,
    sources: ["CDP", "WBA/CHRB", "Sanctions/Exclusions"],
    sourceLinks: [
      { label: "CDP scores", url: "https://www.cdp.net/en/data/scores" },
      { label: "Corporate Human Rights Benchmark", url: "https://www.worldbenchmarkingalliance.org/benchmark/corporate-human-rights-benchmark" },
      { label: "OFAC sanctions lists", url: "https://ofac.treasury.gov/sanctions-list-service" }
    ],
    notes: "Strong renewables exposure; standard utility governance profile."
  },
  ORSTED: {
    name: "Ørsted",
    ticker: "ORSTED",
    type: "stock",
    exchange: "CPH",
    green: 91,
    ethical: 78,
    sources: ["CDP", "WBA/CHRB", "Sanctions/Exclusions"],
    sourceLinks: [
      { label: "CDP scores", url: "https://www.cdp.net/en/data/scores" },
      { label: "Corporate Human Rights Benchmark", url: "https://www.worldbenchmarkingalliance.org/benchmark/corporate-human-rights-benchmark" },
      { label: "OFAC sanctions lists", url: "https://ofac.treasury.gov/sanctions-list-service" }
    ],
    notes: "High green alignment; relatively strong transition profile."
  },
  TSLA: {
    name: "Tesla",
    ticker: "TSLA",
    type: "stock",
    exchange: "NASDAQ",
    green: 72,
    ethical: 49,
    sources: ["CDP", "WBA/CHRB", "Sanctions/Exclusions"],
    sourceLinks: [
      { label: "CDP scores", url: "https://www.cdp.net/en/data/scores" },
      { label: "Corporate Human Rights Benchmark", url: "https://www.worldbenchmarkingalliance.org/benchmark/corporate-human-rights-benchmark" },
      { label: "OFAC sanctions lists", url: "https://ofac.treasury.gov/sanctions-list-service" }
    ],
    notes: "Clean-tech exposure offset by recurring governance and labour concerns."
  },
  XOM: {
    name: "Exxon Mobil",
    ticker: "XOM",
    type: "stock",
    exchange: "NYSE",
    green: 18,
    ethical: 38,
    sources: ["CDP", "WBA/CHRB", "Sanctions/Exclusions"],
    sourceLinks: [
      { label: "CDP scores", url: "https://www.cdp.net/en/data/scores" },
      { label: "Corporate Human Rights Benchmark", url: "https://www.worldbenchmarkingalliance.org/benchmark/corporate-human-rights-benchmark" },
      { label: "OFAC sanctions lists", url: "https://ofac.treasury.gov/sanctions-list-service" }
    ],
    notes: "Low green profile due to fossil-fuel intensity."
  },
  PG: {
    name: "Procter & Gamble",
    ticker: "PG",
    type: "stock",
    exchange: "NYSE",
    green: 61,
    ethical: 64,
    sources: ["CDP", "WBA/CHRB", "Sanctions/Exclusions"],
    sourceLinks: [
      { label: "CDP scores", url: "https://www.cdp.net/en/data/scores" },
      { label: "Corporate Human Rights Benchmark", url: "https://www.worldbenchmarkingalliance.org/benchmark/corporate-human-rights-benchmark" },
      { label: "OFAC sanctions lists", url: "https://ofac.treasury.gov/sanctions-list-service" }
    ],
    notes: "Moderate sustainability profile with broad consumer exposure."
  }
};

const etfHoldings = {
  ESGV: [
    { ticker: "MSFT", weight: 0.35 },
    { ticker: "NEE", weight: 0.20 },
    { ticker: "PG", weight: 0.20 },
    { ticker: "TSLA", weight: 0.15 },
    { ticker: "XOM", weight: 0.10 }
  ],
  ICLN: [
    { ticker: "ORSTED", weight: 0.45 },
    { ticker: "NEE", weight: 0.25 },
    { ticker: "TSLA", weight: 0.20 },
    { ticker: "PG", weight: 0.10 }
  ]
};

const instruments = [
  { ticker: "MSFT", name: "Microsoft", type: "stock", exchange: "NASDAQ" },
  { ticker: "NEE", name: "NextEra Energy", type: "stock", exchange: "NYSE" },
  { ticker: "ORSTED", name: "Ørsted", type: "stock", exchange: "CPH" },
  { ticker: "TSLA", name: "Tesla", type: "stock", exchange: "NASDAQ" },
  { ticker: "XOM", name: "Exxon Mobil", type: "stock", exchange: "NYSE" },
  { ticker: "PG", name: "Procter & Gamble", type: "stock", exchange: "NYSE" },
  { ticker: "ESGV", name: "Vanguard ESG U.S. Stock ETF", type: "etf", exchange: "NYSE Arca" },
  { ticker: "ICLN", name: "iShares Global Clean Energy ETF", type: "etf", exchange: "NASDAQ" }
];

const searchInput = document.getElementById("search");
const greenSlider = document.getElementById("greenSlider");
const ethicalSlider = document.getElementById("ethicalSlider");
const greenValue = document.getElementById("greenValue");
const ethicalValue = document.getElementById("ethicalValue");
const typeFilter = document.getElementById("typeFilter");
const matchCount = document.getElementById("matchCount");
const avgGreen = document.getElementById("avgGreen");
const avgEthical = document.getElementById("avgEthical");
const results = document.getElementById("results");

function weightedAverage(items, field) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  return items.reduce((sum, item) => sum + (companyScores[item.ticker][field] * item.weight), 0) / totalWeight;
}

function scoreLabel(score) {
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  if (score >= 40) return "Mixed";
  return "Low";
}

function enrichInstrument(item) {
  if (item.type === "stock") {
    return { ...item, ...companyScores[item.ticker], holdings: [] };
  }

  const holdings = etfHoldings[item.ticker] || [];
  return {
    ...item,
    green: weightedAverage(holdings, "green"),
    ethical: weightedAverage(holdings, "ethical"),
    holdings,
    sources: ["Weighted constituent company scores"],
    sourceLinks: [
      { label: "ETF constituents source", url: "https://finnhub.io/docs/api/etfs-holdings" },
      { label: "Alternative ETF holdings source", url: "https://site.financialmodelingprep.com/developer/docs/stable/holdings" }
    ],
    notes: "ETF scores are calculated from underlying holdings and weights."
  };
}

function render() {
  greenValue.textContent = greenSlider.value;
  ethicalValue.textContent = ethicalSlider.value;

  const q = searchInput.value.trim().toLowerCase();
  const greenMin = Number(greenSlider.value);
  const ethicalMin = Number(ethicalSlider.value);
  const kind = typeFilter.value;

  const enriched = instruments.map(enrichInstrument);

  const filtered = enriched
    .filter(item => kind === "all" || item.type === kind)
    .filter(item => item.green >= greenMin && item.ethical >= ethicalMin)
    .filter(item => {
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.ticker.toLowerCase().includes(q) || item.exchange.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.green + b.ethical) - (a.green + a.ethical));

  matchCount.textContent = filtered.length;
  avgGreen.textContent = filtered.length ? Math.round(filtered.reduce((s, i) => s + i.green, 0) / filtered.length) : 0;
  avgEthical.textContent = filtered.length ? Math.round(filtered.reduce((s, i) => s + i.ethical, 0) / filtered.length) : 0;

  if (!filtered.length) {
    results.innerHTML = '<div class="card no-results">No companies or ETFs match your current filters.</div>';
    return;
  }

  results.innerHTML = filtered.map(item => {
    const averageScore = (item.green + item.ethical) / 2;
    const holdingsHtml = item.type === "etf" && item.holdings.length
      ? `
        <div class="holdings">
          <strong>Look-through holdings</strong>
          ${item.holdings.map(h => {
            const company = companyScores[h.ticker];
            return `
              <div class="holding-row">
                <div>
                  <div><strong>${h.ticker}</strong></div>
                  <div class="meta">${company.name}</div>
                </div>
                <div><strong>${Math.round(h.weight * 100)}%</strong><div class="meta">weight</div></div>
              </div>
            `;
          }).join("")}
        </div>
      `
      : "";

    return `
      <article class="card instrument-card">
        <div class="top-row">
          <div>
            <h3 class="instrument-name">${item.name}</h3>
            <div class="meta">${item.ticker} • ${item.type.toUpperCase()} • ${item.exchange}${item.type === "etf" ? ` • ${item.holdings.length} holdings used` : ""}</div>
          </div>
          <div class="status-badge">${scoreLabel(averageScore)}</div>
        </div>

        <div class="score-block">
          <div class="score-title"><span>Green</span><strong>${Math.round(item.green)}/100</strong></div>
          <div class="progress"><div class="progress-bar" style="width:${item.green}%"></div></div>
        </div>

        <div class="score-block">
          <div class="score-title"><span>Ethical</span><strong>${Math.round(item.ethical)}/100</strong></div>
          <div class="progress"><div class="progress-bar" style="width:${item.ethical}%"></div></div>
        </div>

        <div class="badge-row">
          ${item.sources.map(source => `<span class="badge">${source}</span>`).join("")}
        </div>

        <div class="link-row">
          ${item.sourceLinks.map(link => `<a href="${link.url}" target="_blank" rel="noreferrer">${link.label}</a>`).join("")}
        </div>

        <div class="notes">${item.notes}</div>
        ${holdingsHtml}
      </article>
    `;
  }).join("");
}

[searchInput, greenSlider, ethicalSlider, typeFilter].forEach(el => el.addEventListener("input", render));
[typeFilter].forEach(el => el.addEventListener("change", render));

render();
