/* Configuració pública. Mai hi posis una clau d’OpenAI. */
(() => {
  const params = new URLSearchParams(location.search);
  const queryApi = params.get('api');
  let saved = '';
  try { saved = localStorage.getItem('pantalla-focus-api') || ''; } catch {}
  const sameOrigin = location.origin && location.origin !== 'null' ? location.origin : '';
  window.FOCUSIA_API_URL = (queryApi || saved || (location.hostname.endsWith('github.io') ? '' : sameOrigin)).replace(/\/$/, '');
})();
