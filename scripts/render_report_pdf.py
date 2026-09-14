"""Régénère le PDF du rapport depuis le HTML d'impression avec Firefox/Selenium."""

from __future__ import annotations

import base64
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.firefox.options import Options

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/livrables/rapport-conduite-projet-print.html"
OUTPUT = ROOT / "public/livrables/rapport-conduite-projet.pdf"


def main() -> None:
    options = Options()
    options.add_argument("-headless")
    driver = webdriver.Firefox(options=options)
    try:
        driver.get(SOURCE.resolve().as_uri())
        OUTPUT.write_bytes(base64.b64decode(driver.print_page()))
        print(f"PDF généré : {OUTPUT} ({OUTPUT.stat().st_size} octets)")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
