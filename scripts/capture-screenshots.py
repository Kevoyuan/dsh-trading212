import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
preview_path = root / "preview-redesign-en.html"
images_dir = root / "docs" / "images"
images_dir.mkdir(parents=True, exist_ok=True)

url = f"file://{preview_path}"

with sync_playwright() as p:
    browser = p.chromium.launch()
    
    # 1. Desktop capture (1440 x 960, 2x DPR)
    page = browser.new_page(
        viewport={"width": 1440, "height": 960},
        device_scale_factor=2,
    )
    page.goto(url)
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)
    
    desktop_output = images_dir / "dashboard-desktop-en.png"
    page.screenshot(path=str(desktop_output), full_page=False)
    print(f"Captured desktop screenshot: {desktop_output} ({desktop_output.stat().st_size} bytes)")

    desktop_full_output = images_dir / "dashboard-desktop-full-en.png"
    page.screenshot(path=str(desktop_full_output), full_page=True)
    print(f"Captured desktop full screenshot: {desktop_full_output} ({desktop_full_output.stat().st_size} bytes)")
    page.close()

    # 2. Privacy mode full capture
    privacy_page = browser.new_page(
        viewport={"width": 1440, "height": 1000},
        device_scale_factor=2,
    )
    privacy_page.goto(url)
    privacy_page.wait_for_load_state("networkidle")
    privacy_page.click("#eyeBtn")
    time.sleep(0.3)
    privacy_output = images_dir / "dashboard-privacy-en.png"
    privacy_page.screenshot(path=str(privacy_output), full_page=True)
    print(f"Captured privacy screenshot: {privacy_output} ({privacy_output.stat().st_size} bytes)")
    privacy_page.close()

    # 3. Mobile capture (390 x 844, 2x DPR)
    mobile_page = browser.new_page(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    mobile_page.goto(url)
    mobile_page.wait_for_load_state("networkidle")
    time.sleep(0.5)

    mobile_output = images_dir / "dashboard-mobile-en.png"
    mobile_page.screenshot(path=str(mobile_output), full_page=False)
    print(f"Captured mobile screenshot: {mobile_output} ({mobile_output.stat().st_size} bytes)")
    mobile_page.close()

    browser.close()

print("All screenshots captured successfully.")
