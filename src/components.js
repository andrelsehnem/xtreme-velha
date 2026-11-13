// Componentes compartilhados por todas as telas (jogos locais, multiplayer e menus).

import { useEffect, useState } from 'react'
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import { useTheme } from './theme'

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

// ── Identidade ─────────────────────────────────────────────────────────────

/** X ou O desenhado com Views, igual em todas as plataformas. `color` substitui a cor do tema. */
export function Mark({ player, size, color }) {
  const t = useTheme()
  const c = color ?? (player === 'X' ? t.x : t.o)
  const stroke = Math.max(2, Math.round(size * 0.17))
  if (player === 'O') {
    const d = Math.round(size * 0.82)
    return <View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: stroke, borderColor: c }} />
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {['45deg', '-45deg'].map((rotate) => (
        <View
          key={rotate}
          style={{
            position: 'absolute',
            width: size * 0.96,
            height: stroke,
            borderRadius: stroke / 2,
            backgroundColor: c,
            transform: [{ rotate }],
          }}
        />
      ))}
    </View>
  )
}

const LOGO_X_TILES = [0, 2, 4, 6, 8]
const LOGO_POP_ORDER = [1, 3, 5, 7, 0, 2, 6, 8, 4]

/**
 * Símbolo do jogo: nove tabuleiros, e os conquistados pelo X formam um X.
 * É o mesmo desenho dos ícones gerados por scripts/generate-assets.js.
 */
export function Logo({ size = 96, animated = false }) {
  const t = useTheme()
  const gap = Math.round(size * 0.06)
  const tile = Math.floor((size - gap * 2) / 3)
  const ring = Math.round(tile * 0.5)
  const [pops] = useState(() => LOGO_POP_ORDER.map(() => new Animated.Value(animated ? 0 : 1)))

  useEffect(() => {
    if (!animated) return
    Animated.stagger(
      60,
      LOGO_POP_ORDER.map((tileIndex) =>
        Animated.spring(pops[tileIndex], { toValue: 1, friction: 6, tension: 140, useNativeDriver: USE_NATIVE_DRIVER })
      )
    ).start()
  }, [animated, pops])

  return (
    <View style={[styles.grid, { width: tile * 3 + gap * 2, gap }]}>
      {pops.map((pop, i) => {
        const isX = LOGO_X_TILES.includes(i)
        return (
          <Animated.View
            key={i}
            style={{
              width: tile,
              height: tile,
              borderRadius: tile * 0.26,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isX ? t.x : t.surfaceAlt,
              opacity: pop,
              transform: [{ scale: pop }],
            }}
          >
            {isX ? null : (
              <View
                style={{
                  width: ring,
                  height: ring,
                  borderRadius: ring / 2,
                  borderWidth: Math.max(2, Math.round(tile * 0.13)),
                  borderColor: t.o,
                }}
              />
            )}
          </Animated.View>
        )
      })}
    </View>
  )
}

export function Wordmark({ tagline }) {
  const t = useTheme()
  return (
    <View style={styles.wordmark}>
      <Text style={[styles.wordmarkTop, { color: t.text }]}>
        <Text style={{ color: t.x }}>X</Text>-TREME
      </Text>
      <Text style={[styles.wordmarkBottom, { color: t.o }]}>VELHA</Text>
      {tagline ? <Text style={[styles.tagline, { color: t.textDim }]}>{tagline}</Text> : null}
    </View>
  )
}

// ── Estrutura das telas ────────────────────────────────────────────────────

/** Com `title`, mostra a barra do topo (e a seta de voltar se houver `onBack`). `center` centraliza na vertical. */
export function Screen({ title, onBack, center = false, children }) {
  const t = useTheme()
  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={[styles.screen, center && styles.screenCenter]}
      keyboardShouldPersistTaps="handled"
    >
      {/* No navegador a janela pode ser larga: o conteúdo fica numa coluna central. */}
      <View style={styles.column}>
        {title ? (
          <View style={styles.header}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={onBack}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.backButton,
                  { backgroundColor: t.surface, borderColor: t.border },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.chevronLeft, { borderColor: t.text }]} />
              </Pressable>
            ) : (
              <View style={styles.backSpace} />
            )}
            <Text style={[styles.h1, { color: t.text }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.backSpace} />
          </View>
        ) : null}
        {children}
      </View>
    </ScrollView>
  )
}

/** Faixa de status. Com `player`, usa a cor do jogador. */
export function Status({ text, player }) {
  const t = useTheme()
  const accent = player === 'X' ? t.x : player === 'O' ? t.o : null
  return (
    <View
      style={[
        styles.status,
        {
          backgroundColor: player === 'X' ? t.xSoft : player === 'O' ? t.oSoft : t.surface,
          borderColor: accent ?? t.border,
        },
      ]}
    >
      <Text style={[styles.statusText, { color: accent ?? t.textDim }]}>{text}</Text>
    </View>
  )
}

/** variant: 'main' | 'secondary' | 'option' (option aceita `selected`). `flex` divide a linha com os vizinhos. */
export function Button({ label, onPress, variant = 'main', selected = false, flex = false }) {
  const t = useTheme()
  const main = variant === 'main'
  const picked = variant === 'option' && selected
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={variant === 'option' ? { selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        flex ? styles.flex : styles.stretch,
        {
          backgroundColor: main ? t.primary : picked ? t.primarySoft : t.surface,
          borderColor: main || picked ? t.primary : t.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, { color: main ? t.onPrimary : t.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

/** `row` põe os filhos lado a lado. */
export function Card({ title, row = false, children }) {
  const t = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      {title ? <Text style={[styles.cardTitle, { color: t.textDim }]}>{title}</Text> : null}
      {row ? <View style={styles.row}>{children}</View> : children}
    </View>
  )
}

export function Info({ children, error = false }) {
  const t = useTheme()
  return <Text style={[styles.info, error && styles.error, { color: error ? t.o : t.textDim }]}>{children}</Text>
}

export function Field({ label, ...inputProps }) {
  const t = useTheme()
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: t.textDim }]}>{label}</Text>
      <TextInput
        placeholderTextColor={t.textDim}
        {...inputProps}
        style={[styles.input, { backgroundColor: t.bg, color: t.text, borderColor: t.border }]}
      />
    </View>
  )
}

export function Actions({ children }) {
  return <View style={styles.actions}>{children}</View>
}

/** Item grande do menu inicial: ícone, título, descrição e seta. `featured` usa a cor de destaque. */
export function MenuItem({ icon, title, description, onPress, featured = false }) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: t.surface, borderColor: featured ? t.primary : t.border },
        featured && { borderWidth: 2, boxShadow: `0 8px 24px ${t.primary}40` },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: t.bg }]}>{icon}</View>
      <View style={styles.menuText}>
        <Text style={[styles.menuTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.menuDescription, { color: t.textDim }]}>{description}</Text>
      </View>
      <View style={[styles.chevronRight, { borderColor: featured ? t.primary : t.textDim }]} />
    </Pressable>
  )
}

/** Opção de paleta nas configurações, com uma amostra da versão clara e da escura. */
export function PaletteOption({ palette, selected, onPress }) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={palette.label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.paletteOption,
        { backgroundColor: selected ? t.primarySoft : t.bg, borderColor: selected ? t.primary : t.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.menuText}>
        <Text style={[styles.menuTitle, { color: t.text }]}>{palette.label}</Text>
        <Text style={[styles.menuDescription, { color: t.textDim }]}>{palette.description}</Text>
      </View>
      <View style={styles.swatches}>
        {[palette.light, palette.dark].map((colors, i) => (
          <View key={i} style={[styles.swatch, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Mark player="X" size={16} color={colors.x} />
            <Mark player="O" size={16} color={colors.o} />
            <View style={[styles.swatchDot, { backgroundColor: colors.primary }]} />
          </View>
        ))}
      </View>
    </Pressable>
  )
}

// ── Tabuleiro ──────────────────────────────────────────────────────────────

/** Largura disponível para um tabuleiro, limitada a `max`. */
export function useBoardWidth(max) {
  const { width } = useWindowDimensions()
  return Math.min(width - 32, max, 560)
}

/** Moldura em volta de um tabuleiro. Os filhos ficam em grade de 3 colunas. */
export function BoardFrame({ width, padding, gap, children }) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.grid,
        { width, padding, gap, backgroundColor: t.boardBg, borderColor: t.border, borderWidth: 1, borderRadius: 22 },
      ]}
    >
      {children}
    </View>
  )
}

/** Tamanho de cada um dos 3 itens que cabem numa grade de largura `width`. */
export const gridItemSize = (width, padding, gap) => Math.floor((width - padding * 2 - gap * 2) / 3)

/**
 * Um tabuleiro 3×3. É o mesmo componente no modo clássico, em cada um dos
 * 9 tabuleiros do X-Treme, no multiplayer e na miniatura do menu (sem `onPlay`).
 */
export function Board({ cells, size, gap, enabled = false, onPlay }) {
  const t = useTheme()
  const cellSize = gridItemSize(size, 0, gap)
  return (
    <View style={[styles.grid, { width: cellSize * 3 + gap * 2, gap }]}>
      {cells.map((cell, i) => {
        const disabled = !enabled || cell !== null
        const backgroundColor = cell === 'X' ? t.xSoft : cell === 'O' ? t.oSoft : disabled ? t.cellOff : t.cellBg
        return (
          <Pressable
            key={i}
            accessibilityLabel={`Célula ${i + 1}${cell ? `: ${cell}` : ''}`}
            disabled={disabled}
            onPress={() => onPlay?.(i)}
            style={({ pressed }) => [
              styles.cell,
              { width: cellSize, height: cellSize, borderRadius: cellSize * 0.2, backgroundColor },
              pressed && { transform: [{ scale: 0.9 }] },
            ]}
          >
            {cell ? <Mark player={cell} size={cellSize * 0.56} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

/** Tabuleiro clássico emoldurado, usado no modo local e no multiplayer. */
export function ClassicBoard({ cells, enabled, onPlay }) {
  const width = useBoardWidth(390)
  return (
    <BoardFrame width={width} padding={12} gap={0}>
      <Board cells={cells} size={width - 26} gap={10} enabled={enabled} onPlay={onPlay} />
    </BoardFrame>
  )
}

function PlayerChip({ player, name, score, active, won }) {
  const t = useTheme()
  const color = player === 'X' ? t.x : t.o
  const lit = active || won
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: lit ? (player === 'X' ? t.xSoft : t.oSoft) : t.surface, borderColor: lit ? color : t.border },
        !lit && styles.chipDim,
      ]}
    >
      <Mark player={player} size={24} />
      <View style={styles.menuText}>
        <Text style={[styles.chipName, { color: t.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.chipHint, { color: lit ? color : t.textDim }]} numberOfLines={1}>
          {won ? 'Venceu!' : active ? 'Sua vez' : 'Aguarda'}
        </Text>
      </View>
      {score === undefined ? null : <Text style={[styles.chipScore, { color }]}>{score}</Text>}
    </View>
  )
}

/**
 * Layout comum das telas de partida: placar dos dois jogadores, status, tabuleiro e botões.
 * `turn` é quem joga agora (null se ninguém pode jogar) e `winner` quem venceu.
 * `score` ({ X, O }) e `backLabel` (botão extra de saída, além da seta do topo) são opcionais.
 */
export function GameScreen({
  title,
  status,
  turn,
  winner,
  names = { X: 'Jogador X', O: 'Jogador O' },
  score,
  onReset,
  onBack,
  backLabel,
  header,
  children,
  extraActions,
}) {
  return (
    <Screen title={title} onBack={onBack}>
      {header}
      <View style={styles.row}>
        {['X', 'O'].map((p) => (
          <PlayerChip
            key={p}
            player={p}
            name={names[p]}
            score={score?.[p]}
            active={!winner && turn === p}
            won={winner === p}
          />
        ))}
      </View>
      <Status text={status} player={winner ?? turn} />
      {children}
      <Actions>
        <Button label="Reiniciar partida" onPress={onReset} />
        {extraActions}
        {backLabel ? <Button label={backLabel} variant="secondary" onPress={onBack} /> : null}
      </Actions>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  screenCenter: { justifyContent: 'center', paddingTop: 28 },
  column: { width: '100%', maxWidth: 560, alignItems: 'center', gap: 14 },
  header: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpace: { width: 42 },
  chevronLeft: {
    width: 11,
    height: 11,
    marginLeft: 4,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: '45deg' }],
  },
  chevronRight: {
    width: 10,
    height: 10,
    marginRight: 6,
    borderRightWidth: 2.5,
    borderTopWidth: 2.5,
    transform: [{ rotate: '45deg' }],
  },
  h1: { flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  wordmark: { alignItems: 'center' },
  wordmarkTop: { fontSize: 44, lineHeight: 50, fontWeight: '900', letterSpacing: 1 },
  wordmarkBottom: { fontSize: 18, fontWeight: '800', letterSpacing: 14, marginRight: -14 },
  tagline: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 12 },
  status: { alignSelf: 'stretch', borderRadius: 14, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 16 },
  statusText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  stretch: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  card: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  cardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  row: { alignSelf: 'stretch', flexDirection: 'row', gap: 10 },
  info: { fontSize: 14, lineHeight: 20 },
  error: { fontWeight: '700', textAlign: 'center' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, fontSize: 16 },
  actions: { alignSelf: 'stretch', gap: 10 },
  menuItem: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  menuIcon: { width: 60, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, gap: 2 },
  menuTitle: { fontSize: 17, fontWeight: '800' },
  menuDescription: { fontSize: 13, lineHeight: 18 },
  paletteOption: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  swatches: { gap: 6 },
  swatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  swatchDot: { width: 14, height: 14, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  chipDim: { opacity: 0.7 },
  chipName: { fontSize: 14, fontWeight: '800' },
  chipHint: { fontSize: 12, fontWeight: '600' },
  chipScore: { fontSize: 24, fontWeight: '900' },
})
