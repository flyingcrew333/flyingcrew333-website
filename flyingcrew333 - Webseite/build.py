#!/usr/bin/env python3
"""Static site generator for flyingcrew333.de — no Node.js required.

Reads YAML content from content/, renders Jinja2 templates from templates/,
and writes the finished site to dist/. Copies static/ (css, js, images) and
admin/ (Decap CMS) as-is.

Usage: python3 build.py
"""
import shutil
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
ADMIN = ROOT / "admin"
DIST = ROOT / "dist"

BASE_URL = ""  # root-relative paths; set e.g. to "" for a custom domain at the root


def load_yaml(name):
    with open(CONTENT / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def write_page(env, template_name, out_path, **context):
    template = env.get_template(template_name)
    html = template.render(base_url=BASE_URL, **context)
    out_file = DIST / out_path / "index.html"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(html, encoding="utf-8")
    print(f"  {out_path or '/'}")


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    site = load_yaml("site.yaml")
    angebote = load_yaml("angebote.yaml")
    wanderungen = load_yaml("wanderungen.yaml")
    impulse = load_yaml("impulse.yaml")
    sitzung = load_yaml("sitzung.yaml")

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

    print("Rendering pages:")
    write_page(env, "index.html", "", site=site, page_url="/")
    write_page(env, "mein-weg.html", "mein-weg", site=site, page_url="/mein-weg/")
    write_page(env, "angebotsuebersicht.html", "angebotsuebersicht", site=site,
               angebote=angebote, page_url="/angebotsuebersicht/")
    write_page(env, "sitzung.html", "wie-laeuft-eine-sitzung-ab", site=site,
               sitzung=sitzung, page_url="/wie-laeuft-eine-sitzung-ab/")
    write_page(env, "impressum.html", "impressum", site=site, page_url="/impressum/")

    write_page(env, "wanderungen_index.html", "wanderungen", site=site,
               wanderungen=wanderungen, page_url="/wanderungen/")
    for w in wanderungen:
        write_page(env, "wanderung_detail.html", f"wanderungen/{w['slug']}",
                   site=site, w=w, page_url="/wanderungen/")

    write_page(env, "tagliche_impulse.html", "tagliche-impulse", site=site,
               impulse=impulse, page_url="/tagliche-impulse/")
    n = len(impulse)
    for i, imp in enumerate(impulse):
        prev_imp = impulse[(i - 1) % n]
        next_imp = impulse[(i + 1) % n]
        write_page(env, "impuls_detail.html", f"tagliche-impulse/{imp['slug']}",
                   site=site, imp=imp, prev=prev_imp, next=next_imp,
                   page_url="/tagliche-impulse/")

    # static assets
    shutil.copytree(STATIC, DIST / "assets")

    # Decap CMS admin panel
    if ADMIN.exists():
        shutil.copytree(ADMIN, DIST / "admin")

    print(f"\nDone. Output in {DIST}")


if __name__ == "__main__":
    main()
