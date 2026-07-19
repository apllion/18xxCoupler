// Shared defaults — titles spread from this and override what differs.

export const defaults = {
  capitalization: 'full',
  currencyFormat: '$',
  floatPercent: 60,

  // Stock rules
  sellBuyOrder: 'sell_buy',
  sellMovement: 'down_share',
  poolShareDrop: 'none',
  sellAfter: 'first_sr',
  mustSellInBlocks: false,

  // Emergency buy
  ebuyPresSwap: true,
  ebuyFromOthers: 'never',
  ebuyMustIssueBefore: false,
  ebuyDepotCheapest: true,

  // Player order between SRs
  // 'after_last_to_act' (default) | 'first_to_pass' | 'most_cash' | 'least_cash'
  nextSRPlayerOrder: 'after_last_to_act',

  // Game end
  gameEndCheck: {
    bankrupt: 'immediate',
    bank: 'full_or',
  },

  // Share structure (default: 20% president + 8x 10%)
  shares: [20, 10, 10, 10, 10, 10, 10, 10, 10],

  // Market share limit (percent in pool before no more can be sold)
  marketShareLimit: 50,

  // Private company sale price range (multiplier of face value)
  // Most titles: 50%–200% (0.5–2.0). Some titles differ.
  privateSaleMin: 0.5,  // minimum price as multiplier of face value
  privateSaleMax: 2.0,  // maximum price as multiplier of face value

  // Corp-to-corp share purchasing (disabled by default)
  // Dividend on unsold shares: 'market' = market pays corp (standard), 'ipo' = IPO/treasury pays corp, 'both' = both, 'none' = neither
  unsoldShareDividends: 'market',

  // Round types available for this title (user picks from these)
  roundTypes: ['SR', 'OR'],

  corpCanBuyShares: false,
  corpCanSellShares: false,
}
