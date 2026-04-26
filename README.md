# svg-converter

A local-first workspace for testing image-to-SVG conversion backends. The UI is a React/Vite frontend with an initial model tier list, and the first local backend target is StarVector 1B.

## Status

- Frontend: React + TypeScript + Vite.
- Local GPU target: NVIDIA RTX 4070, 12 GB VRAM.
- First AI backend: `starvector/starvector-1b-im2svg`.
- Fallback backend planned: `vtracer`.
- Heavy model files, Python environments, source clones, outputs, and caches are intentionally ignored and not committed.

## Model Tier List

| Tier | Model | Size | VRAM | Use |
| --- | --- | --- | --- | --- |
| S | StarVector 1B im2svg | 5.15 GB repo, 1B params | Smoke-tested under 3 GB reserved on RTX 4070 | First local AI backend. |
| A | OmniSVG 1.1 4B | 7.6 GB weights | Official: 16 GB | Strong candidate with quantization/offload. |
| B | StarVector 8B im2svg | 15 GB repo, 8B params | Likely above 12 GB fp16 | Quality reference, not default local path. |
| B | VTracer | Small binary/library | CPU | Deterministic baseline and fallback. |
| C | Qwen2.5-VL 3B / 7B | 3B: 7.52 GB; 7B: 16.6 GB | 3B likely viable; 7B tight | General VLM helper, not a specialist vectorizer. |
| D | OmniSVG 1.1 8B | 17.2 GB weights | Official: 26 GB | Remote/offload only. |

Sources:

- https://huggingface.co/starvector/starvector-1b-im2svg
- https://huggingface.co/starvector/starvector-8b-im2svg
- https://huggingface.co/OmniSVG/OmniSVG1.1_4B
- https://huggingface.co/OmniSVG/OmniSVG1.1_8B
- https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct
- https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct
- https://github.com/visioncortex/vtracer
- https://qwenlm.github.io/blog/qwen2.5-vl/

## Frontend

```powershell
npm install
npm run api
npm run dev
```

Local URL:

```text
http://127.0.0.1:5173/
```

Local API:

```text
http://127.0.0.1:5174/api/health
```

Quality checks:

```powershell
npm run lint
npm run build
```

## StarVector 1B Backend

The model and Python environment are local-only assets. They are not committed because the repo is public.

Local paths used on this machine:

- Venv: `.venv`
- Model: `models/starvector-1b-im2svg`
- Upstream source clone: `third_party/star-vector`
- Smoke output: `outputs/starvector-smoke/sample-0.svg`

Run the existing local smoke test:

```powershell
.\.venv\Scripts\python.exe backend\starvector_smoke.py
```

Convert an image:

```powershell
.\.venv\Scripts\python.exe backend\starvector_convert.py input.png outputs\input.svg
```

Or use the frontend upload flow:

1. Start the API with `npm run api`.
2. Start the frontend with `npm run dev`.
3. Open `http://127.0.0.1:5173/`.
4. Click `Browse`, choose a PNG/JPG/WEBP, then click `Convert to SVG`.

Recreate the backend on a fresh Windows checkout:

```powershell
uv venv .venv --python 3.11.3
uv pip install --python .\.venv\Scripts\python.exe -r backend\requirements-starvector.txt
git clone --depth 1 https://github.com/joanrod/star-vector.git third_party\star-vector
uv pip install --python .\.venv\Scripts\python.exe -e .\third_party\star-vector --no-deps
hf download starvector/starvector-1b-im2svg --local-dir models\starvector-1b-im2svg --max-workers 8
.\scripts\apply-starvector-patch.ps1
.\.venv\Scripts\python.exe backend\starvector_smoke.py
```

Implementation note: upstream StarVector attempts to access gated `bigcode/starcoderbase-1b` during construction. The patch helper makes the local checkout instantiate the compatible BigCode architecture directly, so the downloaded StarVector checkpoint can load offline.

## Security

- Do not commit `.env`, tokens, API keys, auth files, model weights, generated outputs, or local source clones.
- `.gitignore` excludes common secret files, model artifacts, Hugging Face caches, Python environments, logs, and build outputs.
- API/provider keys should be supplied through environment variables or a local `.env` file only.
