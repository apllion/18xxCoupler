// UI store — tab selection, active player, transient UI state.
// Only truly local view state lives here. Turn tracking is in gameStore (syncs with peers).

import { create } from 'zustand'

export const useUIStore = create((set) => ({
  activeTab: 'overview',   // 'overview' | 'market' | 'corps' | 'privates' | 'summary'
  activePlayerId: null,     // which player is "current" (soft, for filtering actions)
  myPlayerId: null,         // "I am this player" — locks share actions to this player
  activeCorpSym: null,      // which corp is selected in Corps tab
  showLog: false,
  turnTracking: 'off',      // 'on' | 'off' — dormant for now

  // Configurable automation
  autoConfig: {
    advanceOnAllPass: false,    // auto-advance SR when all players passed
    advanceOnCorpDone: false,   // auto-next corp after revenue+train
    collectPrivates: false,     // auto-collect private revenue at OR start
    soldOutAdjust: false,       // auto-sold-out adjustment at OR end
    presidentSwap: false,       // auto-swap presidency on share majority
    superUmpire: false,          // show ALL actions regardless of context
  },
  setAutoConfig: (key, value) => set((s) => ({
    autoConfig: { ...s.autoConfig, [key]: value },
  })),

  skin: 'broker',            // 'broker' | 'moderator' — which chrome to use for detail tabs
  setActiveTab: (tab) => set((s) => ({
    activeTab: tab,
    skin: tab === 'overview' ? 'broker' : tab === 'moderator' ? 'moderator' : s.skin,
  })),
  setActivePlayer: (id) => set({ activePlayerId: id }),
  setMyPlayer: (id) => set({ myPlayerId: id }),
  setActiveCorp: (sym) => set({ activeCorpSym: sym }),
  toggleLog: () => set((s) => ({ showLog: !s.showLog })),
  toggleTurnTracking: () => set((s) => ({
    turnTracking: s.turnTracking === 'on' ? 'off' : 'on',
  })),
}))
