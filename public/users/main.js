// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
   navigator.serviceWorker.register('/users/sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('SW failed', err));
  });
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.style.display = 'block';

    installBtn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        console.log(choiceResult.outcome); // accepted / dismissed
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    });
  }
});


window.addEventListener('DOMContentLoaded', () => {
  const card = document.querySelector('.login-card');
  setTimeout(() => {
    card.classList.add('animate-in');
  }, 100);

  const loginForm = document.querySelector(".login-card form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const useremail = loginForm.querySelector('input[type="text"]').value.trim();
    const userpassword = loginForm.querySelector('input[type="password"]').value.trim();

    if (!useremail || !userpassword) {
      Swal.fire({ icon: "warning", title: "Please fill all fields", toast:true, position:"top-end", timer:2000, timerProgressBar:true });
      return;
    }

    try {
      const res = await fetch("/webLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useremail, userpassword })
      });

      const data = await res.json();

      if (data.success) {
        loginForm.querySelector('input[type="text"]').value = "";
        loginForm.querySelector('input[type="password"]').value = "";

        Swal.fire({ icon: "success", title: data.message, toast:true, position:"top-end", timer:2000, timerProgressBar:true })
          .then(() => window.location.href = "/previousSheetData");
      } else {
        Swal.fire({ icon: "error", title: data.message, toast:true, position:"top-end", timer:2000, timerProgressBar:true });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Something went wrong", toast:true, position:"top-end", timer:2000, timerProgressBar:true });
    }
  });
});