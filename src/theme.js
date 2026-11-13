import { createContext, useContext } from 'react'
import PALETTES from './palettes.json'

// As paletas ficam em palettes.json para o script scripts/generate-assets.js
// desenhar os ícones e a splash com as mesmas cores do app.
export { PALETTES }
export const DEFAULT_PALETTE = 'brasa'

/** mode: 'light' | 'dark'. As cores "soft" são a cor do jogador com ~18% de opacidade. */
export function buildTheme(mode, palette) {
  const colors = PALETTES[palette][mode]
  return {
    ...colors,
    mode,
    xSoft: `${colors.x}2e`,
    oSoft: `${colors.o}2e`,
    primarySoft: `${colors.primary}26`,
  }
}

export const ThemeContext = createContext(buildTheme('dark', DEFAULT_PALETTE))
export const useTheme = () => useContext(ThemeContext)
