let allDataRows = [],
  headers = [],
  infoRows = [],
  currentPage = 1,
  rowsPerPage = 25,
  filterType = "month";       // "month" | "year" | "monthyear"
let monthCols = [],
  yearCols = [],
  pctColIndices = new Set(),
  sidebarOpen = true,
  codeMap = {},
  activeFilterCount = 0;

// ─── CODE PERIOD TYPE ─────────────────────────────────────────────────────────
let codePeriodType = "month"; // "month" | "year" | "monthyear"

// ─── CODE EXTRACT ─────────────────────────────────────────────────────────────
function extractCode(val) {
  if (val === null || val === undefined) return null;
  const s = val.toString().trim();
  const match = s.match(/^(\d{3,6})\s+/);
  if (!match) return null;
  const n = parseInt(match[1]);
  if (n >= 1990 && n <= 2100) return null;
  return match[1];
}

function extractLabel(val) {
  if (val === null || val === undefined) return "";
  const s = val.toString().trim();
  const match = s.match(/^\d{3,6}\s+(.*)/);
  return match ? match[1].trim() : s;
}

// ─── CODE COLUMN INDEX ────────────────────────────────────────────────────────
function findCodeColIndex() {
  for (let r = 0; r < Math.min(allDataRows.length, 20); r++) {
    const row = allDataRows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const v = row[c] !== null && row[c] !== undefined ? row[c].toString().trim() : "";
      if (extractCode(v) !== null) return c;
    }
  }
  return 1;
}

const isMobile = () => window.innerWidth <= 768;

function toggleSidebar() {
  if (isMobile()) {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("show");
  } else {
    sidebarOpen = !sidebarOpen;
    document.getElementById("sidebar").classList.toggle("collapsed", !sidebarOpen);
  }
}

function closeSidebar() {
  if (isMobile()) {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("show");
  } else {
    sidebarOpen = false;
    document.getElementById("sidebar").classList.add("collapsed");
  }
}

window.addEventListener("resize", () => {
  if (isMobile()) {
    document.getElementById("sidebar").classList.remove("collapsed");
  } else {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("show");
    if (sidebarOpen) document.getElementById("sidebar").classList.remove("collapsed");
  }
});

function openFilterDrawer() {
  document.getElementById("filterDrawer").classList.add("open");
  document.getElementById("filterDrawerOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeFilterDrawer() {
  document.getElementById("filterDrawer").classList.remove("open");
  document.getElementById("filterDrawerOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ─── PILLS ────────────────────────────────────────────────────────────────────
function updatePills() {
  const pills  = document.getElementById("activePills");
  const badge  = document.getElementById("filterBadge");
  let html = "", count = 0;

  if (filterType === "month") {
    const i1 = document.getElementById("selMonth1").value;
    const i2 = document.getElementById("selMonth2").value;
    if (i1 !== "") {
      count++;
      html += `<span class="filter-pill"><i class="bi bi-calendar3" style="font-size:11px;"></i>${monthCols[i1].label}<span class="filter-pill-x" onclick="clearPeriod1()">×</span></span>`;
    }
    if (i2 !== "") {
      count++;
      html += `<span class="filter-pill"><i class="bi bi-arrow-left-right" style="font-size:11px;"></i>${monthCols[i2].label}<span class="filter-pill-x" onclick="clearPeriod2()">×</span></span>`;
    }
  } else if (filterType === "year") {
    const i1 = document.getElementById("selYear1").value;
    const i2 = document.getElementById("selYear2").value;
    if (i1 !== "") {
      count++;
      html += `<span class="filter-pill"><i class="bi bi-calendar3" style="font-size:11px;"></i>${yearCols[i1].label}<span class="filter-pill-x" onclick="clearPeriod1()">×</span></span>`;
    }
    if (i2 !== "") {
      count++;
      html += `<span class="filter-pill"><i class="bi bi-arrow-left-right" style="font-size:11px;"></i>${yearCols[i2].label}<span class="filter-pill-x" onclick="clearPeriod2()">×</span></span>`;
    }
  } else if (filterType === "monthyear") {
    const im = document.getElementById("selMY_month").value;
    const iy = document.getElementById("selMY_year").value;
    if (im !== "") {
      count++;
      html += `<span class="filter-pill"><i class="bi bi-calendar3" style="font-size:11px;"></i>${monthCols[im].label}<span class="filter-pill-x" onclick="clearPeriod1()">×</span></span>`;
    }
    if (iy !== "") {
      count++;
      html += `<span class="filter-pill"><i class="bi bi-arrow-left-right" style="font-size:11px;"></i>${yearCols[iy].label}<span class="filter-pill-x" onclick="clearPeriod2()">×</span></span>`;
    }
  }

  const codeVal = document.getElementById("codeSelect").value;
  if (codeVal !== "") {
    count++;
    const row = allDataRows[parseInt(codeVal)];
    const CODE_COL = findCodeColIndex();
    const cellVal = row ? (row[CODE_COL] || "").toString().trim() : "";
    const code = extractCode(cellVal) || cellVal;
    html += `<span class="filter-pill purple-pill"><i class="bi bi-hash" style="font-size:11px;"></i>${code}<span class="filter-pill-x" onclick="clearCode()">×</span></span>`;
  }

  pills.innerHTML = html;
  activeFilterCount = count;
  if (count > 0) {
    badge.style.display = "inline-block";
    badge.textContent   = count;
  } else {
    badge.style.display = "none";
  }
}

function clearPeriod1() {
  if (filterType === "month") {
    document.getElementById("selMonth1").value = "";
    document.getElementById("selMonth2").value = "";
  } else if (filterType === "year") {
    document.getElementById("selYear1").value = "";
    document.getElementById("selYear2").value = "";
  } else {
    document.getElementById("selMY_month").value = "";
    document.getElementById("selMY_year").value  = "";
  }
  onFilterChange();
}
function clearPeriod2() {
  if (filterType === "month") {
    document.getElementById("selMonth2").value = "";
  } else if (filterType === "year") {
    document.getElementById("selYear2").value = "";
  } else {
    document.getElementById("selMY_year").value = "";
  }
  onFilterChange();
}
function clearCode() {
  document.getElementById("codeSelect").value = "";
  onCodeSelect();
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MONTHS_EN    = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const MONTHS_AB    = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const MONTHS_ES    = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MONTHS_AB_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isMonth(s) {
  const lc = s.toLowerCase().trim();
  return MONTHS_EN.includes(lc) || MONTHS_AB.includes(lc) || MONTHS_ES.includes(lc) || MONTHS_AB_ES.includes(lc);
}
function isYear(s) {
  return /^\d{4}$/.test(s.trim()) && parseInt(s) >= 1990 && parseInt(s) <= 2100;
}
function isSkipRow(row) {
  return !row || row.length === 0 || row.every((c) => c === null || c === undefined || c.toString().trim() === "");
}
function fmt(n) {
  if (isNaN(n) || n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // ← Math.abs() remove kar diya
}
function cellNum(row, ci) {
  if (pctColIndices.has(ci)) return 0;
  const raw = row[ci] !== undefined && row[ci] !== null ? row[ci].toString().trim() : "";
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}
function getPctForCol(row, colIndex) {
  if (pctColIndices.has(colIndex + 1)) {
    const raw = row[colIndex + 1] !== null && row[colIndex + 1] !== undefined
      ? row[colIndex + 1].toString().trim() : "";
    if (raw) {
      const v = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
      return isNaN(v) ? null : v;
    }
  }
  return null;
}
function fdCard(icon, label, value, sub, type) {
  return `<div class="fd-card ${type}">
    <div class="fd-card-icon">${icon}</div>
    <div class="fd-card-label">${label}</div>
    <div class="fd-card-value">${value}</div>
    ${sub ? `<div class="fd-card-sub">${sub}</div>` : ""}
  </div>`;
}

// ─── PARSE HEADERS ────────────────────────────────────────────────────────────
function parseColumnsFromHeaders() {
  monthCols = [];
  yearCols  = [];
  pctColIndices = new Set();
  headers.forEach((h, i) => {
    const s = (h || "").toString().trim();
    if (!s) return;
    if (s === "%") { pctColIndices.add(i); return; }
    if (isYear(s))  yearCols.push({ label: s, colIndex: i });
    else if (isMonth(s)) monthCols.push({ label: s, colIndex: i });
  });
}

// ─── PERIOD FILTER DROPDOWNS ──────────────────────────────────────────────────
function populateFilterDropdowns() {
  ["selMonth1","selMonth2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    el.innerHTML = idx === 0 ? '<option value="">-- Select --</option>' : '<option value="">-- None --</option>';
    monthCols.forEach((m, i) => (el.innerHTML += `<option value="${i}">${m.label}</option>`));
  });
  ["selYear1","selYear2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    el.innerHTML = idx === 0 ? '<option value="">-- Select --</option>' : '<option value="">-- None --</option>';
    yearCols.forEach((y, i) => (el.innerHTML += `<option value="${i}">${y.label}</option>`));
  });

  // Month vs Year cross-compare dropdowns
  const mySel = document.getElementById("selMY_month");
  if (mySel) {
    mySel.innerHTML = '<option value="">-- Select Month --</option>';
    monthCols.forEach((m, i) => (mySel.innerHTML += `<option value="${i}">${m.label}</option>`));
  }
  const yySel = document.getElementById("selMY_year");
  if (yySel) {
    yySel.innerHTML = '<option value="">-- Select Year --</option>';
    yearCols.forEach((y, i) => (yySel.innerHTML += `<option value="${i}">${y.label}</option>`));
  }

  if (monthCols.length === 0 && yearCols.length > 0) setFilterType("year");
  else setFilterType("month");
}

// ─── SET FILTER TYPE ──────────────────────────────────────────────────────────
function setFilterType(type) {
  filterType = type;
  document.getElementById("btnMonth").classList.toggle("active",     type === "month");
  document.getElementById("btnYear").classList.toggle("active",      type === "year");
  document.getElementById("btnMonthYear").classList.toggle("active", type === "monthyear");
  document.getElementById("monthFilters").style.display     = type === "month"     ? "block" : "none";
  document.getElementById("yearFilters").style.display      = type === "year"      ? "block" : "none";
  document.getElementById("monthYearFilters").style.display = type === "monthyear" ? "block" : "none";
  hideDrawerSummary();
}

// ─── ON FILTER CHANGE ─────────────────────────────────────────────────────────
function onFilterChange() {
  if (filterType === "month") {
    const i1 = document.getElementById("selMonth1").value;
    const i2 = document.getElementById("selMonth2").value;
    if (i1 === "") { hideDrawerSummary(); updatePills(); return; }
    if (i2 === "") showDrawerSingle(monthCols[i1]);
    else           showDrawerCompare(monthCols[i1], monthCols[i2]);

  } else if (filterType === "year") {
    const i1 = document.getElementById("selYear1").value;
    const i2 = document.getElementById("selYear2").value;
    if (i1 === "") { hideDrawerSummary(); updatePills(); return; }
    if (i2 === "") showDrawerSingle(yearCols[i1]);
    else           showDrawerCompare(yearCols[i1], yearCols[i2]);

  } else if (filterType === "monthyear") {
    const im = document.getElementById("selMY_month").value;
    const iy = document.getElementById("selMY_year").value;
    if (im === "" && iy === "") { hideDrawerSummary(); updatePills(); return; }
    if (im !== "" && iy === "") { showDrawerSingle(monthCols[im]); updatePills(); return; }
    if (im === "" && iy !== "") { showDrawerSingle(yearCols[iy]);  updatePills(); return; }
    // Both selected — cross-compare month vs year
    showDrawerCompare(monthCols[im], yearCols[iy]);
  }
  updatePills();
}

// ─── PERIOD SUMMARY ───────────────────────────────────────────────────────────
function calcSummary(colObj) {
  const ci = colObj.colIndex;
  const entries = [];
  allDataRows.forEach((row) => {
    if (isSkipRow(row)) return;
    const v = cellNum(row, ci);
    if (v === 0) return;
    entries.push({ value: v, key: v.toFixed(4) });
  });
  const seen = {};
  let income = 0, expense = 0;
  entries.forEach((e) => {
    seen[e.key] = (seen[e.key] || 0) + 1;
    if (seen[e.key] > 1) return;
    if (e.value > 0) income += e.value;
    else expense += Math.abs(e.value);
  });
  const net = income - expense;
  return { income, expense, profit: net >= 0 ? net : 0, loss: net < 0 ? Math.abs(net) : 0, net };
}

function showDrawerSingle(colObj) {
  const s = calcSummary(colObj);
  let html = `<div style="font-size:11px;font-weight:700;color:#0d6efd;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;display:flex;align-items:center;gap:6px;"><i class="bi bi-bar-chart-fill"></i>Summary — ${colObj.label}</div>`;
  html += `<div class="fd-cards-grid">`;
  html += fdCard("💰", "Income",  fmt(s.income),  "Unique +ve", "income");
  html += fdCard("💸", "Expense", fmt(s.expense), "Unique |−ve|", "expense");
  if (s.profit > 0) html += fdCard("📈", "Profit", fmt(s.profit), "Net positive", "profit");
  if (s.loss   > 0) html += fdCard("📉", "Loss",   fmt(s.loss),   "Net negative", "loss");
  html += `</div>`;
  html += `<div class="formula-hint">💡 Net = ${s.net >= 0 ? "+" : ""}${s.net.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
  document.getElementById("drawerSummaryContent").innerHTML = html;
  document.getElementById("drawerSummarySection").style.display = "block";
}

function showDrawerCompare(col1, col2) {
  const s1 = calcSummary(col1);
  const s2 = calcSummary(col2);
  function arrow(a, b, good) {
    const d   = b - a;
    const pct = a !== 0 ? ((d / Math.abs(a)) * 100).toFixed(1) : null;
    const cls = d === 0 ? "neutral" : d > 0 === good ? "up" : "down";
    const sym = d > 0 ? "▲" : d < 0 ? "▼" : "—";
    return `<span class="diff-val ${cls}">${sym}${pct !== null ? pct + "%" : "—"}</span>`;
  }
  function miniBlock(col, s) {
    let h = `<div><div style="font-size:11px;font-weight:700;color:#0d6efd;margin-bottom:6px;border-bottom:1px solid #b0c8ff;padding-bottom:4px;">${col.label}</div>`;
    h += `<div class="fd-cards-grid">`;
    h += fdCard("💰", "Income",  fmt(s.income),  "", "income");
    h += fdCard("💸", "Expense", fmt(s.expense), "", "expense");
    if (s.profit > 0) h += fdCard("📈", "Profit", fmt(s.profit), "", "profit");
    if (s.loss   > 0) h += fdCard("📉", "Loss",   fmt(s.loss),   "", "loss");
    h += `</div></div>`;
    return h;
  }
  let html = `<div style="font-size:11px;font-weight:700;color:#0d6efd;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;align-items:center;gap:5px;"><i class="bi bi-arrow-left-right"></i>Comparison</div>`;
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">${miniBlock(col1, s1)}${miniBlock(col2, s2)}</div>`;
  html += `<div class="diff-card"><div class="diff-title">Difference (${col2.label} vs ${col1.label})</div>`;
  [
    { k: "income",  icon: "💰", label: "Income",  good: true  },
    { k: "expense", icon: "💸", label: "Expense", good: false },
    { k: "profit",  icon: "📈", label: "Profit",  good: true  },
    { k: "loss",    icon: "📉", label: "Loss",    good: false },
  ].forEach((r) => {
    if (s1[r.k] > 0 || s2[r.k] > 0) {
      const d = s2[r.k] - s1[r.k];
      html += `<div class="diff-row"><span class="diff-label">${r.icon} ${r.label}</span><span style="font-size:11px;">${fmt(s1[r.k])} → ${fmt(s2[r.k])} ${arrow(s1[r.k], s2[r.k], r.good)} (${d >= 0 ? "+" : "-"}${fmt(Math.abs(d))})</span></div>`;
    }
  });
  html += `</div>`;
  document.getElementById("drawerSummaryContent").innerHTML = html;
  document.getElementById("drawerSummarySection").style.display = "block";
}

function hideDrawerSummary() {
  document.getElementById("drawerSummarySection").style.display = "none";
  document.getElementById("drawerSummaryContent").innerHTML = "";
}

// ─── CODE MAP ─────────────────────────────────────────────────────────────────
function buildCodeMap() {
  codeMap = {};
  const CODE_COL = findCodeColIndex();
  allDataRows.forEach((row, rowIdx) => {
    if (isSkipRow(row)) return;
    const cellVal = row[CODE_COL] !== null && row[CODE_COL] !== undefined ? row[CODE_COL].toString().trim() : "";
    const code    = extractCode(cellVal);
    if (!code) return;
    const label  = extractLabel(cellVal);
    const prefix = code.slice(0, 2);
    if (!codeMap[prefix]) codeMap[prefix] = { label: "", children: [] };
    if (code.length === 4 && !codeMap[prefix].label) codeMap[prefix].label = label;
    codeMap[prefix].children.push({ code, label, rowIdx });
  });
}

// ─── CODE PERIOD TYPE TOGGLE ──────────────────────────────────────────────────
function setCodePeriodType(type) {
  codePeriodType = type;
  const btnM  = document.getElementById("codeBtnMonth");
  const btnY  = document.getElementById("codeBtnYear");
  const btnMY = document.getElementById("codeBtnMonthYear");
  if (btnM)  btnM.classList.toggle("active",  type === "month");
  if (btnY)  btnY.classList.toggle("active",  type === "year");
  if (btnMY) btnMY.classList.toggle("active", type === "monthyear");

  const mf  = document.getElementById("codeMonthFilters");
  const yf  = document.getElementById("codeYearFilters");
  const myf = document.getElementById("codeMonthYearFilters");
  if (mf)  mf.style.display  = type === "month"     ? "block" : "none";
  if (yf)  yf.style.display  = type === "year"      ? "block" : "none";
  if (myf) myf.style.display = type === "monthyear" ? "block" : "none";

  // reset selections on toggle
  ["codeSelMonth1","codeSelMonth2","codeSelYear1","codeSelYear2",
   "codeSelMY_month","codeSelMY_year"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const cs = document.getElementById("drawerCodeSummary");
  if (cs) { cs.style.display = "none"; cs.innerHTML = ""; }
}

// ─── POPULATE CODE DROPDOWN ───────────────────────────────────────────────────
function populateCodeDropdown() {
  const sel     = document.getElementById("codeSelect");
  const section = document.getElementById("codeFilterSection");
  if (!sel || !section) return;

  sel.innerHTML = '<option value="">-- Code select  --</option>';
  const CODE_COL = findCodeColIndex();
  let codeCount = 0;

  allDataRows.forEach((row, rowIdx) => {
    if (isSkipRow(row)) return;
    const cellVal = row[CODE_COL] !== null && row[CODE_COL] !== undefined
      ? row[CODE_COL].toString().trim() : "";
    const code = extractCode(cellVal);
    if (!code) return;
    const opt = document.createElement("option");
    opt.value       = rowIdx;
    opt.textContent = code;
    sel.appendChild(opt);
    codeCount++;
  });

  // Month dropdowns for code section
  ["codeSelMonth1","codeSelMonth2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = idx === 0 ? '<option value="">-- Select --</option>' : '<option value="">-- None --</option>';
    monthCols.forEach((m, i) => { el.innerHTML += `<option value="${i}">${m.label}</option>`; });
  });

  // Year dropdowns for code section
  ["codeSelYear1","codeSelYear2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = idx === 0 ? '<option value="">-- Select --</option>' : '<option value="">-- None --</option>';
    yearCols.forEach((y, i) => { el.innerHTML += `<option value="${i}">${y.label}</option>`; });
  });

  // Month vs Year dropdowns for code section
  const cMY_m = document.getElementById("codeSelMY_month");
  if (cMY_m) {
    cMY_m.innerHTML = '<option value="">-- Select Month --</option>';
    monthCols.forEach((m, i) => { cMY_m.innerHTML += `<option value="${i}">${m.label}</option>`; });
  }
  const cMY_y = document.getElementById("codeSelMY_year");
  if (cMY_y) {
    cMY_y.innerHTML = '<option value="">-- Select Year --</option>';
    yearCols.forEach((y, i) => { cMY_y.innerHTML += `<option value="${i}">${y.label}</option>`; });
  }

  // Default toggle
  if (monthCols.length === 0 && yearCols.length > 0) setCodePeriodType("year");
  else setCodePeriodType("month");

  section.style.display = codeCount > 0 ? "block" : "none";
}

// ─── CODE SELECT ──────────────────────────────────────────────────────────────
function onCodeSelect() {
  const rowIdx     = document.getElementById("codeSelect").value;
  const summaryDiv = document.getElementById("drawerCodeSummary");
  const periodRow  = document.getElementById("codePeriodRow");

  if (rowIdx === "") {
    if (summaryDiv) { summaryDiv.style.display = "none"; summaryDiv.innerHTML = ""; }
    if (periodRow)  periodRow.style.display = "none";
    updatePills();
    return;
  }

  if (periodRow) periodRow.style.display = "block";
  onCodePeriodChange();
  updatePills();
}

// ─── CODE PERIOD CHANGE ───────────────────────────────────────────────────────
function onCodePeriodChange() {
  const rowIdx = document.getElementById("codeSelect").value;
  if (rowIdx === "") return;

  const row = allDataRows[parseInt(rowIdx)];
  if (!row) return;

  const CODE_COL   = findCodeColIndex();
  const cellVal    = (row[CODE_COL] || "").toString().trim();
  const code       = extractCode(cellVal) || cellVal;
  const label      = extractLabel(cellVal);
  const summaryDiv = document.getElementById("drawerCodeSummary");

  // ── Resolve col1 and col2 based on current toggle mode ──────────────────
  let col1 = null, col2 = null;

  if (codePeriodType === "month") {
    const i1 = document.getElementById("codeSelMonth1")?.value ?? "";
    const i2 = document.getElementById("codeSelMonth2")?.value ?? "";
    if (i1 !== "") col1 = monthCols[parseInt(i1)];
    if (i2 !== "") col2 = monthCols[parseInt(i2)];

  } else if (codePeriodType === "year") {
    const i1 = document.getElementById("codeSelYear1")?.value ?? "";
    const i2 = document.getElementById("codeSelYear2")?.value ?? "";
    if (i1 !== "") col1 = yearCols[parseInt(i1)];
    if (i2 !== "") col2 = yearCols[parseInt(i2)];

  } else if (codePeriodType === "monthyear") {
    const im = document.getElementById("codeSelMY_month")?.value ?? "";
    const iy = document.getElementById("codeSelMY_year")?.value ?? "";
    if (im !== "") col1 = monthCols[parseInt(im)];
    if (iy !== "") col2 = yearCols[parseInt(iy)];
  }

  // ── Determine the pool for "no period selected" overview ────────────────
  const isM  = codePeriodType === "month";
  const isMY = codePeriodType === "monthyear";
  // For overview table when no period is chosen, use monthCols in month/monthyear mode, yearCols in year mode
  const overviewPool = (codePeriodType === "year") ? yearCols : monthCols;
  const typeLabel    = (codePeriodType === "year") ? "Year" : "Month";

  // ── inner helpers ────────────────────────────────────────────────────────
 function calcCards(val) {
  const income  = val > 0 ? val : 0;
  const expense = val < 0 ? val : 0;          // ← abs() hata diya, negative rahega
  const net     = income + expense;            // ← ab correctly subtract hoga
  return { 
    income, 
    expense, 
    profit: net > 0 ? net  : 0, 
    loss:   net < 0 ? net  : 0,               // ← loss bhi negative rahega
    net 
  };
}

  function singleCard(icon, cardLabel, value, sub, type) {
    return `<div class="fd-card ${type}">
      <div class="fd-card-icon">${icon}</div>
      <div class="fd-card-label">${cardLabel}</div>
      <div class="fd-card-value">${fmt(value)}</div>
      ${sub ? `<div class="fd-card-sub">${sub}</div>` : ""}
    </div>`;
  }

 function renderCards(s, pct) {
  let h = `<div class="fd-cards-grid">`;
  if (s.income  > 0) h += singleCard("💰", "Income",  s.income,  pct !== null ? `% share: ${pct}%` : "", "income");
  if (s.expense < 0) h += singleCard("💸", "Expense", s.expense, pct !== null ? `% share: ${pct}%` : "", "expense"); // ← value as-is (negative)
  if (s.profit  > 0) h += singleCard("📈", "Profit",  s.profit,  "Net +ve", "profit");
  if (s.loss    < 0) h += singleCard("📉", "Loss",    s.loss,    "Net -ve", "loss");   // ← negative
  h += `</div>`;
  h += `<div class="formula-hint">💡 Net = ${s.net >= 0 ? "+" : ""}${s.net.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
  return h;
}

  function arrowSpan(a, b, goodIfUp) {
    const d   = b - a;
    const pct = a !== 0 ? ((d / Math.abs(a)) * 100).toFixed(1) : null;
    const cls = d === 0 ? "neutral" : (d > 0) === goodIfUp ? "up" : "down";
    const sym = d > 0 ? "▲" : d < 0 ? "▼" : "—";
    return `<span class="diff-val ${cls}">${sym}${pct !== null ? pct + "%" : "—"}</span>`;
  }

  function miniCards(colObj, s, pct) {
    let h = `<div>
      <div style="font-size:11px;font-weight:700;color:#0d6efd;margin-bottom:6px;border-bottom:1px solid #b0c8ff;padding-bottom:4px;">${colObj.label}</div>
      <div class="fd-cards-grid">`;
    if (s.income  > 0) h += singleCard("💰", "Income",  s.income,  pct !== null ? `${pct}%` : "", "income");
    if (s.expense > 0) h += singleCard("💸", "Expense", s.expense, pct !== null ? `${pct}%` : "", "expense");
    if (s.profit  > 0) h += singleCard("📈", "Profit",  s.profit,  "", "profit");
    if (s.loss    > 0) h += singleCard("📉", "Loss",    s.loss,    "", "loss");
    h += `</div></div>`;
    return h;
  }

  // ── NO PERIOD: overview table ────────────────────────────────────────────
  if (!col1 && !col2) {
    let html = `<div style="font-size:11px;font-weight:700;color:#7c3aed;margin:8px 0 6px;display:flex;align-items:center;gap:5px;">
        <i class="bi bi-table"></i> ${code} — ${label}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f0ecff;">
            <th style="padding:5px 8px;text-align:left;border-bottom:1px solid #ddd;">${typeLabel}</th>
            <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">Income</th>
            <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">Expense</th>
            <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">Net</th>
            <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">%</th>
          </tr>
        </thead><tbody>`;

    let hasAny = false;
    overviewPool.forEach((col) => {
      const v = cellNum(row, col.colIndex);
      if (v === 0) return;
      hasAny = true;
      const s      = calcCards(v);
      const pctVal = getPctForCol(row, col.colIndex);
      const netClr = s.net >= 0 ? "#2e7d32" : "#c62828";
      html += `<tr>
          <td style="padding:5px 8px;border-bottom:0.5px solid #eee;">${col.label}</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:#2e7d32;">${s.income  > 0 ? fmt(s.income)  : "—"}</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:#c62828;">${s.expense > 0 ? fmt(s.expense) : "—"}</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:${netClr};font-weight:500;">${s.net >= 0 ? "+" : "−"}${fmt(Math.abs(s.net))}</td>
          <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:#666;">${pctVal !== null ? pctVal + "%" : "—"}</td>
        </tr>`;
    });

    if (!hasAny) html += `<tr><td colspan="5" style="padding:8px;color:#888;">Koi data nahi mila</td></tr>`;
    html += `</tbody></table>`;
    summaryDiv.innerHTML = html;
    summaryDiv.style.display = "block";
    return;
  }

  // ── SINGLE PERIOD (col1 only) ────────────────────────────────────────────
  if (col1 && !col2) {
    const val1 = cellNum(row, col1.colIndex);
    const pct1 = getPctForCol(row, col1.colIndex);
    const s1   = calcCards(val1);
    let html = `<div style="font-size:11px;font-weight:700;color:#7c3aed;margin:8px 0 6px;">
        <i class="bi bi-bar-chart-fill"></i> ${code} — ${label}
      </div>
      <div style="font-size:11px;color:#555;margin-bottom:6px;">${col1.label}</div>`;
    html += renderCards(s1, pct1);
    summaryDiv.innerHTML = html;
    summaryDiv.style.display = "block";
    return;
  }

  // ── COMPARE TWO PERIODS (col1 vs col2 — may be different types) ──────────
  const val1 = cellNum(row, col1.colIndex);
  const pct1 = getPctForCol(row, col1.colIndex);
  const s1   = calcCards(val1);
  const val2 = cellNum(row, col2.colIndex);
  const pct2 = getPctForCol(row, col2.colIndex);
  const s2   = calcCards(val2);

  const pctDiff    = (pct1 !== null && pct2 !== null) ? (pct2 - pct1).toFixed(1) : null;
  const pctDiffCls = !pctDiff ? "neutral" : parseFloat(pctDiff) > 0 ? "up" : "down";
  const pctDiffSym = !pctDiff ? "—" : parseFloat(pctDiff) > 0 ? "▲" : "▼";

  let html = `<div style="font-size:11px;font-weight:700;color:#7c3aed;margin:8px 0 6px;">
      <i class="bi bi-arrow-left-right"></i> ${code} — ${label}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      ${miniCards(col1, s1, pct1)}
      ${miniCards(col2, s2, pct2)}
    </div>
    <div class="diff-card">
      <div class="diff-title">Difference — ${col2.label} vs ${col1.label}</div>`;

  [
    { key: "income",  icon: "💰", label: "Income",  goodIfUp: true  },
    { key: "expense", icon: "💸", label: "Expense", goodIfUp: false },
    { key: "profit",  icon: "📈", label: "Profit",  goodIfUp: true  },
    { key: "loss",    icon: "📉", label: "Loss",    goodIfUp: false },
  ].forEach((m) => {
    if (s1[m.key] > 0 || s2[m.key] > 0) {
      const d = s2[m.key] - s1[m.key];
      html += `<div class="diff-row">
        <span class="diff-label">${m.icon} ${m.label}</span>
        <span style="font-size:11px;">
          ${fmt(s1[m.key])} → ${fmt(s2[m.key])}
          ${arrowSpan(s1[m.key], s2[m.key], m.goodIfUp)}
          (${d >= 0 ? "+" : "−"}${fmt(Math.abs(d))})
        </span>
      </div>`;
    }
  });

  if (pctDiff !== null) {
    html += `<div class="diff-row">
      <span class="diff-label">📊 % share</span>
      <span style="font-size:11px;">
        ${pct1}% → ${pct2}%
        <span class="diff-val ${pctDiffCls}">${pctDiffSym}${Math.abs(pctDiff)} pp</span>
      </span>
    </div>`;
  }

  html += `</div>`;
  summaryDiv.innerHTML = html;
  summaryDiv.style.display = "block";
}

// ─── RESET ────────────────────────────────────────────────────────────────────
function resetAllFilters() {
  ["selMonth1","selMonth2","selYear1","selYear2",
   "selMY_month","selMY_year"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("codeSelect").value = "";
  ["codeSelMonth1","codeSelMonth2","codeSelYear1","codeSelYear2",
   "codeSelMY_month","codeSelMY_year"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const pr = document.getElementById("codePeriodRow");
  if (pr) pr.style.display = "none";
  hideDrawerSummary();
  const cs = document.getElementById("drawerCodeSummary");
  if (cs) { cs.style.display = "none"; cs.innerHTML = ""; }
  updatePills();
}

// ─── LOAD DATA ────────────────────────────────────────────────────────────────
async function loadSheetData() {
  try {
    const token = localStorage.getItem("jwt");
    const res = await fetch("/getLatestSheetResult", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Server error: ${res.status} - ${text}`);
    const result = JSON.parse(text);
    const loader = document.getElementById("loader");
    if (!result.success) {
      document.getElementById("tableBody").innerHTML = `<tr><td>${result.error}</td></tr>`;
      loader.style.display = "none";
      return;
    }
    const data = result.data;
    if (!data || data.length === 0) {
      document.getElementById("tableBody").innerHTML = `<tr><td>No data</td></tr>`;
      loader.style.display = "none";
      return;
    }
    infoRows    = data.slice(0, 3);
    headers     = data[3] || [];
    allDataRows = data.slice(4);

    parseColumnsFromHeaders();
    populateFilterDropdowns();
    buildCodeMap();
    populateCodeDropdown();
    renderTable();
    document.getElementById("paginationBar").style.display = "flex";
    loader.style.display = "none";
  } catch (err) {
    console.error(err);
    document.getElementById("tableBody").innerHTML = `<tr><td>${err.message}</td></tr>`;
    document.getElementById("loader").style.display = "none";
  }
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
function renderTable() {
  const tbody    = document.getElementById("tableBody");
  const colCount = headers.length || 1;
  let html = "";
  infoRows.forEach((row) => {
    const text = row.filter((c) => c !== "").join(" ");
    html += `<tr class="info-row"><td colspan="${colCount}" style="text-align:left;">${text}</td></tr>`;
  });
  html += `<tr class="header-row">${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const start    = (currentPage - 1) * rowsPerPage;
  const end      = start + rowsPerPage;
  const pageRows = allDataRows.slice(start, end);
  if (pageRows.length === 0) {
    html += `<tr><td colspan="${colCount}" style="text-align:center;color:#888;padding:20px;">No data available</td></tr>`;
  } else {
    pageRows.forEach((row) => {
      html += "<tr>" + headers.map((_, i) => `<td>${row[i] ?? ""}</td>`).join("") + "</tr>";
    });
  }
  tbody.innerHTML = html;
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(allDataRows.length / rowsPerPage));
  const start = allDataRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end   = Math.min(currentPage * rowsPerPage, allDataRows.length);
  document.getElementById("paginationInfo").textContent = `Showing ${start}–${end} of ${allDataRows.length} records`;
  const controls = document.getElementById("paginationControls");
  let btns = "";
  btns += `<button class="page-btn" onclick="goToPage(1)" ${currentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-double-left"></i></button>`;
  btns += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  let sp = Math.max(1, currentPage - 2), ep = Math.min(totalPages, sp + 4);
  if (ep - sp < 4) sp = Math.max(1, ep - 4);
  for (let p = sp; p <= ep; p++)
    btns += `<button class="page-btn ${p === currentPage ? "active" : ""}" onclick="goToPage(${p})">${p}</button>`;
  btns += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;
  btns += `<button class="page-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-double-right"></i></button>`;
  controls.innerHTML = btns;
}

function goToPage(page) {
  const totalPages = Math.ceil(allDataRows.length / rowsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTable();
  document.querySelector(".table-responsive").scrollTop = 0;
}

function changeRowsPerPage() {
  rowsPerPage = parseInt(document.getElementById("rowsPerPage").value);
  currentPage = 1;
  renderTable();
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────
const CHATBOT_API_URL = "/api/chat";
let chatHistory = [], chatIsOpen = false, chatInitialized = false;

function openChatDrawer() {
  chatIsOpen = true;
  document.getElementById("chatDrawer").classList.add("open");
  document.getElementById("chatDrawerOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  const tb = document.getElementById("topbarChatBadge");
  if (tb) tb.style.display = "none";
  if (!chatInitialized) { addWelcomeMessage(); chatInitialized = true; }
  setTimeout(() => document.getElementById("cdInput").focus(), 320);
}

function closeChatDrawer() {
  chatIsOpen = false;
  document.getElementById("chatDrawer").classList.remove("open");
  document.getElementById("chatDrawerOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

function clearChat() {
  chatHistory = [];
  document.getElementById("cdMessages").innerHTML = "";
  chatInitialized = false;
 
  chatInitialized = true;
}



function sendChip(btn) {
  document.getElementById("cdInput").value = btn.textContent.trim();
  sendChatMessage();
}
function autoResizeCdTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 100) + "px";
}
function handleChatKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

function getSheetContext() {
  if (!allDataRows || allDataRows.length === 0) return "Sheet data abhi load nahi hua.";
  const hdrs  = headers || [];
  const maxRows = Math.min(allDataRows.length, 200);
  const lines = [hdrs.join(" | ")];
  for (let i = 0; i < maxRows; i++) {
    const row = allDataRows[i];
    if (!row || row.every((c) => c === null || c === undefined || c.toString().trim() === "")) continue;
    lines.push(row.map((c) => (c !== null && c !== undefined ? c.toString().trim() : "")).join(" | "));
  }
  const infoText = (infoRows || []).map((r) => r.filter(Boolean).join(" ")).join("\n");
  return `=== SHEET INFO ===\n${infoText}\n\n=== HEADERS ===\n${hdrs.join(" | ")}\n\n=== DATA (${allDataRows.length} total rows, first ${maxRows} shown) ===\n${lines.join("\n")}`;
}

async function sendChatMessage() {
  const input    = document.getElementById("cdInput");
  const question = input.value.trim();
  if (!question) return;
  appendUserMsg(question);
  chatHistory.push({ role: "user", content: question });
  input.value        = "";
  input.style.height = "auto";
  const sendBtn = document.getElementById("cdSendBtn");
  sendBtn.disabled = true;
  const typingId = showTyping();
  setCdStatus("typing...");
  try {
    const token = localStorage.getItem("jwt") || "";
    const res = await fetch(CHATBOT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, sheetContext: getSheetContext(), history: chatHistory.slice(-10) }),
    });
    const data = await res.json();
    removeTyping(typingId);
    if (!res.ok || !data.success) throw new Error(data.error || "Server error");
    chatHistory.push({ role: "assistant", content: data.answer });
    appendBotMsg(data.answer);
    setCdStatus("● Online — Sheet data ke baare mein poochho");
    if (!chatIsOpen) {
      const tb = document.getElementById("topbarChatBadge");
      if (tb) { tb.style.display = "inline-block"; tb.textContent = "1"; }
    }
  } catch (err) {
    removeTyping(typingId);
    appendBotMsg(`❌ **Error:** ${err.message}`, true);
    setCdStatus("⚠ Connection error — dobara try karein");
  } finally {
    sendBtn.disabled = false;
    document.getElementById("cdInput").focus();
  }
}

function appendUserMsg(text) {
  const time = nowTime();
  const el   = document.createElement("div");
  el.className = "cd-msg user";
  el.innerHTML = `<div><div class="cd-bubble">${esc(text).replace(/\n/g, "<br>")}</div><div class="cd-msg-time">${time}</div></div><div class="cd-msg-avatar">👤</div>`;
  document.getElementById("cdMessages").appendChild(el);
  scrollChat();
}

function appendBotMsg(text, isError = false) {
  const time = nowTime();
  const el   = document.createElement("div");
  el.className = "cd-msg bot";
  el.innerHTML = `<div class="cd-msg-avatar">🤖</div><div><div class="cd-bubble ${isError ? "error" : ""}">${fmtBotText(text)}</div><div class="cd-msg-time">${time}</div></div>`;
  document.getElementById("cdMessages").appendChild(el);
  scrollChat();
}

function showTyping() {
  const id = "td_" + Date.now();
  const el = document.createElement("div");
  el.className = "cd-msg bot";
  el.id = id;
  el.innerHTML = `<div class="cd-msg-avatar">🤖</div><div class="cd-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  document.getElementById("cdMessages").appendChild(el);
  scrollChat();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
function scrollChat() {
  const m = document.getElementById("cdMessages");
  m.scrollTop = m.scrollHeight;
}
function setCdStatus(t) { document.getElementById("cdStatus").textContent = t; }
function nowTime() {
  return new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtBotText(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:#f0f4ff;padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>')
    .replace(/\n/g, "<br>");
}

window.onload = loadSheetData;