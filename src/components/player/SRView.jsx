// SRView — Stock Round actions for the Player view.
// Ported from driver-sr.jsx with full action set:
//   Holdings with sell/sell-all, two-step par picker, shorts, debt,
//   F-value badge, collapsible Advanced section.

import { useState } from 'react'
import { corpPrice, parPrices } from '../../engine/stockMarket.js'
import CorpBadge from '../shared/CorpBadge.jsx'
import { IconExpand, IconCollapse } from '../shared/Icons.jsx'

export default function SRView({ game, fmt, me, myPlayerId, corps, dispatch }) {
  const [parCorpSym, setParCorpSym] = useState(null)
  const [parPrice, setParPrice] = useState(null)
  const [buyCorpSym, setBuyCorpSym] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!me) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-broker-text-muted text-sm">
        Select a player to begin
      </div>
    )
  }

  const shareSize = game.title.shares?.[1] ?? 10

  // Holdings
  const holdings = corps.map(c => {
    const pct = me.shares.filter(s => s.corpSym === c.sym).reduce((s, x) => s + x.percent, 0)
    if (pct === 0) return null
    const pres = me.shares.some(s => s.corpSym === c.sym && s.isPresident)
    const price = corpPrice(game.stockMarket, c.sym) || 0
    return { corp: c, pct, pres, price, value: price * (pct / shareSize) }
  }).filter(Boolean)

  const totalShareValue = holdings.reduce((s, h) => s + h.value, 0)

  // Shorts
  const shorts = (me.shorts || [])
  const hasShorts = shorts.length > 0

  // Debt
  const debt = me.debt || 0

  // Unfloated corps for parring
  const unfloated = game.corporations.filter(c => !c.ipoed && !c.floated)

  // Available par prices
  const allParPrices = parPrices(game.stockMarket)

  // F value — max affordable par
  const fValue = allParPrices.length > 0
    ? allParPrices.filter(p => p.price <= me.cash).slice(-1)[0]?.price || 0
    : 0

  // Buy target
  const buyTarget = buyCorpSym ? corps.find(c => c.sym === buyCorpSym) : null

  // Par flow target
  const parCorp = parCorpSym ? game.corporations.find(c => c.sym === parCorpSym) : null

  // Concessions (companies starting with 'C')
  const concessions = (me.privates || []).filter(sym => sym.startsWith('C'))

  // Issue/Redeem eligibility
  const hasIssueRedeem = game.title.issueRedeemRule || game.title.capitalization === 'incremental'

  return (
    <div className="space-y-3">
      {/* Header with cash + F value */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-sky-300">{fmt(me.cash)}</span>
          <span className="text-xs text-broker-text-muted">Shares {fmt(totalShareValue)}</span>
          <span className="text-xs text-broker-text-muted">Net {fmt(me.cash + totalShareValue)}</span>
        </div>
        {fValue > 0 && (
          <span className="bg-green-800 text-green-200 text-xs font-bold px-2 py-1 rounded-lg">
            F {fmt(fValue)}
          </span>
        )}
      </div>

      {/* Debt */}
      {debt > 0 && (
        <div className="bg-red-900/30 border border-red-800/40 rounded-lg px-3 py-2 text-sm text-red-300">
          Debt: {fmt(debt)}
        </div>
      )}

      {/* Holdings */}
      <div>
        <div className="text-xs font-medium text-broker-text-muted mb-1 border-l-2 border-green-500 pl-2">Holdings</div>
        <div className="space-y-1">
          {holdings.map(h => (
            <div key={h.corp.sym} className="flex items-center justify-between bg-broker-surface rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <CorpBadge sym={h.corp.sym} color={h.corp.color} textColor={h.corp.textColor}
                  stripeColor={h.corp.stripeColor} stripeTextColor={h.corp.stripeTextColor} />
                <span className="text-sm">{h.pct}%{h.pres ? ' P' : ''}</span>
                <span className="text-xs text-broker-text-muted">{fmt(h.price)} ea</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => dispatch({ type: 'SELL_SHARES', playerId: myPlayerId, corpSym: h.corp.sym, percent: shareSize })}
                  className="text-sm bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium min-h-[44px]">
                  Sell
                </button>
                {h.pct > shareSize && (
                  <button onClick={() => dispatch({ type: 'SELL_SHARES', playerId: myPlayerId, corpSym: h.corp.sym, percent: h.pct })}
                    className="text-xs bg-red-900 hover:bg-red-800 text-red-300 px-2 py-2 rounded-lg min-h-[44px]">
                    All
                  </button>
                )}
              </div>
            </div>
          ))}
          {holdings.length === 0 && <div className="text-xs text-broker-text-muted pl-2">No shares held</div>}
        </div>
      </div>

      {/* Shorts */}
      {hasShorts && (
        <div>
          <div className="text-xs font-medium text-broker-text-muted mb-1 border-l-2 border-red-500 pl-2">Short Positions</div>
          <div className="space-y-1">
            {shorts.map((sh, i) => (
              <div key={i} className="flex items-center justify-between bg-broker-surface rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <CorpBadge sym={sh.corpSym} color={corps.find(c => c.sym === sh.corpSym)?.color || '#666'}
                    textColor={corps.find(c => c.sym === sh.corpSym)?.textColor || '#fff'} />
                  <span className="text-sm text-red-300">{sh.percent}% short</span>
                </div>
                <button onClick={() => dispatch({ type: 'CLOSE_SHORT', playerId: myPlayerId, corpSym: sh.corpSym, percent: sh.percent })}
                  className="text-sm bg-green-800 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium min-h-[44px]">
                  Close
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buy share */}
      <div>
        <div className="text-xs font-medium text-broker-text-muted mb-1 border-l-2 border-green-500 pl-2">Buy Share</div>
        {buyCorpSym && buyTarget ? (
          <div className="bg-broker-surface rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-broker-text-muted">Buy</span>
              <CorpBadge sym={buyTarget.sym} color={buyTarget.color} textColor={buyTarget.textColor}
                stripeColor={buyTarget.stripeColor} stripeTextColor={buyTarget.stripeTextColor} />
            </div>
            <div className="flex gap-2">
              {buyTarget.ipoShares > 0 && (
                <button onClick={() => { dispatch({ type: 'BUY_SHARE', playerId: myPlayerId, corpSym: buyCorpSym, source: 'ipo', percent: shareSize }); setBuyCorpSym(null) }}
                  className="text-sm bg-green-700 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium flex-1 min-h-[44px]">
                  IPO {fmt(buyTarget.parPrice || corpPrice(game.stockMarket, buyCorpSym))}
                </button>
              )}
              {buyTarget.marketShares > 0 && (
                <button onClick={() => { dispatch({ type: 'BUY_SHARE', playerId: myPlayerId, corpSym: buyCorpSym, source: 'market', percent: shareSize }); setBuyCorpSym(null) }}
                  className="text-sm bg-blue-700 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium flex-1 min-h-[44px]">
                  Market {fmt(corpPrice(game.stockMarket, buyCorpSym))}
                </button>
              )}
              <button onClick={() => setBuyCorpSym(null)}
                className="text-sm text-broker-text-muted px-3 min-h-[44px]">Cancel</button>
            </div>
          </div>
        ) : (
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
                className="px-3 py-2 rounded-lg font-bold min-h-[44px]">
                <CorpBadge sym={c.sym} color={c.color} textColor={c.textColor}
                  stripeColor={c.stripeColor} stripeTextColor={c.stripeTextColor} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Par — two-step: pick corp, then pick price */}
      {unfloated.length > 0 && (
        <div>
          <div className="text-xs font-medium text-broker-text-muted mb-1 border-l-2 border-green-500 pl-2">Par</div>
          {parCorpSym && parCorp ? (
            <div className="bg-broker-surface rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-broker-text-muted">Par price for</span>
                <CorpBadge sym={parCorp.sym} color={parCorp.color} textColor={parCorp.textColor}
                  stripeColor={parCorp.stripeColor} stripeTextColor={parCorp.stripeTextColor} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {allParPrices.map(p => {
                  const cost = p.price * (game.title.parSharePercent || 20) / shareSize
                  const canAfford = me.cash >= cost
                  return (
                    <button key={`${p.row}-${p.col}`}
                      onClick={() => { dispatch({ type: 'PAR_SHARE', playerId: myPlayerId, corpSym: parCorpSym, parPrice: p.price, row: p.row, col: p.col }); setParCorpSym(null); setParPrice(null) }}
                      disabled={!canAfford}
                      className={`text-sm px-4 py-3 rounded-lg font-medium min-h-[44px] ${
                        canAfford ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-broker-surface-hover text-broker-text-muted opacity-40'
                      }`}>
                      {fmt(p.price)}
                      <span className="block text-[10px] opacity-70">cost {fmt(cost)}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => { setParCorpSym(null); setParPrice(null) }}
                className="text-xs text-broker-text-muted mt-2">Cancel</button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {unfloated.map(c => (
                <button key={c.sym} onClick={() => setParCorpSym(c.sym)}
                  className="bg-broker-surface hover:bg-broker-surface-hover border border-broker-border text-white px-4 py-3 rounded-lg font-medium min-h-[44px]">
                  <CorpBadge sym={c.sym} color={c.color} textColor={c.textColor}
                    stripeColor={c.stripeColor} stripeTextColor={c.stripeTextColor} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Issue / Redeem shares for corps player presides */}
      {hasIssueRedeem && holdings.filter(h => h.pres).map(h => {
        const c = h.corp
        const rule = game.title.issueRedeemRule || 'standard'
        const curPrice = c.price || 0
        const pos = game.stockMarket.corpPositions[c.sym]
        const leftPrice = pos && pos.col > 0 ? (game.stockMarket.grid[pos.row]?.[pos.col - 1]?.price || curPrice) : curPrice
        const rightPrice = pos ? (game.stockMarket.grid[pos.row]?.[pos.col + 1]?.price || curPrice) : curPrice
        const ip = rule === '1846' ? leftPrice : curPrice
        const rp = rule === '1846' ? rightPrice : curPrice
        const maxIssue = Math.floor((c.ipoShares || 0) / shareSize)
        const maxRedeem = rp > 0 ? Math.min(Math.floor((c.marketShares || 0) / shareSize), Math.floor((c.cash || 0) / rp)) : 0
        if (maxIssue === 0 && maxRedeem === 0) return null
        return (
          <div key={c.sym} className="bg-broker-surface rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-xs text-broker-text-muted">Issue / Redeem</div>
              <CorpBadge sym={c.sym} color={c.color} textColor={c.textColor}
                stripeColor={c.stripeColor} stripeTextColor={c.stripeTextColor} />
            </div>
            {rule === '1846' && <div className="text-[10px] text-broker-text-muted mb-1">Issue @{fmt(ip)} / Redeem @{fmt(rp)}</div>}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: maxIssue }, (_, i) => i + 1).map(n => (
                <button key={`i${n}`} onClick={() => dispatch({ type: 'ISSUE_SHARES', corpSym: c.sym, count: n })}
                  className="text-sm bg-blue-800 text-white px-3 py-2 rounded-lg min-h-[44px]">Issue {n} +{fmt(ip * n)}</button>
              ))}
              {Array.from({ length: maxRedeem }, (_, i) => i + 1).map(n => (
                <button key={`r${n}`} onClick={() => dispatch({ type: 'REDEEM_SHARES', corpSym: c.sym, count: n })}
                  className="text-sm bg-green-800 text-white px-3 py-2 rounded-lg min-h-[44px]">Redeem {n} -{fmt(rp * n)}</button>
              ))}
            </div>
          </div>
        )
      })}

      {/* Advanced section */}
      <div>
        <button onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-1 text-xs text-broker-text-muted hover:text-white py-2">
          {showAdvanced ? <IconCollapse /> : <IconExpand />}
          Advanced
        </button>
        {showAdvanced && (
          <div className="space-y-2 mt-1">

            {/* Short sell */}
            {game.title.shorts && (
              <div>
                <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-red-500 pl-2">Short Sell</div>
                <div className="flex gap-2 flex-wrap">
                  {corps.filter(c => c.floated).map(c => (
                    <button key={c.sym} onClick={() => dispatch({ type: 'SHORT_SELL', playerId: myPlayerId, corpSym: c.sym, percent: shareSize })}
                      className="text-sm bg-red-900 hover:bg-red-800 text-red-300 px-3 py-2 rounded-lg min-h-[44px]">
                      <CorpBadge sym={c.sym} color={c.color} textColor={c.textColor} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Player loans (1880-style) */}
            {game.title.loans?.type === '1880_player' && (
              <div>
                <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-amber-500 pl-2">Player Loans</div>
                <div className="flex gap-2">
                  <button onClick={() => dispatch({ type: 'PLAYER_BORROW', playerId: myPlayerId })}
                    className="text-sm bg-red-800 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium flex-1 min-h-[44px]">
                    Borrow
                  </button>
                  {debt > 0 && (
                    <button onClick={() => dispatch({ type: 'PLAYER_REPAY', playerId: myPlayerId })}
                      className="text-sm bg-green-800 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium flex-1 min-h-[44px]">
                      Repay
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Convert concession */}
            {concessions.length > 0 && (
              <div>
                <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-purple-500 pl-2">Convert Concession</div>
                <div className="flex gap-2 flex-wrap">
                  {concessions.map(sym => (
                    <button key={sym} onClick={() => dispatch({ type: 'CONVERT_CONCESSION', playerId: myPlayerId, companySym: sym })}
                      className="text-sm bg-purple-800 hover:bg-purple-700 text-purple-200 px-4 py-3 rounded-lg font-medium min-h-[44px]">
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Strategy cards */}
            {game.title.strategyCards && (
              <div>
                <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-blue-500 pl-2">Strategy Cards</div>
                <div className="flex gap-2 flex-wrap">
                  {(game.strategyCards || []).filter(c => !c.taken).map(card => (
                    <button key={card.id} onClick={() => dispatch({ type: 'TAKE_STRATEGY_CARD', playerId: myPlayerId, cardId: card.id })}
                      className="text-sm bg-blue-800 hover:bg-blue-700 text-white px-3 py-2 rounded-lg min-h-[44px]">
                      {card.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
