// Returns syncDispatch (broadcasts to peers) when in a room,
// falls back to raw dispatch when offline.
// In what-if mode, always uses raw dispatch (no sync).

import { useGameStore } from '../store/gameStore.js'
import { useSyncContext } from './SyncContext.jsx'

export function useDispatch() {
  const rawDispatch = useGameStore((s) => s.dispatch)
  const whatIfSnapshot = useGameStore((s) => s.whatIfSnapshot)
  const sync = useSyncContext()

  // Suppress sync in what-if mode — changes are local only
  if (whatIfSnapshot) return rawDispatch
  return sync?.syncDispatch || rawDispatch
}
