// RoundTracker — simple round-type selector.
// Each title declares its round types (e.g. ['SR', 'OR']).
// The user picks the current type; it filters actions and views.
// Always advisory — never blocks actions.

import { getPregameSteps } from './pregame.js'

export function createRoundTracker(title, pregameSteps = []) {
  const base = title.roundTypes || ['SR', 'OR']
  const roundTypes = pregameSteps.length > 0 && !base.includes('Pregame')
    ? ['Pregame', ...base]
    : [...base]

  return {
    roundTypes,
    roundType: roundTypes[0],
  }
}

// Human-readable label for the current round
export function roundLabel(tracker) {
  return tracker.roundType || '—'
}

// Set the current round type (primary mutation)
export function setRoundType(tracker, roundType) {
  // Compat: map old values from saved logs
  const COMPAT = { stock: 'SR', operating: 'OR' }
  tracker.roundType = COMPAT[roundType] || roundType
}

// Legacy compat — kept so replaying old ADVANCE_ROUND actions doesn't crash.
// Simple cycle: Pregame → SR → OR → SR → OR ...
export function advanceRound(tracker) {
  if (tracker.roundType === 'Pregame') {
    tracker.roundType = 'SR'
  } else if (tracker.roundType === 'SR') {
    tracker.roundType = 'OR'
  } else {
    tracker.roundType = 'SR'
  }
}
