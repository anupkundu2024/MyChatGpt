// Runs before the app renders so the page never flashes the wrong theme.
// A separate file (not inline) so it passes the production Content-Security-Policy.
// Keep the storage key and logic in sync with src/store/uiStore.js.
(function () {
  var theme;
  try {
    theme = localStorage.getItem('theme');
  } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = theme;
})();
