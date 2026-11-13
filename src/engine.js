// Regras do jogo, sem nada de interface. Usado pelos modos local e multiplayer.

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

const emptyBoard = () => Array(9).fill(null)
const other = (player) => (player === 'X' ? 'O' : 'X')
const isFull = (board) => board.every((cell) => cell !== null)

export function getWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

// ── Clássico ──────────────────────────────────────────────────────────────

export const newClassic = () => ({ board: emptyBoard(), currentPlayer: 'X' })

export function classicResult({ board }) {
  const winner = getWinner(board)
  return { winner, draw: !winner && isFull(board) }
}

export function classicStatus(game) {
  const { winner, draw } = classicResult(game)
  if (winner) return `🏆 Vencedor: Jogador ${winner}`
  if (draw) return '🤝 Empate!'
  return `Vez de ${game.currentPlayer}`
}

/** Devolve o novo estado, ou o mesmo objeto se a jogada for inválida. */
export function playClassic(state, cell) {
  const { winner, draw } = classicResult(state)
  if (winner || draw || state.board[cell] !== null) return state
  return {
    board: state.board.map((c, i) => (i === cell ? state.currentPlayer : c)),
    currentPlayer: other(state.currentPlayer),
  }
}

// ── X-Treme (9 tabuleiros) ────────────────────────────────────────────────

export const newXtreme = () => ({
  boards: Array.from({ length: 9 }, emptyBoard),
  currentPlayer: 'X',
  activeBoard: null, // null = pode jogar em qualquer tabuleiro
})

export function xtremeResult({ boards }) {
  const meta = boards.map(getWinner)
  const winner = getWinner(meta)
  const draw = !winner && boards.every((b, i) => meta[i] !== null || isFull(b))
  const conquered = { X: meta.filter((w) => w === 'X').length, O: meta.filter((w) => w === 'O').length }
  const tiebreak = !draw || conquered.X === conquered.O ? null : conquered.X > conquered.O ? 'X' : 'O'
  return { meta, winner, draw, conquered, tiebreak }
}

export function isBoardPlayable(state, result, boardIndex) {
  return (
    !result.winner &&
    !result.draw &&
    result.meta[boardIndex] === null &&
    !isFull(state.boards[boardIndex]) &&
    (state.activeBoard === null || state.activeBoard === boardIndex)
  )
}

export function playXtreme(state, boardIndex, cell) {
  if (!isBoardPlayable(state, xtremeResult(state), boardIndex)) return state
  if (state.boards[boardIndex][cell] !== null) return state

  const boards = state.boards.map((b, bi) =>
    bi === boardIndex ? b.map((c, ci) => (ci === cell ? state.currentPlayer : c)) : b
  )
  // A célula jogada manda o adversário para o tabuleiro de mesmo índice.
  const target = boards[cell]
  const targetDone = getWinner(target) !== null || isFull(target)
  return { boards, currentPlayer: other(state.currentPlayer), activeBoard: targetDone ? null : cell }
}
