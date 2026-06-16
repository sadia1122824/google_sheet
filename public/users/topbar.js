function renderTopBar(containerId = "topbar-container") {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = `
    <div class="top-bar">
      
      <button class="hamburger-btn" onclick="toggleSidebar()">
        <i class="bi bi-list"></i>
      </button>

      <a href="/LiveSheetData">
        <img
          src="/users/icons/image1.png"
          alt="logotipo"
          class="theme-logo top-bar-logo"
          onerror="this.style.display='none'"
        >
      </a>

      <span class="top-bar-title"></span>

      <button class="theme-toggle-btn" onclick="toggleTheme()" title="Cambiar tema">
        <span class="icon-dark">🌙</span>
        <span class="icon-light">☀️</span>
      </button>

      <span class="badge-status">
        <i class="bi bi-circle-fill" style="font-size:8px;color:#28a745;"></i>
        <span class="live-text"> Datos en vivo</span>
      </span>

    </div>
  `;
}