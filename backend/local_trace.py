from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from skimage import measure


def otsu_threshold(values: np.ndarray) -> int:
    hist, _ = np.histogram(values, bins=256, range=(0, 255))
    total = values.size
    sum_total = np.dot(np.arange(256), hist)
    sum_background = 0.0
    weight_background = 0.0
    best_variance = -1.0
    best_threshold = 127

    for threshold in range(256):
        weight_background += hist[threshold]
        if weight_background == 0:
            continue

        weight_foreground = total - weight_background
        if weight_foreground == 0:
            break

        sum_background += threshold * hist[threshold]
        mean_background = sum_background / weight_background
        mean_foreground = (sum_total - sum_background) / weight_foreground
        variance = weight_background * weight_foreground * (mean_background - mean_foreground) ** 2

        if variance > best_variance:
            best_variance = variance
            best_threshold = threshold

    return best_threshold


def contour_to_path(contour: np.ndarray, tolerance: float) -> str:
    simplified = measure.approximate_polygon(contour, tolerance=tolerance)
    if len(simplified) < 3:
        return ""

    parts: list[str] = []
    first_y, first_x = simplified[0]
    parts.append(f"M {first_x:.2f} {first_y:.2f}")

    for y, x in simplified[1:]:
        parts.append(f"L {x:.2f} {y:.2f}")

    parts.append("Z")
    return " ".join(parts)


def trace_silhouette(
    input_path: Path,
    output_path: Path,
    threshold: int | None,
    tolerance: float,
    min_area: float,
) -> None:
    image = Image.open(input_path).convert("RGBA")
    width, height = image.size
    rgba = np.asarray(image)
    alpha = rgba[:, :, 3] / 255.0
    luminance = (
        0.299 * rgba[:, :, 0]
        + 0.587 * rgba[:, :, 1]
        + 0.114 * rgba[:, :, 2]
    ).astype(np.uint8)

    auto_threshold = otsu_threshold(luminance[alpha > 0.05]) if threshold is None else threshold
    dark_mask = luminance <= auto_threshold
    transparent_mask = alpha <= 0.05
    foreground = np.where(transparent_mask, False, dark_mask)

    if foreground.sum() > foreground.size * 0.55:
        foreground = np.where(transparent_mask, False, luminance > auto_threshold)

    padded = np.pad(foreground.astype(np.uint8), 1, mode="constant")
    contours = measure.find_contours(padded, 0.5)

    paths: list[str] = []
    for contour in contours:
        contour = contour - 1
        y_min, x_min = contour.min(axis=0)
        y_max, x_max = contour.max(axis=0)
        area = max(0.0, (x_max - x_min) * (y_max - y_min))
        if area < min_area:
            continue

        path_data = contour_to_path(contour, tolerance=tolerance)
        if path_data:
            paths.append(path_data)

    if not paths:
        raise ValueError("No traceable silhouette was found. Try a darker logo or a transparent-background image.")

    compound_path = " ".join(paths)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <path d="{compound_path}" fill="#111820" fill-rule="evenodd"/>
</svg>
'''
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(svg, encoding="utf-8")
    print(f"SVG: {output_path.resolve()}")
    print(f"Mode: local-trace")
    print(f"Threshold: {auto_threshold}")
    print(f"Contours: {len(paths)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trace a simple logo silhouette into SVG paths.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--threshold", type=int, default=None)
    parser.add_argument("--tolerance", type=float, default=1.3)
    parser.add_argument("--min-area", type=float, default=12.0)
    args = parser.parse_args()

    trace_silhouette(
        input_path=args.input,
        output_path=args.output,
        threshold=args.threshold,
        tolerance=args.tolerance,
        min_area=args.min_area,
    )


if __name__ == "__main__":
    main()
