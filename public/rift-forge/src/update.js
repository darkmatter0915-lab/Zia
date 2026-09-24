// Hashed asset URLs work immediately, even while an old root worker controls this tab.
// Refresh only an existing Zia worker; never remove saves or another app's worker.
(() => {
 if (!('serviceWorker' in navigator)) return;
 const root = new URL('../', location.href);
 navigator.serviceWorker.getRegistration(root.href).then(registration => {
  if (registration?.scope === root.href) return registration.update();
 }).catch(() => { /* Offline play must not be blocked by an update check. */ });
})();
