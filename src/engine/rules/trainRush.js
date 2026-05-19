// Train Rush Indicator — phase pressure, obsolescence, emergency buy exposure.

import { currentPhase, phaseForTrain } from '../phase.js'
import { remainingCount } from '../depot.js'
import { corpPrice } from '../stockMarket.js'

// Analyze train rush state for the whole game
export function trainRushAnalysis(state) {
  const pm = state.phaseManager
  const phase = currentPhase(pm)
  const depot = state.depot

  // Find the next phase-triggering train
  const nextPhaseInfo = findNextPhase(pm)
  const nextTrain = nextPhaseInfo
    ? depot.upcoming.find(t => t.name === nextPhaseInfo.on)
    : null

  // Trains remaining in current and next tier
  const tiers = buildTierInfo(state)

  // Per-corp vulnerability analysis
  const corpAnalysis = state.corporations
    .filter(c => c.floated)
    .map(c => analyzeCorpTrains(state, c, tiers, nextPhaseInfo))

  return {
    phase: phase.name,
    nextPhase: nextPhaseInfo,
    tiers,
    corpAnalysis,
  }
}

function findNextPhase(pm) {
  const phases = pm.phases
  if (pm.currentIndex >= phases.length - 1) return null
  return phases[pm.currentIndex + 1]
}

function buildTierInfo(state) {
  const depot = state.depot
  const trains = state.title.trains || []
  const tiers = []

  for (const def of trains) {
    const remaining = remainingCount(depot, def.name)
    const total = typeof def.num === 'number'
      ? def.num
      : (typeof def.num === 'object' ? (def.num[state.playerCount] ?? 99) : 99)

    // Count how many corps currently own this train type
    let ownedCount = 0
    for (const c of state.corporations) {
      ownedCount += c.trains.filter(t => t.name === def.name).length
    }

    tiers.push({
      name: def.name,
      price: def.price,
      remaining,
      total,
      owned: ownedCount,
      rustsOn: def.rustsOn || null,
      obsoleteOn: def.obsoleteOn || null,
      triggersPhase: !!state.phaseManager.phases.find(p => p.on === def.name),
      events: def.events || [],
    })
  }
  return tiers
}

function analyzeCorpTrains(state, corp, tiers, nextPhase) {
  const price = corpPrice(state.stockMarket, corp.sym) || 0

  // Which trains does this corp own?
  const owned = corp.trains.map(t => t.name)

  // Which are rustable?
  const rustable = corp.trains.filter(t => t.rustsOn)
  const rustTriggers = [...new Set(rustable.map(t => t.rustsOn))]

  // What triggers the rust? How many of that train are left in depot?
  const rustRisk = rustTriggers.map(trigger => {
    const remaining = remainingCount(state.depot, trigger)
    const tier = tiers.find(t => t.name === trigger)
    const affectedTrains = rustable.filter(t => t.rustsOn === trigger).map(t => t.name)
    return {
      trigger,
      remaining,
      price: tier?.price || 0,
      affectedTrains,
      willBeTrainless: corp.trains.length === affectedTrains.length,
    }
  })

  // Permanent trains (no rustsOn)
  const permanentCount = corp.trains.filter(t => !t.rustsOn).length

  // Can this corp afford the cheapest available train?
  const cheapest = state.depot.upcoming.find(t => !t.availableOn)
  const canAffordCheapest = cheapest ? corp.cash >= cheapest.price : false

  // Emergency buy exposure: if all rustable trains rust, can the president cover?
  const president = state.players.find(p =>
    p.shares.some(s => s.corpSym === corp.sym && s.isPresident)
  )
  const worstCaseTrainCost = cheapest?.price || 0
  const emergencyBuyExposed = permanentCount === 0 && rustRisk.some(r => r.willBeTrainless)
  const presidentCanCover = president
    ? (corp.cash + president.cash) >= worstCaseTrainCost
    : false

  return {
    sym: corp.sym,
    color: corp.color,
    price,
    trains: owned,
    permanentCount,
    rustRisk,
    emergencyBuyExposed,
    presidentCanCover,
    canAffordCheapest,
    treasuryVsCheapest: cheapest ? corp.cash - cheapest.price : 0,
  }
}
