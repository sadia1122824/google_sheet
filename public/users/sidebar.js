const sidebarHTML = `
  <div class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <a href="/webLogin">
        <img src="/users/icons/image1.png" alt="logo" class="top-bar-logo" onerror="this.style.display='none'">
      </a>
    </div>

    <div class="sidebar-body">
      <div class="sidebar-section-title">
        <i class="bi bi-compass"></i> Navigation
      </div>

      <!-- Dropdown Parent -->
      <div class="sb-dropdown">
        <div class="sb-nav-link dropdown-toggle" onclick="toggleDropdown()">
          <i class="bi bi-table"></i> Sheet Data
          <i class="bi bi-chevron-down" style="float:right;"></i>
        </div>

        <!-- Dropdown Items -->
        <div class="sb-dropdown-menu" id="sheetDropdown" style="display:none; padding-left:15px;">
          <a class="sb-nav-link" href="/LiveSheetData">
            <i class="bi bi-dot"></i> Live Sheet
          </a>
          <a class="sb-nav-link" href="/previousSheetData">
            <i class="bi bi-dot"></i> Previous Sheet
          </a>
        </div>
      </div>

    </div>
  </div>
`;

// render
document.getElementById("app").innerHTML = sidebarHTML;

// toggle function
function toggleDropdown() {
  const dropdown = document.getElementById("sheetDropdown");
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
}