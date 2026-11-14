// Incremental family — behavioral strategies for incremental-cap titles.
// Used by: 1846, 18USA, 18SJ, and other titles with incremental capitalization.
//
// IMPORTANT: This module does NOT set capitalization or issueRedeemRule.
// Those are per-title config values read from state.title.* in actions.js.
// This module only provides the BEHAVIORAL functions (how dividend movement
// is calculated given a revenue/price ratio).

// 1846 dividend movement: tiered jumps.
// <half -> left; >=1x -> right1; >=2x -> right2; >=3x -> right3 (if price>=165)
function dividendMovement1846(market, pos, perShare, price, totalRevenue, helpers) {
  if (perShare <= 0) return helpers.doLeft()
  if (perShare < price * 0.5) return helpers.doLeft()
  let t = 0
  if (perShare >= price) t = 1
  if (perShare >= price * 2) t = 2
  if (perShare >= price * 3 && price >= 165) t = 3
  return t > 0 ? helpers.doRight(t) : 0
}

// 18USA dividend movement: half-price threshold tiers.
// >=0.5x -> 1; >=1x -> 2; >=1.5x -> 3; >=2x -> 4
function dividendMovement18usa(market, pos, perShare, price, totalRevenue, helpers) {
  if (perShare <= 0) return helpers.doLeft()
  let t = 0
  if (perShare >= Math.floor(price * 0.5)) t = 1
  if (perShare >= price) t = 2
  if (perShare >= Math.floor(price * 1.5)) t = 3
  if (perShare >= price * 2) t = 4
  return t > 0 ? helpers.doRight(t) : 0
}

export const incremental = {
  dividendMovement1846,
  dividendMovement18usa,
}
