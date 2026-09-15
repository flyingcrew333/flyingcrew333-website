# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static rebuild of `flyingcrew333.de` (Angela Windbichler — energetic guidance / meditation practice), previously hosted on Wix and now self-hosted on Netlify via GitHub. There is no Node.js on the primary dev machine, so the site is built with a small Python + Jinja2 generator instead of a JS static-site generator — do not introduce a Node toolchain (Eleventy, Astro, etc.) without checking that's actually wanted.

## Commands

```bash
pip install -r requirements.txt   # jinja2, pyyaml — only two deps
python3 build.py                  # renders content/ + templates/ -> dist/
```

Local preview: serve `dist/` with any static server, e.g. `cd dist && python3 -m http.server 8850`.

There is no test suite and no linter configured. `netlify.toml` runs `pip install -r requirements.txt && python3 build.py` and publishes `dist`.

## Architecture

**Content/template/build split**, not a conventional framework:

- `content/*.yaml` — all page copy and structured data (`site.yaml` for nav/contact/impressum boilerplate, `angebote.yaml`, `wanderungen.yaml`, `impulse.yaml`, `sitzung.yaml`). Editing site text means editing these YAML files, not the templates.
- `templates/*.html` — Jinja2 templates. `base.html` is the shared layout (header/nav/footer/Three.js background); every other template `{% extends "base.html" %}`.
- `static/` — CSS (`style.css`), JS (`site.js`), and images; copied verbatim into `dist/assets/`.
- `build.py` — the only build logic. Loads each YAML file, renders a fixed list of page templates, and additionally loops over `angebote`, `wanderungen`, and `impulse` to generate one detail page per entry (`/angebotsuebersicht/<slug>/`, `/wanderungen/<slug>/`, `/tagliche-impulse/<slug>/`). Impulse detail pages get `prev`/`next` context computed from list order for the prev/next nav links. Output is always `<path>/index.html` (clean URLs via directory-style output).
- `admin/` (Decap CMS) is referenced in `build.py` (copied into `dist/admin` if present) but does not exist yet — this is planned so the client's mother can self-edit `wanderungen`/`impulse` content without touching code, not yet built.
- `build_scripts/` is an empty leftover from initial scaffolding.

**Content fidelity constraint**: this is a faithful rebuild of the client's real, live Wix site — not a copywriting exercise. All body text in `content/*.yaml` was deliberately transcribed verbatim from the live site per explicit client instruction, including its original typos/inconsistencies (e.g. "integriet" instead of "integriert" in `sitzung.yaml`, inconsistent capitalization of "du/Du"). Do not "fix" grammar/spelling or rephrase existing copy — only change text when the client explicitly asks for a specific rewording. Legal/technical text (Impressum hosting section, etc.) is the exception and should stay factually accurate to the actual current hosting setup.

**Design system**: dark theme driven by CSS custom properties at the top of `style.css` (`--void`, `--violet`, `--cyan`, `--ember`, etc.). `static/js/site.js` renders a Three.js wireframe icosahedron + particle field on a fixed `#bg-canvas`, reacting to scroll position and mouse movement — shared across all pages via `base.html`. Scroll-triggered reveals use an `IntersectionObserver` toggling `.reveal.in`. The daily-impulse tiles (`tagliche_impulse.html`) use a CSS 3D flip (front = icon+title, back = photo + "Klicken, um mehr zu sehen") triggered on hover.

**Images**: sourced from the original Wix site's `static.wixstatic.com` CDN, then resized/compressed for web use with macOS's built-in `sips` (no ImageMagick/Pillow pipeline for this) into `static/images/` and `static/images/impulse/`.

## Deployment quirk (important)

Because the initial GitHub upload was done by dragging the whole local project folder into GitHub's web upload UI (no `git push` access was set up), the repo's actual file layout has everything nested one level deeper than normal, under a folder literally named `flyingcrew333 - Webseite/` (with spaces) at the repo root — e.g. `flyingcrew333 - Webseite/build.py`, not `build.py` at repo root. Netlify's site settings compensate for this with **Base directory = `flyingcrew333 - Webseite`**. Keep this in mind before assuming a standard repo-root layout when reasoning about CI/deploy config.

Updates to the live site are pushed by re-uploading the same local project folder through GitHub's web UI (same nested path), then manually clicking **"Trigger deploy" → "Deploy site"** in Netlify — the GitHub→Netlify webhook has not reliably auto-triggered for this repo via that upload path.
