#!/usr/bin/env python3
"""Static site generator for flyingcrew333.de — no Node.js required.

Reads YAML content from content/, renders Jinja2 templates from templates/,
and writes the finished site to dist/. Copies static/ (css, js, images) and
admin/ (Decap CMS) as-is.

Usage: python3 build.py
"""
import shutil
import time
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


def load_collection(folder):
    """Load every *.yaml file in content/<folder>/ as one list, sorted by
    each item's `order` field (falls back to filename) — this is what lets
    the Decap CMS admin panel add/remove entries as separate files while
    the site still renders them in a stable, intentional order.

    The URL slug always comes from the filename, not a field inside the
    file: Decap generates the filename from the entry's title when the
    editor creates a new one, so this is what actually stays correct for
    entries she adds herself (a `slug` field in the form could easily be
    left blank or made inconsistent with the on-disk filename)."""
    items = []
    for path in sorted((CONTENT / folder).glob("*.yaml")):
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        data["slug"] = path.stem
        items.append(data)
    items.sort(key=lambda x: (x.get("order", 999), x.get("slug", "")))
    return items


ALL_PAGE_PATHS = []  # collected for sitemap.xml


def write_page(env, template_name, out_path, **context):
    url_path = f"/{out_path}/" if out_path else "/"
    ALL_PAGE_PATHS.append(url_path)
    site = context.get("site", {})
    canonical_url = site.get("domain", "") + url_path

    template = env.get_template(template_name)
    html = template.render(base_url=BASE_URL, canonical_url=canonical_url, **context)
    out_file = DIST / out_path / "index.html"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(html, encoding="utf-8")
    print(f"  {out_path or '/'}")


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    site = load_yaml("site.yaml")
    site["build_version"] = str(int(time.time()))  # cache-busts static/css/js on every build
    angebote = load_collection("angebote")
    wanderungen = load_collection("wanderungen")
    impulse = load_collection("impulse")
    sitzung = load_yaml("sitzung.yaml")
    mein_weg = load_yaml("mein_weg.yaml")

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)), autoescape=True)

    print("Rendering pages:")
    write_page(env, "index.html", "", site=site, page_url="/")
    write_page(env, "mein-weg.html", "mein-weg", site=site, mein_weg=mein_weg, page_url="/mein-weg/")
    write_page(env, "angebotsuebersicht.html", "angebotsuebersicht", site=site,
               angebote=angebote, page_url="/angebotsuebersicht/")
    for offer in angebote:
        write_page(env, "angebot_detail.html", f"angebotsuebersicht/{offer['slug']}",
                   site=site, offer=offer, page_url="/angebotsuebersicht/")
    write_page(env, "sitzung.html", "wie-laeuft-eine-sitzung-ab", site=site,
               sitzung=sitzung, page_url="/wie-laeuft-eine-sitzung-ab/", bg_theme="sun")
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
                   page_url="/tagliche-impulse/", bg_theme=imp["theme"])

    # static assets
    shutil.copytree(STATIC, DIST / "assets")

    # Decap CMS admin panel
    if ADMIN.exists():
        shutil.copytree(ADMIN, DIST / "admin")

    write_sitemap(site["domain"])
    write_robots(site["domain"])

    print(f"\nDone. Output in {DIST}")


def write_sitemap(domain):
    urls = "\n".join(
        f"  <url><loc>{domain}{path}</loc></url>" for path in ALL_PAGE_PATHS
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n"
        "</urlset>\n"
    )
    (DIST / "sitemap.xml").write_text(xml, encoding="utf-8")
    print(f"  sitemap.xml ({len(ALL_PAGE_PATHS)} URLs)")


def write_robots(domain):
    txt = f"User-agent: *\nAllow: /\n\nSitemap: {domain}/sitemap.xml\n"
    (DIST / "robots.txt").write_text(txt, encoding="utf-8")
    print("  robots.txt")


if __name__ == "__main__":
    main()
