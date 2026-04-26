import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const uploadDir = path.join(root, 'outputs', 'uploads')
const convertDir = path.join(root, 'outputs', 'web')
const pythonPath = path.join(root, '.venv', 'Scripts', 'python.exe')
const converterPath = path.join(root, 'backend', 'starvector_convert.py')

await mkdir(uploadDir, { recursive: true })
await mkdir(convertDir, { recursive: true })

const app = express()
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter(_request, file, callback) {
    if (/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
      callback(null, true)
      return
    }

    callback(new Error('Upload a PNG, JPG, JPEG, or WEBP image.'))
  },
})

app.use(cors({ origin: ['http://127.0.0.1:5173', 'http://localhost:5173'] }))
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, backend: 'starvector-1b', modelPath: 'models/starvector-1b-im2svg' })
})

app.post('/api/convert', upload.single('image'), async (request, response) => {
  const file = request.file
  if (!file) {
    response.status(400).json({ error: 'Missing image upload.' })
    return
  }

  const id = randomUUID()
  const extension = path.extname(file.originalname) || '.png'
  const inputPath = path.join(uploadDir, `${id}${extension}`)
  const svgPath = path.join(convertDir, `${id}.svg`)

  try {
    await rm(inputPath, { force: true })
    await import('node:fs/promises').then(({ rename }) => rename(file.path, inputPath))

    const result = await runPython([
      converterPath,
      inputPath,
      svgPath,
      '--max-length',
      '8192',
      '--num-beams',
      '2',
      '--temperature',
      '1',
    ])

    const svg = await readFile(svgPath, 'utf8')
    response.json({
      ok: true,
      id,
      fileName: file.originalname,
      svg,
      log: result.stdout,
    })
  } catch (error) {
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Conversion failed.',
    })
  } finally {
    await rm(file.path, { force: true }).catch(() => undefined)
  }
})

function runPython(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, args, {
      cwd: root,
      env: {
        ...process.env,
        PYTHONUTF8: '1',
      },
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(new Error(stderr || stdout || `Python converter exited with code ${code}`))
    })
  })
}

const port = Number(process.env.SVG_CONVERTER_API_PORT || 5174)
app.listen(port, '127.0.0.1', () => {
  console.log(`SVG converter API listening on http://127.0.0.1:${port}`)
})
