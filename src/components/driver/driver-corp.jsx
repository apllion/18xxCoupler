// Corp OR Card — one per corp. Revenue, trains, tokens, and all OR actions.

import { useState } from 'react'
import { nextAvailableTrains } from '../../engine/depot.js'
import { corpPrice } from '../../engine/stockMarket.js'

export default function CorpORCard({ data, corp }) {
  const { game, fmt, dispatch, myPlayerId, isPresident } = data
  const me = game.players.find(p => p.id === myPlayerId)
  const isMyCorp = me && isPresident(me, corp.sym)
  const [revInput, setRevInput] = useState('')
  const rev = parseInt(revInput, 10) || 0
  const shareSize = game.title.shares?.[1] ?? 10

  return (
    <div className="flex flex-col h-full">
      {/* Corp header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 rounded font-bold text-sm"
          style={corp.stripeColor
            ? { background: `linear-gradient(135deg, ${corp.color} 50%, ${corp.stripeColor} 50%)`, color: corp.textColor }
            : { backgroundColor: corp.color, color: corp.textColor }
          }>{corp.sym}</span>
        <span className="text-sky-300 font-bold text-lg">{fmt(corp.cash)}</span>
        <span className="text-xs text-broker-text-muted">@ {fmt(corp.price)}</span>
        {corp.operated && <span className="text-[10px] text-green-400">✓</span>}
        {!isMyCorp && <span className="text-[10px] text-broker-text-muted">(view only)</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-broker-surface rounded-lg p-2 text-center">
          <div className="text-broker-text-muted">Trains</div>
          <div className="font-bold text-white">{corp.trains.length > 0 ? corp.trains.map(t => t.name).join(' ') : 'none'}</div>
        </div>
        <div className="bg-broker-surface rounded-lg p-2 text-center">
          <div className="text-broker-text-muted">Tokens</div>
          <div className="font-bold text-white">{corp.tokensPlaced}/{corp.tokens.length}</div>
        </div>
        <div className="bg-broker-surface rounded-lg p-2 text-center">
          <div className="text-broker-text-muted">IPO / Pool</div>
          <div className="font-bold text-white">{corp.ipoShares}% / {corp.marketShares}%</div>
        </div>
      </div>

      {/* === ACTIONS (president only) === */}
      {isMyCorp && (
        <div className="space-y-2 flex-1">

          {/* Revenue */}
          <div className="bg-broker-surface rounded-lg p-3">
            <div className="text-xs text-broker-text-muted mb-1">Revenue</div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="number" value={revInput} onChange={e => setRevInput(e.target.value)}
                placeholder="0" className="w-20 bg-broker-bg border border-broker-border rounded px-2 py-2 text-white text-center" />
              <button onClick={() => dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: 0 })}
                className="text-sm bg-red-800 text-white px-3 py-2 rounded-lg font-medium">No Trains</button>
              {rev > 0 && (
                <>
                  <button onClick={() => { dispatch({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                    className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg font-medium">Pay</button>
                  <button onClick={() => { dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                    className="text-sm bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Withhold</button>
                  {game.title.halfPay && (
                    <button onClick={() => { dispatch({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                      className="text-sm bg-amber-700 text-white px-3 py-2 rounded-lg font-medium">Half</button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Train buy */}
          <div className="bg-broker-surface rounded-lg p-3">
            <div className="text-xs text-broker-text-muted mb-1">Buy Train</div>
            <div className="flex gap-2 flex-wrap">
              {(game.depot ? nextAvailableTrains(game.depot) : []).map(t => (
                <button key={t.name}
                  onClick={() => dispatch({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })}
                  disabled={corp.cash < t.price}
                  className="text-sm bg-blue-800 hover:bg-blue-700 disabled:opacity-30 text-white px-3 py-2 rounded-lg">
                  {t.name} {fmt(t.price)}
                </button>
              ))}
            </div>
            {/* Discard train */}
            {corp.trains.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                <span className="text-[10px] text-broker-text-muted self-center">Discard:</span>
                {corp.trains.map((t, i) => (
                  <button key={i} onClick={() => dispatch({ type: 'DISCARD_TRAIN', corpSym: corp.sym, trainName: t.name })}
                    className="text-xs bg-red-900 hover:bg-red-800 text-red-300 px-2 py-1 rounded">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Token */}
          {corp.tokensPlaced < corp.tokens.length && (
            <div className="bg-broker-surface rounded-lg p-3">
              <div className="text-xs text-broker-text-muted mb-1">Place Token</div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => dispatch({ type: 'PLACE_TOKEN', corpSym: corp.sym, price: corp.tokens[corp.tokensPlaced] || 0 })}
                  className="text-sm bg-green-700 text-white px-3 py-2 rounded-lg">
                  Place {fmt(corp.tokens[corp.tokensPlaced] || 0)}
                </button>
                {/* Terrain costs */}
                {(game.title.terrainCosts || []).map(tc => (
                  <button key={tc} onClick={() => dispatch({ type: 'ADJUST_CASH', entityId: corp.sym, entityType: 'corporation', amount: -tc })}
                    className="text-sm bg-amber-800 text-amber-200 px-3 py-2 rounded-lg">
                    Terrain {fmt(tc)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Remove token */}
          {corp.tokensPlaced > 0 && (
            <button onClick={() => dispatch({ type: 'REMOVE_TOKEN', corpSym: corp.sym })}
              className="text-xs text-broker-text-muted hover:text-red-300">Remove Token</button>
          )}

          {/* Issue / Redeem (incremental cap) */}
          {game.title.capitalization === 'incremental' && (
            <div className="flex gap-2">
              {corp.ipoShares > 0 && (
                <button onClick={() => dispatch({ type: 'ISSUE_SHARES', corpSym: corp.sym, percent: shareSize })}
                  className="text-sm bg-blue-800 text-white px-3 py-2 rounded-lg flex-1">
                  Issue {shareSize}%
                </button>
              )}
              {corp.marketShares > 0 && (
                <button onClick={() => dispatch({ type: 'REDEEM_SHARES', corpSym: corp.sym, percent: shareSize })}
                  className="text-sm bg-green-800 text-white px-3 py-2 rounded-lg flex-1">
                  Redeem {shareSize}%
                </button>
              )}
            </div>
          )}

          {/* Loans */}
          {game.title.loans && (
            <div className="flex gap-2">
              <button onClick={() => dispatch({ type: 'TAKE_LOAN', corpSym: corp.sym })}
                className="text-sm bg-red-800 text-white px-3 py-2 rounded-lg flex-1">
                Take Loan
              </button>
              {corp.loans > 0 && (
                <>
                  <button onClick={() => dispatch({ type: 'REPAY_LOAN', corpSym: corp.sym })}
                    className="text-sm bg-green-800 text-white px-3 py-2 rounded-lg flex-1">
                    Repay Loan
                  </button>
                  <button onClick={() => dispatch({ type: 'PAY_INTEREST', corpSym: corp.sym })}
                    className="text-sm bg-amber-800 text-white px-3 py-2 rounded-lg flex-1">
                    Interest
                  </button>
                </>
              )}
            </div>
          )}

          {/* Corp share trading */}
          {game.title.corpCanBuyShares && (
            <div className="bg-broker-surface rounded-lg p-3">
              <div className="text-xs text-broker-text-muted mb-1">Corp Share Trading</div>
              <div className="flex gap-2 flex-wrap">
                {game.corporations.filter(c => c.sym !== corp.sym && c.ipoed).map(target => {
                  const tp = corpPrice(game.stockMarket, target.sym) || 0
                  return (
                    <span key={target.sym} className="inline-flex gap-1">
                      {target.ipoShares > 0 && (
                        <button onClick={() => dispatch({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'ipo', percent: shareSize })}
                          disabled={corp.cash < tp}
                          className="text-xs bg-green-800 disabled:opacity-30 text-white px-2 py-1 rounded">
                          <span style={{ color: target.color }}>{target.sym}</span> IPO
                        </button>
                      )}
                      {target.marketShares > 0 && (
                        <button onClick={() => dispatch({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'market', percent: shareSize })}
                          disabled={corp.cash < tp}
                          className="text-xs bg-blue-800 disabled:opacity-30 text-white px-2 py-1 rounded">
                          <span style={{ color: target.color }}>{target.sym}</span> Mkt
                        </button>
                      )}
                    </span>
                  )
                })}
              </div>
              {/* Sell corp holdings */}
              {(corp.sharesHeld || []).length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] text-broker-text-muted mb-1">Sell holdings:</div>
                  <div className="flex gap-1 flex-wrap">
                    {[...new Set((corp.sharesHeld || []).map(s => s.corpSym))].map(sym => {
                      const pct = (corp.sharesHeld || []).filter(s => s.corpSym === sym).reduce((s, x) => s + x.percent, 0)
                      const target = game.corporations.find(c => c.sym === sym)
                      return (
                        <button key={sym} onClick={() => dispatch({ type: 'CORP_SELL_SHARES', sellerCorpSym: corp.sym, targetCorpSym: sym, percent: shareSize })}
                          className="text-xs bg-red-800 text-white px-2 py-1 rounded">
                          <span style={{ color: target?.color }}>{sym}</span> {pct}%
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sell private to corp */}
          {me && me.privates.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] text-broker-text-muted self-center">Sell private:</span>
              {me.privates.map(sym => {
                const company = (game.companies || []).find(c => c.sym === sym)
                if (!company || company.closed) return null
                return (
                  <button key={sym} onClick={() => dispatch({ type: 'SELL_PRIVATE', companySym: sym, fromPlayerId: myPlayerId, toCorpSym: corp.sym, price: company.value })}
                    className="text-xs bg-purple-800 text-purple-200 px-2 py-1 rounded">
                    {sym} {fmt(company.value)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
