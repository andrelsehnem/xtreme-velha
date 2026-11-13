// Partida em rede local por TCP: uma mensagem JSON por linha.
// O host guarda o estado da partida e valida as jogadas; o convidado só envia pedidos.
//
// Estado compartilhado: { game, names: { X, O }, connected }
// Convidado → host: { type: 'join', name } | { type: 'move', cell } | { type: 'reset' }
// Host → convidado: { type: 'state', state } | { type: 'error', message }

import * as Network from 'expo-network'
import { NativeModules } from 'react-native'
import TcpSocket from 'react-native-tcp-socket'
import { newClassic, playClassic } from './engine'

// Os sockets TCP são código nativo que só existe no app compilado deste projeto.
// No Expo Go o módulo não está lá, e usar a biblioteca derrubaria o app.
export const lanUnavailableReason = NativeModules.TcpSockets
  ? null
  : 'O multiplayer LAN não funciona no Expo Go. Instale o app do jogo neste aparelho (pnpm android).'

function send(socket, message) {
  try {
    socket.write(JSON.stringify(message) + '\n')
  } catch {
    // socket já fechado
  }
}

function onMessages(socket, handler) {
  let buffer = ''
  socket.setEncoding('utf8')
  socket.on('data', (chunk) => {
    buffer += chunk
    let end
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + 1)
      let message = null
      try {
        message = JSON.parse(line)
      } catch {
        // linha inválida: ignora
      }
      if (message && typeof message === 'object') handler(message)
    }
  })
}

/** Abre a sala. O host joga com X. */
export async function createHost({ port, name, onState, onError }) {
  let state = { game: newClassic(), names: { X: name, O: null }, connected: false }
  let guest = null

  const publish = (next) => {
    state = next
    onState(state)
    if (guest) send(guest, { type: 'state', state })
  }

  const move = (player, cell) => {
    if (!state.connected || state.game.currentPlayer !== player) return
    const game = playClassic(state.game, cell)
    if (game !== state.game) publish({ ...state, game })
  }

  const reset = () => publish({ ...state, game: newClassic() })

  const server = TcpSocket.createServer((socket) => {
    if (guest) {
      socket.end(JSON.stringify({ type: 'error', message: 'A sala já está com 2 jogadores.' }) + '\n')
      return
    }
    guest = socket

    onMessages(socket, (message) => {
      if (message.type === 'join') {
        const guestName = String(message.name || 'Jogador 2').slice(0, 24)
        publish({ ...state, names: { ...state.names, O: guestName }, connected: true })
      } else if (message.type === 'move') {
        move('O', message.cell)
      } else if (message.type === 'reset') {
        reset()
      }
    })

    const drop = () => {
      if (guest !== socket) return
      guest = null
      publish({ ...state, connected: false })
    }
    socket.on('close', drop)
    socket.on('error', drop)
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen({ port, host: '0.0.0.0', reuseAddress: true }, resolve)
  })
  server.on('error', () => onError('Erro no servidor da sala.'))

  onState(state)

  return {
    me: 'X',
    ip: await Network.getIpAddressAsync().catch(() => '0.0.0.0'),
    port,
    play: (cell) => move('X', cell),
    reset,
    close: () => {
      if (guest) guest.destroy()
      guest = null
      server.close()
    },
  }
}

const CONNECT_TIMEOUT_MS = 8000

/**
 * Entra numa sala. O convidado joga com O.
 * `onError` é chamado uma única vez, quando a conexão falha ou cai; depois disso a sessão está encerrada.
 */
export function joinHost({ host, port, name, onState, onError }) {
  let joined = false
  let finished = false
  let timer = null

  const socket = TcpSocket.createConnection({ host, port, connectTimeout: CONNECT_TIMEOUT_MS }, () =>
    send(socket, { type: 'join', name })
  )

  const finish = (message) => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    socket.destroy()
    if (message) onError(message)
  }

  const connectionLost = () =>
    finish(
      joined
        ? 'A conexão com o host caiu.'
        : `Não foi possível conectar em ${host}:${port}. Confira o IP e a porta, e se os dois aparelhos estão na mesma rede Wi-Fi.`
    )

  // Um IP que não existe na rede não responde nada: sem este limite a tentativa ficaria pendurada.
  timer = setTimeout(connectionLost, CONNECT_TIMEOUT_MS)

  onMessages(socket, (message) => {
    if (message.type === 'state') {
      joined = true
      clearTimeout(timer)
      onState(message.state)
    } else if (message.type === 'error') {
      finish(String(message.message))
    }
  })
  socket.on('error', connectionLost)
  socket.on('close', connectionLost)

  return {
    me: 'O',
    play: (cell) => send(socket, { type: 'move', cell }),
    reset: () => send(socket, { type: 'reset' }),
    close: () => finish(null),
  }
}
