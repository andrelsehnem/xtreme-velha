import { useEffect, useMemo, useState } from 'react'
import { BackHandler, View, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Board,
  BoardFrame,
  Button,
  Card,
  ClassicBoard,
  GameScreen,
  Logo,
  Mark,
  MenuItem,
  PaletteOption,
  Screen,
  Wordmark,
  gridItemSize,
  useBoardWidth,
} from './components'
import {
  classicResult,
  classicStatus,
  isBoardPlayable,
  newClassic,
  newXtreme,
  playClassic,
  playXtreme,
  xtremeResult,
} from './engine'
import { AndreSplash } from './AndreSplash'
import Multiplayer from './Multiplayer'
import { DEFAULT_PALETTE, PALETTES, ThemeContext, buildTheme, useTheme } from './theme'

const THEME_KEY = 'xtreme-velha:theme'
const PALETTE_KEY = 'xtreme-velha:palette'
const MODES = { system: 'Auto', light: 'Claro', dark: 'Escuro' }

// A splash nativa fica na tela até as preferências salvas serem lidas.
SplashScreen.preventAutoHideAsync().catch(() => {})

// ── Modos locais ───────────────────────────────────────────────────────────

function ClassicGame({ onBack }) {
  const [game, setGame] = useState(newClassic)
  const { winner, draw } = classicResult(game)
  return (
    <GameScreen
      title="Clássico"
      status={classicStatus(game)}
      turn={winner || draw ? null : game.currentPlayer}
      winner={winner}
      onReset={() => setGame(newClassic())}
      onBack={onBack}
    >
      <ClassicBoard cells={game.board} enabled={!winner && !draw} onPlay={(i) => setGame((g) => playClassic(g, i))} />
    </GameScreen>
  )
}

function XtremeGame({ onBack }) {
  const t = useTheme()
  const [game, setGame] = useState(newXtreme)
  const result = useMemo(() => xtremeResult(game), [game])
  const { meta, winner, draw, conquered, tiebreak } = result

  const score = `${conquered.X}x${conquered.O} velhas`
  const status = winner
    ? `🏆 Vencedor: Jogador ${winner}`
    : draw
    ? tiebreak
      ? `🏆 Vencedor no desempate: Jogador ${tiebreak} (${score})`
      : `🤝 Empate! (${score})`
    : game.activeBoard !== null
    ? `Vez de ${game.currentPlayer} — jogue no tabuleiro destacado`
    : `Vez de ${game.currentPlayer} — jogue em qualquer tabuleiro`

  const width = useBoardWidth(520)
  const metaSize = gridItemSize(width, 8, 6)
  const innerSize = metaSize - 12
  const turnColor = game.currentPlayer === 'X' ? t.x : t.o

  return (
    <GameScreen
      title="X-Treme"
      status={status}
      turn={winner || draw ? null : game.currentPlayer}
      winner={winner ?? tiebreak}
      score={conquered}
      onReset={() => setGame(newXtreme())}
      onBack={onBack}
    >
      <BoardFrame width={width} padding={7} gap={6}>
        {game.boards.map((cells, bi) => {
          const owner = meta[bi]
          const finished = owner !== null || cells.every((c) => c !== null)
          const playable = isBoardPlayable(game, result, bi)
          return (
            <View
              key={bi}
              style={{
                width: metaSize,
                height: metaSize,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                borderWidth: 2,
                // O tabuleiro onde se pode jogar ganha a cor de quem joga.
                borderColor: playable ? turnColor : 'transparent',
                backgroundColor: owner === 'X' ? t.xSoft : owner === 'O' ? t.oSoft : 'transparent',
              }}
            >
              {owner ? (
                <Mark player={owner} size={innerSize * 0.72} />
              ) : finished ? (
                <View style={{ width: innerSize * 0.5, height: 6, borderRadius: 3, backgroundColor: t.textDim }} />
              ) : (
                <Board
                  cells={cells}
                  size={innerSize}
                  gap={4}
                  enabled={playable}
                  onPlay={(ci) => setGame((g) => playXtreme(g, bi, ci))}
                />
              )}
            </View>
          )
        })}
      </BoardFrame>
    </GameScreen>
  )
}

// ── Menu e configurações ───────────────────────────────────────────────────

const CLASSIC_PREVIEW = ['X', null, 'O', null, 'X', null, 'O', null, 'X']

function Menu({ onSelect }) {
  const t = useTheme()
  return (
    <Screen center>
      <Logo size={116} />
      <Wordmark tagline="Nove tabuleiros. Cada jogada decide onde será a próxima." />
      <View style={{ height: 6 }} />
      <MenuItem
        featured
        icon={<Logo size={42} />}
        title="X-Treme"
        description="Nove tabuleiros em um. Conquiste três em linha."
        onPress={() => onSelect('xtreme')}
      />
      <MenuItem
        icon={<Board cells={CLASSIC_PREVIEW} size={42} gap={3} />}
        title="Clássico"
        description="O jogo da velha de sempre, para dois."
        onPress={() => onSelect('classic')}
      />
      <MenuItem
        icon={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Mark player="X" size={19} />
            <Mark player="O" size={19} />
          </View>
        }
        title="Multiplayer LAN"
        description="Dois celulares na mesma rede Wi-Fi."
        onPress={() => onSelect('lan')}
      />
      <MenuItem
        icon={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[t.x, t.primary, t.o].map((color, i) => (
              <View key={i} style={{ width: 11, height: 26, borderRadius: 6, backgroundColor: color }} />
            ))}
          </View>
        }
        title="Configurações"
        description="Tema claro ou escuro e paleta de cores."
        onPress={() => onSelect('settings')}
      />
    </Screen>
  )
}

function Settings({ onBack, mode, palette, onModeChange, onPaletteChange }) {
  return (
    <Screen title="Configurações" onBack={onBack}>
      <Card title="Aparência" row>
        {Object.keys(MODES).map((key) => (
          <Button
            key={key}
            flex
            label={MODES[key]}
            variant="option"
            selected={mode === key}
            onPress={() => onModeChange(key)}
          />
        ))}
      </Card>
      <Card title="Paleta de cores">
        {Object.keys(PALETTES).map((key) => (
          <PaletteOption
            key={key}
            palette={PALETTES[key]}
            selected={palette === key}
            onPress={() => onPaletteChange(key)}
          />
        ))}
      </Card>
    </Screen>
  )
}

// ── Raiz ───────────────────────────────────────────────────────────────────

export default function App() {
  const systemScheme = useColorScheme()
  const [screen, setScreen] = useState('menu')
  const [mode, setMode] = useState('system')
  const [palette, setPalette] = useState(DEFAULT_PALETTE)
  const [loaded, setLoaded] = useState(false)
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    AsyncStorage.multiGet([THEME_KEY, PALETTE_KEY])
      .then(([[, savedMode], [, savedPalette]]) => {
        if (savedMode in MODES) setMode(savedMode)
        if (savedPalette in PALETTES) setPalette(savedPalette)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (loaded) SplashScreen.hide()
  }, [loaded])

  useEffect(() => {
    if (loaded) AsyncStorage.multiSet([[THEME_KEY, mode], [PALETTE_KEY, palette]]).catch(() => {})
  }, [loaded, mode, palette])

  // O botão "voltar" do Android retorna ao menu em vez de fechar o app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'menu') return false
      setScreen('menu')
      return true
    })
    return () => sub.remove()
  }, [screen])

  const scheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode
  const theme = useMemo(() => buildTheme(scheme, palette), [scheme, palette])
  const back = () => setScreen('menu')

  if (!loaded) return null

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <StatusBar style={splash || scheme === 'dark' ? 'light' : 'dark'} />
          {screen === 'menu' && <Menu onSelect={setScreen} />}
          {screen === 'classic' && <ClassicGame onBack={back} />}
          {screen === 'xtreme' && <XtremeGame onBack={back} />}
          {screen === 'lan' && <Multiplayer onBack={back} />}
          {screen === 'settings' && (
            <Settings
              onBack={back}
              mode={mode}
              palette={palette}
              onModeChange={setMode}
              onPaletteChange={setPalette}
            />
          )}
        </SafeAreaView>
        {/* Continuação animada da splash nativa; no navegador é a única splash. */}
        {splash && (
          <AndreSplash
            appName="X-Treme Velha"
            appIcon={require('../assets/icon.png')}
            appBackground={theme.bg}
            appForeground={theme.text}
            onFinish={() => setSplash(false)}
          />
        )}
      </ThemeContext.Provider>
    </SafeAreaProvider>
  )
}
