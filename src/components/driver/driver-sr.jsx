// Card 3: My SR Stats + Main Actions — shares, cash, buy/sell/par

import { useState } from 'react'
import { corpPrice, parPrices } from '../../engine/stockMarket.js'
import { getCorpShares } from '../../engine/corporation.js'

export default function MySRStats({ data }) {
  const { game, fmt, me, myPlayerId, corps, dispatch, playerSharePercent, isPresident } = data
  const [buyCorpSym, setBuyCorpSym] = useState(null)

  if (!me) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-broker-text-muted">← Select a player first</div>
      </div>
    )
  }

  const shareSize = game.title.shares?.[1] ?? 10

  // My holdings
  const holdings = corps.map(c => {
    const pct = playerSharePercent(me, c.sym)
    if (pct === 0) return null
    const pres = isPresident(me, c.sym)
    const price = corpPrice(game.stockMarket, c.sym) || 0
    return { corp: c, pct, pres, price, value: price * (pct / 10) }
  }).filter(Boolean)

  const totalShareValue = holdings.reduce((s, h) => s + h.value, 0)

  // Unfloated corps for parring
  const unfloated = game.corporations.filter(c => !c.ipoed && !c.floated)

  // Corp being bought from
  const buyTarget = buyCorpSym ? corps.find(c => c.sym === buyCorpSym) : null

  return (
    <div className="flex flex-col h-full">
      <div className="text-lg font-bold mb-1">{me.name}</div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl font-bold text-sky-300">{fmt(me.cash)}</span>
        <span className="text-xs text-broker-text-muted">Shares: {fmt(totalShareValue)}</span>
        <span className="text-xs text-broker-text-muted">Net: {fmt(me.cash + totalShareValue)}</span>
      </div>

      {/* Holdings */}
      <div className="space-y-1 mb-3">
        {holdings.map(h => (
          <div key={h.corp.sym} className="flex items-center justify-between bg-broker-surface rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="px-1 rounded font-bold text-xs" style={{ backgroundColor: h.corp.color, color: h.corp.textColor }}>
                {h.corp.sym}
              </span>
              <span className="text-sm">{h.pct}%{h.pres ? 'P' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-broker-text-muted">{fmt(h.price)}</span>
              {/* Sell button */}
              <button onClick={() => dispatch({ type: 'SELL_SHARES', playerId: myPlayerId, corpSym: h.corp.sym, percent: shareSize })}
                className="text-sm bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium">
                Sell
              </button>
            </div>
          </div>
        ))}
        {holdings.length === 0 && <div className="text-xs text-broker-text-muted">No shares held</div>}
      </div>

      {/* Actions */}
      <div className="space-y-2 mt-auto">
        {/* Buy */}
        {buyCorpSym && buyTarget ? (
          <div className="bg-broker-surface rounded-lg p-3">
            <div className="text-sm text-broker-text-muted mb-2">Buy <span className="px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: buyTarget.color, color: buyTarget.textColor }}>{buyTarget.sym}</span></div>
            <div className="flex gap-2">
              {buyTarget.ipoShares > 0 && (
                <button onClick={() => { dispatch({ type: 'BUY_SHARE', playerId: myPlayerId, corpSym: buyCorpSym, source: 'ipo', percent: shareSize }); setBuyCorpSym(null) }}
                  className="text-sm bg-green-700 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium flex-1">
                  IPO {fmt(corpPrice(game.stockMarket, buyCorpSym) || buyTarget.parPrice)}
                </button>
              )}
              {buyTarget.marketShares > 0 && (
                <button onClick={() => { dispatch({ type: 'BUY_SHARE', playerId: myPlayerId, corpSym: buyCorpSym, source: 'market', percent: shareSize }); setBuyCorpSym(null) }}
                  className="text-sm bg-blue-700 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium flex-1">
                  Market {fmt(corpPrice(game.stockMarket, buyCorpSym))}
                </button>
              )}
              <button onClick={() => setBuyCorpSym(null)} className="text-sm text-broker-text-muted px-3">×</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm text-broker-text-muted mb-2">Buy share:</div>
            <div className="flex gap-2 flex-wrap">
              {corps.filter(c => c.ipoShares > 0 || c.marketShares > 0).map(c => (
                <button key={c.sym} onClick={() => {
                  if (c.ipoShares > 0 && c.marketShares === 0) {
                    dispatch({ type: 'BUY_SHARE', playerId: myPlayerId, corpSym: c.sym, source: 'ipo', percent: shareSize })
                  } else if (c.marketShares > 0 && c.ipoShares === 0) {
                    dispatch({ type: 'BUY_SHARE', playerId: myPlayerId, corpSym: c.sym, source: 'market', percent: shareSize })
                  } else {
                    setBuyCorpSym(c.sym)
                  }
                }}
                  className="px-3 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: c.color, color: c.textColor }}>
                  {c.sym}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Par */}
        {unfloated.length > 0 && (
          <div>
            <div className="text-sm text-broker-text-muted mb-2">Par:</div>
            <div className="flex gap-2 flex-wrap">
              {unfloated.map(c => {
                const pars = parPrices(game.stockMarket)
                const cheapest = pars[0]
                return (
                  <button key={c.sym} onClick={() => {
                    if (cheapest) dispatch({ type: 'PAR_SHARE', playerId: myPlayerId, corpSym: c.sym, parPrice: cheapest.price, row: cheapest.row, col: cheapest.col })
                  }}
                    className="text-sm bg-broker-surface hover:bg-broker-surface-hover border border-broker-border text-white px-4 py-3 rounded-lg font-medium">
                    {c.sym} @{fmt(cheapest?.price || 0)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
