document.addEventListener("DOMContentLoaded", function () {
  const sideNavbar = document.getElementById("side-navbar");
  if (!sideNavbar) return;

  sideNavbar.innerHTML = `
    <div class="left-sidenav">
      <div class="brand">
        <a href="/login" class="logo">
          <span>
            <img src="../admin/assets/images/browser_logo/image1.png" class="logo-sm">
          </span>
          <span>
           
          </span>
        </a>
      </div>
      
      <div class="menu-content h-100" data-simplebar>
        <ul class="metismenu left-sidenav-menu">

          <li class="menu-label mt-0">Main</li>

        

        <li>
  <a href="/">
    <i data-feather="home" class="menu-icon"></i>
    <span>Dashboard</span>
  </a>

  <a href="/staffRecord">
    <i data-feather="user-plus" class="menu-icon"></i>
    <span>Add Staff</span>
  </a>

  <a href="/showStaffRecord">
    <i data-feather="users" class="menu-icon"></i>
    <span>Show Staff</span>
  </a>

  <a href="/AddClients">
    <i data-feather="briefcase" class="menu-icon"></i>
    <span>Add Client</span>
  </a>

  <a href="/showClients">
    <i data-feather="user-check" class="menu-icon"></i>
    <span>Show Clients</span>
  </a>
</li>
  


        </ul>
      </div>
    </div>
  `;

  // Feather icons activate
  if (window.feather) feather.replace();
});
