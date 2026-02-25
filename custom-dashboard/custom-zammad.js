(function () {
  // Hide Group Selection for Customers globally via injected CSS
  fetch('/api/v1/users/me')
    .then(res => res.json())
    .then(user => {
      if (user && user.role_ids) {
        const isAgentOrAdmin = user.role_ids.includes(1) || user.role_ids.includes(2);
        if (!isAgentOrAdmin) {
          // 1. Inject aggressive CSS
          const style = document.createElement('style');
          style.innerHTML = `
            .form-group[data-attribute-name="group_id"],
            div[data-attribute-name="group_id"],
            .ticket-group-container,
            label[for="group_id"],
            label[for="group_id"] + * {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              width: 0 !important;
              position: absolute !important;
              pointer-events: none !important;
            }
          `;
          document.head.appendChild(style);

          // 2. Continuous DOM purging (Zammad dynamically re-renders views)
          setInterval(() => {
            const groupFields = document.querySelectorAll('.form-group[data-attribute-name="group_id"], div[data-attribute-name="group_id"]');
            groupFields.forEach(el => {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.position = 'absolute';
              if (el.parentElement && el.parentElement.classList.contains('form-group')) {
                el.parentElement.style.display = 'none';
              }
            });
          }, 500);
        }
      }
    })
    .catch(e => console.error("Could not fetch user role", e));

  // Global Audio Notification Alert for all Zammad Portals
  let lastNotifCount = null;
  // A clean, generic short positive "ding" sound 
  const notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

  function checkAudioAlert() {
    const counterBadge = document.querySelector('.activity-counter.js-notificationsCounter');
    if (!counterBadge) return;

    if (counterBadge.style.display === 'none') {
      lastNotifCount = 0;
      return;
    }

    const currentCount = parseInt(counterBadge.textContent.trim()) || 0;

    // If the count goes up, and we've already initialized (lastNotifCount !== null), play sound
    if (lastNotifCount !== null && currentCount > lastNotifCount) {
      notifSound.play().catch(e => console.log('Zammad Audio Autoplay Blocked:', e));
    }

    lastNotifCount = currentCount;
  }

  setInterval(checkAudioAlert, 2000);

  // Forcefully intercept Zammad's Single-Page-App native routing
  // so it cannot render the default Zammad Dashboard if the user clicks the logo
  setInterval(() => {
    if (window.location.pathname === '/' && (window.location.hash === '' || window.location.hash === '#' || window.location.hash === '#dashboard')) {
      window.location.replace('/dashboard/');
    }
  }, 300);

})();
