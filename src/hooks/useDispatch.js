// Returns syncDispatch (broadcasts to peers) when in a room,
// falls back to raw dispatch when offline.
// In what-if mode, always uses raw dispatch (no sync).
// Injects _source metadata for action log.

import { useCallback } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useUIStore } from '../store/uiStore.js'
import { useSyncContext } from './SyncContext.jsx'

// Device ID — stable per browser session, exported for toast comparison
export const DEVICE_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem('deviceId') || (() => { const id = Math.random().toString(36).slice(2, 8); sessionStorage.setItem('deviceId', id); return id })())
  : 'server'

export function useDispatch() {
  const rawDispatch = useGameStore((s) => s.dispatch)
  const whatIfSnapshot = useGameStore((s) => s.whatIfSnapshot)
  const activeTab = useUIStore((s) => s.activeTab)
  const sync = useSyncContext()

  const dispatch = whatIfSnapshot ? rawDispatch : (sync?.syncDispatch || rawDispatch)

  return useCallback((action) => {
    dispatch({
      ...action,
      _source: {
        device: DEVICE_ID,
        view: activeTab,
        player: useUIStore.getState().myPlayerId || null,
      },
    })
  }, [dispatch, activeTab])
}
