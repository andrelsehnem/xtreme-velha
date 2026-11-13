// Desenha os ícones e as imagens da splash com as cores de uma paleta de src/palettes.json.
// Não depende de nenhum pacote: as formas são rasterizadas aqui e gravadas como PNG.
//
//   node scripts/generate-assets.js [paleta]     (padrão: brasa)
//
// Depois de rodar, atualize as cores em app.json (o script mostra quais) e rode
// `npx expo prebuild --platform android` para o Android receber os novos ícones.

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const PALETTES = require('../src/palettes.json')

const ROOT = path.join(__dirname, '..')
const X_TILES = [0, 2, 4, 6, 8]

// ── Rasterização ───────────────────────────────────────────────────────────

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k)

const newCanvas = (size) => ({ size, data: new Float32Array(size * size * 4) })

/**
 * Pinta uma forma descrita por `distance(x, y)`: negativo dentro, positivo fora, em pixels.
 * A borda de 1 pixel vira transparência parcial (antisserrilhado).
 * `color` é [r, g, b] ou uma função (x, y) => [r, g, b].
 */
function paint(canvas, [x0, y0, x1, y1], color, distance) {
  const { size, data } = canvas
  const colorAt = typeof color === 'function' ? color : () => color
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(size, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(size, Math.ceil(x1)); x++) {
      const alpha = Math.min(1, Math.max(0, 0.5 - distance(x + 0.5, y + 0.5)))
      if (alpha === 0) continue
      const i = (y * size + x) * 4
      const under = data[i + 3] * (1 - alpha)
      const out = alpha + under
      const c = colorAt(x + 0.5, y + 0.5)
      for (let k = 0; k < 3; k++) data[i + k] = (c[k] * alpha + data[i + k] * under) / out
      data[i + 3] = out
    }
  }
}

function roundRect(canvas, cx, cy, half, radius, color) {
  paint(canvas, [cx - half, cy - half, cx + half, cy + half], color, (x, y) => {
    const qx = Math.abs(x - cx) - (half - radius)
    const qy = Math.abs(y - cy) - (half - radius)
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
  })
}

function ring(canvas, cx, cy, radius, stroke, color) {
  const reach = radius + stroke
  paint(canvas, [cx - reach, cy - reach, cx + reach, cy + reach], color, (x, y) => {
    return Math.abs(Math.hypot(x - cx, y - cy) - radius) - stroke / 2
  })
}

/** O mesmo desenho do componente Logo (src/components.js): 9 blocos, os do X formam um X. */
function logo(canvas, side, { x, o, tile, rings = true }) {
  const center = canvas.size / 2
  const gap = side * 0.06
  const tileSize = (side - gap * 2) / 3
  for (let i = 0; i < 9; i++) {
    const cx = center + ((i % 3) - 1) * (tileSize + gap)
    const cy = center + (Math.floor(i / 3) - 1) * (tileSize + gap)
    if (X_TILES.includes(i)) {
      roundRect(canvas, cx, cy, tileSize / 2, tileSize * 0.26, x)
    } else {
      if (tile) roundRect(canvas, cx, cy, tileSize / 2, tileSize * 0.26, tile)
      if (rings) ring(canvas, cx, cy, tileSize * 0.2, tileSize * 0.13, o)
    }
  }
}

/** Fundo com um brilho suave no centro. `radius` arredonda os cantos (0 = quadrado cheio). */
function background(canvas, colors, radius = 0) {
  const { size } = canvas
  const glow = rgb(colors.surfaceAlt)
  const edge = rgb(colors.bg)
  roundRect(canvas, size / 2, size / 2, size / 2, radius * size, (x, y) =>
    mix(glow, edge, Math.min(1, Math.hypot(x - size / 2, y - size / 2) / (size * 0.62)))
  )
}

// ── PNG ────────────────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})

function chunk(type, body) {
  const data = Buffer.concat([Buffer.from(type), body])
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(body.length)
  const check = Buffer.alloc(4)
  check.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, data, check])
}

function save(canvas, file) {
  const { size, data } = canvas
  const raw = Buffer.alloc(size * (size * 4 + 1)) // cada linha começa com o byte de filtro (0)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = (y * size + x) * 4
      const to = y * (size * 4 + 1) + 1 + x * 4
      for (let k = 0; k < 3; k++) raw[to + k] = Math.round(data[from + k])
      raw[to + 3] = Math.round(data[from + 3] * 255)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 6, 0, 0, 0], 8) // 8 bits por canal, RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true })
  fs.writeFileSync(path.join(ROOT, file), png)
  console.log(`  ${file} (${size}×${size})`)
}

// ── Arquivos ───────────────────────────────────────────────────────────────

const name = process.argv[2] ?? 'brasa'
const palette = PALETTES[name]
if (!palette) {
  console.error(`Paleta "${name}" não existe. Opções: ${Object.keys(PALETTES).join(', ')}`)
  process.exit(1)
}

const { light, dark } = palette
const marks = (colors) => ({ x: rgb(colors.x), o: rgb(colors.o), tile: rgb(colors.surfaceAlt) })
// Sobre o brilho do fundo dos ícones, os blocos do O precisam de um tom mais claro que o do app.
const iconMarks = { ...marks(dark), tile: mix(rgb(dark.surfaceAlt), rgb(dark.text), 0.14) }

/** Ícone completo (fundo + símbolo). `radius` > 0 deixa os cantos transparentes. */
function icon(file, size, { radius = 0, rings = true } = {}) {
  const canvas = newCanvas(size)
  background(canvas, dark, radius)
  logo(canvas, size * 0.6, { ...iconMarks, rings })
  save(canvas, file)
}

console.log(`Paleta: ${palette.label}`)

icon('assets/icon.png', 1024)
icon('assets/favicon.png', 256, { radius: 0.22, rings: false })
icon('public/logo192.png', 192)
icon('public/logo512.png', 512)
icon('public/apple-touch-icon.png', 180)
icon('public/splash.png', 256, { radius: 0.22 }) // usada pelo public/index.html enquanto o app carrega

// Ícone adaptativo do Android: o símbolo fica na área central que nenhuma máscara corta.
let canvas = newCanvas(1024)
logo(canvas, 1024 * 0.42, iconMarks)
save(canvas, 'assets/android-icon-foreground.png')

canvas = newCanvas(1024)
background(canvas, dark)
save(canvas, 'assets/android-icon-background.png')

canvas = newCanvas(1024)
logo(canvas, 1024 * 0.42, { x: [255, 255, 255], o: [255, 255, 255] })
save(canvas, 'assets/android-icon-monochrome.png')

// Splash: só o símbolo, com fundo transparente (a cor de fundo vem do app.json).
for (const [file, colors] of [['assets/splash-icon.png', light], ['assets/splash-icon-dark.png', dark]]) {
  canvas = newCanvas(1024)
  logo(canvas, 1024 * 0.46, marks(colors))
  save(canvas, file)
}

console.log(`
Cores para conferir em app.json e public/:
  splash backgroundColor (claro):  ${light.bg}
  splash backgroundColor (escuro): ${dark.bg}
  adaptiveIcon / web / manifest:   ${dark.bg}`)
