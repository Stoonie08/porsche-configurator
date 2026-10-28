# Security and publishing

This is a public static portfolio site, not an account or payment service.
Do not submit credentials or personal information in GitHub issues.

## Publish only the website

- Keep Maya/USD scenes and source art outside this repository.
- Run `npm ci`, `npm audit --audit-level=high`, and `npm run build` before publishing.
- The build checks tracked/public filenames and common credential signatures.
  This is a guardrail, not a comprehensive secret scanner or history audit.
- GitHub Pages deploys `dist`, not the full repository. Everything in `public`
  is copied into that public build, including unreferenced files.
- `.gitignore` does not remove files already committed. Removing files in a new
  commit does not remove earlier versions from public Git history.
- Never store secrets in browser code, Vite environment variables, or public assets.

## Current browser protections

Production HTML includes a Content Security Policy that allows application
scripts only from this origin, restricts network requests, and blocks plugins,
forms, and base-URL overrides. Data/blob image sources are necessary for embedded
GLB textures. Inline styles remain allowed because the viewer uses dynamic styles.
The local Vite development server removes the production CSP for HMR; production
builds retain it. Referrer metadata uses `no-referrer` on both HTML pages.

GitHub Pages already serves HTTPS and HSTS on the inspected github.io site.
Its ordinary repository deployment does not provide a per-repository way to set
arbitrary response headers. A `_headers` file does not configure GitHub Pages.
These protections are **not implemented by HTML meta tags**:

- CSP `frame-ancestors 'none'` (or an explicit allowlist if intentional embedding is needed)
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

To add these, use a hosting layer that supports response headers. Do not describe
them as active until verified against the deployed responses. The CSP does not
prevent downloading public assets and is not a guarantee against every attack.

## Account settings the owner must verify

- Enable MFA/passkeys for GitHub and any domain account; save recovery codes safely.
- Review repository collaborators, Actions secrets, and deployment access.
- Enable GitHub secret scanning/push protection where available, Dependabot alerts,
  and private vulnerability reporting in repository settings.
- Review and merge dependency-update PRs after checks pass; do not auto-merge blindly.
- Keep a known-good release for rollback. If a credential is ever exposed, revoke
  or rotate it first; deleting the file is not sufficient.

## Privacy and rights

The privacy page documents the three browser storage keys and GitHub hosting logs.
It does not add analytics, cookies, or a consent-management provider. Reassess the
notice and any consent requirements before adding tracking or third-party services.
The browser-storage clear button removes only this project's keys.

The portfolio disclaimer does not grant asset licenses or settle trademark rights.
Verify rights for the model, textures, HDRIs, fonts, photos, and Porsche branding,
including permission for web delivery. No asset license has been inferred or added.

References:
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- https://vite.dev/guide/env-and-mode
