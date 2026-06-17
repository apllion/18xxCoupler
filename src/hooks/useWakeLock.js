// Wake Lock — keeps screen on during game sessions.
// Uses Screen Wake Lock API with localStorage persistence and visibilitychange re-activation.

import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = '18xxCoupler_wakeLock'

export function useWakeLock() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'on' } catch { return false }
  })
  const [active, setActive] = useState(false)
  const lockRef = useRef(null)
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  const acquire = useCallback(async () => {
    if (!supported || !enabled) return
    try {
      lockRef.current = await navigator.wakeLock.request('screen')
      setActive(true)
      lockRef.current.addEventListener('release', () => setActive(false))
    } catch { /* no-op — user denied or not supported */ }
  }, [supported, enabled])

  const release = useCallback(() => {
    if (lockRef.current) {
      lockRef.current.release()
      lockRef.current = null
    }
    setActive(false)
  }, [])

  // Acquire/release when enabled changes
  useEffect(() => {
    if (enabled) acquire()
    else release()
    return release
  }, [enabled, acquire, release])

  // Re-acquire on tab visibility change
  useEffect(() => {
    if (!enabled) return
    function onVisible() {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [enabled, acquire])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off') } catch { /* no-op */ }
  }

  return { supported, enabled, active, toggle }
}
