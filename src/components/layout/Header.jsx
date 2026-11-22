import { useGameStore } from '../../store/gameStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { currentPhase, trainLimit } from '../../engine/phase.js'
import { getEventInfo } from '../../engine/events.js'
import { formatCurrency } from '../../utils/currency.js'
import { IconUndo, IconRedo } from '../shared/Icons.jsx'

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

  return (
    <>
      <header className="sticky top-0 z-10 bg-broker-surface border-b border-broker-border px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold text-base text-white">{game.title.title}</span>
          <div className="flex">
            {roundTypes.map((rType) => {
              const active = rType === currentRoundType
              const colors = active
                ? rType === 'SR' ? 'bg-green-800 text-green-200'
                  : rType === 'OR' ? 'bg-amber-800 text-amber-200'
                  : rType === 'Pregame' ? 'bg-broker-green text-white'
                  : 'bg-blue-800 text-blue-200'
                : 'bg-broker-surface-hover text-broker-text-muted'
              return (
                <span key={rType}
                  className={`text-sm font-medium px-2 py-1 min-h-[32px] flex items-center first:rounded-l last:rounded-r border-r border-broker-border last:border-r-0 ${colors}`}
                >{rType}</span>
              )
            })}
          </div>
          <span className="text-xs text-broker-text-muted whitespace-nowrap">Ph{phase.name} L{trainLimit(game.phaseManager)}</span>
          <span className={`text-xs font-medium whitespace-nowrap ${game.bank.cash <= 0 ? 'text-red-400' : 'text-broker-cash'}`}>
            Bank {fmt(game.bank.cash)}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => isWhatIf ? exitWhatIf(true) : enterWhatIf()}
              className={`text-xs px-2 py-1 min-h-[36px] rounded transition-colors ${
                isWhatIf
                  ? 'bg-amber-700 text-amber-100 ring-1 ring-amber-400'
                  : 'bg-broker-surface-hover text-broker-text-muted hover:text-broker-text'
              }`}
            >
              {isWhatIf ? 'Exit' : 'What-if'}
            </button>
            <button
              onClick={() => canUndo() && undo()}
              className="text-broker-text-muted hover:text-white p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-30"
              disabled={!canUndo()}
              title="Undo"
            >
              <IconUndo className="w-4 h-4" />
            </button>
            <button
              onClick={() => canRedo() && redo()}
              className="text-broker-text-muted hover:text-white p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-30"
              disabled={!canRedo()}
              title="Redo"
            >
              <IconRedo className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* What-if mode banner */}
      {isWhatIf && (
        <div className="bg-amber-900/80 border-b border-amber-600 px-3 py-1.5 flex items-center justify-between">
          <span className="text-sm text-amber-200 font-medium">What-if — changes are local only</span>
          <div className="flex gap-2">
            <button onClick={() => exitWhatIf(true)}
              className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs font-medium min-h-[36px]">
              Discard
            </button>
            <button onClick={() => exitWhatIf(false)}
              className="text-amber-300 hover:text-amber-100 text-xs px-2 min-h-[36px]">
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
                <button onClick={() => { exitReplay(); enterWhatIf() }}
                  className="text-xs bg-amber-700 hover:bg-amber-600 text-amber-200 px-2 py-1 rounded min-h-[36px]">
                  What-if
                </button>
              )}
              <button onClick={exitReplay}
                className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded min-h-[36px]">
                Exit Replay
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => replayTo(Math.max(-1, game.actionLog.length - 2))}
              disabled={game.actionLog.length <= 0}
              className="text-xs px-2 py-1 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-30 text-white min-h-[36px]">
              Prev
            </button>
            <input type="range" min={-1} max={fullLog.length - 1}
              value={game.actionLog.length - 1}
              onChange={(e) => replayTo(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-400" />
            <button
              onClick={() => replayTo(Math.min(fullLog.length - 1, game.actionLog.length))}
              disabled={game.actionLog.length >= fullLog.length}
              className="text-xs px-2 py-1 rounded bg-blue-800 hover:bg-blue-700 disabled:opacity-30 text-white min-h-[36px]">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Enter replay button */}
      {!inReplay && game.actionLog.length > 0 && (
        <div className="bg-broker-surface border-b border-broker-border px-3 py-1 flex justify-end">
          <button onClick={enterReplay}
            className="text-xs bg-blue-900/60 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded min-h-[36px]">
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
            <button onClick={() => dispatch({ type: 'DISMISS_EVENT', event: eventName })}
              className="flex-shrink-0 text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded min-h-[36px]">
              OK
            </button>
          </div>
        )
      })}
    </div>
  )
}
