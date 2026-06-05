import { describe, it, expect } from 'vitest'
import { createRoundTracker, roundLabel, advanceRound, setRoundType } from '../src/engine/roundTracker.js'

function makeTracker(pregameSteps = [], title = {}) {
  return createRoundTracker(title, pregameSteps)
}

describe('roundTracker', () => {
  it('starts in Pregame when steps exist', () => {
    const rt = makeTracker([{ id: 'auction', label: 'Private Auction', type: 'waterfall' }])
    expect(rt.roundType).toBe('Pregame')
    expect(rt.roundTypes).toEqual(['Pregame', 'SR', 'OR'])
    expect(roundLabel(rt)).toBe('Pregame')
  })

  it('starts in SR when no pregame steps', () => {
    const rt = makeTracker([])
    expect(rt.roundType).toBe('SR')
    expect(rt.roundTypes).toEqual(['SR', 'OR'])
    expect(roundLabel(rt)).toBe('SR')
  })

  it('advances Pregame → SR → OR → SR', () => {
    const rt = makeTracker([{ id: 'auction', label: 'Auction', type: 'waterfall' }])
    expect(rt.roundType).toBe('Pregame')

    advanceRound(rt)
    expect(rt.roundType).toBe('SR')

    advanceRound(rt)
    expect(rt.roundType).toBe('OR')

    advanceRound(rt)
    expect(rt.roundType).toBe('SR')
  })

  it('setRoundType changes round type', () => {
    const rt = makeTracker([])
    expect(rt.roundType).toBe('SR')

    setRoundType(rt, 'OR')
    expect(rt.roundType).toBe('OR')
    expect(roundLabel(rt)).toBe('OR')

    setRoundType(rt, 'SR')
    expect(rt.roundType).toBe('SR')
  })

  it('setRoundType maps legacy values', () => {
    const rt = makeTracker([])
    setRoundType(rt, 'stock')
    expect(rt.roundType).toBe('SR')

    setRoundType(rt, 'operating')
    expect(rt.roundType).toBe('OR')
  })

  it('uses custom roundTypes from title', () => {
    const rt = makeTracker([], { roundTypes: ['SR', 'CR', 'OR'] })
    expect(rt.roundTypes).toEqual(['SR', 'CR', 'OR'])
    expect(rt.roundType).toBe('SR')
  })

  it('prepends Pregame to custom roundTypes when steps exist', () => {
    const rt = makeTracker(
      [{ id: 'auction', label: 'Auction', type: 'waterfall' }],
      { roundTypes: ['SR', 'CR', 'OR'] }
    )
    expect(rt.roundTypes).toEqual(['Pregame', 'SR', 'CR', 'OR'])
    expect(rt.roundType).toBe('Pregame')
  })
})
