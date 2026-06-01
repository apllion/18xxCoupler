// ActionToast — shows brief notifications when actions happen.
// Remote actions: prominent. Local actions: subtle confirmation.
// Uses actionLog as source — no separate logging.

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { DEVICE_ID } from '../../hooks/useDispatch.js'

export default function ActionToast() {
  const showToasts = useUIStore((s) => s.showToasts)
  const logLength = useGameStore((s) => s.game?.actionLog?.length || 0)
  const [toasts, setToasts] = useState([])
  const lastSeen = useRef(0)

  useEffect(() => {
    if (!showToasts) return
    const game = useGameStore.getState().game
    if (!game?.actionLog) return

    const log = game.actionLog
    if (lastSeen.current === 0) {
      // First render — don't toast all existing actions
      lastSeen.current = log.length
      return
    }

    // New entries since last check
    const newEntries = log.slice(lastSeen.current)
    lastSeen.current = log.length

    if (newEntries.length === 0) return

    const newToasts = newEntries.map(entry => {
      const isLocal = entry.source?.device === DEVICE_ID
      const playerName = entry.source?.player
        ? game.players.find(p => p.id === entry.source.player)?.name
        : null
      return {
        id: entry.id,
        description: entry.description || entry.action.type,
        playerName,
        isLocal,
        timestamp: Date.now(),
      }
    })

    setToasts(prev => [...prev, ...newToasts].slice(-3))
  }, [logLength, showToasts])

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => Date.now() - t.timestamp < 4000))
    }, 1000)
    return () => clearTimeout(timer)
  }, [toasts])

  if (!showToasts || toasts.length === 0) return null

  return (
    <div className="fixed top-2 right-2 left-2 sm:left-auto sm:w-80 z-[60] space-y-1 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`rounded-lg px-3 py-2 shadow-lg text-sm pointer-events-auto transition-opacity ${
            t.isLocal
              ? 'bg-broker-surface/90 border border-broker-border text-broker-text-muted'
              : 'bg-broker-gold/90 text-broker-bg font-medium'
          }`}>
          {t.playerName && <span className="font-bold mr-1">{t.playerName}:</span>}
          {t.description}
        </div>
      ))}
    </div>
  )
}
