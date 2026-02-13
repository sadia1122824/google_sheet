document.addEventListener("DOMContentLoaded", function () {

  const sideNavbar = document.getElementById("side-navbar");
  if (!sideNavbar) return;

  sideNavbar.innerHTML = `
    <div class="left-sidenav">
      <div class="brand">
        <a href="/login" class="logo">
          <span>
            <img src="../admin/assets/images/browser_logo/img1.jpeg" class="logo-sm">
          </span>
          <span>
           
          </span>
        </a>
      </div>
      
      <div class="menu-content h-100" data-simplebar>
        <ul class="metismenu left-sidenav-menu">

          <li class="menu-label mt-0">Main</li>

        

           <li>
  <a href="/dataUpload">
    <i data-feather="upload" class="menu-icon"></i>  <!-- valid feather icon -->
    <span>Upload Excel Data</span>
  </a>
</li>

  


        </ul>
      </div>
    </div>
  `;

  // Feather icons activate
  if (window.feather) feather.replace();
});
