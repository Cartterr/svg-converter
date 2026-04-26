import './App.css'

type Tier = 'S' | 'A' | 'B' | 'C' | 'D'

type ModelPick = {
  tier: Tier
  name: string
  size: string
  vram: string
  fit: string
  runPlan: string
  notes: string
  source: string
  sourceUrl: string
}

const modelPicks: ModelPick[] = [
  {
    tier: 'S',
    name: 'StarVector 1B im2svg',
    size: '5.15 GB repo, 1B params',
    vram: 'Likely 12 GB friendly in fp16; needs live test',
    fit: 'Best first local specialist for RTX 4070 12 GB.',
    runPlan: 'Transformers + CUDA, direct image-to-SVG generation.',
    notes:
      'Purpose-built for icons, logos, diagrams, charts, and other vector-like inputs. This is the first model I would wire behind the frontend.',
    source: 'Hugging Face: StarVector provides 1B and 8B im2svg checkpoints',
    sourceUrl: 'https://huggingface.co/starvector/starvector-8b-im2svg',
  },
  {
    tier: 'A',
    name: 'OmniSVG 1.1 4B',
    size: '7.6 GB weights',
    vram: 'Official: 16 GB',
    fit: 'Best quality candidate that is close to local, but tight on 12 GB.',
    runPlan: 'Try quantized or CPU-offloaded inference after StarVector works.',
    notes:
      'More ambitious multimodal SVG model, trained for image-to-SVG and text-to-SVG. Official card lists 16 GB GPU memory, so it is not a clean full-VRAM fit.',
    source: 'Hugging Face: OmniSVG1.1 4B lists 7.6 GB weights and 16 GB GPU memory',
    sourceUrl: 'https://huggingface.co/OmniSVG/OmniSVG1.1_4B',
  },
  {
    tier: 'B',
    name: 'StarVector 8B im2svg',
    size: '15 GB repo, 8B params',
    vram: 'Likely above 12 GB in fp16; try only with quant/offload',
    fit: 'Quality reference, not the first practical local target.',
    runPlan: 'Keep as optional advanced backend if quantization/offload behaves.',
    notes:
      'Reported strongest StarVector benchmark scores, but 8B fp16 plus vision components will be uncomfortable on 12 GB.',
    source: 'Hugging Face: StarVector 8B leads SVG-Bench table on the model card',
    sourceUrl: 'https://huggingface.co/starvector/starvector-8b-im2svg',
  },
  {
    tier: 'B',
    name: 'VTracer',
    size: 'Small binary/library, no model weights',
    vram: 'CPU path',
    fit: 'Fast deterministic baseline, not an AI model.',
    runPlan: 'Use as the always-available fallback path for PNG/JPG upload.',
    notes:
      'Great for real conversion UX because it is fast, local, and predictable. It will produce trace-heavy SVGs, but it gives the app an immediate working backend.',
    source: 'GitHub: visioncortex/vtracer raster-to-vector converter',
    sourceUrl: 'https://github.com/visioncortex/vtracer',
  },
  {
    tier: 'C',
    name: 'Qwen2.5-VL 3B / 7B general prompt-to-SVG',
    size: '3B: 7.52 GB repo; 7B: 16.6 GB repo',
    vram: '3B likely viable; 7B tight/heavy on 12 GB',
    fit: 'Useful experiment, weaker than specialist image-to-SVG models.',
    runPlan: 'Ask the VLM to describe shapes or emit simple SVG code.',
    notes:
      'Good for understanding images, but not trained as a dedicated vectorizer. Better as a helper for prompts, cleanup, or layer naming than as the core converter.',
    source: 'Qwen blog: Qwen2.5-VL is a general vision-language model family',
    sourceUrl: 'https://qwenlm.github.io/blog/qwen2.5-vl/',
  },
  {
    tier: 'D',
    name: 'OmniSVG 1.1 8B',
    size: '17.2 GB weights',
    vram: 'Official: 26 GB',
    fit: 'Skip for this GPU unless using remote or heavy offload.',
    runPlan: 'Support later through remote inference/API backend.',
    notes:
      'Official memory figure is 26 GB, well above this RTX 4070. It belongs in the app as a cloud/remote option, not the local default.',
    source: 'Hugging Face: OmniSVG1.1 8B lists 26 GB GPU memory',
    sourceUrl: 'https://huggingface.co/OmniSVG/OmniSVG1.1_8B',
  },
]

const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D']

function App() {
  return (
    <main className="workspace">
      <section className="intro">
        <div>
          <p className="eyebrow">SVG Converter</p>
          <h1>Local image-to-SVG model shortlist</h1>
          <p className="summary">
            Target machine: NVIDIA RTX 4070 with 12 GB VRAM. The first backend
            should favor models that are specialized for SVG code generation,
            then fall back to deterministic tracing when AI output is weak.
          </p>
        </div>
        <aside className="next-step">
          <span>First backend</span>
          <strong>StarVector 1B + VTracer fallback</strong>
          <p>
            This gives us one AI path and one reliable conversion path before
            adding heavier OmniSVG or remote OpenAI-style providers.
          </p>
        </aside>
      </section>

      <section className="converter-panel" aria-label="Converter workspace">
        <div className="drop-zone">
          <span>PNG / JPG input</span>
          <strong>Upload wiring comes next</strong>
        </div>
        <div className="pipeline">
          <span>Backend route</span>
          <strong>local-starvector-1b</strong>
        </div>
        <div className="output-preview">
          <span>SVG output</span>
          <strong>Preview + code editor</strong>
        </div>
      </section>

      <section className="tier-list" aria-label="Model tier list">
        {tiers.map((tier) => (
          <div className="tier-row" key={tier}>
            <div className={`tier-label tier-${tier.toLowerCase()}`}>{tier}</div>
            <div className="tier-items">
              {modelPicks
                .filter((model) => model.tier === tier)
                .map((model) => (
                  <article className="model-card" key={model.name}>
                    <div className="card-head">
                      <h2>{model.name}</h2>
                      <a href={model.sourceUrl} target="_blank">
                        Source
                      </a>
                    </div>
                    <p className="fit">{model.fit}</p>
                    <dl>
                      <div>
                        <dt>Size</dt>
                        <dd>{model.size}</dd>
                      </div>
                      <div>
                        <dt>VRAM</dt>
                        <dd>{model.vram}</dd>
                      </div>
                      <div>
                        <dt>Run plan</dt>
                        <dd>{model.runPlan}</dd>
                      </div>
                      <div>
                        <dt>Notes</dt>
                        <dd>{model.notes}</dd>
                      </div>
                      <div>
                        <dt>Evidence</dt>
                        <dd>{model.source}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}

export default App
