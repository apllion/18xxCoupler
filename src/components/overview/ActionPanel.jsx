// ActionPanel — structured action panels for both skins.
// Two-step flows: pick entity first, then pick action.

import { useState } from 'react'
import { playerSharePercent, corpPrice, parPrices, nextAvailableTrains } from './useOverviewData.js'
import { useUIStore } from '../../store/uiStore.js'
import { useGameStore } from '../../store/gameStore.js'
import { useThemeStore, themes as brokerThemes } from '../../store/themeStore.js'
import { CorpCard } from './CorpCard.jsx'
import { PlayerCard } from './PlayerCard.jsx'

export function ActionPanel({ panel, game, player, corp, unfloated, fmt, revenueInput, setRevenueInput, revRef, onClose, doAction, skin }) {
  const m = skin === 'moderator'
  const wrap = m
    ? 'bg-gray-900 border-t border-green-700 px-2 py-2 flex-shrink-0'
    : 'bg-broker-surface border-t border-broker-border px-3 py-3 flex-shrink-0'

  return (
    <div className={wrap}>
      <div className="flex justify-between items-start mb-1">
        <PanelContent panel={panel} game={game} player={player} corp={corp}
          unfloated={unfloated} fmt={fmt} revenueInput={revenueInput}
          setRevenueInput={setRevenueInput} revRef={revRef} doAction={doAction} m={m} />
        <button onClick={onClose} className={m ? 'text-red-400 hover:text-red-200 text-xs ml-2' : 'text-broker-text-muted hover:text-white text-sm ml-2'}>
          Esc
        </button>
      </div>
    </div>
  )
}

function PanelContent({ panel, game, player, corp, unfloated, fmt, revenueInput, setRevenueInput, revRef, doAction, m }) {
  const price = corp ? corpPrice(game.stockMarket, corp.sym) || 0 : 0
  const [priceTarget, setPriceTarget] = useState(null) // { type, data } for inline price entry
  const [priceValue, setPriceValue] = useState('')

  // Par: two-step — pick corp, then pick price
  if (panel === 'par' && player) {
    return <ParPanel player={player} unfloated={unfloated} game={game} fmt={fmt} doAction={doAction} m={m} />
  }

  // Share buy/sell
  if (panel === 'share' && player && corp) {
    const pct = playerSharePercent(player, corp.sym)
    const pres = player.shares.some(s => s.corpSym === corp.sym && s.isPresident)
    return (
      <div>
        <Title m={m}>{player.name} + <span style={{ color: corp.color }}>{corp.sym}</span></Title>
        <div className="flex gap-2 mt-1">
          {corp.ipoShares > 0 && <Btn m={m} v="green" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'ipo', percent: 10 })}>Buy IPO {fmt(price)}</Btn>}
          {corp.marketShares > 0 && <Btn m={m} v="blue" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'market', percent: 10 })}>Buy Market {fmt(price)}</Btn>}
          {pct >= 10 && <Btn m={m} v="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 10 })}>Sell 10%</Btn>}
          {pct >= 20 && <Btn m={m} v="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 20 })}>Sell 20%</Btn>}
          {pct >= 30 && <Btn m={m} v="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 30 })}>Sell 30%</Btn>}
          {pct > 0 && !pres && <Btn m={m} v="yellow" o={() => doAction({ type: 'SWAP_PRESIDENT', playerId: player.id, corpSym: corp.sym })}>President</Btn>}
        </div>
      </div>
    )
  }

  // Revenue / dividend
  if (panel === 'revenue' && corp) {
    const rev = parseInt(revenueInput, 10) || 0
    const perShare = Math.floor(rev / 10)
    const dblJump = price > 0 && perShare >= price
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> Revenue</Title>
        <div className="flex items-center gap-2 mt-1">
          <input ref={revRef} type="number" value={revenueInput} onChange={e => setRevenueInput(e.target.value)}
            placeholder="Enter revenue" autoFocus
            className={m
              ? 'w-20 bg-black border border-green-800 rounded px-2 py-1 text-white text-center text-sm font-mono'
              : 'w-24 bg-broker-bg border border-broker-border rounded px-2 py-1.5 text-white text-center'
            }
            onKeyDown={e => {
              if (!rev || rev <= 0) return
              if (e.key === 'p' || e.key === 'Enter') { e.preventDefault(); doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
              if (e.key === 'w') { e.preventDefault(); doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
              if (e.key === 'h') { e.preventDefault(); doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
            }}
          />
          {rev > 0 && (
            <>
              <Btn m={m} v="green" o={() => doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })}>
                Pay{dblJump ? ' x2' : ''}
              </Btn>
              {game.title.halfPay && (
                <Btn m={m} v="yellow" o={() => doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })}>Half</Btn>
              )}
              <Btn m={m} v="red" o={() => doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })}>Withhold</Btn>
              <span className={m ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-xs'}>{fmt(perShare)}/share</span>
            </>
          )}
        </div>
      </div>
    )
  }

  // Train purchase
  if (panel === 'train' && corp) {
    const available = nextAvailableTrains(game.depot)
    const otherCorps = game.corporations.filter(c => c.sym !== corp.sym && c.trains.length > 0)
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> Buy Train — Treasury {fmt(corp.cash)}</Title>
        <div className="mt-1 space-y-1">
          {available.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {available.map(t => {
                const ok = corp.cash >= t.price
                return (
                  <Btn key={t.name} m={m} v={ok ? 'green' : 'disabled'}
                    o={() => ok && doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })}>
                    {t.name}-train {fmt(t.price)}{t.rustsOn ? ` (rusts on ${t.rustsOn})` : ''}
                  </Btn>
                )
              })}
            </div>
          )}
          {otherCorps.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <span className={m ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-xs'}>From corps:</span>
              {otherCorps.map(other => other.trains.map(t => (
                <Btn key={`${other.sym}-${t.id}`} m={m} v="blue"
                  o={() => { setPriceTarget({ type: 'train', trainName: t.name, fromCorpSym: other.sym, corpSym: corp.sym }); setPriceValue(String(t.price)) }}>
                  {t.name} from <span style={{ color: other.color }}>{other.sym}</span>
                </Btn>
              )))}
            </div>
          )}
          {priceTarget?.type === 'train' && (
            <PriceInput m={m} label={`Price for ${priceTarget.trainName} from ${priceTarget.fromCorpSym}`}
              value={priceValue} onChange={setPriceValue}
              onConfirm={() => { const pr = parseInt(priceValue); if (pr > 0) doAction({ type: 'BUY_TRAIN', corpSym: priceTarget.corpSym, trainName: priceTarget.trainName, price: pr, fromCorpSym: priceTarget.fromCorpSym }) }}
              onCancel={() => setPriceTarget(null)} />
          )}
        </div>
      </div>
    )
  }

  // Loans
  if (panel === 'loan' && corp) {
    const config = game.title.loans || {}
    const loanValue = config.loanValue || 100
    const loans = corp.loans || 0
    const max = config.maxLoansPerCorp || 99
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> Loans — {loans}/{max}</Title>
        <div className="flex gap-2 mt-1">
          {loans < max && <Btn m={m} v="green" o={() => doAction({ type: 'TAKE_LOAN', corpSym: corp.sym })}>Take Loan +{fmt(loanValue)}</Btn>}
          {loans > 0 && corp.cash >= loanValue && <Btn m={m} v="red" o={() => doAction({ type: 'REPAY_LOAN', corpSym: corp.sym })}>Repay -{fmt(loanValue)}</Btn>}
          {loans > 0 && <Btn m={m} v="yellow" o={() => doAction({ type: 'PAY_INTEREST', corpSym: corp.sym })}>Pay Interest</Btn>}
        </div>
      </div>
    )
  }

  // Sell private to corp
  if (panel === 'private' && player && corp) {
    const privs = (game.companies || []).filter(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.canSellToCorp !== false)
    return (
      <div>
        <Title m={m}>{player.name} sell private to <span style={{ color: corp.color }}>{corp.sym}</span></Title>
        {privs.length === 0
          ? <span className={m ? 'text-red-400 text-xs' : 'text-broker-text-muted text-sm'}>No privates to sell</span>
          : <div className="flex gap-2 mt-1 flex-wrap">
              {privs.map(c => (
                <Btn key={c.sym} m={m} v="blue"
                  o={() => { setPriceTarget({ type: 'sellpriv', companySym: c.sym, fromPlayerId: player.id, toCorpSym: corp.sym }); setPriceValue(String(c.value)) }}>
                  {c.sym} — {fmt(c.value)}
                </Btn>
              ))}
              {priceTarget?.type === 'sellpriv' && (
                <PriceInput m={m} label={`Sell ${priceTarget.companySym} to ${priceTarget.toCorpSym} for`}
                  value={priceValue} onChange={setPriceValue}
                  onConfirm={() => { const pr = parseInt(priceValue); if (pr > 0) doAction({ type: 'SELL_PRIVATE', companySym: priceTarget.companySym, fromPlayerId: priceTarget.fromPlayerId, toCorpSym: priceTarget.toCorpSym, price: pr }) }}
                  onCancel={() => setPriceTarget(null)} />
              )}
            </div>
        }
      </div>
    )
  }

  // Settings — uses SettingsPanel component for reactivity
  if (panel === 'settings') {
    return <SettingsPanel m={m} game={game} doAction={doAction} />
  }

  // Navigation menu
  if (panel === 'navigate') {
    const go = (tab) => { useUIStore.getState().setActiveTab(tab); onClose() }
    const items = [
      { key: '1', label: 'Broker', id: 'overview' },
      { key: '2', label: 'Moderator', id: 'moderator' },
    ]
    return (
      <div>
        <Title m={m}>Switch View</Title>
        <div className="flex flex-wrap gap-1 mt-1">
          {items.map(it => (
            <Btn key={it.id} m={m} v={useUIStore.getState().activeTab === it.id ? 'green' : 'blue'}
              o={() => go(it.id)}>
              [{it.key}] {it.label}
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Corp detail card
  if (panel === 'corpdetail' && corp) {
    return <CorpCard game={game} corpSym={corp.sym} skin={m ? 'moderator' : 'broker'} />
  }

  // Player detail card
  if (panel === 'playerdetail' && player) {
    return <PlayerCard game={game} playerId={player.id} skin={m ? 'moderator' : 'broker'} />
  }

  // Buy private from bank (auctions, drafts — record the result)
  if (panel === 'buyprivate' && player) {
    const available = (game.companies || []).filter(c => !c.ownerId && !c.closed)
    return (
      <div>
        <Title m={m}>{player.name} — Buy Private</Title>
        {available.length === 0
          ? <span className={m ? 'text-red-400 text-xs' : 'text-broker-text-muted text-sm'}>No privates available</span>
          : <div className="flex flex-wrap gap-1 mt-1">
              {available.map(c => {
                const ok = player.cash >= c.value
                return (
                  <Btn key={c.sym} m={m} v={ok ? 'green' : 'disabled'}
                    o={() => { setPriceTarget({ type: 'buypriv', companySym: c.sym, playerId: player.id }); setPriceValue(String(c.value)) }}>
                    {c.sym} {fmt(c.value)} {c.revenue > 0 && `+${fmt(c.revenue)}`}
                  </Btn>
                )
              })}
              {priceTarget?.type === 'buypriv' && (
                <PriceInput m={m} label={`Buy ${priceTarget.companySym} for`}
                  value={priceValue} onChange={setPriceValue}
                  onConfirm={() => { const pr = parseInt(priceValue); if (pr > 0) doAction({ type: 'BUY_PRIVATE', playerId: priceTarget.playerId, companySym: priceTarget.companySym, price: pr }) }}
                  onCancel={() => setPriceTarget(null)} />
              )}
            </div>
        }
      </div>
    )
  }

  // Merge panel — handles all merger types
  if (panel === 'merge' && corp) {
    return <MergePanel game={game} corp={corp} fmt={fmt} doAction={doAction} m={m} />
  }

  // Short sell (1817)
  if (panel === 'short' && player) {
    const corps = game.corporations.filter(c => c.ipoed && c.floated)
    return (
      <div>
        <Title m={m}>{player.name} — Short Sell</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {corps.map(c => (
            <Btn key={c.sym} m={m} v="red"
              o={() => doAction({ type: 'SHORT_SELL', playerId: player.id, corpSym: c.sym })}>
              <span style={{ color: c.color }}>{c.sym}</span> @ {fmt(corpPrice(game.stockMarket, c.sym) || 0)}
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Close short (1817)
  if (panel === 'closeshort' && player) {
    const shorts = player.shares?.filter(s => s.isShort) || []
    if (shorts.length === 0) return <Title m={m}>{player.name} has no open short positions</Title>
    return (
      <div>
        <Title m={m}>{player.name} — Close Short Position</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {shorts.map((s, i) => (
            <Btn key={i} m={m} v="green"
              o={() => doAction({ type: 'CLOSE_SHORT', playerId: player.id, corpSym: s.corpSym })}>
              <span style={{ color: game.corporations.find(c => c.sym === s.corpSym)?.color }}>{s.corpSym}</span>
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Executive car (18Daihan)
  if (panel === 'execcar' && corp) {
    const trainsWithoutCar = corp.trains.filter(t => !t.attachment)
    if (trainsWithoutCar.length === 0) return <Title m={m}>{corp.sym}: all trains have attachments</Title>
    const ecPrice = game.title.executiveCars?.price ?? 0
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> — Buy Executive Car ({fmt(ecPrice)})</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {trainsWithoutCar.map(t => (
            <Btn key={t.id} m={m} v={corp.cash >= ecPrice ? 'green' : 'disabled'}
              o={() => corp.cash >= ecPrice && doAction({ type: 'BUY_EXECUTIVE_CAR', corpSym: corp.sym, trainId: t.id, price: ecPrice })}>
              {t.name}-train + EC
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Convert concession (1822 family)
  if (panel === 'concession' && player) {
    const concessions = (game.companies || []).filter(c =>
      c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.sym.startsWith('C')
    )
    if (concessions.length === 0) return <Title m={m}>{player.name} has no concessions</Title>
    return (
      <div>
        <Title m={m}>{player.name} — Convert Concession</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {concessions.map(c => {
            const matchingCorp = game.corporations.find(corp => c.desc?.includes(corp.name) || c.desc?.includes(corp.sym))
            return (
              <Btn key={c.sym} m={m} v="green"
                o={() => doAction({ type: 'CONVERT_CONCESSION', playerId: player.id, companySym: c.sym, corpSym: matchingCorp?.sym || c.sym })}>
                {c.sym} → {matchingCorp?.sym || '?'}
              </Btn>
            )
          })}
        </div>
      </div>
    )
  }

  // Export train (1817, 18USA)
  if (panel === 'export') {
    const nextTrain = game.depot.upcoming[0]
    if (!nextTrain) return <Title m={m}>No trains to export</Title>
    return (
      <div>
        <Title m={m}>Export Train</Title>
        <div className="mt-1">
          <Btn m={m} v="red"
            o={() => doAction({ type: 'EXPORT_TRAIN' })}>
            Export {nextTrain.name}-train ({fmt(nextTrain.price)})
          </Btn>
        </div>
      </div>
    )
  }

  // Discard train (forced when over train limit)
  if (panel === 'discard' && corp) {
    if (corp.trains.length === 0) return <Title m={m}>{corp.sym} has no trains to discard</Title>
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> — Discard Train</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {corp.trains.map((t, i) => (
            <Btn key={t.id || i} m={m} v="red"
              o={() => doAction({ type: 'DISCARD_TRAIN', corpSym: corp.sym, trainName: t.name })}>
              {t.name}-train
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Corp share trading (21Moon, PTG, 18India)
  if (panel === 'corpshare' && corp) {
    const shareSize = game.title.shares?.[1] ?? 10
    const otherCorps = game.corporations.filter(c => c.ipoed && c.sym !== corp.sym)
    const ownShares = corp.sharesHeld || []
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> Share Trading — Treasury {fmt(corp.cash)}</Title>
        {/* Buy from other corps */}
        <div className="mt-1 space-y-1">
          <span className={m ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-xs'}>Buy {shareSize}% from:</span>
          <div className="flex gap-1 flex-wrap">
            {otherCorps.map(target => {
              const tp = corpPrice(game.stockMarket, target.sym) || 0
              const cost = (tp * shareSize) / 10
              const hasIPO = target.ipoShares > 0
              const hasMkt = target.marketShares > 0
              const ok = corp.cash >= cost
              return (
                <span key={target.sym} className="inline-flex gap-0.5">
                  {hasIPO && <Btn m={m} v={ok ? 'green' : 'disabled'}
                    o={() => ok && doAction({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'ipo', percent: shareSize })}>
                    <span style={{ color: target.color }}>{target.sym}</span> IPO {fmt(cost)}
                  </Btn>}
                  {hasMkt && <Btn m={m} v={ok ? 'blue' : 'disabled'}
                    o={() => ok && doAction({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'market', percent: shareSize })}>
                    <span style={{ color: target.color }}>{target.sym}</span> Mkt {fmt(cost)}
                  </Btn>}
                </span>
              )
            })}
          </div>
          {/* Sell holdings */}
          {ownShares.length > 0 && (
            <>
              <span className={m ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-xs'}>Sell holdings:</span>
              <div className="flex gap-1 flex-wrap">
                {[...new Set(ownShares.map(s => s.corpSym))].map(sym => {
                  const pct = ownShares.filter(s => s.corpSym === sym).reduce((s, x) => s + x.percent, 0)
                  const target = game.corporations.find(c => c.sym === sym)
                  return (
                    <Btn key={sym} m={m} v="red"
                      o={() => doAction({ type: 'CORP_SELL_SHARES', sellerCorpSym: corp.sym, targetCorpSym: sym, percent: shareSize })}>
                      <span style={{ color: target?.color }}>{sym}</span> {pct}%
                    </Btn>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}

// Par: two-step picker — select corp first, then price
function ParPanel({ player, unfloated, game, fmt, doAction, m }) {
  const [selectedCorp, setSelectedCorp] = useState(null)
  const prices = parPrices(game.stockMarket)
  const presPercent = game.title.shares?.[0] ?? 20

  return (
    <div>
      <Title m={m}>{player.name} — Par new corporation</Title>

      {/* Step 1: pick corp */}
      <div className="flex gap-1 mt-1 flex-wrap">
        {unfloated.map(c => (
          <button key={c.sym} onClick={() => setSelectedCorp(c.sym === selectedCorp ? null : c.sym)}
            className={`px-2 py-1 rounded text-sm font-bold border ${
              c.sym === selectedCorp
                ? (m ? 'border-green-500 bg-green-900/50' : 'border-broker-gold bg-broker-gold/10')
                : (m ? 'border-blue-800 bg-blue-950 hover:border-blue-600' : 'border-broker-border bg-broker-surface-hover hover:border-broker-text-muted')
            }`}
            style={{ color: c.color }}>
            {c.sym}
          </button>
        ))}
      </div>

      {/* Step 2: pick price */}
      {selectedCorp && (
        <div className="mt-2">
          <span className={m ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-xs'}>
            Par price for <span style={{ color: unfloated.find(c => c.sym === selectedCorp)?.color }} className="font-bold">{selectedCorp}</span>:
          </span>
          <div className="flex gap-1 mt-1 flex-wrap">
            {prices.map(pp => {
              const cost = (pp.price * presPercent) / 10
              const ok = player.cash >= cost
              return (
                <Btn key={pp.price} m={m} v={ok ? 'green' : 'disabled'}
                  o={() => ok && doAction({ type: 'PAR_SHARE', playerId: player.id, corpSym: selectedCorp, parPrice: pp.price, row: pp.row, col: pp.col })}>
                  {fmt(pp.price)}
                  <span className={m ? 'text-blue-400 ml-1' : 'text-white/50 ml-1'}>({fmt(cost)})</span>
                </Btn>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Title({ m, children }) {
  return <div className={m ? 'text-green-400 text-xs font-mono font-bold' : 'text-sm font-medium text-white'}>{children}</div>
}

function MergePanel({ game, corp, fmt, doAction, m }) {
  const [target, setTarget] = useState(null)
  const [paymentShares, setPaymentShares] = useState(0)
  const [cashDiff, setCashDiff] = useState('')

  const merger = game.title.merger
  if (!merger) return <Title m={m}>No merger rules for this title</Title>

  const mergerType = merger.type
  const phase = game.phaseManager.phases[game.phaseManager.currentIndex]

  // Check phase eligibility
  if (merger.fromPhase) {
    const phaseNames = game.phaseManager.phases.map(p => p.name)
    const currentIdx = phaseNames.indexOf(phase.name)
    const fromIdx = phaseNames.indexOf(merger.fromPhase)
    if (currentIdx < fromIdx) {
      return <Title m={m}>Mergers available from phase {merger.fromPhase} (current: {phase.name})</Title>
    }
  }

  // Find eligible targets based on merger type
  let targets = []
  let label = 'Merge'

  if (mergerType === '1867_minor_major') {
    if (corp.type !== 'minor') return <Title m={m}>Select a minor corporation to convert</Title>
    targets = game.corporations.filter(c => c.type === 'major' && !c.floated)
    label = 'Convert to Major'
  } else if (mergerType === '1822_acquire') {
    if (corp.type !== 'major') return <Title m={m}>Select a major corporation to acquire with</Title>
    targets = game.corporations.filter(c => c.type === 'minor' && c.floated && c.sym !== corp.sym)
    label = 'Acquire Minor'
  } else if (mergerType === '1862_peer') {
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.floated)
    label = 'Merge (absorb)'
  } else if (mergerType === 'ptg_combine') {
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.floated && !c.isMerged)
    label = 'Combine'
  } else if (mergerType === 'rla_merge') {
    if (corp.type !== 'minor') return <Title m={m}>Select a minor to merge</Title>
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.type === 'minor' && c.floated)
    label = 'Merge Minors'
  } else if (mergerType === '1817_merge') {
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.floated && c.corpSize === corp.corpSize)
    label = 'Merge (same size)'
  }

  if (targets.length === 0 && !target) {
    return <Title m={m}>{label}: no eligible targets</Title>
  }

  // Step 1: pick target
  if (!target) {
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> — {label}</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {targets.map(t => (
            <Btn key={t.sym} m={m} v="blue" o={() => {
              // Simple mergers: execute directly
              if (mergerType === '1867_minor_major') {
                doAction({ type: 'CONVERT_MINOR', minorSym: corp.sym, majorSym: t.sym })
              } else if (mergerType === '1862_peer') {
                doAction({ type: 'MERGE_CORPS', survivorSym: corp.sym, nonsurvivorSym: t.sym })
              } else if (mergerType === 'ptg_combine') {
                doAction({ type: 'MERGE_CORPS', topCorpSym: corp.sym, bottomCorpSym: t.sym })
              } else {
                // Multi-step: go to step 2
                setTarget(t.sym)
              }
            }}>
              <span style={{ color: t.color }} className="font-bold">{t.sym}</span>
              {' '}{t.name?.slice(0, 20)}
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: 1822_acquire payment options
  if (mergerType === '1822_acquire') {
    return (
      <div>
        <Title m={m}><span style={{ color: corp.color }}>{corp.sym}</span> acquires {target}</Title>
        <div className="mt-1 space-y-1">
          <div className="flex gap-1 items-center">
            <span className={m ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-xs'}>Shares:</span>
            {(merger.paymentOptions || [0, 1, 2]).map(n => (
              <Btn key={n} m={m} v={paymentShares === n ? 'green' : 'blue'}
                o={() => setPaymentShares(n)}>{n}</Btn>
            ))}
          </div>
          <PriceInput m={m} label="Cash difference" value={cashDiff} onChange={setCashDiff}
            onConfirm={() => doAction({ type: 'ACQUIRE_MINOR', majorSym: corp.sym, minorSym: target, paymentShares, cashDifference: parseInt(cashDiff) || 0 })}
            onCancel={() => { setTarget(null); setPaymentShares(0); setCashDiff('') }} />
        </div>
      </div>
    )
  }

  // Step 2: rla_merge — pick major corp
  if (mergerType === 'rla_merge') {
    const availMajors = game.corporations.filter(c => c.type === 'major' && !c.floated)
    return (
      <div>
        <Title m={m}>{corp.sym} + {target} → pick Major</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {availMajors.map(maj => (
            <Btn key={maj.sym} m={m} v="green"
              o={() => doAction({ type: 'MERGE_CORPS', minorSymA: corp.sym, minorSymB: target, majorCorpSym: maj.sym })}>
              <span style={{ color: maj.color }}>{maj.sym}</span>
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: 1817_merge
  if (mergerType === '1817_merge') {
    return (
      <div>
        <Title m={m}>{corp.sym} merges with {target}</Title>
        <div className="flex gap-1 mt-1">
          <Btn m={m} v="green" o={() => doAction({ type: 'MERGE_CORPS', survivorSym: corp.sym, nonsurvivorSym: target })}>
            {corp.sym} survives
          </Btn>
          <Btn m={m} v="blue" o={() => doAction({ type: 'MERGE_CORPS', survivorSym: target, nonsurvivorSym: corp.sym })}>
            {target} survives
          </Btn>
          <Btn m={m} v="red" o={() => { setTarget(null) }}>Cancel</Btn>
        </div>
      </div>
    )
  }

  return null
}

function PriceInput({ m, label, value, onChange, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className={m ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-xs'}>{label}:</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        autoFocus
        className={m
          ? 'w-20 bg-black border border-green-800 rounded px-2 py-0.5 text-white text-center text-xs font-mono'
          : 'w-20 bg-broker-bg border border-broker-border rounded px-2 py-0.5 text-white text-center text-xs'
        }
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }}
      />
      <Btn m={m} v="green" o={onConfirm}>OK</Btn>
      <Btn m={m} v="red" o={onCancel}>Cancel</Btn>
    </div>
  )
}

function SettingsPanel({ m, game, doAction }) {
  const ac = useUIStore((s) => s.autoConfig)
  const skin = useUIStore((s) => s.skin)
  const modTheme = useUIStore((s) => s.modTheme)
  const setAutoConfig = useUIStore((s) => s.setAutoConfig)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const setModTheme = useUIStore((s) => s.setModTheme)
  const brokerThemeId = useThemeStore((s) => s.themeId)
  const setBrokerTheme = useThemeStore((s) => s.setTheme)
  const enterReplay = useGameStore((s) => s.enterReplay)
  const exitReplay = useGameStore((s) => s.exitReplay)
  const fullLog = useGameStore((s) => s.fullLog)
  const inReplay = fullLog !== null

  const autoItems = [
    { key: 'advanceOnAllPass', label: 'Auto-advance SR when all pass' },
    { key: 'advanceOnCorpDone', label: 'Auto-next corp after revenue + train' },
    { key: 'collectPrivates', label: 'Auto-collect private revenue at OR start' },
    { key: 'soldOutAdjust', label: 'Auto-sold-out adjustment at OR end' },
    { key: 'presidentSwap', label: 'Auto-swap presidency on share majority' },
    { key: 'superUmpire', label: 'Super-umpire: show ALL actions' },
  ]
  const onColor = m ? 'bg-green-900 text-green-300' : 'bg-green-700/30 text-green-300'
  const offColor = m ? 'bg-gray-800 text-gray-500' : 'bg-gray-800/50 text-gray-400'
  const labelColor = m ? 'text-green-600 text-xs mb-1 font-mono' : 'text-gray-400 text-xs mb-1'

  return (
    <div>
      <Title m={m}>Settings</Title>
      <div className="mt-1 flex gap-4 flex-wrap">
        <div>
          <div className={labelColor}>App</div>
          <div className="flex gap-1">
            <Btn m={m} v={skin === 'broker' ? 'green' : 'blue'} o={() => setActiveTab('overview')}>Broker</Btn>
            <Btn m={m} v={skin === 'moderator' ? 'green' : 'blue'} o={() => setActiveTab('moderator')}>Moderator</Btn>
          </div>
          {skin === 'broker' && (
            <>
              <div className={`${labelColor} mt-1`}>Color</div>
              <div className="flex gap-1">
                {Object.values(brokerThemes).map(bt => (
                  <Btn key={bt.id} m={m} v={brokerThemeId === bt.id ? 'green' : 'blue'} o={() => setBrokerTheme(bt.id)}>
                    {bt.label}
                  </Btn>
                ))}
              </div>
            </>
          )}
          {skin === 'moderator' && (
            <>
              <div className={`${labelColor} mt-1`}>Terminal</div>
              <div className="flex gap-1">
                {['dos', 'green', 'amber', 'white'].map(tid => (
                  <Btn key={tid} m={m} v={modTheme === tid ? 'green' : 'blue'} o={() => setModTheme(tid)}>
                    {tid.charAt(0).toUpperCase() + tid.slice(1)}
                  </Btn>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <div className={labelColor}>Tools</div>
          <div className="flex gap-1 flex-wrap">
            {game?.actionLog?.length > 0 && !inReplay && <Btn m={m} v="blue" o={() => enterReplay()}>Replay</Btn>}
            {inReplay && <Btn m={m} v="red" o={() => exitReplay()}>Exit Replay</Btn>}
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className={labelColor}>Automation</div>
          <div className="space-y-0.5">
            {autoItems.map(it => (
              <button key={it.key} onClick={() => setAutoConfig(it.key, !ac[it.key])}
                className={`block w-full text-left text-xs px-2 py-0.5 rounded ${ac[it.key] ? onColor : offColor}`}>
                [{ac[it.key] ? 'X' : ' '}] {it.label}
              </button>
            ))}
          </div>
          <div className={`${labelColor} mt-1`}>Limits</div>
          <div className="flex gap-1">
            {['ignore', 'warn', 'block'].map(mode => (
              <Btn key={mode} m={m} v={ac.limitMode === mode ? 'green' : 'blue'}
                o={() => setAutoConfig('limitMode', mode)}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Btn>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Btn({ m, v, o, children }) {
  const mod = { green: 'bg-green-900/80 text-green-300 hover:bg-green-800', red: 'bg-red-900/80 text-red-300 hover:bg-red-800', blue: 'bg-cyan-900/80 text-cyan-300 hover:bg-cyan-800', yellow: 'bg-yellow-900/80 text-yellow-300 hover:bg-yellow-800', disabled: 'bg-gray-800/60 text-gray-600 cursor-not-allowed' }
  const brk = { green: 'bg-green-700 text-white hover:bg-green-600', red: 'bg-red-700 text-white hover:bg-red-600', blue: 'bg-blue-700 text-white hover:bg-blue-600', yellow: 'bg-amber-700 text-white hover:bg-amber-600', disabled: 'bg-broker-surface-hover text-broker-text-muted cursor-not-allowed' }
  const styles = m ? mod : brk
  return <button onClick={o} className={`px-2 py-1 rounded text-xs font-medium ${styles[v] || styles.green}`}>{children}</button>
}
