import './loading-screen.css';

export function createLoadingScreen() {
  const screen = document.createElement('div');
  screen.className = 'porsche-loading-screen';
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-label', 'Loading configurator');
  screen.innerHTML = `
    <img class="porsche-loading-header-logo" src="${import.meta.env.BASE_URL}branding/porsche-logo-loading_screen-01.jpg" alt="" width="1000" height="352">
    <div class="porsche-loading-content">
      <p class="porsche-loading-status" role="status">Loading your</p>
      <div class="porsche-loading-wordmark">
        <img src="${import.meta.env.BASE_URL}branding/porsche-loading_screen-01.jpg" alt="Porsche" width="1000" height="352">
      </div>
      <img class="porsche-loading-model-logo" src="${import.meta.env.BASE_URL}branding/911-turbo-s.png" alt="" role="img" aria-label="911 Turbo S" width="458" height="54">
      <div class="porsche-loading-pulse" role="progressbar" aria-label="Loading configurator"><span></span></div>
      <p class="porsche-loading-detail">Preparing your configurator</p>
      <div class="porsche-loading-actions" hidden>
        <button type="button" data-retry>Try again</button>
        <button type="button" data-close>Close</button>
      </div>
    </div>`;
  document.body.append(screen);
  const app = document.querySelector('#app');
  const wasInert = app?.inert || false;
  if (app) app.inert = true;
  const bar = screen.querySelector('.porsche-loading-pulse');
  const title = screen.querySelector('.porsche-loading-status');
  const detail = screen.querySelector('.porsche-loading-detail');
  const headerLogo = document.querySelector('.header-porsche-logo');
  const topLogo = screen.querySelector('.porsche-loading-header-logo');
  function alignHeaderLogo() {
    if (!headerLogo) { topLogo.hidden = true; return; }
    const rect = headerLogo.getBoundingClientRect();
    topLogo.hidden = rect.width === 0 || rect.height === 0;
    // Align directly with the current header image; no extra vertical offset.
    topLogo.style.left = `${rect.left}px`;
    topLogo.style.top = `${rect.top}px`;
    topLogo.style.width = `${rect.width}px`;
  }
  const observer = new ResizeObserver(alignHeaderLogo);
  if (headerLogo) {
    observer.observe(headerLogo);
    if (headerLogo.parentElement) observer.observe(headerLogo.parentElement);
    headerLogo.addEventListener('load', alignHeaderLogo);
  }
  window.addEventListener('resize', alignHeaderLogo);
  window.addEventListener('scroll', alignHeaderLogo, true);
  alignHeaderLogo();
  let finished = false;
  let timer;
  let disposed = false;
  function onFadeEnd(event) {
    if (event.target === screen && event.propertyName === 'opacity') dispose();
  }
  function beginFade() {
    if (disposed) return;
    bar.setAttribute('aria-valuetext', 'Ready');
    title.textContent = 'Ready to explore';
    detail.textContent = '';
    alignHeaderLogo();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dispose();
      return;
    }
    screen.addEventListener('transitionend', onFadeEnd);
    screen.classList.add('is-complete');
    // Fallback if the browser cancels or does not report the transition.
    timer = setTimeout(dispose, 3000);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    finished = true;
    screen.removeEventListener('transitionend', onFadeEnd);
    clearTimeout(timer);
    observer.disconnect();
    headerLogo?.removeEventListener('load', alignHeaderLogo);
    window.removeEventListener('resize', alignHeaderLogo);
    window.removeEventListener('scroll', alignHeaderLogo, true);
    if (app) app.inert = wasInert;
    screen.remove();
  }
  screen.querySelector('[data-retry]').onclick = () => location.reload();
  screen.querySelector('[data-close]').onclick = dispose;
  return {
    progress(event) {
      if (finished) return;
      if (event.total > 0) {
        const percent = Math.min(100, Math.round(event.loaded / event.total * 100));
        bar.setAttribute('aria-valuetext', `Model download ${percent}%`);
        detail.textContent = percent < 100 ? `Downloading model · ${percent}%` : 'Preparing materials and scene';
      } else {
        bar.setAttribute('aria-valuetext', 'Downloading model');
        detail.textContent = 'Downloading model';
      }
    },
    ready() {
      if (finished) return;
      finished = true;
      beginFade();
    },
    error(message) {
      if (finished) return;
      finished = true;
      title.textContent = 'Unable to load';
      detail.textContent = message;
      bar.hidden = true;
      screen.querySelector('.porsche-loading-actions').hidden = false;
      screen.querySelector('[data-retry]').focus();
    },
    dispose
  };
}
