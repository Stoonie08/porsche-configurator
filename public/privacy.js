const keys = [
  'porsche-ui-theme',
  'porsche-configurator-hdri',
  'porsche-camera-views-v1',
];

document.querySelector('#clear-preferences').addEventListener('click', () => {
  const result = document.querySelector('#clear-result');
  try {
    for (const key of keys) localStorage.removeItem(key);
    result.textContent = 'Saved preferences cleared. Reload the configurator to use its defaults.';
  } catch {
    result.textContent = 'Your browser blocked storage access. Clear this site’s storage in your browser settings instead.';
  }
});
