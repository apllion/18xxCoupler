// Role store — which role this device plays in the game session.
// Persists to localStorage so a refresh keeps you in the same role.

import { create } from 'zustand'

const STORAGE_KEY = 'laytrack_role'

const saved = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
})()

export const useRoleStore = create((set) => ({
  role: saved.role || null,       // 'umpire' | 'player' | 'kibitzer' | 'display' | null
  playerId: saved.playerId || null, // which player this device represents (for 'player' role)

  setRole: (role) => {
    set((s) => {
      const next = { role, playerId: role === 'player' ? s.playerId : null }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* no-op */ }
      return next
    })
  },

  setPlayerId: (id) => {
    set((s) => {
      const next = { ...s, playerId: id }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: s.role, playerId: id })) } catch { /* no-op */ }
      return { playerId: id }
    })
  },

  reset: () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* no-op */ }
    set({ role: null, playerId: null })
  },
}))
