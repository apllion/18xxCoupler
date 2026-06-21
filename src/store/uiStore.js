// UI store — tab selection, active player, transient UI state.
// Only truly local view state lives here. Turn tracking is in gameStore (syncs with peers).

import { create } from 'zustand'

export const useUIStore = create((set) => ({
  activeTab: 'overview',   // 'overview' | 'market' | 'corps' | 'privates' | 'summary'
  activePlayerId: null,     // which player is "current" (soft, for filtering actions)
  // myPlayerId removed — umpire is always umpire mode. Driver/mobile uses its own driverPlayerId.
  activeCorpSym: null,      // which corp is selected in Corps tab
  showLog: import.meta.env.DEV,
  showToasts: true,
  turnTracking: 'off',      // 'on' | 'off' — dormant for now
  plusPlus: !!import.meta.env.VITE_PLUSPLUS || import.meta.env.DEV,

  // Configurable automation
  autoConfig: {
    advanceOnAllPass: false,    // auto-advance SR when all players passed
    advanceOnCorpDone: false,   // auto-next corp after revenue+train
    collectPrivates: false,     // auto-collect private revenue at OR start
    soldOutAdjust: false,       // auto-sold-out adjustment at OR end
    presidentSwap: false,       // auto-swap presidency on share majority
    superUmpire: false,          // show ALL actions regardless of context
    limitMode: 'warn',           // 'ignore' | 'warn' | 'block' — how to handle limit violations
  },
  setAutoConfig: (key, value) => set((s) => ({
    autoConfig: { ...s.autoConfig, [key]: value },
  })),

  viewMode: 'umpire',       // 'umpire' | 'mobile'
  readyToPlay: false,        // true after user picks Umpire/Driver from hub
  setViewMode: (mode) => set({ viewMode: mode, readyToPlay: true }),
  backToHub: () => set({ readyToPlay: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActivePlayer: (id) => set({ activePlayerId: id }),
  setActiveCorp: (sym) => set({ activeCorpSym: sym }),
  routeRevenue: null, // { corpSym, revenue } — set by route calc, consumed by corp view
  setRouteRevenue: (corpSym, revenue) => set({ routeRevenue: { corpSym, revenue } }),
  savedRoutes: {}, // { [corpSym]: { stops, trains } } — persisted route calc state per corp
  saveRoutes: (corpSym, data) => set((s) => ({ savedRoutes: { ...s.savedRoutes, [corpSym]: data } })),
  toggleLog: () => set((s) => ({ showLog: !s.showLog })),
  toggleTurnTracking: () => set((s) => ({
    turnTracking: s.turnTracking === 'on' ? 'off' : 'on',
  })),
}))
