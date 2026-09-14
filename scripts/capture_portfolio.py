"""Régénère les captures desktop et mobile du portfolio avec Firefox."""

from __future__ import annotations

import os
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("ECOPLATE_BASE_URL", "http://127.0.0.1:5174/")


def main() -> None:
    options = Options()
    options.add_argument("-headless")
    driver = webdriver.Firefox(options=options)
    try:
        for filename, width, height in (
            ("demo-desktop.png", 1440, 1200),
            ("demo-mobile.png", 390, 844),
        ):
            driver.set_window_size(width, height)
            driver.get(BASE_URL)
            WebDriverWait(driver, 30).until(
                lambda current: current.execute_script("return document.fonts.status") == "loaded"
            )
            output = ROOT / "public/livrables" / filename
            driver.save_screenshot(str(output))
            print(f"Capture générée : {output}")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
