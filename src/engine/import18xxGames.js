// Import game data from 18xx.games JSON format.
// Replays financial actions through the 18xxBroker engine to reconstruct state.

import { createGame } from './setup.js'
import { applyAction } from './actions.js'
import { getTitle } from '../titles/index.js'

// Map 18xx.games title string to our titleId
const TITLE_MAP = {
  '1830': 'g1830',
  '1846': 'g1846',
  '1849': 'g1849',
  '1861': 'g1861',
  '1867': 'g1867',
  '1880': 'g1880',
  '1889': 'g1889',
  '18Chesapeake': 'g18chesapeake',
  '18MEX': 'g18mex',
  '18MS': 'g18ms',
}

// Map variant names back to their base train name in the depot.
// In 18xx.games, "3/5" is a variant of the "4" train, "4/6" of "5", "7/8" of "6".
// Built per-title from the trains config.
function buildVariantToBaseMap(title) {
  const map = {}
  for (const trainDef of (title.trains || [])) {
    map[trainDef.name] = trainDef.name // base name maps to itself
    for (const v of (trainDef.variants || [])) {
      map[v.name] = trainDef.name
    }
  }
  return map
}

// Parse "80,0,8" → { price: 80, row: 0, col: 8 }
function parseSharePrice(str) {
  const [price, row, col] = str.split(',').map(Number)
  return { price, row, col }
}

// Parse share ID like "IC_1" → { corpSym: 'IC', index: 1 }
function parseShareId(shareId) {
  const lastUnderscore = shareId.lastIndexOf('_')
  return {
    corpSym: shareId.substring(0, lastUnderscore),
    index: parseInt(shareId.substring(lastUnderscore + 1), 10),
  }
}

// Build player ID map: 18xx.games user ID → our "pN" ID
function buildPlayerMap(gamePlayers) {
  const map = {}
  gamePlayers.forEach((p, i) => {
    map[p.id] = `p${i}`
  })
  return map
}

// Determine if a share buy is from IPO or market based on current state
function inferShareSource(state, corpSym, shareIndex) {
  const corp = state.corporations.find(c => c.sym === corpSym)
  if (!corp) return 'ipo'
  // Index 0 is president cert — always IPO if available
  // If IPO shares remain, buying from IPO; otherwise market
  if (corp.ipoShares > 0) return 'ipo'
  if (corp.marketShares > 0) return 'market'
  return 'ipo'
}

// Pair run_routes revenue with the following dividend action
function buildRevenueMap(actions) {
  const map = {} // action.id → revenue
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]
    if (a.type === 'run_routes') {
      const totalRevenue = (a.routes || []).reduce((sum, r) => sum + (r.revenue || 0), 0)
        + (a.subsidy || 0) + (a.extra_revenue || 0)
      // Find the next dividend action for the same entity
      for (let j = i + 1; j < actions.length; j++) {
        const b = actions[j]
        if (b.type === 'dividend' && b.entity === a.entity) {
          map[b.id] = totalRevenue
          break
        }
        // If we hit another run_routes for same entity, stop
        if (b.type === 'run_routes' && b.entity === a.entity) break
      }
    }
  }
  return map
}

// Strip undo/redo pairs and program_* actions to get effective action list
function stripUndoRedo(actions) {
  const stack = []
  for (const a of actions) {
    if (a.type === 'undo') {
      // Pop the last non-undo action
      if (stack.length > 0) stack.pop()
    } else if (a.type === 'redo') {
      // Redo doesn't carry the original action data in the JSON,
      // so we can't replay it. This is rare and usually paired with undo.
      // Skip it — the next real action will override anyway.
    } else if (a.type.startsWith('program_')) {
      // Auto-pass/buy programming — not a real game action
    } else {
      stack.push(a)
    }
  }
  return stack
}

// Flatten auto_actions into the main action stream
function flattenAutoActions(actions) {
  const result = []
  for (const a of actions) {
    const { auto_actions, ...main } = a
    result.push(main)
    if (auto_actions && Array.isArray(auto_actions)) {
      for (const auto of auto_actions) {
        result.push({ ...auto, id: main.id + 0.5 }) // synthetic ID
      }
    }
  }
  return result
}

// Convert a single 18xx.games action to our action format
function convertAction(action, state, playerMap, revenueMap, variantToBase) {
  switch (action.type) {
    case 'par': {
      const { price, row, col } = parseSharePrice(action.share_price)
      return {
        type: 'PAR_SHARE',
        playerId: playerMap[action.entity],
        corpSym: action.corporation,
        parPrice: price,
        row,
        col,
      }
    }

    case 'buy_shares': {
      const results = []
      const shares = action.shares || []
      for (const shareId of shares) {
        const { corpSym, index } = parseShareId(shareId)
        const source = inferShareSource(state, corpSym, index)
        const percent = shares.length === 1 ? (action.percent || 10) : 10
        results.push({
          type: 'BUY_SHARE',
          playerId: playerMap[action.entity],
          corpSym,
          source,
          percent,
        })
      }
      return results.length === 1 ? results[0] : results
    }

    case 'sell_shares': {
      if (!action.shares || action.shares.length === 0) return null
      const { corpSym } = parseShareId(action.shares[0])
      return {
        type: 'SELL_SHARES',
        playerId: playerMap[action.entity],
        corpSym,
        percent: action.percent || action.shares.length * 10,
      }
    }

    case 'dividend': {
      const revenue = revenueMap[action.id] ?? 0
      if (action.kind === 'withhold') {
        return {
          type: 'WITHHOLD_DIVIDEND',
          corpSym: action.entity,
          totalRevenue: revenue,
        }
      }
      if (action.kind === 'half') {
        return {
          type: 'HALF_DIVIDEND',
          corpSym: action.entity,
          totalRevenue: revenue,
        }
      }
      // payout
      return {
        type: 'PAY_DIVIDEND',
        corpSym: action.entity,
        totalRevenue: revenue,
      }
    }

    case 'buy_train': {
      // Variant name (e.g. "3/5") maps to base depot name (e.g. "4")
      const variantName = action.variant || action.train.split('-')[0]
      const trainName = variantToBase[variantName] || variantName

      // Detect inter-corp train purchase: check if any other corp owns this train ID
      const trainId = action.train
      let fromCorpSym = null
      for (const c of state.corporations) {
        if (c.sym !== action.entity && c.trains.some(t => t.id === trainId)) {
          fromCorpSym = c.sym
          break
        }
      }
      // Also detect by: no matching train in depot but another corp has one with this name
      if (!fromCorpSym) {
        const inDepot = state.depot.upcoming.some(t => t.name === trainName)
        if (!inDepot) {
          for (const c of state.corporations) {
            if (c.sym !== action.entity && c.trains.some(t => t.name === trainName)) {
              fromCorpSym = c.sym
              break
            }
          }
        }
      }

      return {
        type: 'BUY_TRAIN',
        corpSym: action.entity,
        trainName,
        price: action.price,
        ...(fromCorpSym ? { fromCorpSym } : {}),
      }
    }

    case 'buy_company': {
      // Corp buying a private from a player
      const company = state.companies.find(c => c.sym === action.company)
      if (!company) return null
      if (action.entity_type === 'corporation') {
        return {
          type: 'SELL_PRIVATE',
          companySym: action.company,
          fromPlayerId: company.ownerId,
          toCorpSym: action.entity,
          price: action.price,
        }
      }
      // Player buying from bank (auction)
      return {
        type: 'BUY_PRIVATE',
        playerId: playerMap[action.entity],
        companySym: action.company,
        price: action.price,
      }
    }

    case 'bid': {
      // 1846 draft: bid == buy private at price
      return {
        type: 'BUY_PRIVATE',
        playerId: playerMap[action.entity],
        companySym: action.company,
        price: action.price,
      }
    }

    case 'pass':
      // Context-dependent — could be SR pass, OR pass, draft pass
      // We skip pass actions; turn management is handled externally
      return null

    case 'discard_train': {
      // Corp forced to discard due to train limit
      const discardName = action.variant || action.train.split('-')[0]
      const baseDiscardName = variantToBase[discardName] || discardName
      // Find and remove this train from the corp
      const corp = state.corporations.find(c => c.sym === action.entity)
      if (corp) {
        const idx = corp.trains.findIndex(t => t.name === baseDiscardName)
        if (idx !== -1) {
          corp.trains.splice(idx, 1)
        }
      }
      return null // handled inline, no engine action needed
    }

    case 'bankrupt':
      return {
        type: 'PLAYER_BANKRUPT',
        playerId: playerMap[action.entity],
      }

    case 'merge': {
      // 1861/1867/18MEX mergers
      if (!action.corporation) return null
      return {
        type: 'MERGE_CORPS',
        survivorSym: action.corporation,
        nonsurvivorSym: action.minor || action.target || null,
      }
    }

    case 'convert': {
      // Corp conversion (1861/1867: minor → major, or share size change)
      return {
        type: 'CONVERT_CORP',
        corpSym: action.entity,
        targetSize: '10share',
      }
    }

    case 'take_loan':
      return {
        type: 'TAKE_LOAN',
        corpSym: action.entity,
      }

    case 'purchase_train':
      // 1880: private company ability — not a depot purchase, skip
      return null

    case 'payoff_player_debt':
      // 1880: player pays off debt — treat as cash adjustment
      if (action.entity && playerMap[action.entity]) {
        return {
          type: 'ADJUST_CASH',
          entityId: playerMap[action.entity],
          entityType: 'player',
          amount: -(action.amount || 0),
          reason: 'debt payoff',
        }
      }
      return null

    // Non-financial actions — skip
    case 'assign':
    case 'choose':
    case 'end_game':
    case 'log':
    case 'remove_token':
    case 'lay_tile':
    case 'run_routes':
    case 'place_token':
      return null

    default:
      return null
  }
}

// Main import function: takes raw 18xx.games JSON, returns game state
export function importGame(gameJson) {
  const titleId = TITLE_MAP[gameJson.title]
  if (!titleId) {
    throw new Error(`Unsupported title: ${gameJson.title}`)
  }

  const playerNames = gameJson.players.map(p => p.name)
  const playerMap = buildPlayerMap(gameJson.players)

  const baseTitle = getTitle(titleId)

  // Create initial game state
  const state = createGame(baseTitle, playerNames)

  // Build variant → base train name map from title config
  const variantToBase = buildVariantToBaseMap(baseTitle)

  // Strip undo/redo BEFORE flattening, so undoing an action also removes its auto_actions
  let actions = stripUndoRedo(gameJson.actions)
  actions = flattenAutoActions(actions)

  // Build revenue map from run_routes → dividend pairing
  const revenueMap = buildRevenueMap(actions)

  // Track import stats
  const stats = {
    total: actions.length,
    applied: 0,
    skipped: 0,
    errors: [],
  }

  // Replay each action
  for (const action of actions) {
    const converted = convertAction(action, state, playerMap, revenueMap, variantToBase)
    if (!converted) {
      stats.skipped++
      continue
    }

    // Handle multi-action (e.g., buying multiple shares)
    const toApply = Array.isArray(converted) ? converted : [converted]
    for (const a of toApply) {
      try {
        applyAction(state, a)
        stats.applied++
      } catch (err) {
        stats.errors.push({
          sourceAction: action,
          convertedAction: a,
          error: err.message,
        })
      }
    }
  }

  // Imported games are past pregame — clear auction state
  if (state.roundTracker) {
    state.roundTracker.inPregame = false
    state.roundTracker.pregameIndex = -1
  }

  // Attach import metadata
  state.importSource = {
    platform: '18xx.games',
    gameId: gameJson.id,
    status: gameJson.status,
    result: gameJson.result,
    playerMap, // 18xx.games ID → our ID
    stats,
  }

  return state
}

// Import from gzipped file (Node.js only — for testing/CLI)
export async function importFromFile(filePath) {
  const fs = await import('fs')
  const zlib = await import('zlib')
  const { promisify } = await import('util')
  const gunzip = promisify(zlib.gunzip)

  const compressed = fs.readFileSync(filePath)
  const json = JSON.parse((await gunzip(compressed)).toString())
  return importGame(json)
}
