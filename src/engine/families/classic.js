// Classic family — standard 18xx behavioral strategies.
// Used by: 1830, 1889, 18Ches, most full-cap titles.
//
// These are pure strategy functions. They do NOT read state.title config —
// the caller passes all needed values. They only encode HOW to calculate
// movement, not WHAT config values to use.

// Dividend movement: standard double-jump.
// rev > 0: right 1. If perShare >= price: right 2 (double jump).
// Withhold: left 1.
function dividendMovement(market, pos, perShare, price, totalRevenue, helpers) {
  if (perShare <= 0) return helpers.doLeft()
  return helpers.doRight(perShare >= price ? 2 : 1)
}

// Sell movement: down one space per share sold.
function sellMovementPerShare(market, pos, shares, helpers) {
  for (let i = 0; i < shares; i++) {
    helpers.stepDown()
  }
}

// Sell movement: down one space per sale action (regardless of share count).
function sellMovementBlock(market, pos, shares, helpers) {
  helpers.stepDown()
}

export const classic = {
  dividendMovement,
  sellMovementPerShare,
  sellMovementBlock,
}
