"""cartographer.html 的改动验证：计算样式 + 动态标签逻辑 + 截图。

按 tasteskill 的要求「用证据验证，不靠猜」，这里不只看截图，
还直接读取 computed style 确认分隔线与主题行为真的生效。
"""
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
page_path = root / "design-demos" / "cartographer.html"
shots = root / "design-demos" / "shots"
shots.mkdir(parents=True, exist_ok=True)
url = f"file://{page_path}"

fails = []


def check(label, cond, detail=""):
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {label}{('  -> ' + detail) if detail else ''}")
    if not cond:
        fails.append(label)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---------- 1. 浅色模式 ----------
    print("\n=== 浅色模式 ===")
    pg = browser.new_page(viewport={"width": 1440, "height": 1000},
                          device_scale_factor=2, color_scheme="light")
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(url)
    pg.wait_for_load_state("networkidle")
    time.sleep(0.6)

    check("无 JS 报错", not errors, "; ".join(errors[:2]))

    # 标题不应含 em-dash
    title = pg.title()
    check("title 无 em-dash", "—" not in title and "–" not in title, title)

    # 元信息条：细分隔线真的生效
    strip = pg.locator("#asset-tag")
    check("meta-strip 存在", strip.count() == 1)
    n_children = strip.locator("> *").count()
    check("meta-strip 有 3 段", n_children == 3, f"实际 {n_children}")
    sep = strip.locator("> span").first.evaluate(
        "el => getComputedStyle(el).borderLeftWidth")
    check("次级项有细分隔线", sep not in ("0px", ""), f"border-left = {sep}")
    bold = strip.locator("> b").first.evaluate(
        "el => getComputedStyle(el).fontWeight")
    check("首项加粗", bold in ("600", "700"), f"font-weight = {bold}")

    # 图表元信息
    cm = pg.locator(".chart-meta")
    check("chart-meta 存在", cm.count() == 1)
    check("chart-meta 有 2 段", cm.locator("> *").count() == 2)
    cm_sep = cm.locator("> span").nth(1).evaluate(
        "el => getComputedStyle(el).borderLeftWidth")
    check("chart-meta 有细分隔线", cm_sep not in ("0px", ""), f"border-left = {cm_sep}")

    # 分隔线策略统一：所有行用 border-bottom
    for sel in [".pending-row", ".order-row", ".pos-row", ".hp-row"]:
        st = pg.locator(sel).first.evaluate(
            "el => { const s = getComputedStyle(el);"
            " return s.borderBottomWidth + '|' + s.borderTopWidth; }")
        bot, top = st.split("|")
        check(f"{sel} 用 border-bottom", bot != "0px" and top == "0px", st)

    # 交互状态
    active = pg.evaluate("""() => {
      for (const ss of document.styleSheets)
        for (const r of ss.cssRules || [])
          if (r.selectorText && r.selectorText.includes(':active')) return true;
      return false;
    }""")
    check("存在 :active 规则", active)
    fv = pg.evaluate("""() => {
      for (const ss of document.styleSheets)
        for (const r of ss.cssRules || [])
          if (r.selectorText && r.selectorText.includes('focus-visible')) return true;
      return false;
    }""")
    check("存在 focus-visible 规则", fv)

    pg.screenshot(path=str(shots / "taste-light.png"), full_page=True)

    # ---------- 2. 动态切换标的（验证 renderTag） ----------
    print("\n=== 动态切换标的 ===")
    pg.locator(".pos-row").nth(1).click()
    time.sleep(0.4)
    after = pg.locator("#asset-tag").inner_text().strip()
    check("切换后标签已更新", after.replace("\n", " ") != "AAPL USD NASDAQ",
          after.replace("\n", " "))
    n2 = pg.locator("#asset-tag > *").count()
    check("切换后仍是结构化 3 段", n2 == 3, f"实际 {n2}")
    sep2 = pg.locator("#asset-tag > span").first.evaluate(
        "el => getComputedStyle(el).borderLeftWidth")
    check("切换后分隔线仍在", sep2 not in ("0px", ""), f"border-left = {sep2}")

    # ---------- 3. 深色模式 ----------
    print("\n=== 深色模式 ===")
    pg2 = browser.new_page(viewport={"width": 1440, "height": 1000},
                           device_scale_factor=2, color_scheme="dark")
    pg2.goto(url)
    pg2.wait_for_load_state("networkidle")
    time.sleep(0.6)
    theme = pg2.evaluate("() => document.documentElement.getAttribute('data-theme')")
    check("深色系统偏好下自动用 dark", theme == "dark", f"data-theme = {theme}")
    pg2.screenshot(path=str(shots / "taste-dark.png"), full_page=True)

    # ---------- 4. 强制浅色系统偏好 ----------
    pg3 = browser.new_page(viewport={"width": 1440, "height": 1000},
                           color_scheme="light")
    pg3.goto(url)
    pg3.wait_for_load_state("networkidle")
    t3 = pg3.evaluate("() => document.documentElement.getAttribute('data-theme')")
    check("浅色系统偏好下用 light", t3 == "light", f"data-theme = {t3}")

    # URL 参数应覆盖系统偏好
    pg3.goto(url + "?theme=dark")
    pg3.wait_for_load_state("networkidle")
    t4 = pg3.evaluate("() => document.documentElement.getAttribute('data-theme')")
    check("URL 参数覆盖系统偏好", t4 == "dark", f"data-theme = {t4}")

    # ---------- 5. 横向溢出 ----------
    print("\n=== 布局 ===")
    for w in (1440, 1024, 768, 390):
        pg4 = browser.new_page(viewport={"width": w, "height": 900})
        pg4.goto(url)
        pg4.wait_for_load_state("networkidle")
        time.sleep(0.2)
        ov = pg4.evaluate(
            "() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f"{w}px 无横向溢出", ov <= 1, f"溢出 {ov}px")
        pg4.close()

    browser.close()

print("\n" + "=" * 46)
if fails:
    print(f"失败 {len(fails)} 项:")
    for f in fails:
        print("  -", f)
    sys.exit(1)
print("全部通过")
