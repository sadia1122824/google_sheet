document.addEventListener("DOMContentLoaded", function () {
  const sideNavbar = document.getElementById("side-navbar");
  if (!sideNavbar) return;

  sideNavbar.innerHTML = `
    <div class="left-sidenav">
      <div class="brand">
        <a href="/staffDashboard" class="logo">
          <span>
            <img src="../admin/assets/images/browser_logo/image1.png" class="logo-sm">
          </span>
          <span>
           
          </span>
        </a>
      </div>
      
      <div class="menu-content h-100" data-simplebar>
        <ul class="metismenu left-sidenav-menu">

          <li class="menu-label mt-0">Principal</li>

          <li>
            <a href="/staffDashboard">
              <i data-feather="home" class="menu-icon"></i>
              <span>Panel de Control</span>
            </a>
          </li>

          <li>
            <a href="uploadExcell">
              <i data-feather="upload-cloud" class="menu-icon"></i>
              <span>Subir Excel</span>
            </a>
          </li>

          <li>
            <a href="showTable">
              <i data-feather="database" class="menu-icon"></i>
              <span>Ver Excel</span>
            </a>
          </li>

        </ul>
      </div>
    </div>
  `;

  // Activar íconos Feather
  if (window.feather) feather.replace();
});