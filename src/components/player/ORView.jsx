// ORView — Operating Round actions for the Player view.
// Ported from driver-corp.jsx with full action set:
//   Revenue + NumPad, recent values, keyboard detection, Pay/Withhold/Half,
//   train purchase, token placement, sell private, collapsible Advanced
//   (loans, debt, corp shares, merger, exec cars, train export, discard, strategy).

import { useState, useRef, useEffect, useCallback } from 'react'
import { nextAvailableTrains } from '../../engine/depot.js'
import { corpPrice } from '../../engine/stockMarket.js'
import CorpBadge from '../shared/CorpBadge.jsx'
import { IconExpand, IconCollapse } from '../shared/Icons.jsx'
import { useNumPad, usePhysicalKeyboard } from '../input/NumPadContext.jsx'

// Hook: recent revenue values for a corp from action log
function useRecentValues(actionLog, corpSym) {
  const seen = new Set()
  const values = []
  for (let i = (actionLog || []).length - 1; i >= 0; i--) {
    const a = actionLog[i].action
    if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === corpSym) {
      if (!seen.has(a.totalRevenue) && a.totalRevenue > 0) {
        seen.add(a.totalRevenue)
        values.push(a.totalRevenue)
      }
      if (values.length >= 3) break
    }
  }
  return values
}

export default function ORView({ game, fmt, me, myPlayerId, corps, dispatch }) {
  const [expandedSym, setExpandedSym] = useState(null)

  if (!me) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-broker-text-muted text-sm">
        Select a player to begin
      </div>
    )
  }

  // All floated corps, my presided ones first
  const floatedCorps = corps.filter(c => c.floated)
  const myCorps = floatedCorps.filter(c => me.shares.some(s => s.corpSym === c.sym && s.isPresident))
  const otherCorps = floatedCorps.filter(c => !myCorps.includes(c))
  const orderedCorps = [...myCorps, ...otherCorps]

  return (
    <div className="space-y-2">
      {orderedCorps.map(corp => (
        <CorpCard key={corp.sym}
          game={game} fmt={fmt} me={me} myPlayerId={myPlayerId} corps={corps} dispatch={dispatch}
          corp={corp}
          isMyPres={myCorps.includes(corp)}
          expanded={expandedSym === corp.sym}
          onToggle={() => setExpandedSym(expandedSym === corp.sym ? null : corp.sym)}
        />
      ))}
      {orderedCorps.length === 0 && (
        <div className="text-sm text-broker-text-muted text-center py-8">No floated corporations</div>
      )}
    </div>
  )
}

function CorpCard({ game, fmt, me, myPlayerId, corps, dispatch, corp, isMyPres, expanded, onToggle }) {
  const shareSize = game.title.shares?.[1] ?? 10
  const [revInput, setRevInput] = useState('')
  const [grantName, setGrantName] = useState('')
  const [trainBuyPrice, setTrainBuyPrice] = useState({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mergerStep, setMergerStep] = useState(null) // { type, targetSym } for multi-step
  const revRef = useRef(null)
  const numPad = useNumPad()
  const { hasPhysicalKeyboard } = usePhysicalKeyboard()

  const rev = parseInt(revInput, 10) || 0
  const recentValues = useRecentValues(game.actionLog, corp.sym)

  // Keyboard shortcuts for revenue (P=Pay, W=Withhold, H=Half)
  useEffect(() => {
    if (!expanded || !isMyPres || !hasPhysicalKeyboard) return
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      const r = parseInt(revInput, 10) || 0
      if (r <= 0) return
      if (e.key === 'p' || e.key === 'P') {
        dispatch({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: r })
        setRevInput('')
      } else if (e.key === 'w' || e.key === 'W') {
        dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: r })
        setRevInput('')
      } else if ((e.key === 'h' || e.key === 'H') && game.title.halfPay) {
        dispatch({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: r })
        setRevInput('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, isMyPres, hasPhysicalKeyboard, revInput, corp.sym, dispatch, game.title.halfPay])

  // Touch: open NumPad for revenue
  const openRevNumPad = useCallback(() => {
    if (hasPhysicalKeyboard || !numPad) return
    numPad.openNumPad('Revenue for ' + corp.sym, revInput, (val) => {
      setRevInput(String(val))
    })
  }, [hasPhysicalKeyboard, numPad, corp.sym, revInput])

  // Touch: open NumPad for inter-corp train price
  const openTrainPriceNumPad = useCallback((sellerSym, trainName) => {
    if (!numPad) return
    numPad.openNumPad(`Price for ${trainName} from ${sellerSym}`, '', (val) => {
      setTrainBuyPrice(prev => ({ ...prev, [`${sellerSym}-${trainName}`]: val }))
    })
  }, [numPad])

  // Touch: open NumPad for private sale
  const openPrivatePriceNumPad = useCallback((companySym, defaultPrice) => {
    if (!numPad) return
    numPad.openNumPad(`Sell ${companySym} to ${corp.sym}`, defaultPrice, (val) => {
      dispatch({ type: 'SELL_PRIVATE', companySym, fromPlayerId: myPlayerId, toCorpSym: corp.sym, price: val })
    })
  }, [numPad, corp.sym, myPlayerId, dispatch])

  return (
    <div className={`bg-broker-surface rounded-lg overflow-hidden ${expanded ? 'ring-1 ring-amber-500/40' : ''}`}>
      {/* Corp header — always visible, clickable to expand */}
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-3 min-h-[44px]">
        <div className="flex items-center gap-2">
          <CorpBadge sym={corp.sym} color={corp.color} textColor={corp.textColor}
            stripeColor={corp.stripeColor} stripeTextColor={corp.stripeTextColor} />
          <span className="text-broker-cash font-bold">{fmt(corp.cash)}</span>
          <span className="text-xs text-broker-text-muted">@ {fmt(corp.price)}</span>
          {corp.operated && <span className="text-[10px] text-green-400">done</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-broker-text-muted">
            {corp.trains.length > 0 ? corp.trains.map(t => t.name).join(' ') : 'no trains'}
          </span>
          {expanded ? <IconCollapse /> : <IconExpand />}
        </div>
      </button>

      {/* Expanded: full operating flow */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-broker-border">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-xs pt-2">
            <div className="bg-broker-bg rounded-lg p-2 text-center">
              <div className="text-broker-text-muted">Trains</div>
              <div className="font-bold text-white">{corp.trains.length > 0 ? corp.trains.map(t => t.name).join(' ') : 'none'}</div>
            </div>
            <div className="bg-broker-bg rounded-lg p-2 text-center">
              <div className="text-broker-text-muted">Tokens</div>
              <div className="font-bold text-white">{corp.tokensPlaced}/{corp.tokens.length}</div>
            </div>
            <div className="bg-broker-bg rounded-lg p-2 text-center">
              <div className="text-broker-text-muted">IPO / Pool</div>
              <div className="font-bold text-white">{corp.ipoShares}% / {corp.marketShares}%</div>
            </div>
          </div>

          {/* === ACTIONS (president only) === */}
          {isMyPres ? (
            <div className="space-y-3">

              {/* Revenue */}
              <div>
                <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-amber-500 pl-2">Revenue</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasPhysicalKeyboard ? (
                    <input ref={revRef} type="number" value={revInput} onChange={e => setRevInput(e.target.value)}
                      placeholder="0" className="w-24 bg-broker-bg border border-broker-border rounded px-2 py-2 text-white text-center min-h-[44px]" />
                  ) : (
                    <button onClick={openRevNumPad}
                      className="w-24 bg-broker-bg border border-broker-border rounded px-2 py-2 text-white text-center min-h-[44px]">
                      {revInput || '0'}
                    </button>
                  )}
                  {/* Recent values */}
                  {recentValues.map(v => (
                    <button key={v} onClick={() => setRevInput(String(v))}
                      className="text-sm bg-blue-900 text-blue-300 px-3 py-2 rounded-lg min-h-[44px]">
                      {fmt(v)}
                    </button>
                  ))}
                  {/* $0 withhold */}
                  <button onClick={() => dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: 0 })}
                    className="text-sm bg-red-800 text-white px-3 py-2 rounded-lg font-medium min-h-[44px]">$0</button>
                </div>
                {rev > 0 && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { dispatch({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                      className="text-sm bg-green-700 text-white px-4 py-3 rounded-lg font-medium flex-1 min-h-[44px]">
                      Pay {fmt(rev)}
                    </button>
                    <button onClick={() => { dispatch({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                      className="text-sm bg-red-700 text-white px-4 py-3 rounded-lg font-medium flex-1 min-h-[44px]">
                      Withhold
                    </button>
                    {game.title.halfPay && (
                      <button onClick={() => { dispatch({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }); setRevInput('') }}
                        className="text-sm bg-amber-700 text-white px-3 py-3 rounded-lg font-medium min-h-[44px]">
                        Half
                      </button>
                    )}
                  </div>
                )}
                {hasPhysicalKeyboard && rev > 0 && (
                  <div className="text-[10px] text-broker-text-muted mt-1">Hotkeys: P=Pay, W=Withhold{game.title.halfPay ? ', H=Half' : ''}</div>
                )}
              </div>

              {/* Train purchase from depot */}
              <div>
                <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-amber-500 pl-2">Buy Train</div>
                <div className="flex gap-2 flex-wrap">
                  {(game.depot ? nextAvailableTrains(game.depot) : []).map(t => (
                    <button key={t.name}
                      onClick={() => dispatch({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })}
                      disabled={corp.cash < t.price}
                      className="text-sm bg-blue-800 hover:bg-blue-700 disabled:opacity-30 text-white px-3 py-2 rounded-lg min-h-[44px]">
                      {t.name} {fmt(t.price)}
                    </button>
                  ))}
                </div>

                {/* Inter-corp train purchase */}
                {corps.filter(c => c.sym !== corp.sym && c.trains.length > 0).map(seller => (
                  <div key={seller.sym} className="mt-2">
                    <div className="text-[10px] text-broker-text-muted mb-1">
                      From <CorpBadge sym={seller.sym} color={seller.color} textColor={seller.textColor} />:
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {seller.trains.map((t, i) => {
                        const key = `${seller.sym}-${t.name}`
                        const price = trainBuyPrice[key]
                        return (
                          <span key={i} className="inline-flex items-center gap-1">
                            {hasPhysicalKeyboard ? (
                              <input type="number" placeholder="price"
                                value={trainBuyPrice[key] || ''}
                                onChange={e => setTrainBuyPrice(prev => ({ ...prev, [key]: parseInt(e.target.value, 10) || 0 }))}
                                className="w-16 bg-broker-bg border border-broker-border rounded px-1 py-1 text-white text-center text-xs" />
                            ) : (
                              <button onClick={() => openTrainPriceNumPad(seller.sym, t.name)}
                                className="w-16 bg-broker-bg border border-broker-border rounded px-1 py-1 text-white text-center text-xs min-h-[36px]">
                                {price || '?'}
                              </button>
                            )}
                            <button
                              onClick={() => { if (price > 0) dispatch({ type: 'BUY_TRAIN_INTER_CORP', buyerCorpSym: corp.sym, sellerCorpSym: seller.sym, trainName: t.name, price }) }}
                              disabled={!price || price <= 0}
                              className="text-xs bg-blue-800 disabled:opacity-30 text-white px-2 py-1 rounded min-h-[36px]">
                              {t.name}
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Discard train */}
                {corp.trains.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    <span className="text-[10px] text-broker-text-muted self-center">Discard:</span>
                    {corp.trains.map((t, i) => (
                      <button key={i} onClick={() => dispatch({ type: 'DISCARD_TRAIN', corpSym: corp.sym, trainName: t.name })}
                        className="text-xs bg-red-900 hover:bg-red-800 text-red-300 px-2 py-1 rounded min-h-[36px]">
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grant train (private exchange) */}
                <div className="flex gap-1 items-center mt-1">
                  {hasPhysicalKeyboard ? (
                    <input type="text" value={grantName} onChange={e => setGrantName(e.target.value)}
                      placeholder="grant train" className="w-24 bg-broker-bg border border-broker-border rounded px-2 py-1 text-white text-center text-xs"
                      onKeyDown={e => { if (e.key === 'Enter' && grantName.trim()) { dispatch({ type: 'ADD_TRAIN_MANUAL', corpSym: corp.sym, trainName: grantName.trim() }); setGrantName('') }}} />
                  ) : (
                    <button onClick={() => {
                      if (numPad) {
                        // For grant, just use a simple prompt since it's text
                        const name = window.prompt('Train name to grant:')
                        if (name) dispatch({ type: 'ADD_TRAIN_MANUAL', corpSym: corp.sym, trainName: name.trim() })
                      }
                    }}
                      className="text-xs bg-broker-bg border border-broker-border text-broker-text-muted px-2 py-1 rounded min-h-[36px]">
                      +Grant
                    </button>
                  )}
                  {grantName.trim() && (
                    <button onClick={() => { dispatch({ type: 'ADD_TRAIN_MANUAL', corpSym: corp.sym, trainName: grantName.trim() }); setGrantName('') }}
                      className="text-xs bg-blue-800 text-white px-2 py-1 rounded">+Free</button>
                  )}
                </div>
              </div>

              {/* Token placement */}
              {corp.tokensPlaced < corp.tokens.length && (
                <div>
                  <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-amber-500 pl-2">Place Token</div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => dispatch({ type: 'PLACE_TOKEN', corpSym: corp.sym, price: corp.tokens[corp.tokensPlaced] || 0 })}
                      className="text-sm bg-green-700 text-white px-3 py-2 rounded-lg min-h-[44px]">
                      Place {fmt(corp.tokens[corp.tokensPlaced] || 0)}
                    </button>
                    {(game.title.terrainCosts || []).map(tc => (
                      <button key={tc} onClick={() => dispatch({ type: 'ADJUST_CASH', entityId: corp.sym, entityType: 'corporation', amount: -tc })}
                        className="text-sm bg-amber-800 text-amber-200 px-3 py-2 rounded-lg min-h-[44px]">
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

              {/* Sell private to corp */}
              {me.privates.length > 0 && (
                <div>
                  <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-broker-accent pl-2">Sell Private</div>
                  <div className="flex gap-2 flex-wrap">
                    {me.privates.map(sym => {
                      const company = (game.companies || []).find(c => c.sym === sym)
                      if (!company || company.closed) return null
                      return (
                        <button key={sym} onClick={() => {
                          if (hasPhysicalKeyboard) {
                            dispatch({ type: 'SELL_PRIVATE', companySym: sym, fromPlayerId: myPlayerId, toCorpSym: corp.sym, price: company.value })
                          } else {
                            openPrivatePriceNumPad(sym, company.value)
                          }
                        }}
                          className="text-sm bg-broker-green text-white px-3 py-2 rounded-lg min-h-[44px]">
                          {sym} {fmt(company.value)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Issue / Redeem */}
              {(game.title.capitalization === 'incremental' || game.title.issueRedeemRule) && (corp.ipoShares > 0 || corp.marketShares > 0) && (() => {
                const rule = game.title.issueRedeemRule || 'standard'
                const curPrice = corp.price || 0
                const pos = game.stockMarket.corpPositions[corp.sym]
                const leftPrice = pos && pos.col > 0 ? (game.stockMarket.grid[pos.row]?.[pos.col - 1]?.price || curPrice) : curPrice
                const rightPrice = pos ? (game.stockMarket.grid[pos.row]?.[pos.col + 1]?.price || curPrice) : curPrice
                const ip = rule === '1846' ? leftPrice : curPrice
                const rp = rule === '1846' ? rightPrice : curPrice
                const maxIssue = Math.floor(corp.ipoShares / shareSize)
                const maxRedeem = rp > 0 ? Math.min(Math.floor(corp.marketShares / shareSize), Math.floor(corp.cash / rp)) : 0
                if (maxIssue === 0 && maxRedeem === 0) return null
                return (
                  <div>
                    <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-blue-500 pl-2">Issue / Redeem</div>
                    {rule === '1846' && <div className="text-[10px] text-broker-text-muted mb-1">Issue @{fmt(ip)} / Redeem @{fmt(rp)}</div>}
                    <div className="flex gap-2 flex-wrap">
                      {Array.from({ length: maxIssue }, (_, i) => i + 1).map(n => (
                        <button key={`i${n}`} onClick={() => dispatch({ type: 'ISSUE_SHARES', corpSym: corp.sym, count: n })}
                          className="text-sm bg-blue-800 text-white px-3 py-2 rounded-lg min-h-[44px]">Issue {n} +{fmt(ip * n)}</button>
                      ))}
                      {Array.from({ length: maxRedeem }, (_, i) => i + 1).map(n => (
                        <button key={`r${n}`} onClick={() => dispatch({ type: 'REDEEM_SHARES', corpSym: corp.sym, count: n })}
                          className="text-sm bg-green-800 text-white px-3 py-2 rounded-lg min-h-[44px]">Redeem {n} -{fmt(rp * n)}</button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Advanced section */}
              <div>
                <button onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-1 text-xs text-broker-text-muted hover:text-white py-2">
                  {showAdvanced ? <IconCollapse /> : <IconExpand />}
                  Advanced
                </button>
                {showAdvanced && (
                  <div className="space-y-3 mt-1">

                    {/* Corp loans / bonds / debt */}
                    {game.title.loans && game.title.loans.type !== '1880_player' && (() => {
                      const lc = game.title.loans
                      if (lc.type === '18rg_debt') {
                        const dt = corp.debtTokens || 0
                        if (dt <= 0) return null
                        const dp = game.debtMarketPrice || lc.debtStartPrice || 50
                        return (
                          <div>
                            <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-red-500 pl-2">
                              Debt: {dt} tokens @ {fmt(dp)}
                            </div>
                            <button onClick={() => dispatch({ type: 'PAY_DEBT_TOKEN', corpSym: corp.sym })}
                              disabled={corp.cash < dp}
                              className="text-sm bg-green-800 disabled:opacity-30 text-white px-3 py-2 rounded-lg min-h-[44px]">
                              Pay Debt Token ({fmt(dp)})
                            </button>
                          </div>
                        )
                      }
                      const label = lc.type === '1849' ? 'Bond' : 'Loan'
                      return (
                        <div>
                          <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-red-500 pl-2">{label}s</div>
                          <div className="flex gap-2">
                            <button onClick={() => dispatch({ type: 'TAKE_LOAN', corpSym: corp.sym })}
                              className="text-sm bg-red-800 text-white px-3 py-2 rounded-lg flex-1 min-h-[44px]">
                              Take {label}
                            </button>
                            {corp.loans > 0 && (
                              <>
                                <button onClick={() => dispatch({ type: 'REPAY_LOAN', corpSym: corp.sym })}
                                  className="text-sm bg-green-800 text-white px-3 py-2 rounded-lg flex-1 min-h-[44px]">
                                  Repay {label}
                                </button>
                                <button onClick={() => dispatch({ type: 'PAY_INTEREST', corpSym: corp.sym })}
                                  className="text-sm bg-amber-800 text-white px-3 py-2 rounded-lg flex-1 min-h-[44px]">
                                  Interest
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Corp share trading */}
                    {game.title.corpCanBuyShares && (
                      <div>
                        <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-blue-500 pl-2">Corp Share Trading</div>
                        <div className="flex gap-2 flex-wrap">
                          {game.corporations.filter(c => c.sym !== corp.sym && c.ipoed).map(target => {
                            const tp = corpPrice(game.stockMarket, target.sym) || 0
                            return (
                              <span key={target.sym} className="inline-flex gap-1">
                                {target.ipoShares > 0 && (
                                  <button onClick={() => dispatch({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'ipo', percent: shareSize })}
                                    disabled={corp.cash < tp}
                                    className="text-xs bg-green-800 disabled:opacity-30 text-white px-2 py-1 rounded min-h-[36px]">
                                    <CorpBadge sym={target.sym} color={target.color} textColor={target.textColor} /> IPO
                                  </button>
                                )}
                                {target.marketShares > 0 && (
                                  <button onClick={() => dispatch({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'market', percent: shareSize })}
                                    disabled={corp.cash < tp}
                                    className="text-xs bg-blue-800 disabled:opacity-30 text-white px-2 py-1 rounded min-h-[36px]">
                                    <CorpBadge sym={target.sym} color={target.color} textColor={target.textColor} /> Mkt
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
                                    className="text-xs bg-red-800 text-white px-2 py-1 rounded min-h-[36px]">
                                    <CorpBadge sym={target?.sym || sym} color={target?.color || '#666'} textColor={target?.textColor || '#fff'} /> {pct}%
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Merger / Acquire */}
                    {game.title.merger && (() => {
                      const mergerTypes = Array.isArray(game.title.merger) ? game.title.merger : [game.title.merger]
                      return (
                        <div>
                          <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-broker-accent pl-2">Merge / Acquire</div>
                          {mergerStep ? (
                            <div className="bg-broker-bg rounded-lg p-3">
                              <div className="text-xs text-broker-text-muted mb-2">
                                {mergerStep.type} target for <CorpBadge sym={corp.sym} color={corp.color} textColor={corp.textColor} />:
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {corps.filter(c => c.sym !== corp.sym && c.floated).map(target => (
                                  <button key={target.sym}
                                    onClick={() => {
                                      dispatch({ type: 'MERGE', acquirerCorpSym: corp.sym, targetCorpSym: target.sym, mergerType: mergerStep.type })
                                      setMergerStep(null)
                                    }}
                                    className="text-sm bg-broker-green text-white px-3 py-2 rounded-lg min-h-[44px]">
                                    <CorpBadge sym={target.sym} color={target.color} textColor={target.textColor} />
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => setMergerStep(null)}
                                className="text-xs text-broker-text-muted mt-2">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {mergerTypes.map(mt => {
                                const typeName = typeof mt === 'string' ? mt : mt.type || 'merge'
                                return (
                                  <button key={typeName}
                                    onClick={() => setMergerStep({ type: typeName })}
                                    className="text-sm bg-broker-green hover:bg-broker-green-light text-white px-3 py-2 rounded-lg min-h-[44px]">
                                    {typeName}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Executive cars */}
                    {game.title.executiveCars && (
                      <div>
                        <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-amber-500 pl-2">Executive Car</div>
                        <button onClick={() => dispatch({ type: 'BUY_EXECUTIVE_CAR', corpSym: corp.sym })}
                          className="text-sm bg-amber-800 text-amber-200 px-3 py-2 rounded-lg min-h-[44px]">
                          Buy Executive Car
                        </button>
                      </div>
                    )}

                    {/* Export train */}
                    {game.title.trainExport && (
                      <div>
                        <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-amber-500 pl-2">Export Train</div>
                        <button onClick={() => dispatch({ type: 'EXPORT_TRAIN' })}
                          className="text-sm bg-amber-800 text-amber-200 px-3 py-2 rounded-lg min-h-[44px]">
                          Export Train
                        </button>
                      </div>
                    )}

                    {/* Strategy cards indicator */}
                    {game.title.strategyCards && (corp.cards || []).length > 0 && (
                      <div>
                        <div className="text-xs text-broker-text-muted mb-1 border-l-2 border-blue-500 pl-2">Strategy Cards</div>
                        <div className="flex gap-1 flex-wrap">
                          {(corp.cards || []).map(card => (
                            <span key={card.id} className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                              {card.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-broker-text-muted py-2">(view only)</div>
          )}
        </div>
      )}
    </div>
  )
}
