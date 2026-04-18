import { access, readdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)

type CliOptions = {
  roots: string[]
  quality: string
  force: boolean
  dryRun: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const roots: string[] = []
  let quality = '82'
  let force = false
  let dryRun = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') {
      force = true
      continue
    }
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--quality') {
      const value = argv[i + 1]
      if (!value) {
        throw new Error('Missing value for --quality')
      }
      quality = value
      i++
      continue
    }
    roots.push(arg)
  }

  if (roots.length === 0) {
    roots.push('public')
  }

  return { roots, quality, force, dryRun }
}

async function collectPngFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      return collectPngFiles(fullPath)
    }
    if (entry.isFile() && fullPath.toLowerCase().endsWith('.png')) {
      return [fullPath]
    }
    return []
  }))
  return files.flat()
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  }
  catch {
    return false
  }
}

async function convertFile(
  pngPath: string,
  quality: string,
  force: boolean,
  dryRun: boolean,
): Promise<'converted' | 'skipped'> {
  const webpPath = pngPath.replace(/\.png$/i, '.webp')
  if (!force && await fileExists(webpPath)) {
    return 'skipped'
  }

  if (dryRun) {
    console.log(`[dry-run] ${pngPath} -> ${webpPath}`)
    return 'converted'
  }

  await execFileAsync('cwebp', ['-quiet', '-q', quality, pngPath, '-o', webpPath])
  console.log(`${pngPath} -> ${webpPath}`)
  return 'converted'
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  try {
    await execFileAsync('cwebp', ['-version'])
  }
  catch {
    throw new Error('`cwebp` is not installed or not on PATH.')
  }

  const pngFiles = (await Promise.all(opts.roots.map(collectPngFiles))).flat()

  let converted = 0
  let skipped = 0

  for (const pngPath of pngFiles) {
    const result = await convertFile(pngPath, opts.quality, opts.force, opts.dryRun)
    if (result === 'converted') converted++
    else skipped++
  }

  console.log(`Done. converted=${converted} skipped=${skipped} total=${pngFiles.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
