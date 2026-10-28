import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: '/porsche-configurator/',
  plugins: command === 'serve' ? [{
    // Vite's local HMR uses an injected script and WebSocket. Keep the strict
    // policy in production output; do not weaken it for the public site.
    name: 'local-development-csp',
    transformIndexHtml(html) {
      return html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
    },
  }] : [],
}));
