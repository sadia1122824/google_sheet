/**
 * languageTranslater.js
 */

/* ── Language Map ─────────────────────────────────────────── */

const LANG_MAP = {
  es: { flag: '🇪🇸', label: 'Español' },
  en: { flag: '🇬🇧', label: 'English' },
  nl: { flag: '🇳🇱', label: 'Nederlands' },
};

const SUPPORTED_LANGS = Object.keys(LANG_MAP);
const DEFAULT_LANG    = 'es';
const STORAGE_KEY     = 'appLang';

let _translations = {};
let _currentLang  = DEFAULT_LANG;
let _tempSelected = new Set([DEFAULT_LANG]);
let _appliedLangs = new Set([DEFAULT_LANG]);

/* ── i18n Core ────────────────────────────────────────────── */

async function loadLang(lang) {
  try {
    const res = await fetch(`/users/locales/${lang}/translation.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[i18n] Could not load "${lang}", falling back to "${DEFAULT_LANG}".`, err);
    if (lang !== DEFAULT_LANG) return loadLang(DEFAULT_LANG);
    return {};
  }
}

function applyTranslations(translations) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key] !== undefined) el.textContent = translations[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[key] !== undefined) el.placeholder = translations[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (translations[key] !== undefined) el.title = translations[key];
  });
}

async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    console.warn(`[i18n] "${lang}" not supported.`);
    return;
  }
  _translations = await loadLang(lang);
  _currentLang  = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(_translations);
  document.documentElement.setAttribute('lang', lang);
  document.dispatchEvent(new CustomEvent('langchange', {
    detail: { lang, translations: _translations }
  }));
}

function currentLang() { return _currentLang; }

async function initI18n(preferredLang) {
  const saved    = localStorage.getItem(STORAGE_KEY);
  const browser  = (navigator.language || '').slice(0, 2);
  const resolved = [preferredLang, saved, browser, DEFAULT_LANG]
    .find(l => SUPPORTED_LANGS.includes(l));
  await setLang(resolved);
}

/* ── Button Display ───────────────────────────────────────── */

function updateBtnDisplay(selectedSet) {
  const flagEl  = document.getElementById('activeFlag');
  const labelEl = document.getElementById('activeLabel');
  const codeEl  = document.getElementById('activeCode');
  if (!flagEl || !labelEl || !codeEl) return;

  const langs = [...selectedSet];
  if (langs.length === 1) {
    const data = LANG_MAP[langs[0]];
    if (!data) return;
    flagEl.textContent  = data.flag;
    labelEl.textContent = data.label;
    codeEl.textContent  = langs[0].toUpperCase();
  } else {
    flagEl.textContent  = LANG_MAP[langs[0]]?.flag ?? '';
    labelEl.textContent = `${langs.length} languages`;
    codeEl.textContent  = '';
  }
}

/* ── Modal Logic ──────────────────────────────────────────── */

function injectModalStyles() {
  if (document.getElementById('langModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'langModalStyles';
  style.textContent = `
    .lang-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    .lang-modal-overlay.open { display: flex; }

    .lang-modal-box {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      width: 320px;
      max-width: 92vw;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    }
    .lang-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .lang-modal-title {
      font-size: 15px;
      font-weight: 600;
      color: #111;
    }
    .lang-modal-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #666;
      padding: 4px 6px;
      border-radius: 6px;
    }
    .lang-modal-close:hover { background: #f3f3f3; }
    .lang-modal-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 20px;
    }
    .lang-modal-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.12s, border-color 0.12s;
      user-select: none;
    }
    .lang-modal-item:hover { background: #f5f5f5; }
    .lang-modal-item.selected {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    .lang-modal-item .lm-flag { font-size: 20px; }
    .lang-modal-item .lm-name { flex: 1; font-size: 14px; color: #222; }
    .lang-modal-item .lm-check { font-size: 15px; color: #2563eb; opacity: 0; }
    .lang-modal-item.selected .lm-check { opacity: 1; }
    .lang-modal-footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .lang-modal-btn-cancel {
      padding: 7px 18px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      color: #555;
    }
    .lang-modal-btn-cancel:hover { background: #f3f3f3; }
    .lang-modal-btn-apply {
      padding: 7px 18px;
      border: 1px solid #93c5fd;
      border-radius: 8px;
      background: #eff6ff;
      cursor: pointer;
      font-size: 13px;
      color: #1d4ed8;
      font-weight: 600;
    }
    .lang-modal-btn-apply:hover { background: #dbeafe; }
  `;
  document.head.appendChild(style);
}

function renderModalList() {
  const list = document.getElementById('langList');
  if (!list) return;
  list.innerHTML = '';

  SUPPORTED_LANGS.forEach(code => {
    const { flag, label } = LANG_MAP[code];
    const isSelected = _tempSelected.has(code);

    const item = document.createElement('div');
    item.className = 'lang-modal-item' + (isSelected ? ' selected' : '');
    item.setAttribute('role', 'checkbox');
    item.setAttribute('aria-checked', String(isSelected));
    item.innerHTML = `
      <span class="lm-flag">${flag}</span>
      <span class="lm-name">${label}</span>
      <i class="bi bi-check2 lm-check"></i>`;

    item.addEventListener('click', () => toggleModalItem(code, item));
    list.appendChild(item);
  });
}

function toggleModalItem(code, el) {
  if (_tempSelected.has(code) && _tempSelected.size === 1) return;
  if (_tempSelected.has(code)) {
    _tempSelected.delete(code);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    _tempSelected.add(code);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
}

function openLangModal() {
  _tempSelected = new Set(_appliedLangs);
  renderModalList();
  const overlay = document.getElementById('langModalOverlay');
  if (overlay) {
    overlay.classList.add('open');
    // ✅ overlay click se close
    overlay.onclick = function (e) {
      if (e.target === overlay) closeLangModal();
    };
  }
}

function closeLangModal() {
  document.getElementById('langModalOverlay')?.classList.remove('open');
}

async function applyLangModal() {
  _appliedLangs = new Set(_tempSelected);
  updateBtnDisplay(_appliedLangs);
  const primaryLang = [..._appliedLangs][0];
  await setLang(primaryLang);
  closeLangModal();
}

/* ── Window Globals ───────────────────────────────────────── */

window.openLangModal  = openLangModal;
window.closeLangModal = closeLangModal;
window.applyLangModal = applyLangModal;
window.toggleLangMenu = openLangModal;

window.selectLang = async function (el, flag, label, langCode) {
  _appliedLangs = new Set([langCode]);
  _tempSelected = new Set([langCode]);
  updateBtnDisplay(_appliedLangs);
  await setLang(langCode);
};

/* ── Keyboard ─────────────────────────────────────────────── */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLangModal();
});

/* ── Auto Init ────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  injectModalStyles();
  await initI18n();
  _appliedLangs = new Set([currentLang()]);
  _tempSelected = new Set([currentLang()]);
  updateBtnDisplay(_appliedLangs);
});