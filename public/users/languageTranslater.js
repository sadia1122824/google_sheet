/**
 * languageTranslater.js
 * Note: Modal CSS moved to style.css — include it via <link rel="stylesheet" href="style.css">
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
  const flagEl = document.getElementById('activeFlag');
  const labelEl = document.getElementById('activeLabel');
  const codeEl = document.getElementById('activeCode');

  if (!flagEl || !labelEl || !codeEl) return;

  const lang = [...selectedSet][0];
  const data = LANG_MAP[lang];

  flagEl.textContent = data.flag;
  labelEl.textContent = data.label;
  codeEl.textContent = lang.toUpperCase();
}

/* ── Modal Logic ──────────────────────────────────────────── */

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
  // Purani selection remove karo
  _tempSelected.clear();

  // Nayi language select karo
  _tempSelected.add(code);

  // Sab items se selected class hatao
  document.querySelectorAll('.lang-modal-item').forEach(item => {
    item.classList.remove('selected');
    item.setAttribute('aria-checked', 'false');
  });

  // Current item select karo
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
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
  const selectedLang = [..._tempSelected][0];

  _appliedLangs = new Set([selectedLang]);

  updateBtnDisplay(_appliedLangs);
  await setLang(selectedLang);

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
  await initI18n();
  _appliedLangs = new Set([currentLang()]);
  _tempSelected = new Set([currentLang()]);
  updateBtnDisplay(_appliedLangs);
});
