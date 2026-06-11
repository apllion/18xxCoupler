import { useGameStore } from '../../store/gameStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { currentPhase } from '../../engine/phase.js'
import { getEventInfo } from '../../engine/events.js'
import { formatCurrency } from '../../utils/currency.js'

export default function Header() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)
  const canUndo = useGameStore((s) => s.canUndo)
  const canRedo = useGameStore((s) => s.canRedo)


  // What-if mode
  const whatIfSnapshot = useGameStore((s) => s.whatIfSnapshot)
  const enterWhatIf = useGameStore((s) => s.enterWhatIf)
  const exitWhatIf = useGameStore((s) => s.exitWhatIf)
  const isWhatIf = !!whatIfSnapshot

  // Replay
  const fullLog = useGameStore((s) => s.fullLog)
  const enterReplay = useGameStore((s) => s.enterReplay)
  const exitReplay = useGameStore((s) => s.exitReplay)
  const replayTo = useGameStore((s) => s.replayTo)
  const inReplay = fullLog !== null

  if (!game) return null

  const phase = currentPhase(game.phaseManager)
  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const rt = game.roundTracker
  const roundTypes = rt?.roundTypes || ['SR', 'OR']
  const currentRoundType = rt?.roundType || 'SR'

  function handleUndo() {
    undo()
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-broker-surface border-b border-broker-border px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{game.title.title}</span>
            <span className="text-xs bg-broker-surface-hover px-2 py-0.5 rounded">Phase {phase.name}</span>
            <div className="flex">
              {roundTypes.map((rType) => {
                const active = rType === currentRoundType
                const colors = active
                  ? rType === 'SR' ? 'bg-broker-green text-broker-gold'
                    : rType === 'OR' ? 'bg-amber-900 text-amber-200'
                    : rType === 'Pregame' ? 'bg-purple-800 text-purple-200'
                    : 'bg-blue-800 text-blue-200'
                  : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'
                return (
                  <button
                    key={rType}
                    onClick={() => dispatch({ type: 'SET_ROUND', roundType: rType })}
                    className={`text-sm font-medium px-2 py-0.5 first:rounded-l last:rounded-r border-r border-broker-border last:border-r-0 transition-colors ${colors}`}
                  >
                    {rType}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs ${game.bank.broken ? 'text-red-400 font-bold' : 'text-broker-text-muted'}`}>
              Bank: {fmt(game.bank.cash)}
            </span>

            {/* What-if toggle */}
            {(
              <button
                onClick={() => isWhatIf ? exitWhatIf(true) : enterWhatIf()}
                className={`text-xs px-2.5 py-0.5 rounded transition-colors ${
                  isWhatIf
                    ? 'bg-purple-700 text-purple-100 ring-1 ring-purple-400'
                    : 'bg-broker-surface-hover text-broker-text-muted hover:text-broker-text'
                }`}
              >
                {isWhatIf ? 'Exit' : 'What-if'}
              </button>
            )}

            {/* Guided / Open toggle — dormant */}

<button
              onClick={handleUndo}
              disabled={!canUndo()}
              className="bg-broker-surface-hover hover:bg-broker-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs font-medium"
            >
              Undo
            </button>
            <button
              onClick={() => redo()}
              disabled={!canRedo()}
              className="bg-broker-surface-hover hover:bg-broker-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs font-medium"
            >
              Redo
            </button>
          </div>
        </div>
      </header>

      {/* What-if mode banner */}
      {isWhatIf && (
        <div className="bg-purple-900/80 border-b border-purple-600 px-3 py-2 flex items-center justify-between">
          <span className="text-sm text-purple-200 font-medium">What-if mode — changes are local only</span>
          <div className="flex gap-2">
            <button
              onClick={() => exitWhatIf(true)}
              className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs font-medium"
            >
              Discard
            </button>
            <button
              onClick={() => exitWhatIf(false)}
              className="text-purple-300 hover:text-purple-100 text-xs px-2"
            >
              Keep
            </button>
          </div>
        </div>
      )}

      {/* Replay bar */}
      {inReplay && (
        <div className="bg-blue-900/80 border-b border-blue-700 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-blue-200 font-medium">
              Replay {game.actionLog.length}/{fullLog.length}
              {game.actionLog.length > 0 && ` — ${game.actionLog[game.actionLog.length - 1].description}`}
            </span>
            <div className="flex gap-2">
              {!isWhatIf && (
                <button
                  onClick={() => { exitReplay(); enterWhatIf() }}
                  className="text-xs bg-purple-800 hover:bg-purple-700 text-purple-200 px-2 py-1 rounded"
                >
                  What-if
                </button>
              )}
              <button
                onClick={exitReplay}
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded"
              >
                Exit Replay
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => replayTo(Math.max(-1, game.actionLog.length - 2))}
              disabled={game.actionLog.length <= 0}
              className="text-xs px-2 py-1 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-30 text-white"
            >
              Prev
            </button>
            <input
              type="range"
              min={-1}
              max={fullLog.length - 1}
              value={game.actionLog.length - 1}
              onChange={(e) => replayTo(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-400"
            />
            <button
              onClick={() => replayTo(Math.min(fullLog.length - 1, game.actionLog.length))}
              disabled={game.actionLog.length >= fullLog.length}
              className="text-xs px-2 py-1 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-30 text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Enter replay button (when not in replay and game has actions) */}
      {!inReplay && game.actionLog.length > 0 && (
        <div className="bg-broker-surface border-b border-broker-border px-3 py-1 flex justify-end">
          <button
            onClick={enterReplay}
            className="text-xs bg-blue-900/60 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded"
          >
            Replay
          </button>
        </div>
      )}

      {/* Pending game events */}
      {game.pendingEvents?.length > 0 && (
        <EventBanner events={game.pendingEvents} dispatch={dispatch} />
      )}

    </>
  )
}

function EventBanner({ events, dispatch }) {
  return (
    <div className="space-y-0">
      {events.map((eventName) => {
        const info = getEventInfo(eventName)
        return (
          <div key={eventName} className="bg-red-900/40 border-b border-red-700/50 px-3 py-2 flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-red-200">{info.label}</div>
              <div className="text-xs text-red-300/70 mt-0.5">{info.desc}</div>
            </div>
            <button
              onClick={() => dispatch({ type: 'DISMISS_EVENT', event: eventName })}
              className="flex-shrink-0 text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded"
            >
              OK
            </button>
          </div>
        )
      })}
    </div>
  )
}

