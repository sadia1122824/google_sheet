document.addEventListener("DOMContentLoaded", function () {
  const sideNavbar = document.getElementById("side-navbar");
  if (!sideNavbar) return;

  sideNavbar.innerHTML = `
    <div class="left-sidenav">
      <div class="brand">
        <a href="/" class="logo">
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
    </div>
  `;

  // Activar iconos Feather
  if (window.feather) feather.replace();
});