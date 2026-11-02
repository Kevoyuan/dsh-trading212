"""Capture the README hero screenshot.

Two sources:

- default: the hand-maintained design preview (`preview-redesign-en.html`)
- live: the running plugin, which is what the README shows:

    python3 scripts/capture-screenshots.py \
      --url "http://127.0.0.1:60597/trading212/?dshLocale=en"

Live captures need a dsh instance with the plugin mounted and demo credentials
saved (the T212 tab's own page lives at /trading212/). Captures are 1440 x 960
at 2x for the desktop shots and 390 x 844 at 2x for mobile.
"""

import argparse
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent

parser = argparse.ArgumentParser()
parser.add_argument("--url", default=f"file://{root / 'preview-redesign-en.html'}")
parser.add_argument("--out", default=str(root / "docs" / "images"))
args = parser.parse_args()

url = args.url
images_dir = Path(args.out)
images_dir.mkdir(parents=True, exist_ok=True)


def settle(page, seconds=1.0):
    page.wait_for_load_state("networkidle")
    time.sleep(seconds)


def set_theme(page, theme):
    page.evaluate("(t) => document.documentElement.setAttribute('data-theme', t)", theme)
    time.sleep(0.4)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # Desktop, light theme: viewport and full page (the README hero).
    page = browser.new_page(viewport={"width": 1440, "height": 960}, device_scale_factor=2)
    page.goto(url)
    settle(page, 3.0)
    set_theme(page, "light")
    page.screenshot(path=str(images_dir / "dashboard-desktop-en.png"), full_page=False)
    page.screenshot(path=str(images_dir / "dashboard-desktop-full-en.png"), full_page=True)
    print("captured desktop light (viewport + full page)")
    page.close()

    # Mobile, light theme.
    mobile = browser.new_page(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    mobile.goto(url)
    settle(mobile, 3.0)
    set_theme(mobile, "light")
    mobile.screenshot(path=str(images_dir / "dashboard-mobile-en.png"), full_page=False)
    print("captured mobile light")
    mobile.close()

    browser.close()

print("All screenshots captured successfully.")
