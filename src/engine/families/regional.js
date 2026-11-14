// Regional family — behavioral strategies for titles with unique movement rules.
// Used by: 1860, 1862, 18DO/TRG, PTG, and other titles with multi-jump or
// direction-variant movement.
//
// These are pure strategy functions that encode HOW movement works.
// They do NOT read state.title config.

// Multi-jump dividend (1860, 1862): >=1x->1; >=2x->2; >=3x->3; >=4x->4
function dividendMovementMultiJump(market, pos, perShare, price, totalRevenue, helpers) {
  if (perShare <= 0) return helpers.doLeft()
  if (perShare < price) return 0
  const t = Math.min(Math.floor(perShare / price), 4)
  return helpers.doRight(t)
}

// TRG triple jump (18DO): withhold=left/down; <price=none; >=price right1; >=3x right2
function dividendMovementTRG(market, pos, perShare, price, totalRevenue, helpers) {
  if (perShare <= 0) return helpers.doLeftOrDown()
  if (perShare < price) return 0
  if (perShare >= price * 3) return helpers.doRight(2)
  // Right 1, or up if at right edge
  if (helpers.tryStepRight()) return 1
  if (helpers.tryStepUp()) return 1
  return 0
}

// PTG triple: compare TOTAL revenue vs price (not per-share)
function dividendMovementPTG(market, pos, perShare, price, totalRevenue, helpers) {
  const rev = totalRevenue ?? perShare * 10
  if (perShare <= 0) return helpers.doLeftOrDown()
  if (rev < price * 0.5) return helpers.doLeftOrDown()
  if (rev >= price * 3) {
    let m = 0
    if (helpers.tryStepRight() || helpers.tryStepUp()) m++
    if (helpers.tryStepRight() || helpers.tryStepUp()) m++
    return m
  }
  if (helpers.tryStepRight() || helpers.tryStepUp()) return 1
  return 0
}

export const regional = {
  dividendMovementMultiJump,
  dividendMovementTRG,
  dividendMovementPTG,
}
