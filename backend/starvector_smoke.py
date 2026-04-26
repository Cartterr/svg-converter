from __future__ import annotations

from pathlib import Path

from starvector_convert import convert_image


if __name__ == "__main__":
    convert_image(
        input_path=Path("third_party/star-vector/assets/examples/sample-0.png"),
        output_path=Path("outputs/starvector-smoke/sample-0.svg"),
        model_path=Path("models/starvector-1b-im2svg"),
        max_length=8192,
        temperature=0.7,
        num_beams=1,
    )
