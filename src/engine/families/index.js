// Engine family modules — strategy functions for behavioral differences between
// title families. These extract HOW calculations work, NOT what config values to
// use. Config values (capitalization, issueRedeemRule, operatingOrder, etc.)
// remain as direct reads from state.title.* in actions.js.
//
// Currently extracted:
//   - dividendMovement(market, pos, perShare, price, totalRevenue) — how stock
//     price moves when dividends are paid or withheld
//   - sellMovement(market, pos, shares) — how stock price moves when shares
//     are sold
//
// Each family module exports an object with these strategy functions.
// The lookup is by the title's dividendMovement or sellMovement config string.

import { classic } from './classic.js'
import { incremental } from './incremental.js'
import { regional } from './regional.js'

// Dividend movement strategy lookup — keyed by state.title.dividendMovement.
// Each value is a function(market, pos, perShare, price, totalRevenue, helpers)
// that returns the net movement (positive = right, negative = left, 0 = none).
export const dividendStrategies = {
  // Classic family: simple right-on-pay, double-jump if perShare >= price
  'standard':       classic.dividendMovement,
  undefined:        classic.dividendMovement,  // default when not set

  // No-double family: always right 1 on any pay (1830, 1889, 18Ches, 18MS, 1817)
  'no_double':      (market, pos, perShare, price, totalRevenue, h) =>
    perShare > 0 ? h.doRight(1) : h.doLeft(),

  // Standard but no double jump, require perShare >= price (1867, 1849, 18Rhl, 18Ireland)
  'standard_no_double': (market, pos, perShare, price, totalRevenue, h) =>
    perShare > 0
      ? (perShare >= price ? h.doRight(1) : 0)
      : h.doLeft(),

  // 1858: perShare*10 >= price check
  '1858': (market, pos, perShare, price, totalRevenue, h) =>
    perShare > 0
      ? (perShare * 10 >= price ? h.doRight(1) : 0)
      : h.doLeft(),

  // 1846 incremental: tiered jumps based on ratio
  '1846':           incremental.dividendMovement1846,

  // 1822: right1, or right2 if >= 2x price
  '1822': (market, pos, perShare, price, totalRevenue, h) =>
    perShare > 0
      ? h.doRight(perShare >= price * 2 ? 2 : 1)
      : h.doLeft(),

  // 18SJ: >=price right1; >=2x right2 (if price>82)
  '18sj': (market, pos, perShare, price, totalRevenue, h) =>
    perShare > 0
      ? (perShare < price ? 0 : h.doRight(perShare >= price * 2 && price > 82 ? 2 : 1))
      : h.doLeft(),

  // Multi-jump (1860, 1862): >=1x->1; >=2x->2; >=3x->3; >=4x->4
  'multi_jump':     regional.dividendMovementMultiJump,

  // 18GB: always at least 1 right on pay; up to 4x
  '18gb': (market, pos, perShare, price, totalRevenue, h) =>
    perShare > 0
      ? h.doRight(Math.min(Math.max(Math.floor(perShare / price), 1), 4))
      : h.doLeft(),

  // 18USA: half-price tiers
  '18usa':          incremental.dividendMovement18usa,

  // 18RG: floor(rev/price), max 3
  '18rg': (market, pos, perShare, price, totalRevenue, h) => {
    if (perShare <= 0) return h.doLeft()
    const t = Math.min(Math.floor(perShare / price), 3)
    return t > 0 ? h.doRight(t) : 0
  },

  // 21Moon: >=2x right2; >=half right1; else nothing
  '21moon': (market, pos, perShare, price, totalRevenue, h) => {
    if (perShare <= 0) return h.doLeft()
    if (perShare >= price * 2) return h.doRight(2)
    if (perShare >= price * 0.5) return h.doRight(1)
    return 0
  },

  // 1871: full payout right1
  '1871': (market, pos, perShare, price, totalRevenue, h) =>
    perShare > 0 ? h.doRight(1) : h.doLeft(),

  // TRG triple jump (18DO)
  'trg_triple_jump': regional.dividendMovementTRG,

  // PTG triple: compare TOTAL revenue vs price
  'ptg_triple':      regional.dividendMovementPTG,
}

// Sell movement strategy lookup — keyed by state.title.sellMovement.
// Each value is a function(market, pos, shares, helpers) that performs the movement.
export const sellStrategies = {
  'down_share':       classic.sellMovementPerShare,
  'down_per_10':      classic.sellMovementPerShare,
  undefined:          classic.sellMovementPerShare,  // default

  'down_per_sale':    classic.sellMovementBlock,
  'down_block':       classic.sellMovementBlock,
  'down_block_pres':  classic.sellMovementBlock,

  'left_share':       (market, pos, shares, h) => { for (let i = 0; i < shares; i++) h.stepLeft() },
  'left_block':       (market, pos, shares, h) => { h.stepLeft() },
  'left_block_pres':  (market, pos, shares, h) => { h.stepLeft() },

  'none':             () => {},
}
