// Game store — Zustand + Immer.
// Action log is source of truth. Undo = rebuild state from log minus last action.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createGame } from '../engine/setup.js'
import { applyAction } from '../engine/actions.js'
import { getTitle } from '../titles/index.js'
import { saveGame } from '../utils/persistence.js'
import { importGame as importFrom18xxGamesEngine } from '../engine/import18xxGames.js'

export const useGameStore = create(
  immer((set, get) => ({
    game: null,
    saveKey: null,

    // Start a new game (with optional variant)
    startGame: (titleId, playerNames, userVariant = null) => {
      const title = getTitle(titleId)
      const game = createGame(title, playerNames, userVariant)
      const saveKey = `${titleId}_${game.createdAt}`
      set({ game, saveKey })
      saveGame(game)
    },

    // Load an existing game by rebuilding from action log
    loadGame: (savedGame) => {
      const titleId = savedGame.titleId || savedGame.title?.titleId
      const title = getTitle(titleId)
      const playerNames = savedGame.playerNames || savedGame.players?.map((p) => p.name)
      const userVariant = savedGame.userVariant || savedGame.title?.activeVariant?.id || null
      const freshGame = createGame(title, playerNames, userVariant)
      freshGame.createdAt = savedGame.createdAt

      const actions = (savedGame.actionLog || []).map((entry) => entry.action)
      for (const action of actions) {
        applyAction(freshGame, action)
      }

      const saveKey = `${titleId}_${savedGame.createdAt}`
      set({ game: freshGame, saveKey })
    },

    // Import from 18xx.games by game ID — fetches, replays, enters replay mode
    importFrom18xxGames: async (gameId) => {
      const resp = await fetch(`https://18xx.games/api/v1/game/${gameId}`)
      if (!resp.ok) throw new Error(`Game ${gameId} not found (${resp.status})`)
      const gameJson = await resp.json()
      const game = importFrom18xxGamesEngine(gameJson)
      const saveKey = `import_${gameId}`
      set({ game, saveKey })
      // Auto-enter replay mode so user can scrub through the game
      set({ fullLog: game.actionLog.map((e) => e.action) })
    },

    dispatch: (action) => {
      set((state) => {
        if (!state.game) return
        applyAction(state.game, action)
      })
      // Don't persist during what-if — changes are exploratory
      const { game, whatIfSnapshot } = get()
      if (game && !whatIfSnapshot) saveGame(game)
    },

    undo: () => {
      const { game } = get()
      if (!game || game.actionLog.length === 0) return

      const title = getTitle(game.title.titleId)
      const playerNames = game.originalPlayerNames || game.players.map((p) => p.name)
      const userVariant = game.title.activeVariant?.id || null
      const freshGame = createGame(title, playerNames, userVariant)
      freshGame.createdAt = game.createdAt

      const actions = game.actionLog.slice(0, -1).map((entry) => entry.action)
      for (const action of actions) {
        applyAction(freshGame, action)
      }

      set({ game: freshGame })
      saveGame(freshGame)
    },

    canUndo: () => {
      const { game } = get()
      return game && game.actionLog.length > 0
    },

    endGame: () => {
      set({ game: null, saveKey: null })
    },

    // What-if mode — snapshot state, explore freely, revert on exit
    whatIfSnapshot: null,

    enterWhatIf: () => {
      const { game } = get()
      if (!game) return
      // Snapshot: store the bare actions + metadata needed to rebuild
      set({
        whatIfSnapshot: {
          titleId: game.title.titleId,
          playerNames: game.originalPlayerNames || game.players.map((p) => p.name),
          userVariant: game.title.activeVariant?.id || null,
          actionLog: game.actionLog.map((e) => e.action),
          createdAt: game.createdAt,
          turnQueue: game.turnQueue,
          turnIndex: game.turnIndex,
          srPassed: game.srPassed,
          orStep: game.orStep,
          priorityDeal: game.priorityDeal,
        },
      })
    },

    exitWhatIf: (discard = true) => {
      const { whatIfSnapshot } = get()
      if (!whatIfSnapshot) { set({ whatIfSnapshot: null }); return }

      if (discard) {
        // Restore: rebuild game from snapshot
        const title = getTitle(whatIfSnapshot.titleId)
        const freshGame = createGame(title, whatIfSnapshot.playerNames, whatIfSnapshot.userVariant)
        freshGame.createdAt = whatIfSnapshot.createdAt
        for (const action of whatIfSnapshot.actionLog) {
          applyAction(freshGame, action)
        }
        // Restore turn state
        freshGame.turnQueue = whatIfSnapshot.turnQueue
        freshGame.turnIndex = whatIfSnapshot.turnIndex
        freshGame.srPassed = whatIfSnapshot.srPassed
        freshGame.orStep = whatIfSnapshot.orStep
        freshGame.priorityDeal = whatIfSnapshot.priorityDeal

        set({ game: freshGame, whatIfSnapshot: null })
        saveGame(freshGame)
      } else {
        // Keep: commit what-if changes as real
        set({ whatIfSnapshot: null })
        const { game } = get()
        if (game) saveGame(game)
      }
    },

    // Replay — rebuild game at a specific action index
    fullLog: null, // stored when entering replay mode

    enterReplay: () => {
      const { game } = get()
      if (!game) return
      set({ fullLog: game.actionLog.map((e) => e.action) })
    },

    exitReplay: () => {
      const { game, fullLog } = get()
      if (!game || !fullLog) { set({ fullLog: null }); return }
      // Rebuild to full state
      const title = getTitle(game.title.titleId)
      const playerNames = game.originalPlayerNames || game.players.map((p) => p.name)
      const userVariant = game.title.activeVariant?.id || null
      const freshGame = createGame(title, playerNames, userVariant)
      freshGame.createdAt = game.createdAt
      for (const action of fullLog) {
        applyAction(freshGame, action)
      }
      set({ game: freshGame, fullLog: null })
    },

    replayTo: (index) => {
      const { game, fullLog } = get()
      if (!game || !fullLog) return
      const title = getTitle(game.title.titleId)
      const playerNames = game.originalPlayerNames || game.players.map((p) => p.name)
      const userVariant = game.title.activeVariant?.id || null
      const freshGame = createGame(title, playerNames, userVariant)
      freshGame.createdAt = game.createdAt
      const actions = fullLog.slice(0, index + 1)
      for (const action of actions) {
        applyAction(freshGame, action)
      }
      set({ game: freshGame })
    },
  }))
)
