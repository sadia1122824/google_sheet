// ─── COLUMN WINDOWING CONSTANTS ───────────────────────────────────
const getColsPerPage = () => (window.innerWidth <= 768 ? 4 : 8);

// ─── STATE ────────────────────────────────────────────────────────
let allDataRows = [],
  headers = [],
  infoRows = [],
  currentPage = 1,
  rowsPerPage = 25,
  filterType = "month",
  colOffset = 0;

let monthCols = [],
  yearCols = [],
  pctColIndices = new Set(),
  sidebarOpen = true,
  codeMap = {},
  activeFilterCount = 0;

let codePeriodType = "month";

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

function findCodeColIndex() {
  for (let r = 0; r < Math.min(allDataRows.length, 20); r++) {
    const row = allDataRows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const v =
        row[c] !== null && row[c] !== undefined ? row[c].toString().trim() : "";
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
    document
      .getElementById("sidebar")
      .classList.toggle("collapsed", !sidebarOpen);
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
    if (sidebarOpen)
      document.getElementById("sidebar").classList.remove("collapsed");
  }
  if (allDataRows.length) {
    colOffset = 0;
    renderTable();
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

function updatePills() {
  const pills = document.getElementById("activePills");
  const badge = document.getElementById("filterBadge");
  let html = "",
    count = 0;

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
    badge.textContent = count;
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
    document.getElementById("selMY_year").value = "";
  }
  onFilterChange();
}

function clearPeriod2() {
  if (filterType === "month") document.getElementById("selMonth2").value = "";
  else if (filterType === "year")
    document.getElementById("selYear2").value = "";
  else document.getElementById("selMY_year").value = "";
  onFilterChange();
}

function clearCode() {
  document.getElementById("codeSelect").value = "";
  onCodeSelect();
}

const MONTHS_EN = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTHS_AB = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MONTHS_AB_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function isMonth(s) {
  const lc = s.toLowerCase().trim();
  return (
    MONTHS_EN.includes(lc) ||
    MONTHS_AB.includes(lc) ||
    MONTHS_ES.includes(lc) ||
    MONTHS_AB_ES.includes(lc)
  );
}

function isYear(s) {
  return /^\d{4}$/.test(s.trim()) && parseInt(s) >= 1990 && parseInt(s) <= 2100;
}

function isSkipRow(row) {
  return (
    !row ||
    row.length === 0 ||
    row.every(
      (c) => c === null || c === undefined || c.toString().trim() === "",
    )
  );
}

function fmt(n) {
  if (isNaN(n) || n === undefined || n === null) return "0.00";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? "−" + formatted : formatted;
}

function cellNum(row, ci) {
  if (pctColIndices.has(ci)) return 0;
  const raw =
    row[ci] !== undefined && row[ci] !== null ? row[ci].toString().trim() : "";
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}

function getPctForCol(row, colIndex) {
  if (pctColIndices.has(colIndex + 1)) {
    const raw =
      row[colIndex + 1] !== null && row[colIndex + 1] !== undefined
        ? row[colIndex + 1].toString().trim()
        : "";
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

function parseColumnsFromHeaders() {
  monthCols = [];
  yearCols = [];
  pctColIndices = new Set();
  headers.forEach((h, i) => {
    const s = (h || "").toString().trim();
    if (!s) return;
    if (s === "%") {
      pctColIndices.add(i);
      return;
    }
    if (isYear(s)) yearCols.push({ label: s, colIndex: i });
    else if (isMonth(s)) monthCols.push({ label: s, colIndex: i });
  });
}

function populateFilterDropdowns() {
  ["selMonth1", "selMonth2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    el.innerHTML =
      idx === 0
        ? '<option value="">-- Select --</option>'
        : '<option value="">-- None --</option>';
    monthCols.forEach(
      (m, i) => (el.innerHTML += `<option value="${i}">${m.label}</option>`),
    );
  });
  ["selYear1", "selYear2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    el.innerHTML =
      idx === 0
        ? '<option value="">-- Select --</option>'
        : '<option value="">-- None --</option>';
    yearCols.forEach(
      (y, i) => (el.innerHTML += `<option value="${i}">${y.label}</option>`),
    );
  });
  const mySel = document.getElementById("selMY_month");
  if (mySel) {
    mySel.innerHTML = '<option value="">-- Select Month --</option>';
    monthCols.forEach(
      (m, i) => (mySel.innerHTML += `<option value="${i}">${m.label}</option>`),
    );
  }
  const yySel = document.getElementById("selMY_year");
  if (yySel) {
    yySel.innerHTML = '<option value="">-- Select Year --</option>';
    yearCols.forEach(
      (y, i) => (yySel.innerHTML += `<option value="${i}">${y.label}</option>`),
    );
  }
  if (monthCols.length === 0 && yearCols.length > 0) setFilterType("year");
  else setFilterType("month");
}

function setFilterType(type) {
  filterType = type;
  document
    .getElementById("btnMonth")
    .classList.toggle("active", type === "month");
  document
    .getElementById("btnYear")
    .classList.toggle("active", type === "year");
  document
    .getElementById("btnMonthYear")
    .classList.toggle("active", type === "monthyear");
  document.getElementById("monthFilters").style.display =
    type === "month" ? "block" : "none";
  document.getElementById("yearFilters").style.display =
    type === "year" ? "block" : "none";
  document.getElementById("monthYearFilters").style.display =
    type === "monthyear" ? "block" : "none";
  hideDrawerSummary();
}

function onFilterChange() {
  if (filterType === "month") {
    const i1 = document.getElementById("selMonth1").value;
    const i2 = document.getElementById("selMonth2").value;
    if (i1 === "") {
      hideDrawerSummary();
      updatePills();
      return;
    }
    if (i2 === "") showDrawerSingle(monthCols[i1]);
    else showDrawerCompare(monthCols[i1], monthCols[i2]);
  } else if (filterType === "year") {
    const i1 = document.getElementById("selYear1").value;
    const i2 = document.getElementById("selYear2").value;
    if (i1 === "") {
      hideDrawerSummary();
      updatePills();
      return;
    }
    if (i2 === "") showDrawerSingle(yearCols[i1]);
    else showDrawerCompare(yearCols[i1], yearCols[i2]);
  } else if (filterType === "monthyear") {
    const im = document.getElementById("selMY_month").value;
    const iy = document.getElementById("selMY_year").value;
    if (im === "" && iy === "") {
      hideDrawerSummary();
      updatePills();
      return;
    }
    if (im !== "" && iy === "") {
      showDrawerSingle(monthCols[im]);
      updatePills();
      return;
    }
    if (im === "" && iy !== "") {
      showDrawerSingle(yearCols[iy]);
      updatePills();
      return;
    }
    showDrawerCompare(monthCols[im], yearCols[iy]);
  }
  updatePills();
}

function calcSummary(colObj) {
  const ci = colObj.colIndex;
  const CODE_COL = findCodeColIndex();
  const IS_INCOME_ROW = (v) => /^1[\.\s]|^importe\s+neto|^1\s+importe/i.test(v);
  const IS_EXPLOTACION_ROW = (v) => /^A\)\s*RESULTADO\s+DE\s+EXPLOT/i.test(v);
  const IS_INTEREST_ROW = (v) => /^14[\.\s]|gastos\s+financiero/i.test(v);

  // ← YEH NAYA ADD KARO: sirf pure expense rows (codes 4–13, ya jo negative hain aur income nahi)
  const IS_EXPENSE_ROW = (v) => /^[4-9][\.\s]|^1[0-3][\.\s]/.test(v);

  let income = 0,
    explotacion = 0,
    bankInterest = 0,
    pureExpense = 0; // ← pureExpense add karo

  allDataRows.forEach((row) => {
    if (isSkipRow(row)) return;
    const cellVal = (row[CODE_COL] ?? "").toString().trim();
    if (!cellVal) return;
    const v = cellNum(row, ci);
    if (v === 0) return;
    if (IS_INCOME_ROW(cellVal)) income = v;
    else if (IS_EXPLOTACION_ROW(cellVal)) explotacion = v;
    else if (IS_INTEREST_ROW(cellVal)) bankInterest = v;
    else if (IS_EXPENSE_ROW(cellVal)) pureExpense += v; // ← pure expenses sum
  });

  const finalResult = explotacion + bankInterest;
  return {
    income,
    expense: pureExpense, // ← card mein yeh aayega (pure expenses)
    explotacion: explotacion, // ← final result ke liye yeh use hoga
    bankInterest,
    finalResult,
    profit: finalResult > 0 ? finalResult : 0,
    loss: finalResult < 0 ? finalResult : 0,
  };
}

function showDrawerSingle(colObj) {
  const s = calcSummary(colObj);
  let html = `<div style="font-size:11px;font-weight:700;color:#0d6efd;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;display:flex;align-items:center;gap:6px;"><i class="bi bi-bar-chart-fill"></i> Summary — ${colObj.label}</div><div class="fd-cards-grid">`;
  html += fdCard("💰", "Income", fmt(s.income), "1. Importe neto", "income");
  const expType = s.expense <= 0 ? "expense" : "profit";
  html += fdCard(
    "💸",
    "Expense",
    fmt(s.expense),
    "Pure Expenses (4–13)",
    expType,
  );
  if (s.profit > 0)
    html += fdCard(
      "📈",
      "Final Profit",
      fmt(s.profit),
      "Explot. + Fin.",
      "profit",
    );
  else if (s.loss < 0)
    html += fdCard("📉", "Final Loss", fmt(s.loss), "Explot. + Fin.", "loss");
  else html += fdCard("➖", "Break Even", "0.00", "Explot. + Fin.", "income");
  html += `<div class="formula-hint">💡 A) Explot. <strong>${fmt(s.explotacion)}</strong> + 14. Gastos Fin. <strong>${fmt(s.bankInterest)}</strong> = Final: <strong>${fmt(s.finalResult)}</strong></div>`;
  document.getElementById("drawerSummaryContent").innerHTML = html;
  document.getElementById("drawerSummarySection").style.display = "block";
}

function showDrawerCompare(col1, col2) {
  const s1 = calcSummary(col1);
  const s2 = calcSummary(col2);
  function arrow(a, b, good) {
    const d = b - a;
    const pct = a !== 0 ? ((d / Math.abs(a)) * 100).toFixed(1) : null;
    const cls = d === 0 ? "neutral" : d > 0 === good ? "up" : "down";
    const sym = d > 0 ? "▲" : d < 0 ? "▼" : "—";
    return `<span class="diff-val ${cls}">${sym}${pct !== null ? pct + "%" : "—"}</span>`;
  }
  function miniBlock(col, s) {
    let h = `<div style="display:block;width:100%;border:1px solid #e0ecff;border-radius:10px;padding:10px;margin-bottom:10px;">`;
    h += `<div style="display:block;font-size:11px;font-weight:700;color:#0d6efd;margin-bottom:6px;border-bottom:1px solid #b0c8ff;padding-bottom:4px;">${col.label}</div>`;
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
    h += fdCard("💰", "Income", fmt(s.income), "Importe neto", "income");
    h += fdCard(
      "💸",
      "Expense",
      fmt(s.expense),
      "Pure Expenses",
      s.expense <= 0 ? "expense" : "profit",
    );
    if (s.profit > 0)
      h += fdCard("📈", "Final Profit", fmt(s.profit), "Final", "profit");
    if (s.loss < 0)
      h += fdCard("📉", "Final Loss", fmt(Math.abs(s.loss)), "Final", "loss");
    h += `</div></div>`;
    return h;
  }
  let html = `<div style="font-size:11px;font-weight:700;color:#0d6efd;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;align-items:center;gap:5px;"><i class="bi bi-arrow-left-right"></i> Comparison — ${col1.label} vs ${col2.label}</div>`;
  html += `<div style="display:block;width:100%;margin-bottom:10px;">`;
  html += miniBlock(col1, s1);
  html += miniBlock(col2, s2);
  html += `</div>`;
  html += `<div class="diff-card"><div class="diff-title">Difference (${col2.label} vs ${col1.label})</div>`;
  [
    { k: "income", icon: "💰", label: "Income", good: true },
    { k: "expense", icon: "💸", label: "Explotación", good: true },
    { k: "finalResult", icon: "📊", label: "Final", good: true },
  ].forEach((r) => {
    const a = s1[r.k],
      b = s2[r.k];
    if (Math.abs(a) > 0 || Math.abs(b) > 0) {
      const d = b - a;
      html += `<div class="diff-row"><span class="diff-label">${r.icon} ${r.label}</span><span style="font-size:11px;">${fmt(a)} → ${fmt(b)} ${arrow(a, b, r.good)} (${d >= 0 ? "+" : "−"}${fmt(Math.abs(d))})</span></div>`;
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

function buildCodeMap() {
  codeMap = {};
  const CODE_COL = findCodeColIndex();
  allDataRows.forEach((row, rowIdx) => {
    if (isSkipRow(row)) return;
    const cellVal =
      row[CODE_COL] !== null && row[CODE_COL] !== undefined
        ? row[CODE_COL].toString().trim()
        : "";
    const code = extractCode(cellVal);
    if (!code) return;
    const label = extractLabel(cellVal);
    const prefix = code.slice(0, 2);
    if (!codeMap[prefix]) codeMap[prefix] = { label: "", children: [] };
    if (code.length === 4 && !codeMap[prefix].label)
      codeMap[prefix].label = label;
    codeMap[prefix].children.push({ code, label, rowIdx });
  });
}

function setCodePeriodType(type) {
  codePeriodType = type;
  const btnM = document.getElementById("codeBtnMonth");
  const btnY = document.getElementById("codeBtnYear");
  const btnMY = document.getElementById("codeBtnMonthYear");
  if (btnM) btnM.classList.toggle("active", type === "month");
  if (btnY) btnY.classList.toggle("active", type === "year");
  if (btnMY) btnMY.classList.toggle("active", type === "monthyear");
  const mf = document.getElementById("codeMonthFilters");
  const yf = document.getElementById("codeYearFilters");
  const myf = document.getElementById("codeMonthYearFilters");
  if (mf) mf.style.display = type === "month" ? "block" : "none";
  if (yf) yf.style.display = type === "year" ? "block" : "none";
  if (myf) myf.style.display = type === "monthyear" ? "block" : "none";
  [
    "codeSelMonth1",
    "codeSelMonth2",
    "codeSelYear1",
    "codeSelYear2",
    "codeSelMY_month",
    "codeSelMY_year",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const cs = document.getElementById("drawerCodeSummary");
  if (cs) {
    cs.style.display = "none";
    cs.innerHTML = "";
  }
}

function populateCodeDropdown() {
  const sel = document.getElementById("codeSelect");
  const section = document.getElementById("codeFilterSection");
  if (!sel || !section) return;
  sel.innerHTML = '<option value="">-- Code select --</option>';
  const CODE_COL = findCodeColIndex();
  let codeCount = 0;
  allDataRows.forEach((row, rowIdx) => {
    if (isSkipRow(row)) return;
    const cellVal =
      row[CODE_COL] !== null && row[CODE_COL] !== undefined
        ? row[CODE_COL].toString().trim()
        : "";
    const code = extractCode(cellVal);
    if (!code) return;
    const opt = document.createElement("option");
    opt.value = rowIdx;
    opt.textContent = code;
    sel.appendChild(opt);
    codeCount++;
  });
  ["codeSelMonth1", "codeSelMonth2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML =
      idx === 0
        ? '<option value="">-- Select --</option>'
        : '<option value="">-- None --</option>';
    monthCols.forEach((m, i) => {
      el.innerHTML += `<option value="${i}">${m.label}</option>`;
    });
  });
  ["codeSelYear1", "codeSelYear2"].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML =
      idx === 0
        ? '<option value="">-- Select --</option>'
        : '<option value="">-- None --</option>';
    yearCols.forEach((y, i) => {
      el.innerHTML += `<option value="${i}">${y.label}</option>`;
    });
  });
  const cMY_m = document.getElementById("codeSelMY_month");
  if (cMY_m) {
    cMY_m.innerHTML = '<option value="">-- Select Month --</option>';
    monthCols.forEach((m, i) => {
      cMY_m.innerHTML += `<option value="${i}">${m.label}</option>`;
    });
  }
  const cMY_y = document.getElementById("codeSelMY_year");
  if (cMY_y) {
    cMY_y.innerHTML = '<option value="">-- Select Year --</option>';
    yearCols.forEach((y, i) => {
      cMY_y.innerHTML += `<option value="${i}">${y.label}</option>`;
    });
  }
  if (monthCols.length === 0 && yearCols.length > 0) setCodePeriodType("year");
  else setCodePeriodType("month");
  section.style.display = codeCount > 0 ? "block" : "none";
}

function onCodeSelect() {
  const rowIdx = document.getElementById("codeSelect").value;
  const summaryDiv = document.getElementById("drawerCodeSummary");
  const periodRow = document.getElementById("codePeriodRow");
  if (rowIdx === "") {
    if (summaryDiv) {
      summaryDiv.style.display = "none";
      summaryDiv.innerHTML = "";
    }
    if (periodRow) periodRow.style.display = "none";
    updatePills();
    return;
  }
  if (periodRow) periodRow.style.display = "block";
  onCodePeriodChange();
  updatePills();
}

function onCodePeriodChange() {
  const rowIdx = document.getElementById("codeSelect").value;
  if (rowIdx === "") return;
  const row = allDataRows[parseInt(rowIdx)];
  if (!row) return;
  const CODE_COL = findCodeColIndex();
  const cellVal = (row[CODE_COL] || "").toString().trim();
  const code = extractCode(cellVal) || cellVal;
  const label = extractLabel(cellVal);
  const summaryDiv = document.getElementById("drawerCodeSummary");
  let col1 = null,
    col2 = null;
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
  const overviewPool = codePeriodType === "year" ? yearCols : monthCols;
  const typeLabel = codePeriodType === "year" ? "Year" : "Month";

  function calcCards(val) {
    const income = val > 0 ? val : 0;
    const expense = val < 0 ? val : 0;
    const net = income + expense;
    return {
      income,
      expense,
      profit: net > 0 ? net : 0,
      loss: net < 0 ? net : 0,
      net,
    };
  }

  function singleCard(icon, cardLabel, value, sub, type) {
    return `<div class="fd-card ${type}"><div class="fd-card-icon">${icon}</div><div class="fd-card-label">${cardLabel}</div><div class="fd-card-value">${fmt(value)}</div>${sub ? `<div class="fd-card-sub">${sub}</div>` : ""}</div>`;
  }

  function renderCards(s, pct) {
    let h = `<div class="fd-cards-grid">`;
    if (s.income > 0)
      h += singleCard(
        "💰",
        "Income",
        s.income,
        pct !== null ? `% share: ${pct}%` : "",
        "income",
      );
    if (s.expense < 0)
      h += singleCard(
        "💸",
        "Expense",
        s.expense,
        pct !== null ? `% share: ${pct}%` : "",
        "expense",
      );
    if (s.profit > 0)
      h += singleCard("📈", "Profit", s.profit, "Net +ve", "profit");
    if (s.loss < 0) h += singleCard("📉", "Loss", s.loss, "Net -ve", "loss");
    h += `</div>`;
    h += `<div class="formula-hint">💡 Net = ${s.net >= 0 ? "+" : ""}${s.net.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`;
    return h;
  }

  function arrowSpan(a, b, goodIfUp) {
    const d = b - a;
    const pct = a !== 0 ? ((d / Math.abs(a)) * 100).toFixed(1) : null;
    const cls = d === 0 ? "neutral" : d > 0 === goodIfUp ? "up" : "down";
    const sym = d > 0 ? "▲" : d < 0 ? "▼" : "—";
    return `<span class="diff-val ${cls}">${sym}${pct !== null ? pct + "%" : "—"}</span>`;
  }

  function miniCards(colObj, s, pct) {
    let h = `<div style="display:block;width:100%;border:1px solid #e0d0ff;border-radius:10px;padding:10px;margin-bottom:10px;">`;
    h += `<div style="display:block;font-size:11px;font-weight:700;color:#0d6efd;margin-bottom:6px;border-bottom:1px solid #b0c8ff;padding-bottom:4px;">${colObj.label}</div>`;
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
    if (s.income > 0)
      h += singleCard(
        "💰",
        "Income",
        s.income,
        pct !== null ? `${pct}%` : "",
        "income",
      );
    if (s.expense < 0)
      h += singleCard(
        "💸",
        "Expense",
        s.expense,
        pct !== null ? `${pct}%` : "",
        "expense",
      );
    if (s.profit > 0) h += singleCard("📈", "Profit", s.profit, "", "profit");
    if (s.loss < 0) h += singleCard("📉", "Loss", Math.abs(s.loss), "", "loss");
    h += `</div></div>`;
    return h;
  }

  if (!col1 && !col2) {
    let html = `<div style="font-size:11px;font-weight:700;color:#7c3aed;margin:8px 0 6px;display:flex;align-items:center;gap:5px;"><i class="bi bi-table"></i> ${code} — ${label}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#f0ecff;">
          <th style="padding:5px 8px;text-align:left;border-bottom:1px solid #ddd;">${typeLabel}</th>
          <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">Income</th>
          <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">Expense</th>
          <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">Net</th>
          <th style="padding:5px 8px;text-align:right;border-bottom:1px solid #ddd;">%</th>
        </tr></thead><tbody>`;
    let hasAny = false;
    overviewPool.forEach((col) => {
      const v = cellNum(row, col.colIndex);
      if (v === 0) return;
      hasAny = true;
      const s = calcCards(v);
      const pctVal = getPctForCol(row, col.colIndex);
      const netClr = s.net >= 0 ? "#2e7d32" : "#c62828";
      html += `<tr>
        <td style="padding:5px 8px;border-bottom:0.5px solid #eee;">${col.label}</td>
        <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:#2e7d32;">${s.income > 0 ? fmt(s.income) : "—"}</td>
        <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:#c62828;">${s.expense > 0 ? fmt(s.expense) : "—"}</td>
        <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:${netClr};font-weight:500;">${s.net >= 0 ? "+" : "−"}${fmt(Math.abs(s.net))}</td>
        <td style="padding:5px 8px;text-align:right;border-bottom:0.5px solid #eee;color:#666;">${pctVal !== null ? pctVal + "%" : "—"}</td>
      </tr>`;
    });
    if (!hasAny)
      html += `<tr><td colspan="5" style="padding:8px;color:#888;">Koi data nahi mila</td></tr>`;
    html += `</tbody></table>`;
    summaryDiv.innerHTML = html;
    summaryDiv.style.display = "block";
    return;
  }

  if (col1 && !col2) {
    const val1 = cellNum(row, col1.colIndex);
    const pct1 = getPctForCol(row, col1.colIndex);
    const s1 = calcCards(val1);
    let html = `<div style="font-size:11px;font-weight:700;color:#7c3aed;margin:8px 0 6px;"><i class="bi bi-bar-chart-fill"></i> ${code} — ${label}</div><div style="font-size:11px;color:#555;margin-bottom:6px;">${col1.label}</div>`;
    html += renderCards(s1, pct1);
    summaryDiv.innerHTML = html;
    summaryDiv.style.display = "block";
    return;
  }

  const val1 = cellNum(row, col1.colIndex);
  const pct1 = getPctForCol(row, col1.colIndex);
  const s1 = calcCards(val1);
  const val2 = cellNum(row, col2.colIndex);
  const pct2 = getPctForCol(row, col2.colIndex);
  const s2 = calcCards(val2);
  const pctDiff =
    pct1 !== null && pct2 !== null ? (pct2 - pct1).toFixed(1) : null;
  const pctDiffCls = !pctDiff
    ? "neutral"
    : parseFloat(pctDiff) > 0
      ? "up"
      : "down";
  const pctDiffSym = !pctDiff ? "—" : parseFloat(pctDiff) > 0 ? "▲" : "▼";

  let html = `<div style="font-size:11px;font-weight:700;color:#7c3aed;margin:8px 0 6px;"><i class="bi bi-arrow-left-right"></i> ${code} — ${label}</div>`;
  html += miniCards(col1, s1, pct1);
  html += miniCards(col2, s2, pct2);
  html += `<div class="diff-card"><div class="diff-title">Difference — ${col2.label} vs ${col1.label}</div>`;
  [
    { key: "income", icon: "💰", label: "Income", goodIfUp: true },
    { key: "expense", icon: "💸", label: "Expense", goodIfUp: false },
    { key: "profit", icon: "📈", label: "Profit", goodIfUp: true },
    { key: "loss", icon: "📉", label: "Loss", goodIfUp: false },
  ].forEach((m) => {
    if (s1[m.key] > 0 || s2[m.key] > 0) {
      const d = s2[m.key] - s1[m.key];
      html += `<div class="diff-row"><span class="diff-label">${m.icon} ${m.label}</span><span style="font-size:11px;">${fmt(s1[m.key])} → ${fmt(s2[m.key])} ${arrowSpan(s1[m.key], s2[m.key], m.goodIfUp)} (${d >= 0 ? "+" : "−"}${fmt(Math.abs(d))})</span></div>`;
    }
  });
  if (pctDiff !== null) {
    html += `<div class="diff-row"><span class="diff-label">📊 % share</span><span style="font-size:11px;">${pct1}% → ${pct2}% <span class="diff-val ${pctDiffCls}">${pctDiffSym}${Math.abs(pctDiff)} pp</span></span></div>`;
  }
  html += `</div>`;
  summaryDiv.innerHTML = html;
  summaryDiv.style.display = "block";
}

function resetAllFilters() {
  [
    "selMonth1",
    "selMonth2",
    "selYear1",
    "selYear2",
    "selMY_month",
    "selMY_year",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("codeSelect").value = "";
  [
    "codeSelMonth1",
    "codeSelMonth2",
    "codeSelYear1",
    "codeSelYear2",
    "codeSelMY_month",
    "codeSelMY_year",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const pr = document.getElementById("codePeriodRow");
  if (pr) pr.style.display = "none";
  hideDrawerSummary();
  const cs = document.getElementById("drawerCodeSummary");
  if (cs) {
    cs.style.display = "none";
    cs.innerHTML = "";
  }
  updatePills();
}

async function loadSheetData() {
  try {
    const token = localStorage.getItem("jwt");
    const res = await fetch("/getPreviousSheetResult", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Server error: ${res.status} - ${text}`);
    const result = JSON.parse(text);
    const loader = document.getElementById("loader");

    if (!result.success) {
      document.getElementById("tableBody").innerHTML =
        `<tr><td>${result.error}</td></tr>`;
      loader.style.display = "none";
      return;
    }

    const rawData = result.data;

    if (!rawData || rawData.length === 0) {
      document.getElementById("tableBody").innerHTML =
        `<tr><td>No data</td></tr>`;
      loader.style.display = "none";
      return;
    }

    // ✅ FIX: Convert each MongoDB object → plain array of values
    // Filter out internal Mongo fields (_id, _syncedAt, _yearsInSheet)
    const data = rawData.map((row) => {
      if (Array.isArray(row)) return row; // already array, skip
      return Object.entries(row)
        .filter(([key]) => !key.startsWith("_")) // remove _id, _syncedAt, _yearsInSheet
        .map(([, val]) => val); // keep only values
    });

    infoRows = data.slice(0, 3);
    headers = data[3] || [];
    allDataRows = data.slice(4);
    colOffset = 0;
    currentPage = 1;
    parseColumnsFromHeaders();
    populateFilterDropdowns();
    buildCodeMap();
    populateCodeDropdown();
    document.getElementById("loader").style.display = "none";
    renderTable();
    document.getElementById("paginationBar").style.display = allDataRows.length
      ? "flex"
      : "none";
  } catch (err) {
    console.error(err);
    document.getElementById("tableBody").innerHTML =
      `<tr><td>${err.message}</td></tr>`;
    document.getElementById("loader").style.display = "none";
  }
}

// ═══════════════════════════════════════════════════════════════════
//  TABLE RENDER
// ═══════════════════════════════════════════════════════════════════
function renderTable() {
  const tbody = document.getElementById("tableBody");
  const thead = document.getElementById("tableHead");
  const cpp = getColsPerPage();
  const totalCols = headers.length;
  const visHeaders = headers.slice(colOffset, colOffset + cpp);
  const colEnd = Math.min(colOffset + cpp, totalCols);

  const rangeLabel = document.getElementById("colRangeLabel");
  if (rangeLabel)
    rangeLabel.textContent =
      totalCols > 0 ? `Columns ${colOffset + 1}–${colEnd} of ${totalCols}` : "";
  if (thead) thead.innerHTML = "";

  const table = tbody.closest("table");
  if (table) {
    const oldCg = table.querySelector("colgroup");
    if (oldCg) oldCg.remove();
    const cg = document.createElement("colgroup");
    visHeaders.forEach((_, i) => {
      const colAbsIndex = colOffset + i;
      const col = document.createElement("col");
      if (colAbsIndex === 0) col.style.width = "45px";
      else if (colAbsIndex === 1) col.style.width = "240px";
      else col.style.width = "110px";
      cg.appendChild(col);
    });
    table.insertBefore(cg, table.firstChild);
    table.style.tableLayout = "fixed";
    table.style.width = "100%";
    table.style.minWidth = "100%";
  }

  const colCount = visHeaders.length || 1;
  let html = "";
  infoRows.forEach((row) => {
    const text = row.filter((c) => c !== "").join(" ");
    html += `<tr class="info-row"><td colspan="${colCount}" style="text-align:left;">${text}</td></tr>`;
  });
  html += `<tr class="header-row">${visHeaders.map((h) => `<th title="${h}" style="padding:5px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;line-height:1.3;vertical-align:middle;">${h}</th>`).join("")}</tr>`;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = allDataRows.slice(start, end);

  if (pageRows.length === 0) {
    html += `<tr><td colspan="${colCount}" style="text-align:center;color:#888;padding:20px;">No data available</td></tr>`;
  } else {
    pageRows.forEach((row) => {
      html +=
        "<tr>" +
        visHeaders
          .map((_, i) => {
            const val = row[colOffset + i] ?? "";
            return `<td title="${val}" style="padding:5px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;vertical-align:middle;">${val}</td>`;
          })
          .join("") +
        "</tr>";
    });
  }

  tbody.innerHTML = html;

  const btnPrev = document.getElementById("btnPrevCol");
  const btnNext = document.getElementById("btnNextCol");
  if (btnPrev) btnPrev.disabled = colOffset === 0;
  if (btnNext) btnNext.disabled = colOffset + cpp >= totalCols;

  const colNav = document.getElementById("colNavBtns");
  if (colNav) colNav.style.display = totalCols > cpp ? "flex" : "none";

  // Show/hide fullscreen button
  const fsBtn = document.getElementById("btnFullscreen");
  if (fsBtn) fsBtn.style.display = totalCols > 0 ? "flex" : "none";

  renderPagination();
}

function shiftColumns(dir) {
  const cpp = getColsPerPage();
  const next = colOffset + dir * cpp;
  if (next < 0 || next >= headers.length) return;
  colOffset = Math.max(0, Math.min(next, headers.length - cpp));
  renderTable();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(allDataRows.length / rowsPerPage));
  const start =
    allDataRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, allDataRows.length);
  document.getElementById("paginationInfo").textContent =
    `Showing ${start}–${end} of ${allDataRows.length} records`;
  const controls = document.getElementById("paginationControls");
  let btns = "";
  btns += `<button class="page-btn" onclick="goToPage(1)" ${currentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-double-left"></i></button>`;
  btns += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  let sp = Math.max(1, currentPage - 2),
    ep = Math.min(totalPages, sp + 4);
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
  const tr = document.querySelector(".table-responsive");
  if (tr) tr.scrollTop = 0;
}

function changeRowsPerPage() {
  rowsPerPage = parseInt(document.getElementById("rowsPerPage").value);
  currentPage = 1;
  renderTable();
}

// ═══════════════════════════════════════════════════════════════════
//  FULLSCREEN TABLE
// ═══════════════════════════════════════════════════════════════════
function openFullscreenTable() {
  const overlay = document.getElementById("fullscreenOverlay");
  const fsHead = document.getElementById("fsTableHead");
  const fsBody = document.getElementById("fsTableBody");
  const fsColCnt = document.getElementById("fsColCount");
  const fsRowCnt = document.getElementById("fsRowCount");
  if (!overlay || !fsHead || !fsBody) return;

  // Build header row
  fsHead.innerHTML = `<tr>${headers.map((h) => `<th title="${h}">${h}</th>`).join("")}</tr>`;

  // Build body: info rows first
  let bodyHtml = "";
  infoRows.forEach((row) => {
    const text = row.filter((c) => c !== "").join(" ");
    bodyHtml += `<tr class="info-row"><td colspan="${headers.length || 1}" style="text-align:left;">${text}</td></tr>`;
  });

  // All data rows (no pagination limit)
  let dataRowCount = 0;
  allDataRows.forEach((row) => {
    if (!row) return;
    bodyHtml +=
      "<tr>" +
      headers
        .map((_, i) => {
          const val = row[i] ?? "";
          return `<td title="${val}">${val}</td>`;
        })
        .join("") +
      "</tr>";
    dataRowCount++;
  });

  fsBody.innerHTML = bodyHtml;

  // Update counters
  if (fsColCnt) fsColCnt.textContent = `${headers.length} columns`;
  if (fsRowCnt)
    fsRowCnt.textContent = `${dataRowCount} rows · ${headers.length} columns`;

  // Show overlay
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";

  // Scroll to top
  const wrapper = document.getElementById("fsTableWrapper");
  if (wrapper) {
    wrapper.scrollTop = 0;
    wrapper.scrollLeft = 0;
  }
}

function closeFullscreenTable() {
  const overlay = document.getElementById("fullscreenOverlay");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

// ESC key closes fullscreen
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeFullscreenTable();
});

// Click outside fsContainer closes overlay
document
  .getElementById("fullscreenOverlay")
  .addEventListener("click", function (e) {
    if (e.target === this) closeFullscreenTable();
  });

// ═══════════════════════════════════════════════════════════════════
//  CHATBOT
// ═══════════════════════════════════════════════════════════════════
const CHATBOT_API_URL = "/AI_chat";
let chatHistory = [],
  chatIsOpen = false,
  chatInitialized = false;

function openChatDrawer() {
  chatIsOpen = true;
  document.getElementById("chatDrawer").classList.add("open");
  document.getElementById("chatDrawerOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  const tb = document.getElementById("topbarChatBadge");
  if (tb) tb.style.display = "none";
  if (!chatInitialized) {
    if (allDataRows.length === 0) {
      const waitAndInit = setInterval(() => {
        if (allDataRows.length > 0) {
          clearInterval(waitAndInit);
          addWelcomeMessage();
          chatInitialized = true;
        }
      }, 200);
    } else {
      addWelcomeMessage();
      chatInitialized = true;
    }
  }
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
  addWelcomeMessage();
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
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

function getSheetContext() {
  if (!allDataRows || allDataRows.length === 0)
    return "Sheet data is not loaded yet.";
  const hdrs = headers || [];
  const maxRows = Math.min(allDataRows.length, 300);
  const lines = [hdrs.join(" | ")];
  for (let i = 0; i < maxRows; i++) {
    const row = allDataRows[i];
    if (
      !row ||
      row.every(
        (c) => c === null || c === undefined || c.toString().trim() === "",
      )
    )
      continue;
    lines.push(
      row
        .map((c) => (c !== null && c !== undefined ? c.toString().trim() : ""))
        .join(" | "),
    );
  }
  const infoText = (infoRows || [])
    .map((r) => r.filter(Boolean).join(" "))
    .join("\n");
  const monthNames = monthCols.map((m) => m.label).join(", ");
  const yearNames = yearCols.map((y) => y.label).join(", ");
  return `=== SHEET INFO ===\n${infoText}\n\n=== AVAILABLE PERIODS ===\nMonths: ${monthNames || "None"}\nYears: ${yearNames || "None"}\n\n=== COLUMN HEADERS ===\n${hdrs.join(" | ")}\n\n=== DATA (${allDataRows.length} total rows, first ${maxRows} shown) ===\n${lines.join("\n")}`;
}

function findColByLabel(label) {
  if (!label) return null;
  const lc = label.toLowerCase().trim();
  if (lc.length < 2) return null;
  let found = [...monthCols, ...yearCols].find(
    (c) => c.label.toLowerCase().trim() === lc,
  );
  if (found) return found;
  const EN_TO_ES = {
    jan: "ene",
    january: "ene",
    jenuary: "ene",
    jen: "ene",
    enero: "ene",
    feb: "feb",
    february: "feb",
    febrero: "feb",
    mar: "mar",
    march: "mar",
    marzo: "mar",
    apr: "abr",
    april: "abr",
    abril: "abr",
    may: "may",
    mayo: "may",
    jun: "jun",
    june: "jun",
    junio: "jun",
    jul: "jul",
    july: "jul",
    julio: "jul",
    aug: "ago",
    august: "ago",
    agosto: "ago",
    sep: "sep",
    sept: "sep",
    september: "sep",
    septiembre: "sep",
    oct: "oct",
    october: "oct",
    octubre: "oct",
    nov: "nov",
    november: "nov",
    noviembre: "nov",
    dec: "dic",
    december: "dic",
    diciembre: "dic",
    dic: "dic",
  };
  const mapped = EN_TO_ES[lc];
  if (mapped) {
    found = monthCols.find((c) => c.label.toLowerCase().trim() === mapped);
    if (found) return found;
  }
  if (/^\d{4}$/.test(lc)) {
    found = yearCols.find((c) => c.label.trim() === lc);
    if (found) return found;
  }
  if (lc.length >= 3) {
    found = [...monthCols, ...yearCols].find((c) => {
      const cl = c.label.toLowerCase().trim();
      return cl.startsWith(lc) || lc.startsWith(cl);
    });
    if (found) return found;
  }
  return null;
}

function jsCalculate(intent) {
  if (!intent || intent.type === "general") return null;
  const { type, period1, period2 } = intent;
  if (type === "single") {
    const col = findColByLabel(period1);
    if (!col) {
      const available = [...monthCols, ...yearCols]
        .map((c) => c.label)
        .join(", ");
      return {
        error: `Period "${period1}" not found. Available: ${available}`,
      };
    }
    const s = calcSummary(col);
    return {
      period: col.label,
      income: s.income,
      expense: s.expense,
      bankInterest: s.bankInterest,
      finalResult: s.finalResult,
      profit: s.profit,
      loss: s.loss,
    };
  }
  if (type === "compare") {
    const col1 = findColByLabel(period1);
    const col2 = findColByLabel(period2);
    if (!col1) return { error: `Period "${period1}" not found` };
    if (!col2) return { error: `Period "${period2}" not found` };
    const s1 = calcSummary(col1);
    const s2 = calcSummary(col2);
    function pct(a, b) {
      if (a === 0) return null;
      return parseFloat((((b - a) / Math.abs(a)) * 100).toFixed(2));
    }
    return {
      metric: intent.metric,
      period1: {
        label: col1.label,
        income: s1.income,
        expense: s1.expense,
        finalResult: s1.finalResult,
        profit: s1.profit,
        loss: s1.loss,
      },
      period2: {
        label: col2.label,
        income: s2.income,
        expense: s2.expense,
        finalResult: s2.finalResult,
        profit: s2.profit,
        loss: s2.loss,
      },
      difference: {
        income: parseFloat((s2.income - s1.income).toFixed(2)),
        income_pct: pct(s1.income, s2.income),
        expense: parseFloat((s2.expense - s1.expense).toFixed(2)),
        expense_pct: pct(s1.expense, s2.expense),
        finalResult: parseFloat((s2.finalResult - s1.finalResult).toFixed(2)),
        finalResult_pct: pct(s1.finalResult, s2.finalResult),
        direction:
          s2.finalResult > s1.finalResult
            ? "improved"
            : s2.finalResult < s1.finalResult
              ? "declined"
              : "unchanged",
      },
    };
  }
  if (type === "trend") {
    const pool = monthCols.length > 0 ? monthCols : yearCols;
    if (pool.length === 0) return { error: "No period columns found" };
    const points = pool
      .map((col) => {
        const s = calcSummary(col);
        return {
          period: col.label,
          income: s.income,
          expense: s.expense,
          finalResult: s.finalResult,
          profit: s.profit,
          loss: s.loss,
        };
      })
      .filter((p) => p.income !== 0 || p.finalResult !== 0);
    if (points.length < 2)
      return { error: "Not enough data for trend", points };
    const byFinal = [...points].sort((a, b) => b.finalResult - a.finalResult);
    const first = points[0];
    const last = points[points.length - 1];
    let ups = 0,
      downs = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].finalResult > points[i - 1].finalResult) ups++;
      else if (points[i].finalResult < points[i - 1].finalResult) downs++;
    }
    const overallPct =
      first.finalResult !== 0
        ? parseFloat(
            (
              ((last.finalResult - first.finalResult) /
                Math.abs(first.finalResult)) *
              100
            ).toFixed(2),
          )
        : null;
    return {
      points,
      best: byFinal[0],
      worst: byFinal[byFinal.length - 1],
      overallChange_pct: overallPct,
      trend: ups > downs ? "upward" : downs > ups ? "downward" : "flat",
      periodsAnalyzed: points.length,
    };
  }
  return null;
}

function buildIntentFromQuestion(question) {
  const q = question.toLowerCase().trim();
  const words = q.split(/\s+/);
  let foundCols = [];
  for (const word of words) {
    const col = findColByLabel(word);
    if (col && !foundCols.find((c) => c.label === col.label))
      foundCols.push(col);
  }
  if (foundCols.length === 0) {
    for (let i = 0; i < words.length - 1; i++) {
      const combined = words[i] + " " + words[i + 1];
      const col = findColByLabel(combined);
      if (col) foundCols.push(col);
    }
  }
  let period1 = null,
    period2 = null;
  if (foundCols.length >= 2) {
    period1 = foundCols[0].label;
    period2 = foundCols[1].label;
  } else if (foundCols.length === 1) {
    period1 = foundCols[0].label;
  }
  let metric = null;
  if (/profit|ganancia|resultado|benefit/.test(q)) metric = "profit";
  else if (/income|ingreso|importe|revenue|ventas/.test(q)) metric = "income";
  else if (/expense|gasto|cost|coste/.test(q)) metric = "expense";
  else if (/summary|resumen|all|todo/.test(q)) metric = "all";
  let type = "general";
  if (
    /best|worst|trend|highest|lowest|max|min|top|mayor|menor|mejor|peor|grow|crec/.test(
      q,
    )
  )
    type = "trend";
  else if (period1 && period2) type = "compare";
  else if (period1) type = "single";
  else if (/total|overall|ytd|annual/.test(q)) {
    const yearCol = yearCols[0];
    if (yearCol) {
      period1 = yearCol.label;
      type = "single";
    }
  }
  return { type, metric, period1, period2 };
}

async function sendChatMessage() {
  const input = document.getElementById("cdInput");
  const question = input.value.trim();
  if (!question) return;
  appendUserMsg(question);
  chatHistory.push({ role: "user", content: question });
  input.value = "";
  input.style.height = "auto";
  const sendBtn = document.getElementById("cdSendBtn");
  sendBtn.disabled = true;
  const typingId = showTyping();
  setCdStatus("Typing...");
  try {
    const token = localStorage.getItem("jwt") || "";
    const intentToUse = buildIntentFromQuestion(question);
    const jsResult = jsCalculate(intentToUse);
    let finalAnswer;
    if (!jsResult) {
      const res1 = await fetch(CHATBOT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          sheetContext: getSheetContext(),
          history: chatHistory.slice(-10),
          jsResult: null,
        }),
      });
      const data1 = await res1.json();
      if (!res1.ok || !data1.success)
        throw new Error(data1.error || "Server error");
      finalAnswer =
        data1.answer ||
        "I couldn't answer that. Please try asking about a specific period.";
    } else {
      const res2 = await fetch(CHATBOT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          sheetContext: "",
          history: chatHistory.slice(-10),
          jsResult,
          metric: intentToUse.metric,
        }),
      });
      const data2 = await res2.json();
      if (!res2.ok || !data2.success)
        throw new Error(data2.error || "Server error");
      finalAnswer = data2.answer;
    }
    removeTyping(typingId);
    chatHistory.push({ role: "assistant", content: finalAnswer });
    appendBotMsg(finalAnswer);
    setCdStatus("● Online — Ask anything about the sheet data");
    if (!chatIsOpen) {
      const tb = document.getElementById("topbarChatBadge");
      if (tb) {
        tb.style.display = "inline-block";
        tb.textContent = "1";
      }
    }
  } catch (err) {
    removeTyping(typingId);
    appendBotMsg(`❌ **Error:** ${err.message}`, true);
    setCdStatus("⚠ Connection error — please try again");
  } finally {
    sendBtn.disabled = false;
    document.getElementById("cdInput").focus();
  }
}

function appendUserMsg(text) {
  const time = nowTime();
  const el = document.createElement("div");
  el.className = "cd-msg user";
  el.innerHTML = `<div><div class="cd-bubble">${esc(text).replace(/\n/g, "<br>")}</div><div class="cd-msg-time">${time}</div></div><div class="cd-msg-avatar">👤</div>`;
  document.getElementById("cdMessages").appendChild(el);
  scrollChat();
}

function appendBotMsg(text, isError = false) {
  const safeText = text || "⚠️ No response received.";
  const time = nowTime();
  const el = document.createElement("div");
  el.className = "cd-msg bot";
  el.innerHTML = `<div class="cd-msg-avatar">🤖</div><div><div class="cd-bubble ${isError ? "error" : ""}">${fmtBotText(safeText)}</div><div class="cd-msg-time">${time}</div></div>`;
  document.getElementById("cdMessages").appendChild(el);
  scrollChat();
}

function addWelcomeMessage() {
  const monthList = monthCols.map((m) => m.label).join(", ") || "N/A";
  const yearList = yearCols.map((y) => y.label).join(", ") || "N/A";
  const chips = [
    "What is the total income?",
    "Show profit and loss summary",
    `Compare ${monthCols[0]?.label || "first"} vs ${monthCols[1]?.label || "second"} month`,
    "Which period has the highest expense?",
  ];
  const el = document.createElement("div");
  el.className = "cd-msg bot";
  el.innerHTML = `<div class="cd-msg-avatar">🤖</div><div><div class="cd-bubble">👋 <strong>Hello!</strong> I'm your financial AI assistant.<br><br>Sheet data is loaded and ready to analyze.<br>📅 <strong>Months available:</strong> ${monthList}<br>📆 <strong>Years available:</strong> ${yearList}<br><br>You can ask me anything about the data:</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">${chips.map((q) => `<button class="cd-chip" onclick="sendChip(this)">${q}</button>`).join("")}</div><div class="cd-msg-time">${nowTime()}</div></div>`;
  document.getElementById("cdMessages").appendChild(el);
  scrollChat();
}

function setCdStatus(t) {
  const el = document.getElementById("cdStatus");
  if (el) el.textContent = t;
}
function scrollChat() {
  const m = document.getElementById("cdMessages");
  if (m) m.scrollTop = m.scrollHeight;
}

function showTyping() {
  const id = "td_" + Date.now();
  const messages = document.getElementById("cdMessages");
  if (!messages) return id;
  const el = document.createElement("div");
  el.className = "cd-msg bot";
  el.id = id;
  el.innerHTML = `<div class="cd-msg-avatar">🤖</div><div class="cd-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  messages.appendChild(el);
  scrollChat();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
function nowTime() {
  return new Date().toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtBotText(t) {
  return esc(t)
    .replace(
      /^#{1,3}\s(.+)$/gm,
      '<strong style="font-size:13px;color:#0d6efd;display:block;margin:6px 0 2px;">$1</strong>',
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      '<code style="background:#f0f4ff;padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>',
    )
    .replace(
      /^[-•]\s(.+)$/gm,
      '<span style="display:block;padding-left:12px;">• $1</span>',
    )
    .replace(/\n/g, "<br>");
}

window.onload = loadSheetData;
