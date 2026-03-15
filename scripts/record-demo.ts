import { chromium, type Page } from 'playwright'
import { execSync, spawn, type ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WIDTH = 1280
const HEIGHT = 720
const BASE_URL = 'http://localhost:5173/mipmap/'

// Helper: wait ms
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

// Helper: smooth mouse drag on the canvas
async function dragCanvas(
  page: Page,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration: number = 1000,
  button: 'left' | 'right' = 'left'
) {
  const steps = Math.ceil(duration / 16)
  await page.mouse.move(startX, startY)
  await page.mouse.down({ button })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const x = startX + (endX - startX) * t
    const y = startY + (endY - startY) * t
    await page.mouse.move(x, y)
    await wait(16)
  }
  await page.mouse.up({ button })
}

// Helper: click a button by its text
async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text, exact: true }).click()
  await wait(300)
}

async function main() {
  // Start the dev server
  console.log('Starting dev server...')
  const devServer: ChildProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  })

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Dev server timeout')), 30000)
    devServer.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('Local:') || text.includes('localhost')) {
        clearTimeout(timeout)
        resolve()
      }
    })
    devServer.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('Local:') || text.includes('localhost')) {
        clearTimeout(timeout)
        resolve()
      }
    })
  })
  console.log('Dev server ready!')

  // Wait a moment for server to stabilize
  await wait(2000)

  const videoDir = path.resolve(__dirname, '..', 'demo-video')
  fs.mkdirSync(videoDir, { recursive: true })

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    recordVideo: {
      dir: videoDir,
      size: { width: WIDTH, height: HEIGHT },
    },
  })
  const page = await context.newPage()

  try {
    // ========================================
    // 1. Opening shot — load the app
    // ========================================
    console.log('1. Opening shot...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await wait(3000) // Let WebGL render settle

    // ========================================
    // 2. Filter mode comparison
    // ========================================
    console.log('2. Filter mode comparison...')

    // Start with Point sampling to show aliasing
    await clickButton(page, 'POINT')
    await wait(2500)

    // Bilinear
    await clickButton(page, 'BILINEAR')
    await wait(2500)

    // Trilinear
    await clickButton(page, 'TRILINEAR')
    await wait(2500)

    // Anisotropic
    await clickButton(page, 'ANISO')
    await wait(2500)

    // ========================================
    // 3. Mip Levels view
    // ========================================
    console.log('3. Mip Levels view...')
    await clickButton(page, 'MIP LEVELS')
    await wait(3000)

    // ========================================
    // 4. Camera movement (show mip levels changing)
    // ========================================
    console.log('4. Camera movement...')
    // Orbit the camera by dragging on the canvas
    const canvasBox = await page.locator('canvas[data-engine]').boundingBox()
    if (canvasBox) {
      const cx = canvasBox.x + canvasBox.width / 2
      const cy = canvasBox.y + canvasBox.height / 2

      // Orbit left
      await dragCanvas(page, cx, cy, cx - 200, cy - 80, 1500)
      await wait(500)
      // Orbit right
      await dragCanvas(page, cx - 200, cy - 80, cx + 150, cy + 50, 1500)
      await wait(500)
    }

    // ========================================
    // 5. Back to textured
    // ========================================
    console.log('5. Back to TEXTURED...')
    await clickButton(page, 'TEXTURED')
    await wait(2000)

    // ========================================
    // 6. Texture switching
    // ========================================
    console.log('6. Texture switching...')
    await clickButton(page, 'CHECKER FINE')
    await wait(2500)

    await clickButton(page, 'UV GRID')
    await wait(2500)

    await clickButton(page, 'FABRIC')
    await wait(2500)

    // ========================================
    // 7. 4x4 comparison: Point vs Bilinear
    // ========================================
    console.log('7. 4x4 comparison...')
    // The button text is "4×4" (with multiplication sign)
    await page.getByRole('button', { name: /4.*4/ }).click()
    await wait(1500)

    await clickButton(page, 'POINT')
    await wait(2000)

    await clickButton(page, 'BILINEAR')
    await wait(2000)

    // ========================================
    // 8. 3D Scene
    // ========================================
    console.log('8. 3D Scene...')
    // Switch to checker for a better 3D demo
    await clickButton(page, 'CHECKER')
    await wait(500)
    await clickButton(page, 'TRILINEAR')
    await wait(500)
    await clickButton(page, '3D SCENE')
    await wait(2000)

    // Orbit around the 3D scene
    const canvasBox2 = await page.locator('canvas[data-engine]').boundingBox()
    if (canvasBox2) {
      const cx = canvasBox2.x + canvasBox2.width / 2
      const cy = canvasBox2.y + canvasBox2.height / 2

      await dragCanvas(page, cx, cy, cx + 200, cy - 100, 2000)
      await wait(500)
      await dragCanvas(page, cx + 200, cy - 100, cx - 100, cy + 80, 2000)
      await wait(500)
    }

    // ========================================
    // 9. Anisotropic vs Trilinear in 3D
    // ========================================
    console.log('9. Trilinear vs Anisotropic in 3D...')
    await clickButton(page, 'TRILINEAR')
    await wait(2500)

    await clickButton(page, 'ANISO')
    await wait(2500)

    // ========================================
    // 10. Mipmap pyramid hover interaction
    // ========================================
    console.log('10. Mipmap pyramid interaction...')
    // Hover over pyramid sidebar items
    const sidebar = page.locator('aside')
    const pyramidItems = sidebar.locator('canvas')
    const count = await pyramidItems.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const item = pyramidItems.nth(i)
      const box = await item.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await wait(800)
      }
    }

    // Move mouse away to unlock
    await page.mouse.move(WIDTH / 2, HEIGHT / 2)
    await wait(1500)

    console.log('Demo recording complete!')
  } finally {
    // Close to finalize the video
    await context.close()
    await browser.close()

    // Kill dev server
    devServer.kill()
  }

  // Find the recorded webm file
  const files = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'))
  if (files.length === 0) {
    console.error('No video file found!')
    process.exit(1)
  }

  const webmPath = path.join(videoDir, files[files.length - 1])
  const mp4Path = path.resolve(__dirname, '..', 'demo.mp4')

  // Convert to mp4
  console.log('Converting to MP4...')
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p "${mp4Path}"`,
    { stdio: 'inherit' }
  )

  // Clean up webm
  fs.rmSync(videoDir, { recursive: true, force: true })

  console.log(`\nDemo video saved to: ${mp4Path}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
