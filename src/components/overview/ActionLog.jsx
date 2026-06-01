// ActionLog — action log view, accessible from More menu.
// Shows all state changes with timestamp, description, source device/view.

import { useGameStore } from '../../store/gameStore.js'

export default function ActionLog() {
  const game = useGameStore((s) => s.game)

  if (!game) return null

  const log = game.actionLog || []
  const recent = log.slice().reverse()

  return (
    <div className="p-3 space-y-1 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-broker-text">Action Log ({log.length})</span>
      </div>
      {recent.length === 0 && <div className="text-broker-text-muted py-4 text-center">No actions yet</div>}
      {recent.map(entry => {
        const time = new Date(entry.timestamp)
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        const src = entry.source
        return (
          <div key={entry.id} className="flex gap-2 py-1 border-b border-broker-border/20">
            <span className="text-broker-text-muted/50 w-16 flex-shrink-0">{timeStr}</span>
            <span className="text-broker-text flex-1">{entry.description || entry.action.type}</span>
            {src && (
              <span className="text-broker-text-muted/40 flex-shrink-0 text-right">
                {src.player && <span>{src.player} </span>}
                <span>@{src.device}</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
