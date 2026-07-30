// ═══════════════════════════════════════════════════════════════════
//  AI ASSISTANT SCREEN — logic (dual dataset: latest year + previous year)
//
//  This screen loads BOTH sheets that the two dashboard pages load
//  separately:
//    /getLatestSheetResult    -> "latest" year data   (same as client_details.js #1)
//    /getPreviousSheetResult  -> "previous" year data  (same as client_details.js #2)
//
//  All the parsing/calculation logic below (extractCode, calcSummary,
//  findColByLabel, jsCalculate, etc.) is the SAME logic already used
//  in your two client_details.js files — just made reusable so it can
//  run against either dataset (or both, for year-vs-year comparisons)
//  instead of relying on one set of global variables.
//
//  Chat backend contract (same as before):
//    POST /AI_chat          -> { success, answer }
//    POST /speech_to_text   -> { success, text }
//    POST /text_to_speech   -> audio blob
// ═══════════════════════════════════════════════════════════════════

const AI_CHAT_API_URL = "/AI_chat";
const AI_STT_API_URL  = "/speech_to_text";
const AI_TTS_API_URL  = "/text_to_speech";
const AI_RECENT_KEY   = "ai_recent_commands";
const AI_RECENT_MAX   = 8;

// ─── DUAL SHEET STATE ─────────────────────────────────────────────
let latestSheet   = null;   // { label:"latest",   headers, infoRows, rows, monthCols, yearCols, pctColIndices }
let previousSheet = null;   // { label:"previous", headers, infoRows, rows, monthCols, yearCols, pctColIndices }
let sheetsLoading = true;

let aiChatHistory    = [];
let aiRecentCommands  = [];
let aiPendingAction    = null;

// voice state
let aiMediaRecorder = null;
let aiAudioChunks   = [];
let aiIsRecording   = false;
let aiRecordingTargetInputId = null;
let aiRecordingBtnEl = null;

// TTS state
let aiCurrentAudio = null;

// ═══════════════════════════════════════════════════════════════════
//  SHARED SHEET-PARSING / CALCULATION LOGIC
//  (identical rules to client_details.js, made pure/parameterized so
//  they work on either "latest" or "previous" data)
// ═══════════════════════════════════════════════════════════════════

const MONTHS_EN = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const MONTHS_AB = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MONTHS_AB_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function aiIsMonth(s) {
  const lc = (s || "").toLowerCase().trim();
  return MONTHS_EN.includes(lc) || MONTHS_AB.includes(lc) || MONTHS_ES.includes(lc) || MONTHS_AB_ES.includes(lc);
}
function aiIsYear(s) {
  s = (s || "").trim();
  return /^\d{4}$/.test(s) && parseInt(s) >= 1990 && parseInt(s) <= 2100;
}
function aiIsSkipRow(row) {
  return !row || row.length === 0 || row.every((c) => c === null || c === undefined || c.toString().trim() === "");
}
function aiExtractCode(val) {
  if (val === null || val === undefined) return null;
  const s = val.toString().trim();
  const match = s.match(/^(\d{3,6})\s+/);
  if (!match) return null;
  const n = parseInt(match[1]);
  if (n >= 1990 && n <= 2100) return null;
  return match[1];
}
function aiExtractLabel(val) {
  if (val === null || val === undefined) return "";
  const s = val.toString().trim();
  const match = s.match(/^\d{3,6}\s+(.*)/);
  return match ? match[1].trim() : s;
}
function aiFindCodeColIndex(rows) {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const v = row[c] !== null && row[c] !== undefined ? row[c].toString().trim() : "";
      if (aiExtractCode(v) !== null) return c;
    }
  }
  return 1;
}
function aiFmt(n) {
  if (isNaN(n) || n === undefined || n === null) return "0.00";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? "−" + formatted : formatted;
}
function aiCellNum(row, ci, pctColIndices) {
  if (pctColIndices.has(ci)) return 0;
  const raw = row[ci] !== undefined && row[ci] !== null ? row[ci].toString().trim() : "";
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}

function aiParseColumns(headers, rows) {
  const monthCols = [];
  const yearCols = [];
  const pctColIndices = new Set();

  headers.forEach((h, i) => {
    const s = (h || "").toString().trim();
    if (s === "%" || s.startsWith("%") || s.toLowerCase().startsWith("percent")) {
      pctColIndices.add(i);
      return;
    }
    if (aiIsYear(s)) yearCols.push({ label: s, colIndex: i });
    else if (aiIsMonth(s)) monthCols.push({ label: s, colIndex: i });
  });

  headers.forEach((h, i) => {
    const s = (h || "").toString().trim();
    if (s !== "") return;
    if (pctColIndices.has(i)) return;
    const prevHeader = (headers[i - 1] || "").toString().trim();
    const isPrevMonth = aiIsMonth(prevHeader);
    const isPrevYear = aiIsYear(prevHeader);
    const isPrevPct = pctColIndices.has(i - 1);
    if (isPrevMonth || isPrevYear || isPrevPct) {
      let looksLikePct = false;
      for (let r = 0; r < Math.min(rows.length, 20); r++) {
        const row = rows[r];
        if (!row) continue;
        const val = (row[i] || "").toString().trim();
        if (!val) continue;
        const num = parseFloat(val.replace(/[^0-9.\-]/g, ""));
        if (!isNaN(num) && num >= -100 && num <= 100) {
          looksLikePct = true;
          break;
        }
      }
      if (looksLikePct) pctColIndices.add(i);
    }
  });

  return { monthCols, yearCols, pctColIndices };
}

// Same profit/loss classification rules as client_details.js
function aiCalcSummary(sheet, colObj) {
  const ci = colObj.colIndex;
  const rows = sheet.rows;
  const pctColIndices = sheet.pctColIndices;
  const CODE_COL = aiFindCodeColIndex(rows);
  const IS_INCOME_ROW = (v) => /^1[\.\s]|^importe\s+neto|^1\s+importe/i.test(v);
  const IS_EXPLOTACION_ROW = (v) => /^A\)\s*RESULTADO\s+DE\s+EXPLOT/i.test(v);
  const IS_INTEREST_ROW = (v) => /^14[\.\s]|gastos\s+financiero/i.test(v);
  const IS_EXPENSE_ROW = (v) => /^[4-9][\.\s]|^1[0-3][\.\s]/.test(v);

  let income = 0, explotacion = 0, bankInterest = 0, pureExpense = 0;

  rows.forEach((row) => {
    if (aiIsSkipRow(row)) return;
    const cellVal = (row[CODE_COL] ?? "").toString().trim();
    if (!cellVal) return;
    const v = aiCellNum(row, ci, pctColIndices);
    if (v === 0) return;
    if (IS_INCOME_ROW(cellVal)) income = v;
    else if (IS_EXPLOTACION_ROW(cellVal)) explotacion = v;
    else if (IS_INTEREST_ROW(cellVal)) bankInterest = v;
    else if (IS_EXPENSE_ROW(cellVal)) pureExpense += v;
  });

  const finalResult = explotacion + bankInterest;
  return {
    income,
    expense: pureExpense,
    explotacion,
    bankInterest,
    finalResult,
    profit: finalResult > 0 ? finalResult : 0,
    loss: finalResult < 0 ? finalResult : 0,
  };
}

const EN_TO_ES_MONTH = {
  jan: "ene", january: "ene", enero: "ene",
  feb: "feb", february: "feb", febrero: "feb",
  mar: "mar", march: "mar", marzo: "mar",
  apr: "abr", april: "abr", abril: "abr",
  may: "may", mayo: "may",
  jun: "jun", june: "jun", junio: "jun",
  jul: "jul", july: "jul", julio: "jul",
  aug: "ago", august: "ago", agosto: "ago",
  sep: "sep", sept: "sep", september: "sep", septiembre: "sep",
  oct: "oct", october: "oct", octubre: "oct",
  nov: "nov", november: "nov", noviembre: "nov",
  dec: "dic", december: "dic", diciembre: "dic", dic: "dic",
};

function aiFindColByLabel(sheet, label) {
  if (!sheet || !label) return null;
  const lc = label.toLowerCase().trim();
  if (lc.length < 2) return null;
  const all = [...sheet.monthCols, ...sheet.yearCols];
  let found = all.find((c) => c.label.toLowerCase().trim() === lc);
  if (found) return found;
  const mapped = EN_TO_ES_MONTH[lc];
  if (mapped) {
    found = sheet.monthCols.find((c) => c.label.toLowerCase().trim() === mapped);
    if (found) return found;
  }
  if (/^\d{4}$/.test(lc)) {
    found = sheet.yearCols.find((c) => c.label.trim() === lc);
    if (found) return found;
  }
  if (lc.length >= 3) {
    found = all.find((c) => {
      const cl = c.label.toLowerCase().trim();
      return cl.startsWith(lc) || lc.startsWith(cl);
    });
    if (found) return found;
  }
  return null;
}

// ─── which year(s) is the question about? ──────────────────────────
const AI_PREV_RE = /\b(previous|last\s*year|prior\s*year|past\s*year|pichl[ae]|pichla\s*saal|purana|purani)\b/i;
const AI_LATEST_RE = /\b(latest|current\s*year|this\s*year|naya|nayi|is\s*saal|present\s*year|recent\s*year)\b/i;
const AI_COMPARE_YEARS_RE = /\b(vs|versus|compare)\b.*\byear/i;
const AI_YOY_RE = /\byear[\s-]?on[\s-]?year|yoy\b/i;

function aiDetectYearTarget(question) {
  const q = question.toLowerCase();
  const wantsPrev = AI_PREV_RE.test(q);
  const wantsLatest = AI_LATEST_RE.test(q);
  if (AI_COMPARE_YEARS_RE.test(q) || AI_YOY_RE.test(q)) return "compare_years";
  if (wantsPrev && wantsLatest) return "compare_years";
  if (wantsPrev) return "previous";
  if (wantsLatest) return "latest";
  return "latest"; // default when not specified
}

function aiBuildIntentFromQuestion(question, sheet) {
  const q = question.toLowerCase().trim();
  const words = q.split(/\s+/);
  let foundCols = [];
  const pool = sheet || latestSheet || previousSheet;
  if (pool) {
    for (const word of words) {
      const col = aiFindColByLabel(pool, word);
      if (col && !foundCols.find((c) => c.label === col.label)) foundCols.push(col);
    }
    if (foundCols.length === 0) {
      for (let i = 0; i < words.length - 1; i++) {
        const combined = words[i] + " " + words[i + 1];
        const col = aiFindColByLabel(pool, combined);
        if (col) foundCols.push(col);
      }
    }
  }
  let period1 = null, period2 = null;
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
  if (/best|worst|trend|highest|lowest|max|min|top|mayor|menor|mejor|peor|grow|crec/.test(q)) type = "trend";
  else if (period1 && period2) type = "compare";
  else if (period1) type = "single";
  else if (/total|overall|ytd|annual/.test(q)) {
    const yearCol = pool?.yearCols?.[0];
    if (yearCol) {
      period1 = yearCol.label;
      type = "single";
    }
  }

  const target = aiDetectYearTarget(question);
  return { type, metric, period1, period2, target };
}

function aiJsCalcSingle(sheet, period1) {
  const col = aiFindColByLabel(sheet, period1);
  if (!col) {
    const available = [...sheet.monthCols, ...sheet.yearCols].map((c) => c.label).join(", ");
    return { error: `Period "${period1}" not found in ${sheet.label} year data. Available: ${available}` };
  }
  const s = aiCalcSummary(sheet, col);
  return {
    period: col.label,
    yearDataset: sheet.label,
    income: s.income,
    expense: s.expense,
    bankInterest: s.bankInterest,
    finalResult: s.finalResult,
    profit: s.profit,
    loss: s.loss,
  };
}

function aiPct(a, b) {
  if (a === 0) return null;
  return parseFloat((((b - a) / Math.abs(a)) * 100).toFixed(2));
}

function aiJsCalcCompareWithinSheet(sheet, period1, period2) {
  const col1 = aiFindColByLabel(sheet, period1);
  const col2 = aiFindColByLabel(sheet, period2);
  if (!col1) return { error: `Period "${period1}" not found in ${sheet.label} year data` };
  if (!col2) return { error: `Period "${period2}" not found in ${sheet.label} year data` };
  const s1 = aiCalcSummary(sheet, col1);
  const s2 = aiCalcSummary(sheet, col2);
  return {
    yearDataset: sheet.label,
    period1: { label: col1.label, income: s1.income, expense: s1.expense, finalResult: s1.finalResult, profit: s1.profit, loss: s1.loss },
    period2: { label: col2.label, income: s2.income, expense: s2.expense, finalResult: s2.finalResult, profit: s2.profit, loss: s2.loss },
    difference: {
      income: parseFloat((s2.income - s1.income).toFixed(2)),
      income_pct: aiPct(s1.income, s2.income),
      finalResult: parseFloat((s2.finalResult - s1.finalResult).toFixed(2)),
      finalResult_pct: aiPct(s1.finalResult, s2.finalResult),
      direction: s2.finalResult > s1.finalResult ? "improved" : s2.finalResult < s1.finalResult ? "declined" : "unchanged",
    },
  };
}

// Year-over-year: same period label compared across latest vs previous sheet
function aiJsCalcYearOverYear(period1) {
  if (!latestSheet || !previousSheet) {
    return { error: "Both latest-year and previous-year data must be loaded to compare years." };
  }
  const label = period1 || (latestSheet.monthCols[0]?.label) || (latestSheet.yearCols[0]?.label);
  const colLatest = aiFindColByLabel(latestSheet, label);
  const colPrev = aiFindColByLabel(previousSheet, label);
  if (!colLatest || !colPrev) {
    return { error: `Couldn't find "${label}" in both years. Latest has: ${[...latestSheet.monthCols, ...latestSheet.yearCols].map(c=>c.label).join(", ")}. Previous has: ${[...previousSheet.monthCols, ...previousSheet.yearCols].map(c=>c.label).join(", ")}` };
  }
  const sLatest = aiCalcSummary(latestSheet, colLatest);
  const sPrev = aiCalcSummary(previousSheet, colPrev);
  return {
    period: label,
    previousYear: { income: sPrev.income, expense: sPrev.expense, finalResult: sPrev.finalResult, profit: sPrev.profit, loss: sPrev.loss },
    latestYear: { income: sLatest.income, expense: sLatest.expense, finalResult: sLatest.finalResult, profit: sLatest.profit, loss: sLatest.loss },
    difference: {
      income: parseFloat((sLatest.income - sPrev.income).toFixed(2)),
      income_pct: aiPct(sPrev.income, sLatest.income),
      finalResult: parseFloat((sLatest.finalResult - sPrev.finalResult).toFixed(2)),
      finalResult_pct: aiPct(sPrev.finalResult, sLatest.finalResult),
      direction: sLatest.finalResult > sPrev.finalResult ? "improved" : sLatest.finalResult < sPrev.finalResult ? "declined" : "unchanged",
    },
  };
}

function aiJsCalcTrend(sheet) {
  const pool = sheet.monthCols.length > 0 ? sheet.monthCols : sheet.yearCols;
  if (pool.length === 0) return { error: "No period columns found" };
  const points = pool
    .map((col) => {
      const s = aiCalcSummary(sheet, col);
      return { period: col.label, income: s.income, expense: s.expense, finalResult: s.finalResult, profit: s.profit, loss: s.loss };
    })
    .filter((p) => p.income !== 0 || p.finalResult !== 0);
  if (points.length < 2) return { error: "Not enough data for trend", points };
  const byFinal = [...points].sort((a, b) => b.finalResult - a.finalResult);
  const first = points[0];
  const last = points[points.length - 1];
  let ups = 0, downs = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].finalResult > points[i - 1].finalResult) ups++;
    else if (points[i].finalResult < points[i - 1].finalResult) downs++;
  }
  const overallPct = first.finalResult !== 0
    ? parseFloat((((last.finalResult - first.finalResult) / Math.abs(first.finalResult)) * 100).toFixed(2))
    : null;
  return {
    yearDataset: sheet.label,
    points,
    best: byFinal[0],
    worst: byFinal[byFinal.length - 1],
    overallChange_pct: overallPct,
    trend: ups > downs ? "upward" : downs > ups ? "downward" : "flat",
    periodsAnalyzed: points.length,
  };
}

function aiJsCalculate(intent) {
  if (!intent || intent.type === "general") return null;

  // Year-over-year / explicit comparison between the two years
  if (intent.target === "compare_years") {
    return aiJsCalcYearOverYear(intent.period1);
  }

  const sheet = intent.target === "previous" ? previousSheet : latestSheet;
  if (!sheet) {
    return { error: `${intent.target === "previous" ? "Previous" : "Latest"} year data is still loading — please try again in a moment.` };
  }

  if (intent.type === "single") return aiJsCalcSingle(sheet, intent.period1);
  if (intent.type === "compare") return aiJsCalcCompareWithinSheet(sheet, intent.period1, intent.period2);
  if (intent.type === "trend") return aiJsCalcTrend(sheet);
  return null;
}

function aiGetSheetContext(target) {
  const parts = [];
  const describe = (sheet) => {
    if (!sheet) return "Not loaded.";
    const hdrs = sheet.headers || [];
    const maxRows = Math.min(sheet.rows.length, 300);
    const lines = [hdrs.join(" | ")];
    for (let i = 0; i < maxRows; i++) {
      const row = sheet.rows[i];
      if (!row || row.every((c) => c === null || c === undefined || c.toString().trim() === "")) continue;
      lines.push(row.map((c) => (c !== null && c !== undefined ? c.toString().trim() : "")).join(" | "));
    }
    const infoText = (sheet.infoRows || []).map((r) => r.filter(Boolean).join(" ")).join("\n");
    const monthNames = sheet.monthCols.map((m) => m.label).join(", ");
    const yearNames = sheet.yearCols.map((y) => y.label).join(", ");
    return `${infoText}\nMonths: ${monthNames || "None"}\nYears: ${yearNames || "None"}\nColumns: ${hdrs.join(" | ")}\nData (${sheet.rows.length} rows, first ${maxRows} shown):\n${lines.join("\n")}`;
  };

  if (target === "previous") parts.push(`=== PREVIOUS YEAR SHEET ===\n${describe(previousSheet)}`);
  else if (target === "compare_years") {
    parts.push(`=== LATEST YEAR SHEET ===\n${describe(latestSheet)}`);
    parts.push(`=== PREVIOUS YEAR SHEET ===\n${describe(previousSheet)}`);
  } else parts.push(`=== LATEST YEAR SHEET ===\n${describe(latestSheet)}`);

  return parts.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════
//  SHEET LOADING (both years, in parallel)
// ═══════════════════════════════════════════════════════════════════
async function aiLoadSheet(url, label) {
  const clientId = localStorage.getItem("clientId") || "";
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json", "x-client-id": clientId },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Server error: ${res.status} - ${text}`);
  const result = JSON.parse(text);
  if (!result.success) throw new Error(result.error || "Failed to load sheet");
  const rawData = result.data;
  if (!rawData || rawData.length === 0) throw new Error("No data returned");

  const data = rawData.map((row) =>
    Array.isArray(row) ? row : Object.entries(row).filter(([k]) => !k.startsWith("_")).map(([, v]) => v),
  );
  const infoRows = data.slice(0, 3);
  const headers = data[3] || [];
  const rows = data.slice(4);
  const { monthCols, yearCols, pctColIndices } = aiParseColumns(headers, rows);

  return { label, headers, infoRows, rows, monthCols, yearCols, pctColIndices };
}

async function aiInitSheets() {
  sheetsLoading = true;
  const results = await Promise.allSettled([
    aiLoadSheet("/getLatestSheetResult", "latest"),
    aiLoadSheet("/getPreviousSheetResult", "previous"),
  ]);

  if (results[0].status === "fulfilled") latestSheet = results[0].value;
  else console.error("Latest year sheet failed to load:", results[0].reason);

  if (results[1].status === "fulfilled") previousSheet = results[1].value;
  else console.error("Previous year sheet failed to load:", results[1].reason);

  sheetsLoading = false;
  aiRenderWelcome(true);
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  aiBuildWave();
  aiLoadRecentCommands();
  aiRenderRecent();
  aiRenderWelcome(false);
  aiInitSheets();
});

function aiBuildWave() {
  const wave = document.getElementById("aiWave");
  if (!wave) return;
  wave.innerHTML = "";
  const bars = window.innerWidth <= 768 ? 18 : 32;
  for (let i = 0; i < bars; i++) {
    const span = document.createElement("span");
    span.style.animationDelay = (Math.random() * 1.6).toFixed(2) + "s";
    wave.appendChild(span);
  }
}
window.addEventListener("resize", aiBuildWave);

function aiRenderWelcome(afterLoad) {
  const body = document.getElementById("aiConvBody");
  if (!body) return;
  if (!afterLoad && body.children.length > 0) return;
  if (afterLoad) body.innerHTML = "";

  if (sheetsLoading) {
    aiAppendBotMsg("Loading your latest-year and previous-year data…");
    return;
  }

  const latestYears = latestSheet ? [...latestSheet.monthCols, ...latestSheet.yearCols].map((c) => c.label).join(", ") : "not available";
  const prevYears = previousSheet ? [...previousSheet.monthCols, ...previousSheet.yearCols].map((c) => c.label).join(", ") : "not available";

  aiAppendBotMsg(
    `Hi! Both years are loaded and ready.\n\n📅 **Latest year periods:** ${latestYears}\n📆 **Previous year periods:** ${prevYears}\n\nAsk me things like "profit for March" (latest year by default), "previous year income for June", or "compare December vs last year" for year-over-year.`,
  );
}

// ───────────────────────── CHIPS ──────────────────────────
function aiUseChip(text) {
  const heroInput = document.getElementById("aiHeroInput");
  if (heroInput) heroInput.value = text;
  aiSendFromHero();
}

// ───────────────────────── SEND (hero + conversation inputs) ──────────────────────────
function aiSendFromHero() {
  const input = document.getElementById("aiHeroInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  aiSendMessage(text);
}

function aiSendFromConv() {
  const input = document.getElementById("aiConvInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  aiSendMessage(text);
}

async function aiSendMessage(text) {
  aiAppendUserMsg(text);
  aiChatHistory.push({ role: "user", content: text });
  aiAddRecentCommand(text);

  const typingId = aiShowTyping();
  const sendBtns = document.querySelectorAll(".ai-conv-input button, .ai-send-btn-hero");
  sendBtns.forEach((b) => (b.disabled = true));

  try {
    const targetSheet = aiDetectYearTarget(text) === "previous" ? previousSheet : latestSheet;
    const intent = aiBuildIntentFromQuestion(text, targetSheet);
    const jsResult = aiJsCalculate(intent);

    const token = localStorage.getItem("jwt") || "";
    let finalAnswer;

    if (!jsResult) {
      const res = await fetch(AI_CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question: text,
          sheetContext: aiGetSheetContext(intent.target),
          history: aiChatHistory.slice(-10),
          jsResult: null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");
      finalAnswer = data.answer || "I couldn't answer that. Try asking about a specific month, year, or period.";
    } else {
      const res = await fetch(AI_CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question: text,
          sheetContext: "",
          history: aiChatHistory.slice(-10),
          jsResult,
          metric: intent.metric,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Server error");
      finalAnswer = data.answer;
    }

    aiRemoveTyping(typingId);
    aiChatHistory.push({ role: "assistant", content: finalAnswer });
    aiAppendBotMsg(finalAnswer);
  } catch (err) {
    aiRemoveTyping(typingId);
    aiAppendBotMsg(`⚠️ ${err.message}`, true);
  } finally {
    sendBtns.forEach((b) => (b.disabled = false));
  }
}

function aiClearChat() {
  aiChatHistory = [];
  aiPendingAction = null;
  const body = document.getElementById("aiConvBody");
  if (body) body.innerHTML = "";
  aiRenderWelcome(true);
}

// ───────────────────────── MESSAGE RENDERING ──────────────────────────
function aiEsc(s) {
  return (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function aiFmtText(t) {
  return aiEsc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}
function aiNowTime() {
  return new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

function aiAppendUserMsg(text) {
  const body = document.getElementById("aiConvBody");
  if (!body) return;
  const el = document.createElement("div");
  el.className = "ai-msg user";
  el.innerHTML = `
    <div class="ai-msg-avatar"><i class="bi bi-person-fill"></i></div>
    <div>
      <div class="ai-msg-name">You</div>
      <div class="ai-bubble">${aiFmtText(text)}</div>
      <div class="ai-msg-time">${aiNowTime()}</div>
    </div>`;
  body.appendChild(el);
  aiScrollConv();
}

function aiAppendBotMsg(text, isError = false, action = null) {
  const body = document.getElementById("aiConvBody");
  if (!body) return;
  const speakId = "ai_speak_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  const el = document.createElement("div");
  el.className = "ai-msg bot";
  el.innerHTML = `
    <div class="ai-msg-avatar"><i class="bi bi-robot"></i></div>
    <div style="width:100%;">
      <div class="ai-msg-name">Assistant</div>
      <div class="ai-bubble" style="${isError ? "color:var(--ai-red);" : ""}">${aiFmtText(text)}</div>
      ${action ? aiBuildResultCard(action) : ""}
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="ai-msg-time">${aiNowTime()}</div>
        ${!isError ? `<button id="${speakId}" class="ai-speak-btn" onclick='aiSpeakText(${JSON.stringify(text)})' title="Listen" style="background:none;border:none;color:var(--ai-primary);cursor:pointer;font-size:13px;opacity:.7;"><i class="bi bi-volume-up-fill"></i></button>` : ""}
      </div>
    </div>`;
  body.appendChild(el);
  aiScrollConv();
}

function aiShowTyping() {
  const body = document.getElementById("aiConvBody");
  if (!body) return null;
  const id = "ai_typing_" + Date.now();
  const el = document.createElement("div");
  el.className = "ai-msg bot";
  el.id = id;
  el.innerHTML = `<div class="ai-msg-avatar"><i class="bi bi-robot"></i></div><div class="ai-bubble"><i class="bi bi-three-dots"></i> typing...</div>`;
  body.appendChild(el);
  aiScrollConv();
  return id;
}
function aiRemoveTyping(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}
function aiScrollConv() {
  const body = document.getElementById("aiConvBody");
  if (body) body.scrollTop = body.scrollHeight;
}

// ───────────────────────── RESULT / CONFIRM CARD (generic actions) ──────────────────────────
function aiBuildResultCard(action) {
  aiPendingAction = action;
  const icon =
    action.type === "task" ? "bi-check2-square" :
    action.type === "meeting" ? "bi-calendar-event" :
    action.type === "client" ? "bi-person-plus" :
    action.type === "invoice" ? "bi-receipt" : "bi-info-circle";

  const rows = (action.rows || [])
    .map((r) => `
      <div class="ai-result-row">
        <span class="ai-rr-label"><i class="bi ${r.icon || "bi-dot"}"></i> ${aiEsc(r.label)}</span>
        <span class="ai-rr-value">${aiEsc(r.value)}</span>
      </div>`)
    .join("");

  return `
    <div class="ai-result-card">
      <div class="ai-result-title"><i class="bi ${icon}"></i> ${aiEsc(action.title || "Confirm action")}</div>
      ${rows}
      <div class="ai-result-actions">
        <button class="ai-btn ai-btn-confirm" onclick="aiConfirmAction()"><i class="bi bi-check-lg"></i> Confirm</button>
        <button class="ai-btn ai-btn-edit" onclick="aiEditAction()"><i class="bi bi-pencil"></i> Edit</button>
        <button class="ai-btn ai-btn-cancel" onclick="aiCancelAction()"><i class="bi bi-x-lg"></i> Cancel</button>
      </div>
    </div>`;
}

async function aiConfirmAction() {
  if (!aiPendingAction) return;
  const action = aiPendingAction;
  aiPendingAction = null;
  try {
    const token = localStorage.getItem("jwt") || "";
    const res = await fetch(AI_CHAT_API_URL + "/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    aiAppendBotMsg(data && data.answer ? data.answer : "Done — action confirmed.");
  } catch (err) {
    aiAppendBotMsg(`⚠️ Could not confirm: ${err.message}`, true);
  }
}
function aiEditAction() {
  const input = document.getElementById("aiConvInput") || document.getElementById("aiHeroInput");
  if (input && aiPendingAction) {
    input.value = `Edit: ${aiPendingAction.title || ""} `;
    input.focus();
  }
}
function aiCancelAction() {
  aiPendingAction = null;
  aiAppendBotMsg("Okay, cancelled.");
}

// ───────────────────────── RECENT COMMANDS ──────────────────────────
function aiLoadRecentCommands() {
  try {
    aiRecentCommands = JSON.parse(localStorage.getItem(AI_RECENT_KEY) || "[]");
  } catch (e) {
    aiRecentCommands = [];
  }
}
function aiAddRecentCommand(text) {
  aiRecentCommands.unshift({ text, time: aiNowTime() });
  aiRecentCommands = aiRecentCommands.slice(0, AI_RECENT_MAX);
  localStorage.setItem(AI_RECENT_KEY, JSON.stringify(aiRecentCommands));
  aiRenderRecent();
}
function aiRenderRecent() {
  const list = document.getElementById("aiRecentList");
  if (!list) return;
  if (aiRecentCommands.length === 0) {
    list.innerHTML = `<div style="font-size:12.5px;color:var(--ai-muted);padding:8px 0;">No commands yet</div>`;
    return;
  }
  list.innerHTML = aiRecentCommands
    .map((c) => `
      <div class="ai-recent-item">
        <div class="ai-ri-icon" style="background:var(--ai-primary-soft);color:var(--ai-primary);"><i class="bi bi-arrow-return-left"></i></div>
        <div class="ai-ri-text">${aiEsc(c.text)}</div>
        <div class="ai-ri-time">${aiEsc(c.time)}</div>
      </div>`)
    .join("");
}

// ───────────────────────── VOICE INPUT (mic buttons) ──────────────────────────
async function aiToggleVoice(inputId, btnEl) {
  if (aiIsRecording) {
    aiStopRecording();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    aiAudioChunks = [];
    aiMediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    aiRecordingTargetInputId = inputId;
    aiRecordingBtnEl = btnEl;

    aiMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) aiAudioChunks.push(e.data);
    };
    aiMediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      await aiSendAudioToSTT();
    };

    aiMediaRecorder.start();
    aiIsRecording = true;
    if (btnEl) {
      btnEl.classList.add("listening");
      btnEl.innerHTML = `<i class="bi bi-stop-fill"></i>`;
    }
  } catch (err) {
    alert("Microphone access denied. Please allow mic permission.");
  }
}
function aiStopRecording() {
  if (aiMediaRecorder && aiIsRecording) {
    aiMediaRecorder.stop();
    aiIsRecording = false;
    if (aiRecordingBtnEl) {
      aiRecordingBtnEl.classList.remove("listening");
      aiRecordingBtnEl.innerHTML = `<i class="bi bi-mic-fill"></i>`;
    }
  }
}
async function aiSendAudioToSTT() {
  if (aiAudioChunks.length === 0) return;
  const btnEl = aiRecordingBtnEl;
  const inputId = aiRecordingTargetInputId;
  if (btnEl) btnEl.innerHTML = `<i class="bi bi-hourglass-split"></i>`;

  try {
    const blob = new Blob(aiAudioChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "audio.webm");
    const token = localStorage.getItem("jwt") || "";

    const res = await fetch(AI_STT_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();

    if (data.success && data.text) {
      const input = document.getElementById(inputId);
      if (input) input.value = data.text;
      if (inputId === "aiHeroInput") aiSendFromHero();
      else aiSendFromConv();
    } else {
      aiAppendBotMsg("⚠️ Could not understand audio, please try again.", true);
    }
  } catch (err) {
    aiAppendBotMsg(`⚠️ Voice error: ${err.message}`, true);
  } finally {
    if (btnEl) btnEl.innerHTML = `<i class="bi bi-mic-fill"></i>`;
  }
}

// ───────────────────────── TEXT-TO-SPEECH ──────────────────────────
async function aiSpeakText(text) {
  if (aiCurrentAudio) {
    aiCurrentAudio.pause();
    aiCurrentAudio = null;
    aiUpdateSpeakBtns(false);
    return;
  }
  const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/<[^>]*>/g, "").slice(0, 4000);
  aiUpdateSpeakBtns(true, true);
  try {
    const token = localStorage.getItem("jwt") || "";
    const res = await fetch(AI_TTS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: clean }),
    });
    if (!res.ok) throw new Error("TTS request failed");
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("Empty audio");
    const url = URL.createObjectURL(blob);
    aiCurrentAudio = new Audio(url);
    aiCurrentAudio.onended = () => { aiCurrentAudio = null; aiUpdateSpeakBtns(false); URL.revokeObjectURL(url); };
    aiCurrentAudio.onerror = () => { aiCurrentAudio = null; aiUpdateSpeakBtns(false); };
    aiUpdateSpeakBtns(true);
    await aiCurrentAudio.play();
  } catch (err) {
    aiUpdateSpeakBtns(false);
    if (err.name === "NotAllowedError") {
      alert("Browser blocked audio autoplay — click anywhere on the page and try again.");
    }
  }
}
function aiUpdateSpeakBtns(playing, loading = false) {
  document.querySelectorAll(".ai-speak-btn").forEach((btn) => {
    btn.innerHTML = loading ? `<i class="bi bi-hourglass-split"></i>` : playing ? `<i class="bi bi-stop-fill"></i>` : `<i class="bi bi-volume-up-fill"></i>`;
  });
}
