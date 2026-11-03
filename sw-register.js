/* Registre del service worker en un fitxer propi perquè funcioni també
   amb una Content-Security-Policy estricta (script-src 'self'). */
(() => {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
})();
