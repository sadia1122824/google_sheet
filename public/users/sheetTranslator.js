// ═══════════════════════════════════════════════════════════════════
//  SHEET TRANSLATOR — Auto-translate Google Sheet data via Claude API
//  Supports: Spanish ↔ English ↔ Dutch (any source language)
//  Drop this file AFTER main script, BEFORE languageTranslater.js
// ═══════════════════════════════════════════════════════════════════

const SheetTranslator = (() => {

  // ── Cache: { "en": { originalText: translatedText }, "nl": {...} }
  const _cache = {};

  // ── Original (untranslated) copies saved on first load
  let _origHeaders   = null;
  let _origInfoRows  = null;
  let _origDataRows  = null;   // only col-0 and col-1 labels (text cells)

  // ── Currently active language (syncs with languageTranslater.js)
  let _activeLang = localStorage.getItem("appLang") || "es";

  // Language display names for prompt
  const LANG_NAMES = { en: "English", es: "Spanish", nl: "Dutch" };

  // ── Save originals once (called right after loadSheetData fills globals)
  function saveOriginals() {
    if (_origHeaders !== null) return;          // already saved
    _origHeaders  = [...headers];
    _origInfoRows = infoRows.map(r => [...r]);
    // Save only first two columns (Sr# and label); numeric cols stay as-is
    _origDataRows = allDataRows.map(r => r ? [r[0], r[1]] : [null, null]);
  }

  // ── Collect all unique text strings that need translating
  function collectTexts() {
    const set = new Set();

    // Headers (skip blank, numbers, month/year names — they stay as-is)
    _origHeaders.forEach(h => {
      const s = (h || "").toString().trim();
      if (s && isNaN(s) && !_isMonthOrYear(s)) set.add(s);
    });

    // Info rows
    _origInfoRows.forEach(row => {
      row.forEach(cell => {
        const s = (cell || "").toString().trim();
        if (s) set.add(s);
      });
    });

    // Row labels (col 1 — account names like "1 Importe neto")
    _origDataRows.forEach(pair => {
      const s = (pair[1] || "").toString().trim();
      if (s && isNaN(s)) set.add(s);
    });

    return [...set];
  }

  // ── Month/year detection — these should NOT be translated
  function _isMonthOrYear(s) {
    const lc = s.toLowerCase().trim();
    const months = ["enero","febrero","marzo","abril","mayo","junio","julio",
      "agosto","septiembre","octubre","noviembre","diciembre",
      "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
      "january","february","march","april","june","july","august","september",
      "october","november","december",
      "ene","abr","ago","dic"];
    if (months.includes(lc)) return true;
    if (/^\d{4}$/.test(lc)) return true;   // year
    if (/^%/.test(lc) || lc === "%") return true;
    return false;
  }

  // ── Call Claude API to translate an array of strings
  async function _callClaudeTranslate(texts, targetLang) {
    const langName = LANG_NAMES[targetLang] || targetLang;

    const prompt = `You are a professional financial translator.
Translate the following list of financial/accounting terms and labels into ${langName}.
Rules:
- Return ONLY a valid JSON array of translated strings, same order as input.
- Do NOT translate: numbers, codes like "1234", percentages like "45%", month names, year numbers.
- Keep short codes at the start (like "1 ", "4010 ") as-is; only translate the description part.
- If a string is already in ${langName}, keep it as-is.
- No explanation, no markdown, just the JSON array.

Input array:
${JSON.stringify(texts, null, 2)}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    const raw = data.content?.[0]?.text || "[]";

    // Strip markdown fences if present
    const clean = raw.replace(/```json|```/gi, "").trim();
    const translated = JSON.parse(clean);

    if (!Array.isArray(translated) || translated.length !== texts.length) {
      throw new Error("Translation response length mismatch");
    }

    return translated;
  }

  // ── Build cache entry for a language
  async function buildCache(lang) {
    if (_cache[lang]) return;   // already cached

    const texts = collectTexts();
    if (texts.length === 0) { _cache[lang] = {}; return; }

    console.log(`[SheetTranslator] Translating ${texts.length} strings to ${lang}...`);

    const translated = await _callClaudeTranslate(texts, lang);

    _cache[lang] = {};
    texts.forEach((orig, i) => {
      _cache[lang][orig] = translated[i] || orig;
    });

    console.log(`[SheetTranslator] Cache built for [${lang}]`, _cache[lang]);
  }

  // ── Translate a single string using cache
  function _tr(s, lang) {
    const key = (s || "").toString().trim();
    if (!key || _isMonthOrYear(key)) return s;
    if (!_cache[lang]) return s;       // cache not ready yet
    return _cache[lang][key] || s;     // fallback to original
  }

  // ── Apply translation to global arrays and re-render table
  function _applyToTable(lang) {
    if (!_origHeaders) return;

    // Translate headers
    headers = _origHeaders.map(h => _tr(h, lang));

    // Translate info rows
    infoRows = _origInfoRows.map(row => row.map(cell => _tr(cell, lang)));

    // Translate row labels (col 0 = Sr#, col 1 = label)
    allDataRows = allDataRows.map((row, idx) => {
      if (!row) return row;
      const newRow = [...row];
      // col 1: account label
      if (_origDataRows[idx]) {
        newRow[1] = _tr(_origDataRows[idx][1], lang);
      }
      return newRow;
    });

    // Re-render
    if (typeof renderTable === "function") renderTable();
  }

  // ── Show/hide loading indicator on language button
  function _setLoading(on) {
    const btn = document.getElementById("langBtn");
    if (!btn) return;
    if (on) {
      btn.dataset._origText = btn.innerHTML;
      btn.innerHTML = `<span style="font-size:12px;">⏳ Translating...</span>`;
      btn.disabled = true;
    } else {
      if (btn.dataset._origText) btn.innerHTML = btn.dataset._origText;
      btn.disabled = false;
    }
  }

  // ── PUBLIC: Call this when language changes
  async function switchLang(newLang) {
    _activeLang = newLang;

    if (!_origHeaders) {
      console.warn("[SheetTranslator] No data to translate yet.");
      return;
    }

    // Original language — restore originals directly
    if (!_cache[newLang]) {
      _setLoading(true);
      try {
        await buildCache(newLang);
      } catch (err) {
        console.error("[SheetTranslator] Translation failed:", err.message);
        _setLoading(false);
        return;
      }
      _setLoading(false);
    }

    _applyToTable(newLang);
  }

  // ── PUBLIC: Call this after sheet data loads
  async function onDataLoaded() {
    saveOriginals();

    // Pre-translate current language silently in background
    const lang = _activeLang;
    if (!_cache[lang]) {
      try {
        await buildCache(lang);
        _applyToTable(lang);
      } catch (err) {
        console.warn("[SheetTranslator] Background translate failed:", err.message);
      }
    }
  }

  return { switchLang, onDataLoaded };

})();


// ═══════════════════════════════════════════════════════════════════
//  HOOK into existing functions (no HTML/JS edits needed)
// ═══════════════════════════════════════════════════════════════════

// 1. Hook into loadSheetData — call onDataLoaded after table renders
(function () {
  const _orig = window.loadSheetData;
  if (typeof _orig !== "function") return;
  window.loadSheetData = async function (...args) {
    await _orig.apply(this, args);
    await SheetTranslator.onDataLoaded();
  };
})();

// 2. Hook into switchLanguage (from languageTranslater.js)
(function () {
  const _origSwitch = window.switchLanguage;
  window.switchLanguage = async function (lang) {
    if (typeof _origSwitch === "function") await _origSwitch(lang);
    await SheetTranslator.switchLang(lang);
  };
})();

// Also hook applyLangModal in case it calls switchLanguage internally
(function () {
  const _origApply = window.applyLangModal;
  if (typeof _origApply !== "function") return;
  window.applyLangModal = async function (...args) {
    await _origApply.apply(this, args);
    // switchLanguage hook above will handle it
  };
})();