// Actions — every user input is an action appended to the log.
// applyAction mutates state and returns a log entry.

import { buyShareFromIPO, buyShareFromMarket, sellShares, corpBuyShareFromIPO, corpBuyShareFromMarket, corpSellShares } from './sharePool.js'
import { placeCorpOnMarket, moveDividend, moveSell, moveRight, moveLeft, moveSoldOutCorps, corpPrice } from './stockMarket.js'
import { buyAvailableTrain, rustTrains } from './depot.js'
import { addTrain, getCorpShares, regularSharePercent } from './corporation.js'
import { advanceToPhase, phaseForTrain } from './phase.js'
import { collectRevenue, collectAllRevenue, closeAllCompanies, assignPrivate, closePrivate } from './privateCompany.js'
import { transferFromBank, transferToBank } from './bank.js'
import { deliverToSegment, deliverToExport, advanceBeerMarket, removeNoDemand, placeNoDemand } from './beerMarket.js'
import { advanceRound, setRound, setFixedIndex, roundLabel } from './roundTracker.js'
import { ptgMerge, merge1862, acquireMinor1822, convertMinor1867, mergeMinors1867, rlaMerge } from './merger.js'
import { takeLoan, repayLoan, payInterest, interestDue } from './loans.js'
import { convertTo5Share, convertTo10Share } from './corpConversion.js'
import { shortSell, closeShort } from './shorts.js'

let actionSeq = 0

// Actions that mutate state but shouldn't be logged (turn navigation)
const SILENT_ACTIONS = new Set(['NEXT_TURN', 'PREV_TURN', 'SET_TURN_QUEUE', 'SET_OR_STEP', 'OR_NEXT_CORP'])

export function applyAction(state, action) {
  const silent = SILENT_ACTIONS.has(action.type)
  const entry = silent ? null : {
    id: actionSeq++,
    timestamp: Date.now(),
    action,
    description: describeAction(state, action),
    source: action._source || null, // device/view that dispatched
  }

  switch (action.type) {
    case 'PAR_SHARE':
      handlePar(state, action)
      break
    case 'BUY_SHARE':
      handleBuyShare(state, action)
      break
    case 'SELL_SHARES':
      handleSellShares(state, action)
      break
    case 'CORP_BUY_SHARE':
      handleCorpBuyShare(state, action)
      break
    case 'CORP_SELL_SHARES':
      handleCorpSellShares(state, action)
      break
    case 'PAY_DIVIDEND':
      handlePayDividend(state, action)
      break
    case 'WITHHOLD_DIVIDEND':
      handleWithholdDividend(state, action)
      break
    case 'HALF_DIVIDEND':
      handleHalfDividend(state, action)
      break
    case 'BUY_TRAIN':
      handleBuyTrain(state, action)
      break
    case 'BUY_PRIVATE':
      handleBuyPrivate(state, action)
      break
    case 'SELL_PRIVATE':
      handleSellPrivate(state, action)
      break
    case 'COLLECT_REVENUE':
      handleCollectRevenue(state, action)
      break
    case 'COLLECT_ALL_REVENUE':
      handleCollectAllRevenue(state, action)
      break
    case 'SOLD_OUT_ADJUST':
      handleSoldOutAdjust(state, action)
      break
    case 'ADJUST_CASH':
      handleAdjustCash(state, action)
      break
    case 'SET_PRIORITY': {
      // Give priority deal marker to a player
      state.priorityDeal = action.playerId
      break
    }
    // Super-umpire direct edit actions
    case 'SET_PLAYER_NAME': {
      const p = state.players.find(pl => pl.id === action.playerId)
      if (p && action.name) p.name = action.name
      break
    }
    case 'SET_CASH': {
      if (action.entityType === 'player') {
        const p = state.players.find(pl => pl.id === action.entityId)
        if (p) p.cash = action.value
      } else if (action.entityType === 'corporation') {
        const c = state.corporations.find(co => co.sym === action.entityId)
        if (c) c.cash = action.value
      } else if (action.entityType === 'bank') {
        state.bank.cash = action.value
      }
      break
    }
    // Force-set presidency (super-umpire — no cert exchange, just flag flip)
    case 'FORCE_PRESIDENT': {
      const fpCorp = action.corpSym
      for (const pl of state.players) {
        for (const s of pl.shares) {
          if (s.corpSym === fpCorp) s.isPresident = false
        }
      }
      const fpPlayer = state.players.find(p => p.id === action.playerId)
      if (fpPlayer) {
        const cert = fpPlayer.shares.find(s => s.corpSym === fpCorp)
        if (cert) cert.isPresident = true
      }
      break
    }
    case 'MOVE_CERT': {
      // Move one specific certificate between players (or to/from IPO/pool)
      const mcFrom = action.fromPlayerId ? state.players.find(p => p.id === action.fromPlayerId) : null
      const mcTo = action.toPlayerId ? state.players.find(p => p.id === action.toPlayerId) : null
      const mcCorp = state.corporations.find(c => c.sym === action.corpSym)
      if (!mcCorp) break

      if (action.fromSource === 'ipo') {
        // From IPO to player
        if (mcTo && mcCorp.ipoShares >= action.percent) {
          mcCorp.ipoShares -= action.percent
          mcTo.shares.push({ corpSym: action.corpSym, percent: action.percent, isPresident: !!action.isPresident })
        }
      } else if (action.fromSource === 'pool') {
        // From market pool to player
        if (mcTo && mcCorp.marketShares >= action.percent) {
          mcCorp.marketShares -= action.percent
          mcTo.shares.push({ corpSym: action.corpSym, percent: action.percent, isPresident: !!action.isPresident })
        }
      } else if (action.toSource === 'ipo') {
        // From player to IPO
        if (mcFrom) {
          const idx = mcFrom.shares.findIndex(s => s.corpSym === action.corpSym && s.percent === action.percent && s.isPresident === !!action.isPresident)
          if (idx !== -1) { mcFrom.shares.splice(idx, 1); mcCorp.ipoShares += action.percent }
        }
      } else if (action.toSource === 'pool') {
        // From player to market pool
        if (mcFrom) {
          const idx = mcFrom.shares.findIndex(s => s.corpSym === action.corpSym && s.percent === action.percent && s.isPresident === !!action.isPresident)
          if (idx !== -1) { mcFrom.shares.splice(idx, 1); mcCorp.marketShares += action.percent }
        }
      } else if (mcFrom && mcTo) {
        // Player to player
        const idx = mcFrom.shares.findIndex(s => s.corpSym === action.corpSym && s.percent === action.percent && s.isPresident === !!action.isPresident)
        if (idx !== -1) {
          const cert = mcFrom.shares.splice(idx, 1)[0]
          mcTo.shares.push(cert)
        }
      }
      break
    }
    case 'SET_SHARES': {
      const sp = state.players.find(pl => pl.id === action.playerId)
      const sc = state.corporations.find(co => co.sym === action.corpSym)
      if (!sp || !sc) break
      const newPct = action.percent
      const oldPct = sp.shares.filter(s => s.corpSym === action.corpSym).reduce((sum, s) => sum + s.percent, 0)
      const wasPres = sp.shares.some(s => s.corpSym === action.corpSym && s.isPresident)
      // Remove all existing shares of this corp
      sp.shares = sp.shares.filter(s => s.corpSym !== action.corpSym)
      // Add new shares
      if (newPct > 0) {
        const shareSize = state.title.shares?.[1] ?? 10
        const presSize = state.title.shares?.[0] ?? 20
        if (wasPres || newPct >= presSize) {
          sp.shares.push({ corpSym: action.corpSym, percent: presSize, isPresident: true })
          let remaining = newPct - presSize
          while (remaining >= shareSize) { sp.shares.push({ corpSym: action.corpSym, percent: shareSize, isPresident: false }); remaining -= shareSize }
        } else {
          let remaining = newPct
          while (remaining >= shareSize) { sp.shares.push({ corpSym: action.corpSym, percent: shareSize, isPresident: false }); remaining -= shareSize }
        }
      }
      // Adjust IPO to compensate
      const totalPlayerShares = state.players.reduce((sum, p) => sum + p.shares.filter(s => s.corpSym === action.corpSym).reduce((s2, sh) => s2 + sh.percent, 0), 0)
      sc.ipoShares = 100 - totalPlayerShares - sc.marketShares
      break
    }
    case 'SET_CORP_FIELD': {
      const fc = state.corporations.find(co => co.sym === action.corpSym)
      if (fc && action.field in fc) { fc[action.field] = action.value }
      break
    }
    case 'SET_MARKET_POSITION': {
      const mp = state.stockMarket.corpPositions[action.corpSym]
      if (mp) { mp.row = action.row; mp.col = action.col }
      else { state.stockMarket.corpPositions[action.corpSym] = { row: action.row, col: action.col } }
      break
    }
    case 'ADD_TRAIN_MANUAL': {
      const atc = state.corporations.find(co => co.sym === action.corpSym)
      if (atc) { atc.trains.push({ name: action.trainName, id: `manual_${Date.now()}`, distance: 0, price: 0 }) }
      break
    }
    case 'REMOVE_TRAIN_MANUAL': {
      const rtc = state.corporations.find(co => co.sym === action.corpSym)
      if (rtc) { const idx = rtc.trains.findIndex(t => t.name === action.trainName); if (idx !== -1) rtc.trains.splice(idx, 1) }
      break
    }
    case 'ADVANCE_ROUND':
      if (state.roundTracker) {
        advanceRound(state.roundTracker, state.phaseManager)
      }
      break
    case 'SET_ROUND':
      if (state.roundTracker) {
        if (action.fixedIndex != null) {
          setFixedIndex(state.roundTracker, action.fixedIndex)
        } else {
          setRound(state.roundTracker, action.roundType, action.srNumber, action.orSet, action.orInSet)
        }
      }
      break
    // Beer market actions (HSB)
    case 'DELIVER_BEER':
      handleDeliverBeer(state, action)
      break
    case 'DELIVER_EXPORT':
      handleDeliverExport(state, action)
      break
    case 'BREWERY_INCOME':
      handleBreweryIncome(state, action)
      break
    case 'ADVANCE_BEER_MARKET':
      handleAdvanceBeerMarket(state, action)
      break
    case 'REMOVE_NO_DEMAND':
      handleRemoveNoDemand(state, action)
      break
    case 'PLACE_NO_DEMAND':
      handlePlaceNoDemand(state, action)
      break
    case 'SET_PLAYER_ORDER':
      if (action.order && Array.isArray(action.order)) {
        const ordered = action.order
          .map((id) => state.players.find((p) => p.id === id))
          .filter(Boolean)
        if (ordered.length === state.players.length) {
          state.players = ordered
          state.playerOrder = action.order
        }
      }
      break
    case 'SET_PRIORITY':
      if (action.playerId) {
        state.priorityDeal = action.playerId
      }
      break
    case 'DISMISS_EVENT':
      if (state.pendingEvents?.length > 0) {
        state.pendingEvents = state.pendingEvents.filter((e) => e !== action.event)
      }
      break
    case 'REMOVE_CORPORATION':
      if (action.corpSym) {
        state.corporations = state.corporations.filter((c) => c.sym !== action.corpSym)
      }
      break
    // Merger actions
    case 'MERGE_CORPS':
      handleMerge(state, action)
      break
    case 'ACQUIRE_MINOR':
      handleAcquireMinor(state, action)
      break
    case 'CONVERT_MINOR':
      handleConvertMinor(state, action)
      break
    case 'MERGE_MINORS':
      handleMergeMinors(state, action)
      break
    // Train attachment actions (strategy cards, executive cars)
    case 'GIVE_CARD':
      handleGiveCard(state, action)
      break
    case 'ASSIGN_CARD_TO_TRAIN':
      handleAssignCardToTrain(state, action)
      break
    case 'USE_CARD_ACTION':
      handleUseCardAction(state, action)
      break
    case 'BUY_EXECUTIVE_CAR':
      handleBuyExecutiveCar(state, action)
      break
    // Loan actions (1817, 1867)
    case 'TAKE_LOAN':
      takeLoan(state, action.corpSym)
      break
    case 'REPAY_LOAN':
      repayLoan(state, action.corpSym)
      break
    case 'PAY_INTEREST': {
      const result = payInterest(state, action.corpSym)
      if (result < 0) {
        // Corp can't pay — mark as liquidated
        const c = state.corporations.find((co) => co.sym === action.corpSym)
        if (c) c.liquidated = true
        state.pendingEvents = (state.pendingEvents || []).concat([`${action.corpSym}_liquidated`])
      }
      break
    }
    // Corp conversion (1817: 2→5→10)
    case 'CONVERT_CORP':
      if (action.targetSize === '5share') convertTo5Share(state, action.corpSym)
      else if (action.targetSize === '10share') convertTo10Share(state, action.corpSym)
      break
    // Short selling (1817)
    case 'SHORT_SELL':
      shortSell(state, action.playerId, action.corpSym)
      break
    case 'CLOSE_SHORT':
      closeShort(state, action.playerId, action.corpSym)
      break
    // Train export
    case 'EXPORT_TRAIN': {
      const exported = state.depot?.upcoming?.[0]
      if (exported) {
        state.depot.upcoming.shift()
        state.depot.discarded.push(exported)
        // Check phase advancement
        const newPhase = phaseForTrain(state.phaseManager, exported.name)
        if (newPhase && state.phaseManager.currentIndex < state.phaseManager.phases.indexOf(newPhase)) {
          advanceToPhase(state.phaseManager, newPhase.name)
          rustTrains(state, exported.name)
        }
      }
      break
    }
    // Liquidation
    case 'LIQUIDATE_CORP': {
      const lc = state.corporations.find((co) => co.sym === action.corpSym)
      if (lc) lc.liquidated = true
      break
    }
    // Acquisition (simplified: corp buys another corp)
    case 'ACQUIRE_CORP': {
      const acquirer = state.corporations.find((co) => co.sym === action.acquirerSym)
      const target = state.corporations.find((co) => co.sym === action.targetSym)
      if (acquirer && target) {
        const price = action.price || 0
        acquirer.cash -= price
        // Transfer assets
        acquirer.cash += target.cash
        acquirer.trains.push(...target.trains)
        acquirer.loans = (acquirer.loans || 0) + (target.loans || 0)
        // Pay shareholders
        if (price > 0 && target.totalShares) {
          const perShare = Math.floor(price / target.totalShares)
          for (const player of state.players) {
            const pct = player.shares
              .filter((s) => s.corpSym === action.targetSym && !s.isShort)
              .reduce((sum, s) => sum + s.percent, 0)
            if (pct > 0) {
              const payout = Math.floor(perShare * pct / 10)
              player.cash += payout
            }
          }
        }
        // Remove target from game (inline — can't dynamic import in action handler)
        state.corporations = state.corporations.filter((co) => co.sym !== action.targetSym)
        if (state.stockMarket?.corpPositions?.[action.targetSym]) {
          delete state.stockMarket.corpPositions[action.targetSym]
        }
        for (const player of state.players) {
          player.shares = player.shares.filter((s) => s.corpSym !== action.targetSym)
        }
        if (state.turnQueue) {
          state.turnQueue = state.turnQueue.filter((s) => s !== action.targetSym)
        }
      }
      break
    }
    // Discard train: forced discard when over train limit after phase change
    case 'DISCARD_TRAIN': {
      const dc = state.corporations.find(co => co.sym === action.corpSym)
      if (dc) {
        const idx = dc.trains.findIndex(t => t.name === action.trainName)
        if (idx !== -1) {
          const discarded = dc.trains.splice(idx, 1)[0]
          state.depot.discarded.push(discarded)
        }
      }
      break
    }
    // Remove token: undo a station token placement
    case 'REMOVE_TOKEN': {
      const rc = state.corporations.find(co => co.sym === action.corpSym)
      if (rc && rc.tokensPlaced > 0) {
        rc.tokensPlaced--
      }
      break
    }
    // Place token: corp pays token cost, increments tokensPlaced
    case 'PLACE_TOKEN': {
      const tc = state.corporations.find(co => co.sym === action.corpSym)
      if (tc && tc.tokensPlaced < tc.tokens.length) {
        const cost = action.price ?? tc.tokens[tc.tokensPlaced] ?? 0
        tc.cash -= cost
        state.bank.cash += cost
        tc.tokensPlaced++
      }
      break
    }
    // Issue shares: corp sells shares from IPO to raise cash (incremental cap)
    case 'ISSUE_SHARES': {
      const ic = state.corporations.find(co => co.sym === action.corpSym)
      if (ic && ic.ipoShares > 0) {
        const shareSize = getCorpShares(state, action.corpSym)[1] ?? 10
        const issuePrice = corpPrice(state.stockMarket, action.corpSym) || ic.parPrice || 0
        const revenue = (issuePrice * shareSize) / 10
        ic.ipoShares -= shareSize
        ic.marketShares += shareSize
        ic.cash += revenue
        // Price moves left on issue
        moveLeft(state.stockMarket, action.corpSym, 1)
      }
      break
    }
    // Redeem shares: corp buys shares from market pool back to IPO
    case 'REDEEM_SHARES': {
      const rc = state.corporations.find(co => co.sym === action.corpSym)
      if (rc && rc.marketShares > 0) {
        const shareSize = getCorpShares(state, action.corpSym)[1] ?? 10
        const redeemPrice = corpPrice(state.stockMarket, action.corpSym) || rc.parPrice || 0
        const cost = (redeemPrice * shareSize) / 10
        if (rc.cash >= cost) {
          rc.marketShares -= shareSize
          rc.ipoShares += shareSize
          rc.cash -= cost
          // Price moves right on redeem
          moveRight(state.stockMarket, action.corpSym, 1)
        }
      }
      break
    }
    // Nationalization: close a corp and transfer assets to national entity
    // Change float percent (1880: event-driven 20→30→40→60)
    case 'SET_FLOAT_PERCENT': {
      const newFloat = action.percent
      if (newFloat) {
        for (const c of state.corporations) {
          if (!c.floated) c.floatPercent = newFloat
        }
      }
      break
    }
    // Concession conversion: private concession → president cert of matching corp
    case 'CONVERT_CONCESSION': {
      const player = state.players.find((p) => p.id === action.playerId)
      const company = state.companies?.find((c) => c.sym === action.companySym)
      const corp = state.corporations.find((c) => c.sym === action.corpSym)
      if (player && company && corp) {
        // Remove concession from player
        player.privates = player.privates.filter((s) => s !== action.companySym)
        company.closed = true
        // Give president cert
        const presPercent = getCorpShares(state, action.corpSym)[0] ?? 20
        player.shares.push({ corpSym: action.corpSym, percent: presPercent, isPresident: true })
        corp.ipoShares -= presPercent
        corp.ipoed = true
        // Set par if provided
        if (action.parPrice != null) {
          corp.parPrice = action.parPrice
          if (action.row != null && action.col != null) {
            placeCorpOnMarket(state.stockMarket, action.corpSym, action.row, action.col)
          }
        }
      }
      break
    }
    case 'NATIONALIZE_CORP': {
      const nc = state.corporations.find((co) => co.sym === action.corpSym)
      const national = state.corporations.find((co) => co.sym === action.nationalSym)
      if (nc && national) {
        // Transfer assets
        national.cash += nc.cash
        national.trains.push(...nc.trains)
        nc.cash = 0
        nc.trains = []
        // Compensate shareholders at current price
        const price = corpPrice(state.stockMarket, action.corpSym) || 0
        for (const player of state.players) {
          const pct = player.shares
            .filter((s) => s.corpSym === action.corpSym && !s.isShort)
            .reduce((sum, s) => sum + s.percent, 0)
          if (pct > 0) {
            player.cash += Math.floor(price * pct / 10)
            state.bank.cash -= Math.floor(price * pct / 10)
          }
        }
        // Remove nationalized corp
        state.corporations = state.corporations.filter((co) => co.sym !== action.corpSym)
        if (state.stockMarket?.corpPositions?.[action.corpSym]) {
          delete state.stockMarket.corpPositions[action.corpSym]
        }
        for (const player of state.players) {
          player.shares = player.shares.filter((s) => s.corpSym !== action.corpSym)
        }
        if (state.turnQueue) {
          state.turnQueue = state.turnQueue.filter((s) => s !== action.corpSym)
        }
      }
      break
    }
    // Player bankruptcy
    case 'PLAYER_BANKRUPT': {
      const bp = state.players.find((p) => p.id === action.playerId)
      if (bp) {
        bp.bankrupt = true
        bp.cash = 0
        bp.shares = []
        bp.privates = []
        if (state.turnQueue) {
          state.turnQueue = state.turnQueue.filter((s) => s !== action.playerId)
        }
      }
      break
    }
    case 'SWAP_PRESIDENT': {
      // Exchange president cert (e.g. 20%) for N regular certs (e.g. 2×10%)
      const fromPlayer = state.players.find(p => p.shares.some(s => s.corpSym === action.corpSym && s.isPresident))
      const toPlayer = state.players.find(p => p.id === action.playerId)
      if (fromPlayer && toPlayer && fromPlayer.id !== toPlayer.id) {
        const presCert = fromPlayer.shares.find(s => s.corpSym === action.corpSym && s.isPresident)
        if (!presCert) break
        const presPercent = presCert.percent // e.g. 20%
        const shareSize = state.title.shares?.[1] ?? 10 // e.g. 10%
        const certsNeeded = Math.floor(presPercent / shareSize) // e.g. 2

        // New president needs enough regular certs to exchange
        const newPlayerCerts = toPlayer.shares.filter(s => s.corpSym === action.corpSym && !s.isPresident)
        if (newPlayerCerts.length < certsNeeded) break

        // Remove president cert from old president
        fromPlayer.shares = fromPlayer.shares.filter(s => s !== presCert)

        // Remove N regular certs from new president
        let removed = 0
        toPlayer.shares = toPlayer.shares.filter(s => {
          if (removed >= certsNeeded) return true
          if (s.corpSym === action.corpSym && !s.isPresident) { removed++; return false }
          return true
        })

        // Give old president N regular certs
        for (let i = 0; i < certsNeeded; i++) {
          fromPlayer.shares.push({ corpSym: action.corpSym, percent: shareSize, isPresident: false })
        }

        // Give new president the president cert
        toPlayer.shares.push({ corpSym: action.corpSym, percent: presPercent, isPresident: true })
      }
      break
    }
    case 'SET_CORP_ORDER':
      if (action.order && Array.isArray(action.order)) {
        state.corpOrder = action.order
      }
      break
    case 'SET_TURN_QUEUE':
      state.turnQueue = action.queue || []
      state.turnIndex = action.turnIndex ?? 0
      state.srPassed = action.srPassed ?? []
      break
    case 'NEXT_TURN': {
      if (state.turnQueue.length === 0) break
      let next = (state.turnIndex + 1) % state.turnQueue.length
      let attempts = 0
      while (state.srPassed.includes(state.turnQueue[next]) && attempts < state.turnQueue.length) {
        next = (next + 1) % state.turnQueue.length
        attempts++
      }
      state.turnIndex = next
      break
    }
    case 'PREV_TURN':
      state.turnIndex = state.turnIndex > 0 ? state.turnIndex - 1 : state.turnQueue.length - 1
      break
    case 'SR_PASS': {
      const passId = action.playerId
      if (!state.srPassed.includes(passId)) {
        state.srPassed = [...state.srPassed, passId]
      }
      let nextIdx = (state.turnIndex + 1) % state.turnQueue.length
      let att = 0
      while (state.srPassed.includes(state.turnQueue[nextIdx]) && att < state.turnQueue.length) {
        nextIdx = (nextIdx + 1) % state.turnQueue.length
        att++
      }
      state.turnIndex = nextIdx
      break
    }
    case 'SR_ACTED':
      state.srPassed = []
      state.turnIndex = (state.turnIndex + 1) % (state.turnQueue.length || 1)
      break
    case 'SET_OR_STEP':
      state.orStep = action.step ?? 0
      break
    case 'OR_NEXT_CORP':
      // Advance to next corp and reset OR step
      state.turnIndex = Math.min((state.turnIndex + 1), (state.turnQueue.length || 1) - 1)
      state.orStep = 0
      break
    case 'REORDER_BY_CASH': {
      const dir = action.direction || 'desc' // 'desc' = most cash first, 'asc' = least first
      const sorted = [...state.players].sort((a, b) =>
        dir === 'desc' ? b.cash - a.cash : a.cash - b.cash
      )
      state.players = sorted
      state.playerOrder = sorted.map((p) => p.id)
      state.priorityDeal = sorted[0].id
      break
    }
    default:
      break
  }

  if (entry) state.actionLog.push(entry)
  return entry
}

function handlePar(state, { playerId, corpSym, parPrice, row, col }) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  const player = state.players.find((p) => p.id === playerId)
  if (!corp || !player) return

  corp.parPrice = parPrice
  corp.ipoed = true
  placeCorpOnMarket(state.stockMarket, corpSym, row, col)

  const corpShares = getCorpShares(state, corpSym)
  const presPercent = corpShares[0] ?? 20
  const baseShare = getCorpShares(state, corpSym)[1] ?? getCorpShares(state, corpSym)[0] ?? 10
  const cost = parPrice * (presPercent / baseShare)
  player.cash -= cost
  corp.ipoShares -= presPercent

  player.shares.push({ corpSym, percent: presPercent, isPresident: true })

  if (state.title.capitalization === 'incremental') {
    // Incremental: player pays corp treasury (not bank)
    corp.cash += cost
  } else {
    // Full: player pays bank
    state.bank.cash += cost
  }

  const soldPercent = 100 - corp.ipoShares
  if (soldPercent >= corp.floatPercent) {
    corp.floated = true
    if (state.title.capitalization !== 'incremental') {
      // Full cap: corp receives par × 10 from bank on float
      const capitalization = parPrice * 10
      corp.cash += capitalization
      state.bank.cash -= capitalization
    }
    // Incremental: no lump sum — corp already received the share payment
  }
}

function handleBuyShare(state, { playerId, corpSym, source, percent = 10 }) {
  if (source === 'ipo') {
    buyShareFromIPO(state, playerId, corpSym, percent)
  } else if (source === 'market') {
    buyShareFromMarket(state, playerId, corpSym, percent)
  }
}

function handleCorpBuyShare(state, { buyerCorpSym, targetCorpSym, source, percent = 10 }) {
  if (source === 'ipo') {
    corpBuyShareFromIPO(state, buyerCorpSym, targetCorpSym, percent)
  } else if (source === 'market') {
    corpBuyShareFromMarket(state, buyerCorpSym, targetCorpSym, percent)
  }
}

function handleCorpSellShares(state, { sellerCorpSym, targetCorpSym, percent = 10 }) {
  corpSellShares(state, sellerCorpSym, targetCorpSym, percent)
  const sellMovement = state.title.sellMovement || 'down_share'
  moveSell(state.stockMarket, targetCorpSym, percent, sellMovement)
}

function handleSellShares(state, { playerId, corpSym, percent = 10 }) {
  sellShares(state, playerId, corpSym, percent)
  // Title-aware sell movement
  const sellMovement = state.title.sellMovement || 'down_share'
  moveSell(state.stockMarket, corpSym, percent, sellMovement)
}

function handlePayDividend(state, { corpSym, totalRevenue }) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return

  const regShare = regularSharePercent(state, corpSym)
  const numShares = 100 / regShare // e.g., 5 for 20% shares, 10 for 10%
  const perShare = Math.floor(totalRevenue / numShares)

  // Pay each player for their shares
  for (const player of state.players) {
    const pct = player.shares
      .filter((s) => s.corpSym === corpSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > 0) {
      const payout = perShare * (pct / regShare)
      player.cash += payout
      state.bank.cash -= payout
    }
  }

  // Pay corps that hold shares in this corp
  for (const holder of state.corporations) {
    if (holder.sharesHeld.length === 0) continue
    const pct = holder.sharesHeld
      .filter((s) => s.corpSym === corpSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > 0) {
      const payout = perShare * (pct / regShare)
      holder.cash += payout
      state.bank.cash -= payout
    }
  }

  // IPO shares: dividends on unsold shares go to corp treasury
  if (corp.ipoShares > 0) {
    const ipoPayout = perShare * (corp.ipoShares / regShare)
    corp.cash += ipoPayout
    state.bank.cash -= ipoPayout
  }

  // Market shares: dividends go to bank (already there, no transfer needed)

  // Price movement: title-aware
  // perShare is per actual share, totalRevenue passed for PTG-style comparison
  moveDividend(state.stockMarket, corpSym, perShare, state.title.dividendMovement, totalRevenue)
}

function handleWithholdDividend(state, { corpSym, totalRevenue }) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return

  corp.cash += totalRevenue
  state.bank.cash -= totalRevenue

  // Price moves left once
  moveLeft(state.stockMarket, corpSym, 1)
}

function handleHalfDividend(state, { corpSym, totalRevenue }) {
  // Half to shareholders, half to treasury
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return

  const regShare = regularSharePercent(state, corpSym)
  const numShares = 100 / regShare
  const halfRevenue = Math.floor(totalRevenue / 2)
  const perShare = Math.floor(halfRevenue / numShares)

  // Pay shareholders their half
  for (const player of state.players) {
    const pct = player.shares
      .filter((s) => s.corpSym === corpSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > 0) {
      const payout = perShare * (pct / regShare)
      player.cash += payout
      state.bank.cash -= payout
    }
  }

  // Pay corps that hold shares in this corp
  for (const holder of state.corporations) {
    if (holder.sharesHeld.length === 0) continue
    const pct = holder.sharesHeld
      .filter((s) => s.corpSym === corpSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > 0) {
      const payout = perShare * (pct / regShare)
      holder.cash += payout
      state.bank.cash -= payout
    }
  }

  // Other half to corp treasury
  const treasuryHalf = totalRevenue - halfRevenue
  corp.cash += treasuryHalf
  state.bank.cash -= treasuryHalf

  // Half pay: no price movement (or move right once depending on title)
  // Most titles: no movement. Some: move right if > 0.
  // Default: no movement for half pay
}

function handleBuyTrain(state, { corpSym, trainName, price, fromCorpSym }) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return

  let train
  if (fromCorpSym) {
    const fromCorp = state.corporations.find((c) => c.sym === fromCorpSym)
    if (!fromCorp) return
    const idx = fromCorp.trains.findIndex((t) => t.name === trainName)
    if (idx === -1) return
    train = fromCorp.trains.splice(idx, 1)[0]
    corp.cash -= price
    fromCorp.cash += price
  } else {
    train = buyAvailableTrain(state.depot, trainName)
    if (!train) return
    const actualPrice = price ?? train.price
    corp.cash -= actualPrice
    state.bank.cash += actualPrice
  }

  addTrain(corp, train)

  // Check phase advancement
  const newPhase = phaseForTrain(state.phaseManager, trainName)
  if (newPhase && state.phaseManager.currentIndex < state.phaseManager.phases.indexOf(newPhase)) {
    advanceToPhase(state.phaseManager, newPhase.name)

    // Handle train rusting
    rustTrains(state, trainName)

    // Handle events
    const triggered = []
    for (const event of (train.events || [])) {
      if (event === 'close_companies' || event === 'nationalize_companies') {
        closeAllCompanies(state)
      }
      triggered.push(event)
    }
    // Store triggered events for UI prompts
    if (triggered.length > 0) {
      state.pendingEvents = (state.pendingEvents || []).concat(triggered)
    }

    // Make trains available that were gated on this train name
    for (const t of state.depot.upcoming) {
      if (t.availableOn === trainName) {
        t.availableOn = null
      }
    }
  }
}

function handleBuyPrivate(state, { playerId, companySym, price }) {
  const player = state.players.find((p) => p.id === playerId)
  const company = state.companies.find((c) => c.sym === companySym)
  if (!player || !company) return

  player.cash -= price
  state.bank.cash += price
  assignPrivate(company, playerId, 'player')
  player.privates.push(companySym)
}

function handleSellPrivate(state, { companySym, fromPlayerId, toCorpSym, price }) {
  const company = state.companies.find((c) => c.sym === companySym)
  const fromPlayer = state.players.find((p) => p.id === fromPlayerId)
  const toCorp = state.corporations.find((c) => c.sym === toCorpSym)
  if (!company || !fromPlayer || !toCorp) return
  if (company.canSellToCorp === false) return // cannot sell to corp

  fromPlayer.cash += price
  toCorp.cash -= price
  fromPlayer.privates = fromPlayer.privates.filter((s) => s !== companySym)
  assignPrivate(company, toCorpSym, 'corporation')
}

function handleCollectRevenue(state, { companySym }) {
  collectRevenue(state, companySym)
}

function handleCollectAllRevenue(state) {
  collectAllRevenue(state)
}

function handleSoldOutAdjust(state) {
  // Move all sold-out corps up one space (called at end of OR set)
  moveSoldOutCorps(state.stockMarket, state.corporations)
}

// --- Beer market handlers (HSB) ---

function handleDeliverBeer(state, { brewerySym, segmentId, count = 1 }) {
  if (!state.beerMarket) return
  const delivered = deliverToSegment(state.beerMarket, segmentId, count)
  // Income is tracked when BREWERY_INCOME action is dispatched
  return delivered
}

function handleDeliverExport(state, { brewerySym, count = 1 }) {
  if (!state.beerMarket) return
  deliverToExport(state.beerMarket, count)
}

function handleBreweryIncome(state, { brewerySym, ownerType, ownerId, income }) {
  // Pay brewery income to owner (player for small brewery, shareholders for corp)
  if (ownerType === 'player') {
    const player = state.players.find((p) => p.id === ownerId)
    if (player) {
      player.cash += income
      state.bank.cash -= income
    }
  } else if (ownerType === 'corporation') {
    // For brewery corps: income goes to corp treasury (withhold) or paid as dividend
    const corp = state.corporations.find((c) => c.sym === brewerySym)
    if (corp) {
      corp.cash += income
      state.bank.cash -= income
    }
  }
}

function handleAdvanceBeerMarket(state) {
  if (!state.beerMarket) return
  advanceBeerMarket(state.beerMarket)
}

function handleRemoveNoDemand(state, { segmentId }) {
  if (!state.beerMarket) return
  removeNoDemand(state.beerMarket, segmentId)
}

function handlePlaceNoDemand(state, { segmentId }) {
  if (!state.beerMarket) return
  placeNoDemand(state.beerMarket, segmentId)
}

// --- Merger handlers ---

function handleMerge(state, action) {
  const mergerType = state.title.merger?.type
  if (mergerType === 'ptg_combine') {
    ptgMerge(state, action.topCorpSym, action.bottomCorpSym)
  } else if (mergerType === '1862_peer') {
    merge1862(state, action.survivorSym, action.nonsurvivorSym)
  } else if (mergerType === 'rla_merge') {
    rlaMerge(state, action.minorSymA, action.minorSymB, action.majorCorpSym, action.chosenIdentity)
  }
}

function handleAcquireMinor(state, { majorSym, minorSym, paymentShares, cashDifference }) {
  acquireMinor1822(state, majorSym, minorSym, paymentShares, cashDifference)
}

function handleConvertMinor(state, { minorSym, majorSym }) {
  convertMinor1867(state, minorSym, majorSym)
}

function handleMergeMinors(state, { minorSyms, majorSym }) {
  mergeMinors1867(state, minorSyms, majorSym)
}

// --- Train attachment handlers (cards, executive cars) ---

function handleGiveCard(state, { playerId, card }) {
  const player = state.players.find((p) => p.id === playerId)
  if (!player || !card) return
  player.cards.push({ ...card, used: false })
}

function handleAssignCardToTrain(state, { playerId, cardId, corpSym, trainId }) {
  const player = state.players.find((p) => p.id === playerId)
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!player || !corp) return

  const cardIdx = player.cards.findIndex((c) => c.id === cardId && !c.used)
  const train = corp.trains.find((t) => t.id === trainId)
  if (cardIdx < 0 || !train) return

  const card = player.cards[cardIdx]
  train.attachment = { type: 'card', id: card.id, name: card.name, color: card.color, permit: card.permit }
  player.cards[cardIdx].used = true
  player.cards[cardIdx].assignedTo = { corpSym, trainId }
}

function handleUseCardAction(state, { playerId, cardId }) {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return

  const cardIdx = player.cards.findIndex((c) => c.id === cardId && !c.used)
  if (cardIdx < 0) return

  // Mark as used (unique action consumed — actual effect is tracked on the board, not in engine)
  player.cards[cardIdx].used = true
  player.cards[cardIdx].usedAs = 'unique_action'
}

function handleBuyExecutiveCar(state, { corpSym, trainId, price }) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return

  const train = corp.trains.find((t) => t.id === trainId)
  if (!train || train.attachment) return // already has attachment

  const cost = price ?? 0
  corp.cash -= cost
  state.bank.cash += cost

  train.attachment = { type: 'executive_car', name: 'Executive Car' }

  // Track remaining supply
  if (!state.executiveCarSupply) state.executiveCarSupply = state.title.executiveCars?.count ?? 0
  if (typeof state.executiveCarSupply === 'number') state.executiveCarSupply--
}

function handleAdjustCash(state, { entityId, entityType, amount }) {
  if (entityType === 'player') {
    const player = state.players.find((p) => p.id === entityId)
    if (player) player.cash += amount
  } else if (entityType === 'corporation') {
    const corp = state.corporations.find((c) => c.sym === entityId)
    if (corp) corp.cash += amount
  } else if (entityType === 'bank') {
    state.bank.cash += amount
  }
}

// Generate human-readable description
function describeAction(state, action) {
  const playerName = (id) => state.players.find((p) => p.id === id)?.name ?? id
  const fmt = (n) => `${state.title.currencyFormat}${n}`

  switch (action.type) {
    case 'PAR_SHARE':
      return `${playerName(action.playerId)} pars ${action.corpSym} at ${fmt(action.parPrice)}`
    case 'BUY_SHARE':
      return `${playerName(action.playerId)} buys ${action.percent ?? 10}% ${action.corpSym} from ${action.source}`
    case 'SELL_SHARES':
      return `${playerName(action.playerId)} sells ${action.percent ?? 10}% ${action.corpSym}`
    case 'CORP_BUY_SHARE':
      return `${action.buyerCorpSym} buys ${action.percent ?? 10}% ${action.targetCorpSym} from ${action.source}`
    case 'CORP_SELL_SHARES':
      return `${action.sellerCorpSym} sells ${action.percent ?? 10}% ${action.targetCorpSym}`
    case 'PAY_DIVIDEND': {
      const ps = Math.floor(action.totalRevenue / 10)
      const price = corpPrice(state.stockMarket, action.corpSym)
      const jumps = price && ps >= price ? ' (double jump)' : ''
      return `${action.corpSym} pays ${fmt(action.totalRevenue)} (${fmt(ps)}/share)${jumps}`
    }
    case 'WITHHOLD_DIVIDEND':
      return `${action.corpSym} withholds ${fmt(action.totalRevenue)}`
    case 'HALF_DIVIDEND':
      return `${action.corpSym} half-pays ${fmt(action.totalRevenue)}`
    case 'BUY_TRAIN':
      return `${action.corpSym} buys ${action.trainName}-train${action.fromCorpSym ? ` from ${action.fromCorpSym}` : ''} for ${fmt(action.price ?? 0)}`
    case 'BUY_PRIVATE':
      return `${playerName(action.playerId)} buys ${action.companySym} for ${fmt(action.price)}`
    case 'SELL_PRIVATE':
      return `${playerName(action.fromPlayerId)} sells ${action.companySym} to ${action.toCorpSym} for ${fmt(action.price)}`
    case 'COLLECT_REVENUE':
      return `${action.companySym} collects revenue`
    case 'COLLECT_ALL_REVENUE':
      return 'All private revenue collected'
    case 'SOLD_OUT_ADJUST':
      return 'Sold-out corporations move up'
    case 'MERGE_CORPS':
      return `${action.topCorpSym || action.survivorSym} merges with ${action.bottomCorpSym || action.nonsurvivorSym}`
    case 'ACQUIRE_MINOR':
      return `${action.majorSym} acquires ${action.minorSym} (${action.paymentShares} shares + ${fmt(action.cashDifference)})`
    case 'CONVERT_MINOR':
      return `${action.minorSym} converts to ${action.majorSym}`
    case 'MERGE_MINORS':
      return `${(action.minorSyms || []).join(', ')} merge into ${action.majorSym}`
    case 'GIVE_CARD':
      return `${playerName(action.playerId)} receives ${action.card?.name ?? 'card'}`
    case 'ASSIGN_CARD_TO_TRAIN':
      return `${playerName(action.playerId)} assigns ${action.cardId} to ${action.corpSym} ${action.trainId}`
    case 'USE_CARD_ACTION':
      return `${playerName(action.playerId)} uses ${action.cardId} unique action`
    case 'BUY_EXECUTIVE_CAR':
      return `${action.corpSym} buys executive car for ${action.trainId}${action.price ? ` (${fmt(action.price)})` : ''}`
    case 'TAKE_LOAN':
      return `${action.corpSym} takes loan (+${fmt(state.title.loans?.loanValue || 100)})`
    case 'REPAY_LOAN':
      return `${action.corpSym} repays loan (-${fmt(state.title.loans?.loanValue || 100)})`
    case 'PAY_INTEREST':
      return `${action.corpSym} pays ${fmt(interestDue(state, action.corpSym))} interest`
    case 'CONVERT_CORP':
      return `${action.corpSym} converts to ${action.targetSize}`
    case 'SHORT_SELL':
      return `${playerName(action.playerId)} shorts ${action.corpSym}`
    case 'CLOSE_SHORT':
      return `${playerName(action.playerId)} closes short on ${action.corpSym}`
    case 'EXPORT_TRAIN':
      return `Train exported from depot`
    case 'LIQUIDATE_CORP':
      return `${action.corpSym} liquidated`
    case 'ACQUIRE_CORP':
      return `${action.acquirerSym} acquires ${action.targetSym} for ${fmt(action.price || 0)}`
    case 'SET_FLOAT_PERCENT':
      return `Float requirement changed to ${action.percent}%`
    case 'CONVERT_CONCESSION':
      return `${playerName(action.playerId)} converts ${action.companySym} to ${action.corpSym} president`
    case 'NATIONALIZE_CORP':
      return `${action.corpSym} nationalized into ${action.nationalSym}`
    case 'PLAYER_BANKRUPT':
      return `${playerName(action.playerId)} declares bankruptcy`
    case 'DELIVER_BEER':
      return `${action.brewerySym} delivers ${action.count ?? 1} beer to segment ${action.segmentId}`
    case 'DELIVER_EXPORT':
      return `${action.brewerySym} delivers ${action.count ?? 1} beer to export market`
    case 'BREWERY_INCOME':
      return `${action.brewerySym} earns ${fmt(action.income)} brewery income`
    case 'ADVANCE_BEER_MARKET':
      return 'Beer market advanced'
    case 'REMOVE_NO_DEMAND':
      return `No Demand removed from segment ${action.segmentId}`
    case 'PLACE_NO_DEMAND':
      return `No Demand placed on segment ${action.segmentId}`
    case 'ADJUST_CASH':
      return `Manual adjustment: ${action.entityId} ${action.amount >= 0 ? '+' : ''}${fmt(action.amount)}${action.reason ? ` (${action.reason})` : ''}`
    case 'FORCE_PRESIDENT':
      return `Force ${playerName(action.playerId)} as president of ${action.corpSym}`
    case 'MOVE_CERT': {
      const from = action.fromSource || playerName(action.fromPlayerId)
      const to = action.toSource || playerName(action.toPlayerId)
      return `Move ${action.percent}%${action.isPresident ? 'P' : ''} ${action.corpSym} from ${from} to ${to}`
    }
    case 'SET_PRIORITY': {
      const pp = state.players.find(p => p.id === action.playerId)
      return `Priority deal → ${pp?.name || action.playerId}`
    }
    case 'SET_PLAYER_NAME':
      return `Rename ${action.playerId} to ${action.name}`
    case 'SET_CASH':
      return `Set ${action.entityId} cash to ${fmt(action.value)}`
    case 'SET_SHARES':
      return `Set ${playerName(action.playerId)} ${action.corpSym} to ${action.percent}%`
    case 'SET_CORP_FIELD':
      return `Set ${action.corpSym} ${action.field} to ${action.value}`
    case 'SET_MARKET_POSITION':
      return `Move ${action.corpSym} to [${action.row},${action.col}]`
    case 'ADD_TRAIN_MANUAL':
      return `Add ${action.trainName}-train to ${action.corpSym} (manual)`
    case 'REMOVE_TRAIN_MANUAL':
      return `Remove ${action.trainName}-train from ${action.corpSym} (manual)`
    case 'ADVANCE_ROUND':
      return `→ ${state.roundTracker ? roundLabel(state.roundTracker) : 'next round'}`
    case 'SET_ROUND':
      return `Round set manually`
    case 'SET_PLAYER_ORDER': {
      const names = (action.order || []).map((id) => playerName(id))
      return `Player order set: ${names.join(', ')}`
    }
    case 'SET_PRIORITY':
      return `Priority deal → ${playerName(action.playerId)}`
    case 'DISMISS_EVENT':
      return `Event acknowledged: ${action.event}`
    case 'REMOVE_CORPORATION':
      return `${action.corpSym} removed from game`
    case 'DISCARD_TRAIN':
      return `${action.corpSym} discards ${action.trainName}-train`
    case 'REMOVE_TOKEN':
      return `${action.corpSym} removes a station token`
    case 'PLACE_TOKEN':
      return `${action.corpSym} places token (${fmt(action.price ?? 0)})`
    case 'ISSUE_SHARES':
      return `${action.corpSym} issues shares (IPO → market)`
    case 'REDEEM_SHARES':
      return `${action.corpSym} redeems shares (market → IPO)`
    case 'SWAP_PRESIDENT':
      return `${playerName(action.playerId)} becomes president of ${action.corpSym}`
    case 'SET_CORP_ORDER':
      return `Corporation order set: ${(action.order || []).join(', ')}`
    case 'SET_TURN_QUEUE':
      return `Turn order set`
    case 'NEXT_TURN':
    case 'PREV_TURN':
    case 'SR_PASS':
    case 'SR_ACTED':
      return null // silent — no log entry for turn navigation
    case 'REORDER_BY_CASH':
      return `Players reordered by ${action.direction === 'asc' ? 'least' : 'most'} cash`
    default:
      return JSON.stringify(action)
  }
}
