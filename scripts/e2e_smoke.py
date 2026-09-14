"""Smoke test navigateur optionnel, exécuté avec `uv run --with selenium`.

Le serveur Vite doit être disponible sur ECOPLATE_BASE_URL (défaut :
http://127.0.0.1:5173/). Le test utilise une image locale existante uniquement pour
vérifier le chargement réel du modèle ; il ne mesure pas sa précision alimentaire.
"""

from __future__ import annotations

import os
import json
import re
from statistics import median
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait


ROOT = Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("ECOPLATE_BASE_URL", "http://127.0.0.1:5174/")
RUNS = int(os.environ.get("ECOPLATE_BENCHMARK_RUNS", "10"))
LATENCY_PATTERN = re.compile(r"Dernière inférence\s*:\s*(\d+) ms")


def p95(values: list[int]) -> int:
    ordered = sorted(values)
    return ordered[max(0, (95 * len(ordered) + 99) // 100 - 1)]


def main() -> None:
    options = Options()
    options.add_argument("-headless")
    driver = webdriver.Firefox(options=options)
    driver.set_window_size(1440, 1200)
    wait = WebDriverWait(driver, 90)

    try:
        driver.get(BASE_URL)
        ingredients = wait.until(EC.presence_of_element_located((By.ID, "ingredients")))
        ingredients.send_keys("Repas : 150 g de bœuf, tomates et lentilles.")
        driver.find_element(By.ID, "parse-text").click()
        result = driver.find_element(By.ID, "result")
        assert "Impact estimé élevé" in result.text
        assert "Bœuf / viande rouge" in driver.find_element(By.ID, "candidate-list").text

        image_input = driver.find_element(By.ID, "image-file")
        image_input.send_keys(str((ROOT / "enonce" / "message.png").resolve()))
        analyze = driver.find_element(By.ID, "analyze")
        metrics = driver.find_element(By.ID, "runtime-metrics")
        measurements = []
        for model_id, preprocessing in (
            ("food101-finetuned", "full"),
            ("food101-finetuned", "grid"),
            ("imagenet-baseline", "full"),
            ("imagenet-baseline", "grid"),
        ):
            Select(driver.find_element(By.ID, "vision-model")).select_by_value(model_id)
            driver.find_element(By.CSS_SELECTOR, f'input[name="segmentation-mode"][value="{preprocessing}"]').click()
            latencies = []
            for _ in range(RUNS):
                driver.execute_script("arguments[0].textContent = 'pending'", metrics)
                analyze.click()
                wait.until(lambda current: "Dernière inférence" in metrics.text)
                status = driver.find_element(By.ID, "status").text
                assert "impossible" not in status.lower(), status
                match = LATENCY_PATTERN.search(metrics.text)
                assert match, metrics.text
                latencies.append(int(match.group(1)))
            measurements.append({
                "model": model_id,
                "preprocessing": preprocessing,
                "runs": RUNS,
                "medianMs": median(latencies),
                "p95Ms": p95(latencies),
                "valuesMs": latencies,
            })

        report = {
            "scope": "Latence navigateur sur une image de smoke test ; aucune mesure d'accuracy",
            "browser": driver.execute_script("return navigator.userAgent"),
            "measurements": measurements,
        }
        output = ROOT / "evaluation/browser-latency.json"
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Smoke test et benchmark réussis — {output}")
        for item in measurements:
            print(f"{item['model']} / {item['preprocessing']}: médiane {item['medianMs']} ms, p95 {item['p95Ms']} ms")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
