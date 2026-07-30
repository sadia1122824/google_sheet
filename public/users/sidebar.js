const sidebarHTML = `
<div class="sidebar" id="sidebar">

  <!-- Logo -->
  <div class="sidebar-header">
    <a href="/liveSheetGraphs">
     <img
  src="/users/icons/image2.png"
  alt="logo"
  data-i18n-alt="logo_alt"
  class="top-bar-logo sidebar-logo"
  onerror="this.style.display='none'"
>
    </a>
  </div>

  <!-- Sidebar Body (SCROLLABLE — nav links + AI card dono is ke andar) -->
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
      <div class="sb-nav-link dropdown-toggle" onclick="toggleDropdown('graphsDropdown')">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="bi bi-bar-chart-line"></i>
          <span data-i18n="graphs">Gráficos</span>
        </div>
        <i class="bi bi-chevron-down dropdown-icon"></i>
      </div>
      <div class="sb-dropdown-menu" id="graphsDropdown" style="display:none;">
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
      <div class="sb-nav-link dropdown-toggle" onclick="toggleDropdown('sheetDropdown')">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="bi bi-table"></i>
          <span data-i18n="google_sheet">Hoja de Google</span>
        </div>
        <i class="bi bi-chevron-down dropdown-icon"></i>
      </div>
      <div class="sb-dropdown-menu" id="sheetDropdown" style="display:none;">
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
      <div class="sb-nav-link dropdown-toggle" onclick="toggleDropdown('debtDropdown')">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="bi bi-cash-stack"></i>
          <span data-i18n="debts">Deudas</span>
        </div>
        <i class="bi bi-chevron-down dropdown-icon"></i>
      </div>
      <div class="sb-dropdown-menu" id="debtDropdown" style="display:none;">
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

    <!-- AI Assistant Card (ab sidebar-body ke andar hai — dropdowns ke sath scroll hoga) -->
    <div class="ai-assistant-card">
      <div class="ai-assistant-header">
        <div class="ai-assistant-icon">
          <img
            src="/users/icons/icon2.png"
            alt="AI Assistant logo"
            class="ai-assistant-icon-img"
            onerror="this.style.display='none'"
          >
        </div>
        <span class="ai-assistant-title" data-i18n="ai_assistant_title">AI Assistant</span>
      </div>
      <p class="ai-assistant-desc" data-i18n="ai_assistant_desc">
        Ask anything about your business or data.
      </p>
   <a href="/AI_Assistant" class="ai-assistant-btn" data-i18n="chat_now">
    Chat Now
</a>
    </div>

  </div>
  <!-- /.sidebar-body -->

  <!-- Bottom User (FIXED — sidebar-body ke bahar, hamesha bottom pa) -->
  <div class="sidebar-footer">

    <div class="user-card" id="userCard" onclick="toggleUserMenu()">
      <div class="user-avatar" id="userAvatar">A</div>
      <div class="user-details">
        <div class="user-name" id="userName">Accountech</div>
        <div class="user-role">Administrator</div>
      </div>
      <i class="bi bi-chevron-down"></i>

      <div class="user-menu" id="userMenu" style="display:none;">
        <a href="#" class="user-menu-item" id="logoutBtn">
          <i class="bi bi-box-arrow-right"></i>
          <span data-i18n="logout">Cerrar sesión</span>
        </a>
      </div>
    </div>

  </div>

</div>
`;

// Render Sidebar
document.getElementById("app").innerHTML = sidebarHTML;

// ---- Client Name (from localStorage) ----
function getClientNameFromStorage() {
  // 1) Agar seedhi si key me client name save hai
  let name =
    localStorage.getItem("clientName") ||
    localStorage.getItem("client_name") ||
    localStorage.getItem("companyName");

  if (name) return name;

  // 2) Agar poora user/client object JSON stringify karke save kiya gaya hai
  const possibleObjectKeys = [
    "userData",
    "user",
    "client",
    "clientData",
    "auth",
  ];

  for (const key of possibleObjectKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      name =
        parsed?.clientName ||
        parsed?.client_name ||
        parsed?.companyName ||
        parsed?.name;

      if (name) return name;
    } catch (e) {
      // JSON nahi tha, ignore
    }
  }

  return null;
}

function applyClientName() {
  const clientName = getClientNameFromStorage() || "Accountech";

  const userNameEl = document.getElementById("userName");
  const userAvatarEl = document.getElementById("userAvatar");

  if (userNameEl) {
    userNameEl.textContent = clientName;
  }

  if (userAvatarEl) {
    userAvatarEl.textContent = clientName.charAt(0).toUpperCase();
  }
}

applyClientName();

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

document.querySelectorAll(".sb-nav-link[href]").forEach((link) => {
  if (link.getAttribute("href") === currentPath) {
    link.classList.add("active");
  }
});

// ---- User Menu Toggle ----
function toggleUserMenu() {
  const menu = document.getElementById("userMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Menu ke bahar click karne pa close ho jaye
document.addEventListener("click", (e) => {
  const userCard = document.getElementById("userCard");
  const userMenu = document.getElementById("userMenu");
  if (userCard && userMenu && !userCard.contains(e.target)) {
    userMenu.style.display = "none";
  }
});

// ---- Logout Handler ----
// ---- Logout Handler ----
document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  try {
    const res = await fetch("/logoutController", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    localStorage.clear();

    if (res.ok) {
      window.location.href = "/webLogin";
    } else {
      console.error("Logout API failed");
      window.location.href = "/webLogin";
    }
  } catch (err) {
    console.error("Logout error:", err);
    localStorage.clear();
    window.location.href = "/webLogin";
  }
});
