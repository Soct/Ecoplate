"""Compare full, grille et SlimSAM dans Firefox sur une image par classe Food-101.

Le serveur Vite doit être démarré. Ce benchmark navigateur est volontairement
distinct du benchmark TFLite complet : il inclut le prétraitement et permet de tester
SlimSAM via l'implémentation réellement utilisée par le produit.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from statistics import median

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import Select, WebDriverWait

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("ECOPLATE_BASE_URL", "http://127.0.0.1:5174/")
DATA_DIR = ROOT / "dataset/food101-relabeled/validation"
LATENCY_PATTERN = re.compile(r"Dernière inférence\s*:\s*(\d+) ms")
WAIT_SECONDS = int(os.environ.get("ECOPLATE_VARIANT_TIMEOUT", "60"))
OUTPUT = ROOT / "evaluation/browser-preprocessing-ablation.json"


def one_per_food101_class() -> list[Path]:
    selected: dict[str, Path] = {}
    for path in sorted(DATA_DIR.glob("*/*.jpg")):
        food101_class = path.stem.split("_", 1)[1]
        selected.setdefault(food101_class, path)
    if len(selected) != 101:
        raise SystemExit(f"101 classes attendues, {len(selected)} trouvées")
    return list(selected.values())


def p95(values: list[int]) -> int:
    ordered = sorted(values)
    return ordered[max(0, (95 * len(ordered) + 99) // 100 - 1)]


def summarize(rows: list[dict[str, object]]) -> dict[str, object]:
    top1 = sum(row["predictions"][0] == row["expected"] for row in rows)
    top3 = sum(row["expected"] in row["predictions"][:3] for row in rows)
    rejected = sum(row["rejected"] for row in rows)
    latencies = [row["latencyMs"] for row in rows]
    return {
        "sampleCount": len(rows),
        "top1Accuracy": top1 / len(rows),
        "top3Accuracy": top3 / len(rows),
        "rejectionRate": rejected / len(rows),
        "medianMs": median(latencies),
        "p95Ms": p95(latencies),
    }


def main() -> None:
    paths = one_per_food101_class()
    options = Options()
    options.add_argument("-headless")
    driver = webdriver.Firefox(options=options)
    driver.set_window_size(1440, 1200)
    wait = WebDriverWait(driver, WAIT_SECONDS)
    results = {
        "scope": "Une image déterministe par classe Food-101 ; comparaison exploratoire navigateur",
        "sampleCount": len(paths),
        "model": "food101-finetuned",
        "variants": {},
    }
    try:
        driver.get(BASE_URL)
        wait.until(lambda current: current.find_element(By.ID, "vision-model"))
        Select(driver.find_element(By.ID, "vision-model")).select_by_value("food101-finetuned")
        file_input = driver.find_element(By.ID, "image-file")
        analyze = driver.find_element(By.ID, "analyze")
        metrics = driver.find_element(By.ID, "runtime-metrics")

        for mode in ("full", "grid", "sam-auto"):
            driver.find_element(By.CSS_SELECTOR, f'input[name="segmentation-mode"][value="{mode}"]').click()
            rows = []
            try:
                for index, path in enumerate(paths, 1):
                    driver.execute_script("arguments[0].value = ''", file_input)
                    file_input.send_keys(str(path.resolve()))
                    driver.execute_script("arguments[0].textContent = 'pending'", metrics)
                    analyze.click()
                    wait.until(lambda current: "Dernière inférence" in metrics.text)
                    status = driver.find_element(By.ID, "status").text
                    if "impossible" in status.lower():
                        raise RuntimeError(f"{mode} / {path.name}: {status}")
                    match = LATENCY_PATTERN.search(metrics.text)
                    if not match:
                        raise RuntimeError(metrics.text)
                    predictions = [
                        item.text.strip()
                        for item in driver.find_elements(By.CSS_SELECTOR, "#raw-predictions .prediction-item strong")
                    ]
                    rows.append({
                        "path": str(path.relative_to(ROOT)),
                        "food101Class": path.stem.split("_", 1)[1],
                        "expected": path.parent.name,
                        "predictions": predictions,
                        "rejected": driver.find_element(By.CSS_SELECTOR, "#result .score-orb").text == "?",
                        "latencyMs": int(match.group(1)),
                    })
                    if index % 10 == 0 or index == len(paths):
                        print(f"{mode}: {index}/{len(paths)}", flush=True)
                results["variants"][mode] = {"status": "measured", "metrics": summarize(rows), "cases": rows}
            except TimeoutException:
                results["variants"][mode] = {
                    "status": "timeout",
                    "timeoutSeconds": WAIT_SECONDS,
                    "completedCases": len(rows),
                    "statusMessage": driver.find_element(By.ID, "status").text,
                    "interpretation": "Aucune métrique d'accuracy n'est calculable pour une variante qui ne produit pas de résultat.",
                }
                print(f"{mode}: timeout après {WAIT_SECONDS} s", flush=True)
                break
            finally:
                results["browser"] = driver.execute_script("return navigator.userAgent")
                OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        print(f"Résultats écrits dans {OUTPUT}")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
