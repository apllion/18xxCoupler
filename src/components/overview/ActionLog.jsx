// ActionLog — toggleable action log panel.
// Shows all state changes with timestamp, description, source device/view.
// Default on in dev mode, off otherwise. Toggle in settings.

import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'

export default function ActionLog() {
  const game = useGameStore((s) => s.game)
  const showLog = useUIStore((s) => s.showLog)

  if (!showLog || !game) return null

  const log = game.actionLog || []
  const recent = log.slice(-50).reverse()

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 max-h-[40vh] overflow-y-auto bg-broker-bg/95 border-t border-broker-border text-xs">
      <div className="flex items-center justify-between px-3 py-1 border-b border-broker-border sticky top-0 bg-broker-bg">
        <span className="text-broker-text-muted font-medium">Action Log ({log.length})</span>
        <button onClick={() => useUIStore.getState().toggleLog()} className="text-broker-text-muted hover:text-broker-text px-2">×</button>
      </div>
      <div className="px-3 py-1 space-y-0.5">
        {recent.length === 0 && <div className="text-broker-text-muted py-2">No actions yet</div>}
        {recent.map(entry => {
          const time = new Date(entry.timestamp)
          const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          const src = entry.source
          return (
            <div key={entry.id} className="flex gap-2 text-broker-text-muted">
              <span className="text-broker-text-muted/50 w-16 flex-shrink-0">{timeStr}</span>
              <span className="text-broker-text flex-1">{entry.description || entry.action.type}</span>
              {src && (
                <span className="text-broker-text-muted/40 flex-shrink-0">
                  {src.player && <span>{src.player} </span>}
                  {src.view && <span>{src.view} </span>}
                  <span>@{src.device}</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
