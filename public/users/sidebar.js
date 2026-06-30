const sidebarHTML = `
<div class="sidebar" id="sidebar">

  <!-- Logo -->
  <div class="sidebar-header">
    <a href="/liveSheetGraphs">
      <img
        src="/users/icons/image2.png"
        alt="logo"
        data-i18n-alt="logo_alt"
        class="top-bar-logo"
        onerror="this.style.display='none'"
      >
    </a>
  </div>

  <!-- Sidebar Body -->
  <div class="sidebar-body">

    <!-- Navigation -->
    <div class="sidebar-section-title">
      <i class="bi bi-compass"></i>
      <span data-i18n="navigation">Navegación</span>
    </div>

    <!-- Dashboard -->
    <a class="sb-nav-link" href="/liveSheetGraphs">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="bi bi-house-door"></i>
        <span data-i18n="dashboard">Dashboard</span>
      </div>
    </a>

    <!-- Graphs -->
    <div class="sb-dropdown">

      <div class="sb-nav-link dropdown-toggle"
           onclick="toggleDropdown('graphsDropdown')">

        <div style="display:flex;align-items:center;gap:10px;">
          <i class="bi bi-bar-chart-line"></i>
          <span data-i18n="graphs">Gráficos</span>
        </div>

        <i class="bi bi-chevron-down dropdown-icon"></i>

      </div>

      <div class="sb-dropdown-menu"
           id="graphsDropdown"
           style="display:none;">

        <a class="sb-nav-link" href="/liveSheetGraphs">
          <i class="bi bi-dot"></i>
          <span data-i18n="live_graphs">Gráficos en Vivo</span>
        </a>

        <a class="sb-nav-link" href="/previousSheetGraphs">
          <i class="bi bi-dot"></i>
          <span data-i18n="previous_graphs">Gráficos Anteriores</span>
        </a>

      </div>

    </div>

    <!-- Google Sheet -->
    <div class="sb-dropdown">

      <div class="sb-nav-link dropdown-toggle"
           onclick="toggleDropdown('sheetDropdown')">

        <div style="display:flex;align-items:center;gap:10px;">
          <i class="bi bi-table"></i>
          <span data-i18n="google_sheet">Hoja de Google</span>
        </div>

        <i class="bi bi-chevron-down dropdown-icon"></i>

      </div>

      <div class="sb-dropdown-menu"
           id="sheetDropdown"
           style="display:none;">

        <a class="sb-nav-link" href="/LiveSheetData">
          <i class="bi bi-dot"></i>
          <span data-i18n="live_sheet">Hoja en Vivo</span>
        </a>

        <a class="sb-nav-link" href="/previousSheetData">
          <i class="bi bi-dot"></i>
          <span data-i18n="previous_sheet">Hoja Anterior</span>
        </a>

      </div>

    </div>

    <!-- Debts -->
    <div class="sb-dropdown">

      <div class="sb-nav-link dropdown-toggle"
           onclick="toggleDropdown('debtDropdown')">

        <div style="display:flex;align-items:center;gap:10px;">
          <i class="bi bi-cash-stack"></i>
          <span data-i18n="debts">Deudas</span>
        </div>

        <i class="bi bi-chevron-down dropdown-icon"></i>

      </div>

      <div class="sb-dropdown-menu"
           id="debtDropdown"
           style="display:none;">

        <a class="sb-nav-link" href="/showLatestdept">
          <i class="bi bi-dot"></i>
          <span data-i18n="current_debts">Deudas Actuales</span>
        </a>

        <a class="sb-nav-link" href="/showPreviousdept">
          <i class="bi bi-dot"></i>
          <span data-i18n="previous_debts">Deudas Anteriores</span>
        </a>

      </div>

    </div>

  </div>

  <!-- Bottom User -->
  <div class="sidebar-footer">

    <div class="user-card">

      <div class="user-avatar">
        A
      </div>

      <div class="user-details">
        <div class="user-name">Accountech</div>
        <div class="user-role">Administrator</div>
      </div>

      <i class="bi bi-chevron-down"></i>

    </div>

  </div>

</div>
`;

// Render Sidebar
document.getElementById("app").innerHTML = sidebarHTML;

// Apply translations
if (
  typeof applyTranslations === "function" &&
  typeof _translations !== "undefined"
) {
  applyTranslations(_translations);
}

// Language Change
document.addEventListener("langchange", (e) => {
  if (typeof applyTranslations === "function") {
    applyTranslations(e.detail.translations);
  }
});

// Dropdown Toggle
function toggleDropdown(dropdownId) {

  const dropdown = document.getElementById(dropdownId);
  const parent = dropdown.parentElement;

  parent.classList.toggle("open");

  if (dropdown.style.display === "block") {
    dropdown.style.display = "none";
  } else {
    dropdown.style.display = "block";
  }
}

// Active Menu
const currentPath = window.location.pathname;

document.querySelectorAll(".sb-nav-link[href]").forEach(link => {

  if (link.getAttribute("href") === currentPath) {
    link.classList.add("active");
  }

});