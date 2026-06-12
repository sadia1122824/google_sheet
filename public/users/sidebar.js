const sidebarHTML = `
  <div class="sidebar" id="sidebar">

    <div class="sidebar-header">
      <a href="/liveSheetGraphs">
        <img
          src="/users/icons/image1.png"
          alt="logo"
          class="theme-logo top-bar-logo"
          onerror="this.style.display='none'"
        >
      </a>
    </div>

    <div class="sidebar-body">

      <div class="sidebar-section-title">
        <i class="bi bi-compass"></i> Navigation
      </div>

      <!-- Graphs Dropdown -->
      <div class="sb-dropdown">

        <div class="sb-nav-link dropdown-toggle" onclick="toggleDropdown('graphsDropdown')">
          <div style="display:flex; align-items:center; gap:10px;">
            <i class="bi bi-bar-chart-line"></i>
            <span>Graphs</span>
          </div>

          <i class="bi bi-chevron-down dropdown-icon"></i>
        </div>

        <!-- Dropdown Items -->
        <div
          class="sb-dropdown-menu"
          id="graphsDropdown"
          style="display:none; padding-left:15px;"
        >
          <a class="sb-nav-link" href="/liveSheetGraphs">
            <i class="bi bi-dot"></i>
            <span>Live Graphs</span>
          </a>

          <a class="sb-nav-link" href="/previousSheetGraphs">
            <i class="bi bi-dot"></i>
            <span>Previous Graphs</span>
          </a>
        </div>

      </div>

      <!-- Google Sheet Dropdown -->
      <div class="sb-dropdown">

        <div class="sb-nav-link dropdown-toggle" onclick="toggleDropdown('sheetDropdown')">
          <div style="display:flex; align-items:center; gap:10px;">
            <i class="bi bi-table"></i>
            <span>Google Sheet</span>
          </div>

          <i class="bi bi-chevron-down dropdown-icon"></i>
        </div>

        <!-- Dropdown Items -->
        <div
          class="sb-dropdown-menu"
          id="sheetDropdown"
          style="display:none; padding-left:15px;"
        >
          <a class="sb-nav-link" href="/LiveSheetData">
            <i class="bi bi-dot"></i>
            <span>Live Sheet</span>
          </a>

          <a class="sb-nav-link" href="/previousSheetData">
            <i class="bi bi-dot"></i>
            <span>Previous Sheet</span>
          </a>
        </div>

      </div>

    </div>

  </div>
`;

// Render Sidebar
document.getElementById("app").innerHTML = sidebarHTML;

// Toggle Dropdown
function toggleDropdown(dropdownId) {

  const dropdown = document.getElementById(dropdownId);

  dropdown.style.display =
    dropdown.style.display === "none" || dropdown.style.display === ""
      ? "block"
      : "none";
}