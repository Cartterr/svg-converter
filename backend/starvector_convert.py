from __future__ import annotations

import argparse
from pathlib import Path

import torch
from PIL import Image
from transformers import AutoModelForCausalLM


def extract_svg(raw_svg: str) -> str:
    start = raw_svg.find("<svg")
    if start == -1:
        return raw_svg

    svg = raw_svg[start:]
    end = svg.find("</svg>")
    if end == -1:
        raise ValueError("Model output did not include a closing </svg> tag. Try again or use a simpler icon-like input.")

    return svg[: end + len("</svg>")]


def convert_image(
    input_path: Path,
    output_path: Path,
    model_path: Path,
    max_length: int,
    temperature: float,
    num_beams: int,
) -> None:
    model = AutoModelForCausalLM.from_pretrained(
        str(model_path),
        torch_dtype=torch.float16,
        trust_remote_code=True,
        local_files_only=True,
        low_cpu_mem_usage=False,
    ).cuda()
    model.eval()

    image = Image.open(input_path).convert("RGB")
    image_tensor = model.process_images([image])[0].cuda()

    with torch.inference_mode():
        raw_svg = model.generate_im2svg(
            {"image": image_tensor},
            max_length=max_length,
            temperature=temperature,
            num_beams=num_beams,
        )[0]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(extract_svg(raw_svg), encoding="utf-8")

    raw_path = output_path.with_suffix(".raw.txt")
    raw_path.write_text(raw_svg, encoding="utf-8")

    print(f"SVG: {output_path.resolve()}")
    print(f"Raw: {raw_path.resolve()}")
    if torch.cuda.is_available():
        reserved = torch.cuda.max_memory_reserved() / 1024**3
        print(f"CUDA max reserved: {reserved:.3f} GB")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert an image to SVG with local StarVector 1B.")
    parser.add_argument("input", type=Path, help="PNG/JPG input path")
    parser.add_argument("output", type=Path, help="SVG output path")
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("models/starvector-1b-im2svg"),
        help="Local StarVector model directory",
    )
    parser.add_argument("--max-length", type=int, default=8192)
    parser.add_argument("--temperature", type=float, default=1.0)
    parser.add_argument("--num-beams", type=int, default=2)
    args = parser.parse_args()

    convert_image(
        input_path=args.input,
        output_path=args.output,
        model_path=args.model,
        max_length=args.max_length,
        temperature=args.temperature,
        num_beams=args.num_beams,
    )


if __name__ == "__main__":
    main()
