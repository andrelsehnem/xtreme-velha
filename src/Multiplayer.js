// Multiplayer LAN: a tela de abrir/entrar numa sala e a partida em rede.
// A partida usa os mesmos componentes do modo clássico local.

import { useEffect, useRef, useState } from 'react'
import { Actions, Button, Card, ClassicBoard, Field, GameScreen, Info, Screen, Status } from './components'
import { classicResult, classicStatus } from './engine'
import { createHost, joinHost, lanUnavailableReason } from './lan'

const TITLE = 'Multiplayer LAN'
const DEFAULT_PORT = '7070'
const IDLE_MESSAGE = 'Escolha criar ou entrar em uma sala LAN.'

function parsePort(text) {
  const port = Number(text)
  return /^\d+$/.test(text.trim()) && port >= 1024 && port <= 65535 ? port : null
}

function isIpAddress(text) {
  const parts = text.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function PortField({ value, onChangeText }) {
  return <Field label="Porta" value={value} onChangeText={onChangeText} keyboardType="number-pad" maxLength={5} />
}

/** Formulário para criar uma sala ou entrar em uma. Com `busy`, só mostra o andamento e o botão de cancelar. */
function Lobby({ message, error, busy, onCreate, onJoin, onCancel, onBack }) {
  const [name, setName] = useState('Jogador')
  const [hostPort, setHostPort] = useState(DEFAULT_PORT)
  const [joinIp, setJoinIp] = useState('')
  const [joinPort, setJoinPort] = useState(DEFAULT_PORT)
  const [formError, setFormError] = useState('')

  const playerName = name.trim() || 'Jogador'

  function create() {
    const port = parsePort(hostPort)
    if (!port) return setFormError('Porta da sala inválida. Use um valor entre 1024 e 65535.')
    setFormError('')
    onCreate({ name: playerName, port })
  }

  function join() {
    const host = joinIp.trim()
    const port = parsePort(joinPort)
    if (!isIpAddress(host)) return setFormError('IP do host inválido. Use o formato 192.168.0.10.')
    if (!port) return setFormError('Porta do host inválida. Use um valor entre 1024 e 65535.')
    setFormError('')
    onJoin({ name: playerName, host, port })
  }

  if (busy) {
    return (
      <Screen title={TITLE} onBack={onCancel}>
        <Status text={message} />
        <Actions>
          <Button label="Cancelar" variant="secondary" onPress={onCancel} />
        </Actions>
      </Screen>
    )
  }

  return (
    <Screen title={TITLE} onBack={onBack}>
      <Status text={message} />
      {formError || error ? <Info error>{formError || error}</Info> : null}
      <Card title="Seu nome">
        <Field label="Nome do jogador" value={name} onChangeText={setName} maxLength={24} />
      </Card>
      <Card title="Criar sala">
        <PortField value={hostPort} onChangeText={setHostPort} />
        <Button label="Criar sala LAN (host)" onPress={create} />
      </Card>
      <Card title="Entrar em uma sala">
        <Field
          label="IP do host"
          value={joinIp}
          onChangeText={setJoinIp}
          placeholder="192.168.0.10"
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={15}
        />
        <PortField value={joinPort} onChangeText={setJoinPort} />
        <Button label="Entrar na sala" onPress={join} />
      </Card>
    </Screen>
  )
}

export default function Multiplayer({ onBack }) {
  // Navegador e Expo Go não têm sockets TCP (ver lan.js e lan.web.js).
  if (lanUnavailableReason) {
    return (
      <Screen title={TITLE} onBack={onBack}>
        <Status text={lanUnavailableReason} />
      </Screen>
    )
  }
  return <LanMatch onBack={onBack} />
}

function LanMatch({ onBack }) {
  const sessionRef = useRef(null)
  const attemptRef = useRef(0) // invalida respostas de tentativas canceladas ou antigas
  const inMatchRef = useRef(false) // o convidado já recebeu o estado da sala
  const [session, setSession] = useState(null) // { me, port, ip? | host?, name? }
  const [state, setState] = useState(null) // estado compartilhado; null enquanto não entrou na sala
  const [busy, setBusy] = useState(false) // abrindo sala ou conectando
  const [online, setOnline] = useState(false)
  const [message, setMessage] = useState(IDLE_MESSAGE)
  const [error, setError] = useState('')

  function closeSession() {
    attemptRef.current += 1
    sessionRef.current?.close()
    sessionRef.current = null
  }

  useEffect(() => closeSession, [])

  /** Volta para o formulário, opcionalmente mostrando por que a sessão acabou. */
  function backToLobby(reason = '') {
    closeSession()
    inMatchRef.current = false
    setSession(null)
    setState(null)
    setBusy(false)
    setOnline(false)
    setMessage(IDLE_MESSAGE)
    setError(reason)
  }

  async function create({ name, port }) {
    closeSession()
    const attempt = attemptRef.current
    setError('')
    setBusy(true)
    setMessage('Abrindo a sala...')
    try {
      const host = await createHost({ port, name, onState: setState, onError: setError })
      if (attempt !== attemptRef.current) return host.close()
      sessionRef.current = host
      setSession({ me: host.me, ip: host.ip, port: host.port })
      setOnline(true)
      setBusy(false)
    } catch {
      if (attempt === attemptRef.current) {
        backToLobby(`Não foi possível abrir a sala na porta ${port}. Ela pode estar em uso; tente outra.`)
      }
    }
  }

  function join({ name, host, port }) {
    closeSession()
    const attempt = attemptRef.current
    const current = () => attempt === attemptRef.current
    setError('')
    setBusy(true)
    setMessage(`Conectando em ${host}:${port}...`)

    sessionRef.current = joinHost({
      host,
      port,
      name,
      onState: (next) => {
        if (!current()) return
        inMatchRef.current = true
        setState(next)
        setSession({ me: 'O', host, port, name })
        setOnline(true)
        setBusy(false)
      },
      onError: (reason) => {
        if (!current()) return
        sessionRef.current = null
        if (!inMatchRef.current) return backToLobby(reason)
        // Caiu no meio de uma partida: mantém o tabuleiro e oferece reconectar.
        setBusy(false)
        setOnline(false)
        setError(reason)
      },
    })
  }

  if (!session || !state) {
    return (
      <Lobby
        message={message}
        error={error}
        busy={busy}
        onCreate={create}
        onJoin={join}
        onCancel={() => backToLobby()}
        onBack={onBack}
      />
    )
  }

  const isHost = session.me === 'X'
  const game = state.game
  const { winner, draw } = classicResult(game)
  const myTurn = online && !busy && state.connected && !winner && !draw && game.currentPlayer === session.me

  const nameOf = (p) => `${state.names[p] ?? 'Aguardando...'}${p === session.me ? ' (você)' : ''}`
  const names = { X: nameOf('X'), O: nameOf('O') }

  const status = busy
    ? 'Reconectando...'
    : !online
    ? 'Conexão perdida.'
    : !state.connected
    ? 'Aguardando o segundo jogador...'
    : winner || draw
    ? classicStatus(game)
    : myTurn
    ? `Sua vez (${session.me})`
    : `Vez do adversário (${game.currentPlayer})`

  return (
    <GameScreen
      title={TITLE}
      status={status}
      turn={winner || draw ? null : game.currentPlayer}
      winner={winner}
      names={names}
      onReset={() => sessionRef.current?.reset()}
      backLabel="Encerrar sessão"
      onBack={() => backToLobby()}
      header={
        <Card title={isHost ? 'Sala criada' : 'Sessão LAN'}>
          {isHost ? (
            <>
              <Info>IP: {session.ip}</Info>
              <Info>Porta: {session.port}</Info>
            </>
          ) : (
            <Info>
              Host: {session.host}:{session.port}
            </Info>
          )}
          <Info>Você joga com {session.me}</Info>
        </Card>
      }
      extraActions={
        !isHost && !online && !busy ? (
          <Button label="Reconectar" variant="secondary" onPress={() => join(session)} />
        ) : null
      }
    >
      <ClassicBoard cells={game.board} enabled={myTurn} onPlay={(i) => sessionRef.current?.play(i)} />
      {error ? <Info error>{error}</Info> : null}
    </GameScreen>
  )
}
