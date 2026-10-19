// Supplied luminance masks: white reveals, black hides, gray softens edges.
const brandingRoot = `${import.meta.env.BASE_URL}branding/`;
for (const [name, file] of Object.entries({
  'header-crest-mask': 'porsche-logo-01_mask.jpg',
  'loading-crest-mask': 'porsche-logo-loading_screen-01_mask.jpg',
  'porsche-wordmark-mask': 'porsche-loading_screen-01_mask.jpg',
  'turbo-wordmark-mask': '911-turbo-s_mask.jpg'
})) document.documentElement.style.setProperty(`--${name}`, `url("${brandingRoot}${file}")`);

const STORAGE_KEY = 'porsche-ui-theme';
const choices = new Set(['system', 'light', 'dark']);
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let preference = 'system';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (choices.has(saved)) preference = saved;
} catch { /* Theme still works when browser storage is unavailable. */ }
let selector = null;
function applyTheme() {
  const resolved = preference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  if (selector) selector.value = preference;
}
// Run before createUI inserts the interface.
applyTheme();
function onSystemChange() { if (preference === 'system') applyTheme(); }
function onStorage(event) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  preference = choices.has(event.newValue) ? event.newValue : 'system';
  applyTheme();
}
systemTheme.addEventListener('change', onSystemChange);
window.addEventListener('storage', onStorage);
export function bindThemeSelector(element) {
  if (selector) selector.removeEventListener('change', onSelection);
  selector = element;
  if (!selector) return;
  selector.value = preference;
  selector.addEventListener('change', onSelection);
}
function onSelection(event) {
  if (!choices.has(event.target.value)) return;
  preference = event.target.value;
  try { localStorage.setItem(STORAGE_KEY, preference); } catch {}
  applyTheme();
}
if (import.meta.hot) import.meta.hot.dispose(() => {
  systemTheme.removeEventListener('change', onSystemChange);
  window.removeEventListener('storage', onStorage);
  selector?.removeEventListener('change', onSelection);
});
