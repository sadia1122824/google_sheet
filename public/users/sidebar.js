const sidebarHTML = `
  <div class="sidebar" id="sidebar">

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

    <div class="sidebar-body">

      <div class="sidebar-section-title">
        <i class="bi bi-compass"></i> <span data-i18n="navigation">Navegación</span>
      </div>

      <!-- Menú desplegable de Gráficos -->
      <div class="sb-dropdown">

        <div class="sb-nav-link dropdown-toggle" onclick="toggleDropdown('graphsDropdown')">
          <div style="display:flex; align-items:center; gap:10px;">
            <i class="bi bi-bar-chart-line"></i>
            <span data-i18n="graphs">Gráficos</span>
          </div>

          <i class="bi bi-chevron-down dropdown-icon"></i>
        </div>

        <!-- Elementos del menú -->
        <div
          class="sb-dropdown-menu"
          id="graphsDropdown"
          style="display:none; padding-left:15px;"
        >
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

      <!-- Menú desplegable de Google Sheet -->
    

     <!-- Google Sheet Dropdown -->
<div class="sb-dropdown">

  <div class="sb-nav-link dropdown-toggle"
       onclick="toggleDropdown('sheetDropdown')">

    <div style="display:flex; align-items:center; gap:10px;">
      <i class="bi bi-table"></i>
      <span data-i18n="google_sheet">Hoja de Google</span>
    </div>

    <i class="bi bi-chevron-down dropdown-icon"></i>
  </div>

  <div class="sb-dropdown-menu"
       id="sheetDropdown"
       style="display:none; padding-left:15px;">

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

<!-- Debt Dropdown -->
<div class="sb-dropdown">

  <div class="sb-nav-link dropdown-toggle"
       onclick="toggleDropdown('debtDropdown')">

    <div style="display:flex; align-items:center; gap:10px;">
      <i class="bi bi-cash-stack"></i>
      <span data-i18n="debts">Deudas</span>
    </div>

    <i class="bi bi-chevron-down dropdown-icon"></i>
  </div>

  <div class="sb-dropdown-menu"
       id="debtDropdown"
       style="display:none; padding-left:15px;">

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

    </div>

  </div>
`;

// Renderizar barra lateral
document.getElementById("app").innerHTML = sidebarHTML;

// Apply translations to the newly injected sidebar markup, if i18n is already loaded
if (
  typeof applyTranslations === "function" &&
  typeof _translations !== "undefined"
) {
  applyTranslations(_translations);
}

// Re-apply translations whenever the language changes, since the sidebar is injected once at load
document.addEventListener("langchange", (e) => {
  if (typeof applyTranslations === "function") {
    applyTranslations(e.detail.translations);
  }
});

// Alternar menú desplegable
function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);

  dropdown.style.display =
    dropdown.style.display === "none" || dropdown.style.display === ""
      ? "block"
      : "none";
}
