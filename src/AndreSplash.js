/**
 * Splash padrão ANDRE100 para apps Expo / React Native.
 *
 * Fase 1: marca ANDRE100 (igual em todos os apps).
 * Fase 2: revela o app (ícone + nome + loader) — só as props mudam por app.
 *
 * Sem dependências além de `react-native` (usa a API Animated nativa).
 * Copie este arquivo e as imagens de `assets/andre100/` para o app e use como overlay:
 *
 *   const [splash, setSplash] = useState(true);
 *   ...
 *   <>
 *     <AppRoot />
 *     {splash && (
 *       <AndreSplash
 *         appName="Marcador de Pontos"
 *         appIcon={require('../assets/icon.png')}
 *         appBackground="#5a8f7e"
 *         onFinish={() => setSplash(false)}
 *       />
 *     )}
 *   </>
 *
 * Dica: no app.json, deixe o splash nativo com backgroundColor "#0b1626"
 * para a troca do splash nativo para este ser imperceptível.
 */
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
const NAVY = '#0b1626'
const BLUE = '#3b82f6'
const INK = '#e6ebf5'
const BRAND = 'ANDRE100'.split('')
const MARK_RATIO = 560 / 435
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1)
const SPRING = Easing.bezier(0.34, 1.56, 0.64, 1)
const REVEAL = Easing.bezier(0.7, 0, 0.2, 1)
const LAYERS = {
  l1: require('../assets/andre100/mark-l1.png'),
  l2: require('../assets/andre100/mark-l2.png'),
  core: require('../assets/andre100/mark-core.png'),
  outline: require('../assets/andre100/mark-outline.png'),
  full: require('../assets/andre100/mark.png'),
}
const value = () => new Animated.Value(0)
const createValues = () => ({
  outline: value(),
  l1: value(),
  l2: value(),
  core: value(),
  dots: [value(), value(), value()],
  letters: BRAND.map(value),
  rule: value(),
  brandOut: value(),
  reveal: value(),
  icon: value(),
  name: value(),
  loader: value(),
  signature: value(),
  bounce: [value(), value(), value()],
  exit: value(),
})
const at = (v, delay, duration, easing = EASE_OUT) =>
  Animated.timing(v, { toValue: 1, delay, duration, easing, useNativeDriver: true })
export function AndreSplash({
  appName,
  appIcon,
  appBackground = '#5a8f7e',
  appForeground = '#ffffff',
  brandDuration = 2300,
  appDuration = 1700,
  bottomInset = 0,
  hold = false,
  onExitStart,
  onFinish,
}) {
  const { width, height } = useWindowDimensions()
  const [v] = useState(createValues)
  const [timelineDone, setTimelineDone] = useState(false)
  const callbacks = useRef({ onExitStart, onFinish })
  useEffect(() => {
    callbacks.current = { onExitStart, onFinish }
  })
  useEffect(() => {
    const b = brandDuration
    const timeline = Animated.parallel([
      // fase 1 — marca
      at(v.outline, 100, 700),
      at(v.l1, 450, 600),
      at(v.l2, 600, 600),
      at(v.core, 750, 700, SPRING),
      ...v.dots.map((d, i) => at(d, 950 + i * 100, 450, SPRING)),
      ...v.letters.map((l, i) => at(l, 1000 + i * 45, 500)),
      at(v.rule, 1350, 700),
      at(v.brandOut, b, 500, Easing.in(Easing.quad)),
      // fase 2 — app
      at(v.reveal, b, 750, REVEAL),
      at(v.icon, b + 300, 700, SPRING),
      at(v.name, b + 550, 500),
      at(v.loader, b + 750, 400, Easing.linear),
      at(v.signature, b + 700, 500),
      // marca o fim da fase do app
      Animated.delay(b + appDuration),
    ])
    const bounce = Animated.loop(
      Animated.stagger(
        120,
        v.bounce.map((d) =>
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 270, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(d, { toValue: 0, duration: 270, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.delay(360),
          ]),
        ),
      ),
    )
    timeline.start(({ finished }) => {
      if (finished) setTimelineDone(true)
    })
    bounce.start()
    return () => {
      timeline.stop()
      bounce.stop()
    }
  }, [v, brandDuration, appDuration])
  // saída: só depois da animação acabar e de `hold` ser liberado
  useEffect(() => {
    if (!timelineDone || hold) return
    callbacks.current.onExitStart?.()
    const exit = at(v.exit, 0, 350, Easing.linear)
    exit.start(({ finished }) => {
      if (finished) callbacks.current.onFinish?.()
    })
    return () => exit.stop()
  }, [v, timelineDone, hold])
  // ---------- layout ----------
  const landscape = width > height * 1.25
  const markW = landscape
    ? Math.min(width * 0.3, height * 0.62 * MARK_RATIO)
    : Math.min(width * 0.6, height * 0.36 * MARK_RATIO)
  const markH = markW / MARK_RATIO
  const nameSize = landscape ? Math.min(width * 0.062, height * 0.13) : Math.min(width * 0.125, height * 0.075)
  const dot = nameSize * 0.2
  const iconSize = Math.min(width * 0.44, height * 0.3)
  const appNameSize = Math.min(width * 0.07, height * 0.042)
  const loaderDot = Math.max(6, appNameSize * 0.32)
  const sigSize = Math.max(11, Math.min(width * 0.034, height * 0.019))
  const diameter = Math.hypot(width, height) * 1.02
  const rise = (val) => ({
    opacity: val,
    transform: [
      { translateY: val.interpolate({ inputRange: [0, 1], outputRange: [markH * 0.1, 0] }) },
      { scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  })
  const fadeUp = (val, distance) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  })
  const layer = [StyleSheet.absoluteFill, { width: markW, height: markH }]
  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { opacity: v.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
      ]}
    >
      {/* Fase 1: marca ANDRE100 */}
      <Animated.View
        style={[
          styles.center,
          {
            flexDirection: landscape ? 'row' : 'column',
            gap: landscape ? width * 0.1 : height * 0.06,
            opacity: v.brandOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }),
            transform: [{ scale: v.brandOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }],
          },
        ]}
      >
        <View style={{ width: markW, height: markH }}>
          <Animated.Image source={LAYERS.l1} style={[layer, rise(v.l1)]} />
          <Animated.Image source={LAYERS.l2} style={[layer, rise(v.l2)]} />
          <Animated.Image source={LAYERS.core} style={[layer, rise(v.core)]} />
          <Animated.Image
            source={LAYERS.outline}
            style={[
              layer,
              {
                opacity: v.outline,
                transform: [{ scale: v.outline.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] }) }],
              },
            ]}
          />
        </View>

        <View style={styles.wordmark}>
          <View style={{ flexDirection: 'row', gap: dot * 1.1, marginBottom: dot * 1.1 }}>
            {v.dots.map((d, i) => (
              <Animated.View
                key={i}
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                  backgroundColor: BLUE,
                  opacity: d,
                  transform: [{ scale: d }],
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row' }} accessible accessibilityLabel="ANDRE100">
            {BRAND.map((ch, i) => (
              <Animated.Text
                key={i}
                allowFontScaling={false}
                style={[
                  styles.brandLetter,
                  { fontSize: nameSize, lineHeight: nameSize * 1.15, letterSpacing: nameSize * 0.035 },
                  fadeUp(v.letters[i], nameSize * 0.45),
                ]}
              >
                {ch}
              </Animated.Text>
            ))}
          </View>

          <Animated.View style={[styles.rule, { marginTop: dot * 1.1, transform: [{ scaleX: v.rule }] }]} />
        </View>
      </Animated.View>

      {/* Fase 2: app (círculo que cresce a partir do centro) */}
      <Animated.View
        style={{
          position: 'absolute',
          left: (width - diameter) / 2,
          top: (height - diameter) / 2,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: appBackground,
          transform: [{ scale: v.reveal }],
        }}
      />

      <View style={[styles.center, { gap: height * 0.032 }]}>
        <Animated.View
          style={[
            styles.iconShadow,
            {
              width: iconSize,
              height: iconSize,
              borderRadius: iconSize * 0.22,
              backgroundColor: appBackground,
              opacity: v.icon,
              transform: [{ scale: v.icon.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
            },
          ]}
        >
          <Image
            source={appIcon}
            accessibilityLabel={appName}
            style={{ width: iconSize, height: iconSize, borderRadius: iconSize * 0.22 }}
          />
        </Animated.View>

        <Animated.Text
          allowFontScaling={false}
          style={[styles.appName, { color: appForeground, fontSize: appNameSize }, fadeUp(v.name, appNameSize * 0.6)]}
        >
          {appName}
        </Animated.Text>

        <Animated.View style={{ flexDirection: 'row', gap: loaderDot * 0.8, opacity: v.loader }}>
          {v.bounce.map((d, i) => (
            <Animated.View
              key={i}
              style={{
                width: loaderDot,
                height: loaderDot,
                borderRadius: loaderDot / 2,
                backgroundColor: appForeground,
                opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -loaderDot * 0.7] }) }],
              }}
            />
          ))}
        </Animated.View>
      </View>

      {/* Assinatura */}
      <Animated.View
        style={[
          styles.signatureWrap,
          { bottom: Math.max(24, height * 0.04) + bottomInset },
          fadeUp(v.signature, sigSize),
        ]}
      >
        <View
          style={[
            styles.signature,
            { paddingVertical: sigSize * 0.5, paddingHorizontal: sigSize * 0.9, gap: sigSize * 0.6 },
          ]}
        >
          <Image source={LAYERS.full} style={{ width: sigSize * 1.8, height: (sigSize * 1.8) / MARK_RATIO }} />
          <Text
            allowFontScaling={false}
            style={[styles.signatureText, { fontSize: sigSize, letterSpacing: sigSize * 0.08 }]}
          >
            ANDRE100
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  root: {
    backgroundColor: NAVY,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  wordmark: {
    alignItems: 'center',
  },
  brandLetter: {
    color: INK,
    fontWeight: '600',
  },
  rule: {
    alignSelf: 'stretch',
    marginHorizontal: '7%',
    height: 2,
    backgroundColor: '#24508f',
  },
  iconShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  appName: {
    fontWeight: '600',
    textAlign: 'center',
  },
  signatureWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: NAVY,
  },
  signatureText: {
    color: INK,
    fontWeight: '600',
  },
})
export default AndreSplash
