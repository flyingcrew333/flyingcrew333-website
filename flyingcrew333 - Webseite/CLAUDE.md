# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static rebuild of `flyingcrew333.de` (Angela Windbichler — energetic guidance / meditation practice), previously hosted on Wix and now self-hosted on Netlify via GitHub. There is no Node.js on the primary dev machine, so the site is built with a small Python + Jinja2 generator instead of a JS static-site generator — do not introduce a Node toolchain (Eleventy, Astro, etc.) without checking that's actually wanted. The site owner's son runs Claude Code for all code/design changes; the site owner herself edits day-to-day content (hikes, bio text, offer text) directly through a Decap CMS admin panel at `/admin/` — see "Content editing & the CMS" below, since that changes how a session should start.

## Commands

```bash
pip install -r requirements.txt   # jinja2, pyyaml — only two deps
python3 build.py                  # renders content/ + templates/ -> dist/
```

Local preview: serve `dist/` with any static server, e.g. `cd dist && python3 -m http.server 8850`.

There is no test suite and no linter configured. `netlify.toml` runs `pip install -r requirements.txt && python3 build.py` and publishes `dist`.

## Architecture

**Content/template/build split**, not a conventional framework:

- `content/*.yaml` and `content/<collection>/*.yaml` — all page copy and structured data. `site.yaml`, `sitzung.yaml`, and `mein_weg.yaml` are single-file pages. `wanderungen/`, `impulse/`, and `angebote/` are folders with **one file per entry** (not a combined list) — this is required for the Decap CMS admin panel to add/delete entries as separate files. Editing site text means editing these YAML files, not the templates.
- `templates/*.html` — Jinja2 templates. `base.html` is the shared layout (header/nav/footer/Three.js background); every other template `{% extends "base.html" %}`.
- `static/` — CSS (`style.css`), JS (`site.js`), and images; copied verbatim into `dist/assets/`.
- `build.py` — the only build logic. `load_collection(folder)` reads every `*.yaml` in a `content/<folder>/`, derives each entry's URL slug **from its filename** (not a field inside the file — Decap generates the filename from the entry's title, so a slug field in the form could go stale), and sorts by an `order` field. `main()` renders a fixed list of page templates and additionally loops over `angebote`, `wanderungen`, and `impulse` to generate one detail page per entry. Impulse detail pages get `prev`/`next` context computed from list order. Output is always `<path>/index.html` (clean URLs). Also generates `sitemap.xml` and `robots.txt` from the same list of rendered paths.
- `admin/` — Decap CMS (config.yml + index.html), copied into `dist/admin` by `build.py`. See below.
- `build_scripts/` is an empty leftover from initial scaffolding.

**Content fidelity constraint**: this is a faithful rebuild of the client's real, live Wix site — not a copywriting exercise. Body text was deliberately transcribed verbatim from the live site per explicit client instruction, including its original typos/inconsistencies (e.g. "integriet" instead of "integriert" in `sitzung.yaml`, inconsistent capitalization of "du/Du"). Do not "fix" grammar/spelling or rephrase existing copy — only change text when explicitly asked for a specific rewording. Legal/technical text (Impressum hosting section, etc.) is the exception and should stay factually accurate to the actual current hosting setup.

**Design system**: dark theme driven by CSS custom properties at the top of `style.css` (`--void`, `--violet`, `--cyan`, `--ember`, etc.). `static/js/site.js` renders a Three.js wireframe icosahedron + particle field + glow/ember-flare sprites on a fixed `#bg-canvas`, reacting to scroll position and mouse movement. The background is themeable per page via `<body data-bg-theme="...">` (set in `base.html`, passed as `bg_theme` from `build.py`): `sun` for the Sitzung page, and each impulse's own `t1`-`t4` color theme on its detail page — see the `THEMES` map in `site.js`. Scroll-triggered reveals use an `IntersectionObserver` toggling `.reveal.in` — don't wrap long-form body text in `.reveal`, only short/above-the-fold elements (a full-page-height block won't cross the visibility threshold until scrolled well past). The daily-impulse tiles use a CSS 3D flip (front = icon+title, back = photo) triggered on hover. Any image shown via `object-fit:cover`/`background-size:cover` (impulse photos, Mein-Weg photos) supports a per-image `image_position` (or `position`) field of `top`/`center`/`bottom` in its YAML, plugged into inline `object-position`/`background-position` — use this instead of changing image files when a crop cuts off something important.

## Content editing & the CMS

The site owner's mother edits some content herself via Decap CMS at `/admin/`, authenticated through Netlify Identity + Git Gateway (so she commits straight to GitHub, no local checkout). `admin/config.yml` deliberately scopes what she can touch:

- **Wanderungen**: full control (add/edit/delete + photo).
- **Mein Weg**, **Startseite** (just the homepage's "Aktuell" button link/label, not the rest of `site.yaml`): edit only, single file.
- **Angebotsübersicht**, **Tägliche Impulse**: edit existing entries only (`create: false, delete: false`) — adding a new impulse well needs more editorial judgment than the form gives room for.
- Structural/design fields (slugs, icon SVGs, theme colors, ordering) are `widget: hidden` — present in the data, invisible in the form, so there's nothing there to break by accident.

**Every `folder`/`file`/`media_folder` path in `admin/config.yml` is prefixed with `flyingcrew333 - Webseite/`** — see the deployment quirk below for why. Git Gateway reads paths relative to the actual repo root, which is *not* the same thing as Netlify's build-time "Base directory". Get this prefix wrong and the CMS silently shows an empty collection instead of the real entries (it happened once already).

**Before starting any local edit session, sync `content/` from what's actually live on GitHub first** — the mother's CMS saves go straight to GitHub, bypassing the local checkout entirely, and the local git history is unrelated to the GitHub history anyway (see below), so a normal `git pull`/merge doesn't apply. Fetch each file's current content via the GitHub Contents API and overwrite the local copy before editing, e.g.:

**Caveat learned the hard way**: this sync is only safe when the local working tree has no commits ahead of what's already uploaded. If a previous session committed content changes locally that the son hasn't uploaded to GitHub yet, blindly syncing will silently overwrite that work with the older GitHub state (git history keeps it, but the working tree loses it until you notice and `git checkout -- content/` to restore from HEAD). Before syncing, check whether `git status` is clean against the last local commit and whether that commit's content changes have actually been uploaded — if unsure, ask rather than assume GitHub is ahead.

```python
import urllib.request, urllib.parse, json, base64, os
REPO = "flyingcrew333/flyingcrew333-website"
REMOTE_PREFIX = "flyingcrew333 - Webseite/content"
# GET https://api.github.com/repos/{REPO}/contents/{urllib.parse.quote(path)}?ref=main
# walk REMOTE_PREFIX recursively, base64-decode each file, overwrite content/<same path>
```
(A working version of this loop has been run from this repo before — search recent git history/session context rather than re-deriving it from scratch.) Skipping this risks a later "upload the whole folder" clobbering a change she made in the meantime.

## Deployment quirk (important)

Because the initial GitHub upload was done by dragging the whole local project folder into GitHub's web upload UI (no `git push` access was set up), the repo's actual file layout has everything nested one level deeper than normal, under a folder literally named `flyingcrew333 - Webseite/` (with spaces) at the repo root — e.g. `flyingcrew333 - Webseite/build.py`, not `build.py` at repo root. Netlify's site settings compensate for this with **Base directory = `flyingcrew333 - Webseite`**. The local git repo (this checkout) does *not* have that extra nesting — its own root is what's nested one level down on GitHub. Keep this in mind before assuming a standard repo-root layout when reasoning about CI/deploy config or writing CMS paths.

Updates to the live site are pushed by re-uploading the same local project folder through GitHub's web UI (same nested path), then manually clicking **"Trigger deploy" → "Deploy site"** in Netlify if the automatic build shows as "Canceled" — GitHub sometimes retries the webhook delivery for large uploads, and Netlify cancels the resulting duplicate-looking build rather than completing it.

Because of the web-upload flow, **local git history and the GitHub repo's history are unrelated graphs** (`git merge-base --is-ancestor <local commit> origin/main` fails) — don't expect `git pull`/`fetch`+merge to work normally against `origin/main`. Local commits are still worth making for the son's own history/reference, just don't rely on git to reconcile the two sides; use the content-sync approach above instead.
