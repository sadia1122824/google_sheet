document.addEventListener("DOMContentLoaded", function () {
  const sideNavbar = document.getElementById("side-navbar");
  if (!sideNavbar) return;

  sideNavbar.innerHTML = `
    <div class="left-sidenav">
      <div class="brand">
        <a href="/" class="logo">
          <span>
            <img src="../admin/assets/images/browser_logo/image2.png"
                 class="logo-sm animate__animated animate__flipInY">
          </span>
        </a>
      </div>

      <div class="menu-content h-100" data-simplebar>
        <ul class="metismenu left-sidenav-menu">

          <li class="menu-label mt-0">Principal</li>

          <li>
            <a href="/">
              <i data-feather="home" class="menu-icon"></i>
              <span>Panel de Control</span>
            </a>

            <a href="/staffRecord">
              <i data-feather="user-plus" class="menu-icon"></i>
              <span>Agregar Personal</span>
            </a>

            <a href="/showStaffRecord">
              <i data-feather="users" class="menu-icon"></i>
              <span>Ver Personal</span>
            </a>

            <a href="/AddClients">
              <i data-feather="briefcase" class="menu-icon"></i>
              <span>Agregar Cliente</span>
            </a>

            <a href="/showClients">
              <i data-feather="user-check" class="menu-icon"></i>
              <span>Ver Clientes</span>
            </a>
          </li>

        </ul>
      </div>

      <!-- ===== Sidebar Footer ===== -->
      <div class="sidebar-footer">
        <button type="button" id="logoutBtn" class="logout-btn" style="display:none;">
          <i data-feather="log-out" class="menu-icon"></i>
          <span>Cerrar Sesión</span>
        </button>

        <div class="admin-box" id="adminBox">
          <div class="admin-avatar">
            <i data-feather="user"></i>
          </div>
          <div class="admin-info">
            <span class="admin-name">Administrator</span>
            <small class="admin-role">Admin</small>
          </div>
          <i data-feather="chevron-up" class="admin-arrow" id="adminArrow"></i>
        </div>
      </div>
    </div>
  `;

  // ===== Styles =====
  const style = document.createElement("style");
  style.innerHTML = `
  /* NOTE: .left-sidenav ki position ko touch nahi karna */

  .left-sidenav .menu-content { padding-bottom: 90px; }

  .sidebar-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 12px;
    border-top: 1px solid rgba(255,255,255,0.1);
    background: #0f172a;
  }

  .admin-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .admin-box:hover { background: rgba(255,255,255,0.08); }

  .admin-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #3b82f6;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .admin-avatar svg { width: 18px; height: 18px; }

  .admin-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    line-height: 1.2;
  }
  .admin-name { font-weight: 600; font-size: 14px; color: #fff; }
  .admin-role { opacity: 0.6; font-size: 12px; color: #fff; }

  .admin-arrow {
    width: 16px;
    height: 16px;
    color: #fff;
    transition: transform 0.2s;
  }
  .admin-arrow.rotate { transform: rotate(180deg); }

  .logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    margin-bottom: 8px;
    border: none;
    border-radius: 8px;
    background: #ef4444;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .logout-btn:hover { background: #dc2626; }
  .logout-btn svg { width: 16px; height: 16px; }
`;
  document.head.appendChild(style);

  // Activar iconos Feather
  if (window.feather) feather.replace();

  // ===== Toggle Logout Button =====
  const adminBox = document.getElementById("adminBox");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminArrow = document.getElementById("adminArrow");

  adminBox.addEventListener("click", function () {
    const isHidden = logoutBtn.style.display === "none";
    logoutBtn.style.display = isHidden ? "flex" : "none";
    adminArrow.classList.toggle("rotate", isHidden);
  });

  // ===== Logout Action =====
  logoutBtn.addEventListener("click", async function () {
    try {
      const res = await fetch("/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = "/login";
      } else {
        alert("Logout failed");
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Something went wrong");
    }
  });
});