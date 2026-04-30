import { useMemo, useState } from 'react'
import './App.css'

type Player = 'X' | 'O'
type Cell = Player | null

const WINNING_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function getWinner(board: Cell[]): Player | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}

function isBoardDone(board: Cell[], winner: Cell): boolean {
  return winner !== null || board.every((c) => c !== null)
}

// ── Inner board component ────────────────────────────────────────────────────

interface InnerBoardProps {
  cells: Cell[]
  winner: Cell
  isActive: boolean
  onCellClick: (cellIndex: number) => void
}

function InnerBoard({ cells, winner, isActive, onCellClick }: InnerBoardProps) {
  if (winner) {
    return (
      <div className={`inner-board won won-${winner.toLowerCase()}`}>
        <span className="meta-winner-symbol">{winner}</span>
      </div>
    )
  }

  const drawn = cells.every((c) => c !== null)
  if (drawn) {
    return (
      <div className="inner-board drawn">
        <span className="meta-winner-symbol drawn-symbol">—</span>
      </div>
    )
  }

  return (
    <div className={`inner-board${isActive ? ' active' : ''}`}>
      {cells.map((cell, i) => (
        <button
          key={i}
          type="button"
          className={`cell${cell ? ` cell-${cell.toLowerCase()}` : ''}`}
          onClick={() => isActive && onCellClick(i)}
          disabled={!!cell || !isActive}
          aria-label={`Célula ${i + 1}`}
        >
          {cell}
        </button>
      ))}
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

const EMPTY_BOARDS = (): Cell[][] =>
  Array.from({ length: 9 }, () => Array(9).fill(null))

export default function App() {
  const [boards, setBoards] = useState<Cell[][]>(EMPTY_BOARDS())
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X')
  const [activeBoard, setActiveBoard] = useState<number | null>(null)

  const metaBoard: Cell[] = useMemo(
    () => boards.map((b) => getWinner(b)),
    [boards]
  )

  const globalWinner = useMemo(() => getWinner(metaBoard), [metaBoard])

  const globalDraw = useMemo(
    () =>
      !globalWinner &&
      boards.every((b, i) => metaBoard[i] !== null || b.every((c) => c !== null)),
    [globalWinner, metaBoard, boards]
  )

  function handleCellClick(boardIndex: number, cellIndex: number) {
    if (globalWinner || globalDraw) return
    if (activeBoard !== null && activeBoard !== boardIndex) return
    if (metaBoard[boardIndex] !== null) return
    if (boards[boardIndex][cellIndex] !== null) return

    const nextBoards = boards.map((b, bi) =>
      bi === boardIndex
        ? b.map((c, ci) => (ci === cellIndex ? currentPlayer : c))
        : b
    )
    setBoards(nextBoards)

    const nextMetaWinner = getWinner(nextBoards[cellIndex])
    const nextBoardDone = isBoardDone(nextBoards[cellIndex], nextMetaWinner)
    setActiveBoard(nextBoardDone ? null : cellIndex)

    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
  }

  function resetGame() {
    setBoards(EMPTY_BOARDS())
    setCurrentPlayer('X')
    setActiveBoard(null)
  }

  const status = globalWinner
    ? `🏆 Vencedor: Jogador ${globalWinner}`
    : globalDraw
    ? '🤝 Empate!'
    : activeBoard !== null
    ? `Vez de ${currentPlayer} — jogue no quadrado ${activeBoard + 1}`
    : `Vez de ${currentPlayer} — qualquer quadrado`

  return (
    <main className="app">
      <h1>Extreme Velha</h1>
      <p className={`status status-${currentPlayer.toLowerCase()}`}>{status}</p>

      <section className="outer-board" aria-label="Tabuleiro externo">
        {boards.map((cells, bi) => {
          const isActive =
            !globalWinner &&
            !globalDraw &&
            metaBoard[bi] === null &&
            !cells.every((c) => c !== null) &&
            (activeBoard === null || activeBoard === bi)

          return (
            <div
              key={bi}
              className={[
                'meta-square',
                isActive ? 'meta-active' : '',
                metaBoard[bi] ? `meta-won-${metaBoard[bi]!.toLowerCase()}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <InnerBoard
                cells={cells}
                winner={metaBoard[bi]}
                isActive={isActive}
                onCellClick={(ci) => handleCellClick(bi, ci)}
              />
            </div>
          )
        })}
      </section>

      <button type="button" className="reset" onClick={resetGame}>
        Reiniciar
      </button>
    </main>
  )
}
