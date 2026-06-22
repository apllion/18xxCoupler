// ActionPanel — structured action panels for the broker skin.
// Two-step flows: pick entity first, then pick action.

import { useState } from 'react'
import { playerSharePercent, corpPrice, parPrices, nextAvailableTrains } from './useOverviewData.js'
import { getCorpShares } from '../../engine/corporation.js'
import { useUIStore } from '../../store/uiStore.js'
import { useGameStore } from '../../store/gameStore.js'
import { useSyncContext } from '../../hooks/SyncContext.jsx'
import { useWakeLock } from '../../hooks/useWakeLock.js'
import { REMINDER_DEFS } from '../../engine/reminders.js'
import { useThemeStore, themes as brokerThemes } from '../../store/themeStore.js'
import { exportGamePdf } from '../../utils/exportPdf.js'
import { exportGame } from '../../utils/persistence.js'
import { CorpCard } from './CorpCard.jsx'
import { PlayerCard } from './PlayerCard.jsx'

export function ActionPanel({ panel, game, player, corp, unfloated, fmt, revenueInput, setRevenueInput, revRef, onClose, doAction }) {
  return (
    <div className="bg-broker-surface border-t border-broker-border px-3 py-3 flex-shrink-0">
      <div className="flex justify-between items-start mb-1">
        <PanelContent panel={panel} game={game} player={player} corp={corp}
          unfloated={unfloated} fmt={fmt} revenueInput={revenueInput}
          setRevenueInput={setRevenueInput} revRef={revRef} onClose={onClose} doAction={doAction} />
        <button onClick={onClose} className="text-broker-text-muted hover:text-white text-sm ml-2">
          Esc
        </button>
      </div>
    </div>
  )
}

function PanelContent({ panel, game, player, corp, unfloated, fmt, revenueInput, setRevenueInput, revRef, onClose, doAction }) {
  const price = corp ? corpPrice(game.stockMarket, corp.sym) || 0 : 0
  const [priceTarget, setPriceTarget] = useState(null) // { type, data } for inline price entry
  const [priceValue, setPriceValue] = useState('')

  // Pay panel state (must be at top level, not inside conditional)
  const [payAmount, setPayAmount] = useState(0)
  const [payFrom, setPayFrom] = useState(
    corp?.floated ? { type: 'corporation', id: corp.sym, label: corp.sym, color: corp.color, cash: corp.cash }
    : player ? { type: 'player', id: player.id, label: player.name, cash: player.cash }
    : null
  )
  const [payTo, setPayTo] = useState({ type: 'bank', label: 'Bank' })

  // Par: two-step — pick corp, then pick price
  if (panel === 'par' && player) {
    return <ParPanel player={player} unfloated={unfloated} game={game} fmt={fmt} doAction={doAction} />
  }

  // Buy source selection (when both IPO and market available)
  if (panel === 'buy' && player && corp) {
    const shareSize = game.title.shares?.[1] ?? 10
    return (
      <div>
        <Title>Buy {shareSize}% <CB c={corp} /> for {player.name}</Title>
        <div className="flex gap-2 mt-1">
          <Btn v="green" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'ipo', percent: shareSize })}>IPO {fmt(price)}</Btn>
          <Btn v="blue" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'market', percent: shareSize })}>Market {fmt(price)}</Btn>
        </div>
      </div>
    )
  }

  // Share buy/sell
  if (panel === 'share' && player && corp) {
    const shareSize = game.title.shares?.[1] ?? 10
    const pct = playerSharePercent(player, corp.sym)
    const pres = player.shares.some(s => s.corpSym === corp.sym && s.isPresident)
    return (
      <div>
        <Title>{player.name} + <CB c={corp} /></Title>
        <div className="flex gap-2 mt-1">
          {corp.ipoShares > 0 && <Btn v="green" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'ipo', percent: shareSize })}>Buy IPO {fmt(price)}</Btn>}
          {corp.marketShares > 0 && <Btn v="blue" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'market', percent: shareSize })}>Buy Market {fmt(price)}</Btn>}
          {Array.from({ length: Math.floor(pct / shareSize) }, (_, i) => {
            const n = (i + 1) * shareSize
            return <Btn key={n} v="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: n })}>Sell {n}%</Btn>
          })}
          {pct > 0 && !pres && <Btn v="yellow" o={() => doAction({ type: 'SWAP_PRESIDENT', playerId: player.id, corpSym: corp.sym })}>President</Btn>}
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
        <Title><CB c={corp} /> Revenue</Title>
        <div className="flex items-center gap-2 mt-1">
          <input ref={revRef} type="number" value={revenueInput} onChange={e => setRevenueInput(e.target.value)}
            placeholder="Enter revenue" autoFocus
            className="w-24 bg-broker-bg border border-broker-border rounded px-2 py-1.5 text-white text-center"
            onKeyDown={e => {
              if (!rev || rev <= 0) return
              if (e.key === 'p' || e.key === 'Enter') { e.preventDefault(); doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
              if (e.key === 'w') { e.preventDefault(); doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
              if (e.key === 'h') { e.preventDefault(); doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
            }}
          />
          <Btn v="blue" o={() => {
            useUIStore.getState().setActiveCorp(corp.sym)
            useUIStore.getState().setActiveTab('routes')
          }}>Route Calc</Btn>
          <Btn v="red" o={() => doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: 0 })}>No Trains</Btn>
          {rev > 0 && (
            <>
              <Btn v="green" o={() => doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })}>
                Pay{dblJump ? ' x2' : ''}
              </Btn>
              {game.title.halfPay && (
                <Btn v="yellow" o={() => doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })}>Half</Btn>
              )}
              <Btn v="red" o={() => doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })}>Withhold</Btn>
              <span className="text-broker-text-muted text-xs">{fmt(perShare)}/share</span>
            </>
          )}
        </div>
      </div>
    )
  }

  // Token placement
  if (panel === 'token' && corp) {
    const placed = corp.tokensPlaced || 0
    const total = corp.tokens.length
    const remaining = total - placed
    const tokenCost = placed < total ? (corp.tokens[placed] || 0) : 0
    const variableTokenCost = game.title.variableTokenCost
    if (remaining <= 0) return <div><Title><CB c={corp} /> Tokens</Title><span className="text-broker-text-muted">All tokens placed</span></div>

    const placeToken = (cost) => {
      doAction({ type: 'PLACE_TOKEN', corpSym: corp.sym, price: cost })
    }

    return (
      <div>
        <Title><CB c={corp} /> Place Token ({placed}/{total}) — next: {fmt(tokenCost)}</Title>
        <div className="flex items-center gap-1 flex-wrap mt-1">
          {variableTokenCost ? (
            <>
              <input type="number" value={priceValue} onChange={e => setPriceValue(e.target.value)}
                placeholder="0"
                className="w-20 bg-broker-bg border border-broker-border rounded px-2 py-1 text-white text-center text-xs" />
              <Btn v="green" o={() => { placeToken(parseInt(priceValue, 10) || 0); setPriceValue('') }}>
                Place {fmt(parseInt(priceValue, 10) || 0)}
              </Btn>
            </>
          ) : (
            <Btn v="green" o={() => placeToken(tokenCost)}>Place {fmt(tokenCost)}</Btn>
          )}
        </div>
      </div>
    )
  }

  // Player reorder
  if (panel === 'reorder') {
    return (
      <div>
        <Title>Reorder Players</Title>
        <div className="mt-1 space-y-1">
          {game.players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 bg-broker-surface rounded-lg px-3 py-2">
              <span className="text-xs text-broker-text-muted w-4">{i + 1}</span>
              <span className={`flex-1 text-sm font-medium ${p.id === game.priorityDeal ? 'text-broker-gold' : 'text-white'}`}>
                {p.name} {p.id === game.priorityDeal && '★'}
              </span>
              <span className="text-xs text-sky-300">{fmt(p.cash)}</span>
              <div className="flex gap-1">
                {i > 0 && <Btn v="blue" o={() => {
                  const order = game.players.map(pl => pl.id)
                  ;[order[i], order[i - 1]] = [order[i - 1], order[i]]
                  doAction({ type: 'SET_PLAYER_ORDER', order })
                }}>↑</Btn>}
                {i < game.players.length - 1 && <Btn v="blue" o={() => {
                  const order = game.players.map(pl => pl.id)
                  ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
                  doAction({ type: 'SET_PLAYER_ORDER', order })
                }}>↓</Btn>}
                <Btn v="yellow" o={() => doAction({ type: 'SET_PRIORITY', playerId: p.id })}>PD</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Terrain costs
  if (panel === 'terrain' && corp) {
    const terrainCosts = game.title.terrainCosts || []
    return (
      <div>
        <Title><CB c={corp} /> Terrain Cost</Title>
        <div className="flex items-center gap-1 flex-wrap mt-1">
          {terrainCosts.map(tc => (
            <Btn key={tc} v="yellow" o={() => doAction({ type: 'ADJUST_CASH', entityId: corp.sym, entityType: 'corporation', amount: -tc })}>
              {fmt(tc)}
            </Btn>
          ))}
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
        <Title><CB c={corp} /> Buy Train — Treasury {fmt(corp.cash)}</Title>
        <div className="mt-1 space-y-1">
          {available.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {available.map(t => {
                const ok = corp.cash >= t.price
                return (
                  <Btn key={t.name} v={ok ? 'green' : 'disabled'}
                    o={() => ok && doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })}>
                    {t.name}-train {fmt(t.price)}{t.rustsOn ? ` (rusts on ${t.rustsOn})` : ''}
                  </Btn>
                )
              })}
            </div>
          )}
          {otherCorps.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <span className="text-broker-text-muted text-xs">From corps:</span>
              {otherCorps.map(other => other.trains.map(t => (
                <Btn key={`${other.sym}-${t.id}`} v="blue"
                  o={() => { setPriceTarget({ type: 'train', trainName: t.name, fromCorpSym: other.sym, corpSym: corp.sym }); setPriceValue(String(t.price)) }}>
                  {t.name} from <span style={{ color: other.color }}>{other.sym}</span>
                </Btn>
              )))}
            </div>
          )}
          {priceTarget?.type === 'train' && (
            <PriceInput label={`Price for ${priceTarget.trainName} from ${priceTarget.fromCorpSym}`}
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
        <Title><CB c={corp} /> Loans — {loans}/{max}</Title>
        <div className="flex gap-2 mt-1">
          {loans < max && <Btn v="green" o={() => doAction({ type: 'TAKE_LOAN', corpSym: corp.sym })}>Take Loan +{fmt(loanValue)}</Btn>}
          {loans > 0 && corp.cash >= loanValue && <Btn v="red" o={() => doAction({ type: 'REPAY_LOAN', corpSym: corp.sym })}>Repay -{fmt(loanValue)}</Btn>}
          {loans > 0 && <Btn v="yellow" o={() => doAction({ type: 'PAY_INTEREST', corpSym: corp.sym })}>Pay Interest</Btn>}
        </div>
      </div>
    )
  }

  // Sell private to corp
  if (panel === 'private' && player && corp) {
    const privs = (game.companies || []).filter(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.canSellToCorp !== false)
    return (
      <div>
        <Title>{player.name} sell private to <CB c={corp} /></Title>
        {privs.length === 0
          ? <span className="text-broker-text-muted text-sm">No privates to sell</span>
          : <div className="flex gap-2 mt-1 flex-wrap">
              {privs.map(c => (
                <Btn key={c.sym} v="blue"
                  o={() => { setPriceTarget({ type: 'sellpriv', companySym: c.sym, fromPlayerId: player.id, toCorpSym: corp.sym }); setPriceValue(String(c.value)) }}>
                  {c.sym} — {fmt(c.value)}
                </Btn>
              ))}
              {priceTarget?.type === 'sellpriv' && (
                <PriceInput label={`Sell ${priceTarget.companySym} to ${priceTarget.toCorpSym} for`}
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
    return <SettingsPanel game={game} doAction={doAction} />
  }

  // Navigation menu
  if (panel === 'navigate') {
    const go = (tab) => { useUIStore.getState().setActiveTab(tab); onClose() }
    const items = [
      { key: '1', label: 'Overview', id: 'overview' },
      ...((import.meta.env.VITE_PLUSPLUS || import.meta.env.DEV) ? [{ key: '2', label: '++ Analysis', id: 'analysis' }] : []),
    ]
    return (
      <div>
        <Title>Switch View</Title>
        <div className="flex flex-wrap gap-1 mt-1">
          {items.map(it => (
            <Btn key={it.id} v={useUIStore.getState().activeTab === it.id ? 'green' : 'blue'}
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
    return <CorpCard game={game} corpSym={corp.sym} />
  }

  // Player detail card
  if (panel === 'playerdetail' && player) {
    return <PlayerCard game={game} playerId={player.id} />
  }

  // Buy private from bank (auctions, drafts — record the result)
  if (panel === 'buyprivate' && player) {
    const available = (game.companies || []).filter(c => !c.ownerId && !c.closed)
    return (
      <div>
        <Title>{player.name} — Buy Private</Title>
        {available.length === 0
          ? <span className="text-broker-text-muted text-sm">No privates available</span>
          : <div className="flex flex-wrap gap-1 mt-1">
              {available.map(c => {
                const ok = player.cash >= c.value
                return (
                  <Btn key={c.sym} v={ok ? 'green' : 'disabled'}
                    o={() => { setPriceTarget({ type: 'buypriv', companySym: c.sym, playerId: player.id }); setPriceValue(String(c.value)) }}>
                    {c.sym} {fmt(c.value)} {c.revenue > 0 && `+${fmt(c.revenue)}`}
                  </Btn>
                )
              })}
              {priceTarget?.type === 'buypriv' && (
                <PriceInput label={`Buy ${priceTarget.companySym} for`}
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
    return <MergePanel game={game} corp={corp} fmt={fmt} doAction={doAction} />
  }

  // Move certificate panel (super-umpire)
  if (panel === 'movecert' && player && corp) {
    const certs = player.shares.filter(s => s.corpSym === corp.sym)
    const otherPlayers = game.players.filter(p => p.id !== player.id)
    return (
      <MoveCertPanel certs={certs} player={player} corp={corp} game={game}
        otherPlayers={otherPlayers} doAction={doAction} fmt={fmt} />
    )
  }

  // Short sell (1817)
  if (panel === 'short' && player) {
    const corps = game.corporations.filter(c => c.ipoed && c.floated)
    return (
      <div>
        <Title>{player.name} — Short Sell</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {corps.map(c => (
            <Btn key={c.sym} v="red"
              o={() => doAction({ type: 'SHORT_SELL', playerId: player.id, corpSym: c.sym })}>
              <CB c={c} /> @ {fmt(corpPrice(game.stockMarket, c.sym) || 0)}
            </Btn>
          ))}
        </div>
      </div>
    )
  }

  // Close short (1817)
  if (panel === 'closeshort' && player) {
    const shorts = player.shares?.filter(s => s.isShort) || []
    if (shorts.length === 0) return <Title>{player.name} has no open short positions</Title>
    return (
      <div>
        <Title>{player.name} — Close Short Position</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {shorts.map((s, i) => (
            <Btn key={i} v="green"
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
    if (trainsWithoutCar.length === 0) return <Title>{corp.sym}: all trains have attachments</Title>
    const ecPrice = game.title.executiveCars?.price ?? 0
    return (
      <div>
        <Title><CB c={corp} /> — Buy Executive Car ({fmt(ecPrice)})</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {trainsWithoutCar.map(t => (
            <Btn key={t.id} v={corp.cash >= ecPrice ? 'green' : 'disabled'}
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
    if (concessions.length === 0) return <Title>{player.name} has no concessions</Title>
    return (
      <div>
        <Title>{player.name} — Convert Concession</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {concessions.map(c => {
            const matchingCorp = game.corporations.find(corp => c.desc?.includes(corp.name) || c.desc?.includes(corp.sym))
            return (
              <Btn key={c.sym} v="green"
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
  // Pay — from player or corp, to bank or corp
  if (panel === 'paybank') {
    const floatedCorps = game.corporations.filter(c => c.floated)

    const doPay = (amount) => {
      const v = amount || payAmount
      if (v <= 0 || !payFrom || !payTo) return
      doAction({ type: 'ADJUST_CASH', entityId: payFrom.id, entityType: payFrom.type, amount: -v })
      doAction({ type: 'ADJUST_CASH', entityId: payTo.id, entityType: payTo.type, amount: v })
      onClose()
    }

    const allOptions = [
      { type: 'bank', id: 'bank', label: 'Bank', cash: game.bank.cash },
      ...game.players.map(p => ({ type: 'player', id: p.id, label: p.name, cash: p.cash })),
      ...floatedCorps.map(c => ({ type: 'corporation', id: c.sym, label: c.sym, color: c.color, cash: c.cash })),
    ]

    return (
      <div>
        <Title>Pay</Title>
        {/* From */}
        <div className="text-broker-text-muted text-xs mb-0.5">From:</div>
        <div className="flex gap-1 flex-wrap mb-1">
          {allOptions.map(o => (
            <Btn key={o.id} v={payFrom?.id === o.id && payFrom?.type === o.type ? 'green' : 'blue'}
              o={() => setPayFrom(o)}>
              {o.color ? <CB c={{ sym: o.label, color: o.color, textColor: '#fff' }} /> : o.label}
              {o.cash != null && <span className="ml-1 opacity-60">{fmt(o.cash)}</span>}
            </Btn>
          ))}
        </div>
        {/* To */}
        <div className="text-broker-text-muted text-xs mb-0.5">To:</div>
        <div className="flex gap-1 flex-wrap mb-1">
          {allOptions.filter(o => !(o.type === payFrom?.type && o.id === payFrom?.id)).map(o => (
            <Btn key={o.id} v={payTo?.id === o.id && payTo?.type === o.type ? 'green' : 'blue'}
              o={() => setPayTo(o)}>
              {o.color ? <CB c={{ sym: o.label, color: o.color, textColor: '#fff' }} /> : o.label}
            </Btn>
          ))}
        </div>
        {/* Amount — value buttons + other */}
        <ValuePicker value={payAmount} onChange={setPayAmount} label="Amount:" />
        {/* Confirm */}
        {payAmount > 0 && payFrom && (
          <Btn v="green" o={() => doPay()}>
            Pay {fmt(payAmount)} {payFrom.label} → {payTo.label}
          </Btn>
        )}
      </div>
    )
  }

  // Take strategy card
  if (panel === 'takecard' && player) {
    const allGiven = game.players.flatMap(p => (p.cards || []).map(c => c.id))
    const available = (game.title.strategyCards || []).filter(c => !allGiven.includes(c.id))
    const cardColors = { blue: '#0189d1', white: '#cccccc', green: '#237333', red: '#d81e3e', purple: '#800080', black: '#333333', yellow: '#FFF500', grey: '#808080' }
    if (available.length === 0) return <Title>No cards available</Title>
    return (
      <div>
        <Title>Take Strategy Card — {player.name}</Title>
        <div className="flex gap-1 flex-wrap mt-1">
          {available.map(card => {
            const cc = cardColors[card.color] || '#888'
            const ct = card.color === 'yellow' || card.color === 'white' ? '#000' : '#fff'
            return (
              <button key={card.id}
                onClick={() => { doAction({ type: 'GIVE_CARD', playerId: player.id, card }); onClose() }}
                className="text-sm px-3 py-2 rounded font-medium hover:opacity-80"
                style={{ backgroundColor: cc, color: ct }}
                title={`${card.unique}\nPermit: ${card.permit}`}>
                {card.name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (panel === 'export') {
    const nextTrain = game.depot.upcoming[0]
    if (!nextTrain) return <Title>No trains to export</Title>
    return (
      <div>
        <Title>Export Train</Title>
        <div className="mt-1">
          <Btn v="red"
            o={() => doAction({ type: 'EXPORT_TRAIN' })}>
            Export {nextTrain.name}-train ({fmt(nextTrain.price)})
          </Btn>
        </div>
      </div>
    )
  }

  // Discard train (forced when over train limit)
  if (panel === 'discard' && corp) {
    if (corp.trains.length === 0) return <Title>{corp.sym} has no trains to discard</Title>
    return (
      <div>
        <Title><CB c={corp} /> — Discard Train</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {corp.trains.map((t, i) => (
            <Btn key={t.id || i} v="red"
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
    const canStartCorps = game.title.corpCanStartCorps
    const otherCorps = game.corporations.filter(c => (c.ipoed || (canStartCorps && !c.ipoed)) && c.sym !== corp.sym)
    const ownShares = corp.sharesHeld || []
    return (
      <div>
        <Title><CB c={corp} /> Share Trading — Treasury {fmt(corp.cash)}</Title>
        {/* Buy from other corps */}
        <div className="mt-1 space-y-1">
          <span className="text-broker-text-muted text-xs">Buy {shareSize}% from:</span>
          <div className="flex gap-1 flex-wrap">
            {otherCorps.filter(c => c.ipoed).map(target => {
              const tp = corpPrice(game.stockMarket, target.sym) || 0
              const cost = tp
              const hasIPO = target.ipoShares > 0
              const hasMkt = target.marketShares > 0
              const ok = corp.cash >= cost
              return (
                <span key={target.sym} className="inline-flex gap-0.5">
                  {hasIPO && <Btn v={ok ? 'green' : 'disabled'}
                    o={() => ok && doAction({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'ipo', percent: shareSize })}>
                    <CB c={target} /> IPO {fmt(cost)}
                  </Btn>}
                  {hasMkt && <Btn v={ok ? 'blue' : 'disabled'}
                    o={() => ok && doAction({ type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: target.sym, source: 'market', percent: shareSize })}>
                    <CB c={target} /> Mkt {fmt(cost)}
                  </Btn>}
                </span>
              )
            })}
          </div>
          {/* Start new corp (PTG: corp buys CEO share at par) */}
          {canStartCorps && otherCorps.some(c => !c.ipoed) && <>
            <span className="text-broker-text-muted text-xs">Start new corp:</span>
            <div className="flex gap-1 flex-wrap">
              {otherCorps.filter(c => !c.ipoed).map(target => {
                const pars = parPrices(game.stockMarket)
                const ceoPercent = game.title.shares?.[0] ?? 20
                return (
                  <span key={target.sym} className="inline-flex gap-0.5 flex-wrap">
                    {pars.map(pp => {
                      const cost = (pp.price * ceoPercent) / 10
                      const ok = corp.cash >= cost
                      return (
                        <Btn key={pp.price} v={ok ? 'green' : 'disabled'}
                          o={() => ok && doAction({ type: 'CORP_PAR', buyerCorpSym: corp.sym, targetCorpSym: target.sym, parPrice: pp.price, row: pp.row, col: pp.col })}>
                          <CB c={target} /> @{fmt(pp.price)}
                        </Btn>
                      )
                    })}
                  </span>
                )
              })}
            </div>
          </>}
          {/* Sell holdings */}
          {ownShares.length > 0 && (
            <>
              <span className="text-broker-text-muted text-xs">Sell holdings:</span>
              <div className="flex gap-1 flex-wrap">
                {[...new Set(ownShares.map(s => s.corpSym))].map(sym => {
                  const pct = ownShares.filter(s => s.corpSym === sym).reduce((s, x) => s + x.percent, 0)
                  const target = game.corporations.find(c => c.sym === sym)
                  return (
                    <Btn key={sym} v="red"
                      o={() => doAction({ type: 'CORP_SELL_SHARES', sellerCorpSym: corp.sym, targetCorpSym: sym, percent: shareSize })}>
                      <CB c={target} /> {pct}%
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
function ParPanel({ player, unfloated, game, fmt, doAction }) {
  const [selectedCorp, setSelectedCorp] = useState(null)
  const prices = parPrices(game.stockMarket)

  return (
    <div>
      <Title>{player.name} — Par new corporation</Title>

      {/* Step 1: pick corp */}
      <div className="flex gap-1 mt-1 flex-wrap">
        {unfloated.map(c => (
          <button key={c.sym} onClick={() => setSelectedCorp(c.sym === selectedCorp ? null : c.sym)}
            className={`px-2 py-1 rounded text-sm font-bold border ${
              c.sym === selectedCorp
                ? 'border-broker-gold bg-broker-gold/10'
                : 'border-broker-border bg-broker-surface-hover hover:border-broker-text-muted'
            }`}
            >
            <CB c={c} />
          </button>
        ))}
      </div>

      {/* Step 2: pick price */}
      {selectedCorp && (
        <div className="mt-2">
          <span className="text-broker-text-muted text-xs">
            Par price for <span style={{ color: unfloated.find(c => c.sym === selectedCorp)?.color }} className="font-bold">{selectedCorp}</span>:
          </span>
          <div className="flex gap-1 mt-1 flex-wrap">
            {prices.map(pp => {
              const corpShares = selectedCorp ? getCorpShares(game, selectedCorp) : [20, 10]
              const presPercent = corpShares[0] ?? 20
              const baseShare = corpShares[1] ?? corpShares[0] ?? 10
              const cost = pp.price * (presPercent / baseShare)
              const ok = player.cash >= cost
              return (
                <Btn key={pp.price} v={ok ? 'green' : 'disabled'}
                  o={() => ok && doAction({ type: 'PAR_SHARE', playerId: player.id, corpSym: selectedCorp, parPrice: pp.price, row: pp.row, col: pp.col })}>
                  {fmt(pp.price)}
                  <span className="text-white/50 ml-1">({fmt(cost)})</span>
                </Btn>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Title({ children }) {
  return <div className="text-sm font-medium text-white">{children}</div>
}

function MoveCertPanel({ certs, player, corp, game, otherPlayers, doAction, fmt: _fmt }) {
  const [selectedCert, setSelectedCert] = useState(null) // { percent, isPresident, index }

  // Certs this player holds
  const corpCerts = certs.map((s, i) => ({ ...s, index: i }))

  // Also show IPO/pool as sources to pull from
  const ipoAvail = corp.ipoShares
  const poolAvail = corp.marketShares
  const shareSize = game.title.shares?.[1] ?? 10
  const presSize = game.title.shares?.[0] ?? 20

  if (!selectedCert) {
    return (
      <div>
        <Title>{player.name} — <CB c={corp} /> Certificates</Title>
        <div className="mt-1 space-y-0.5">
          {corpCerts.length === 0 && <span className="text-broker-text-muted text-xs">No certs held</span>}
          {corpCerts.map((c, i) => (
            <Btn key={i} v={c.isPresident ? 'yellow' : 'blue'}
              o={() => setSelectedCert({ percent: c.percent, isPresident: c.isPresident, source: 'player' })}>
              {c.percent}%{c.isPresident ? ' President' : ''} → move
            </Btn>
          ))}
          {ipoAvail > 0 && (
            <>
              <span className="text-broker-text-muted text-xs block mt-1">From IPO ({ipoAvail}%):</span>
              <Btn v="green" o={() => setSelectedCert({ percent: shareSize, isPresident: false, source: 'ipo' })}>
                Pull {shareSize}% from IPO
              </Btn>
              {ipoAvail >= presSize && (
                <Btn v="yellow" o={() => setSelectedCert({ percent: presSize, isPresident: true, source: 'ipo' })}>
                  Pull {presSize}% Pres from IPO
                </Btn>
              )}
            </>
          )}
          {poolAvail > 0 && (
            <>
              <span className="text-broker-text-muted text-xs block mt-1">From Pool ({poolAvail}%):</span>
              <Btn v="green" o={() => setSelectedCert({ percent: shareSize, isPresident: false, source: 'pool' })}>
                Pull {shareSize}% from Pool
              </Btn>
            </>
          )}
          {/* Force president — any player with shares can be forced president */}
          {corpCerts.length > 0 && !corpCerts.some(c => c.isPresident) && (
            <Btn v="yellow" o={() => doAction({ type: 'FORCE_PRESIDENT', playerId: player.id, corpSym: corp.sym })}>
              Force President
            </Btn>
          )}
          {corpCerts.some(c => c.isPresident) && (
            <span className="text-amber-400 text-xs block mt-1">
              Currently president. Move the pres cert or use Force President on another player.
            </span>
          )}
        </div>
      </div>
    )
  }

  // Step 2: pick destination
  return (
    <div>
      <Title>Move {selectedCert.percent}%{selectedCert.isPresident ? ' President' : ''} <CB c={corp} /> to:</Title>
      <div className="flex gap-1 mt-1 flex-wrap">
        {selectedCert.source === 'player' ? (
          <>
            {otherPlayers.map(p => (
              <Btn key={p.id} v="green" o={() => doAction({
                type: 'MOVE_CERT', corpSym: corp.sym, fromPlayerId: player.id, toPlayerId: p.id,
                percent: selectedCert.percent, isPresident: selectedCert.isPresident
              })}>{p.name}</Btn>
            ))}
            <Btn v="blue" o={() => doAction({
              type: 'MOVE_CERT', corpSym: corp.sym, fromPlayerId: player.id, toSource: 'ipo',
              percent: selectedCert.percent, isPresident: selectedCert.isPresident
            })}>IPO</Btn>
            <Btn v="blue" o={() => doAction({
              type: 'MOVE_CERT', corpSym: corp.sym, fromPlayerId: player.id, toSource: 'pool',
              percent: selectedCert.percent, isPresident: selectedCert.isPresident
            })}>Pool</Btn>
          </>
        ) : (
          // From IPO/pool → pick player
          <>
            {game.players.map(p => (
              <Btn key={p.id} v="green" o={() => doAction({
                type: 'MOVE_CERT', corpSym: corp.sym, fromSource: selectedCert.source, toPlayerId: p.id,
                percent: selectedCert.percent, isPresident: selectedCert.isPresident
              })}>{p.name}</Btn>
            ))}
          </>
        )}
        <Btn v="red" o={() => setSelectedCert(null)}>Cancel</Btn>
      </div>
    </div>
  )
}

function MergePanel({ game, corp, fmt: _fmt, doAction }) {
  const [target, setTarget] = useState(null)
  const [paymentShares, setPaymentShares] = useState(0)
  const [cashDiff, setCashDiff] = useState('')

  const merger = game.title.merger
  if (!merger) return <Title>No merger rules for this title</Title>

  const mergerType = merger.type
  const phase = game.phaseManager.phases[game.phaseManager.currentIndex]

  // Check phase eligibility
  if (merger.fromPhase) {
    const phaseNames = game.phaseManager.phases.map(p => p.name)
    const currentIdx = phaseNames.indexOf(phase.name)
    const fromIdx = phaseNames.indexOf(merger.fromPhase)
    if (currentIdx < fromIdx) {
      return <Title>Mergers available from phase {merger.fromPhase} (current: {phase.name})</Title>
    }
  }

  // Block merged corps from merging again if title disallows
  if (corp.isMerged && !merger.canReMerge) {
    return <Title><CB c={corp} /> — already merged</Title>
  }

  // Find eligible targets based on merger type
  let targets = []
  let label = 'Merge'

  if (mergerType === '1867_minor_major') {
    if (corp.type !== 'minor') return <Title>Select a minor corporation to convert</Title>
    targets = game.corporations.filter(c => c.type === 'major' && !c.floated)
    label = 'Convert to Major'
  } else if (mergerType === '1822_acquire') {
    if (corp.type !== 'major') return <Title>Select a major corporation to acquire with</Title>
    targets = game.corporations.filter(c => c.type === 'minor' && c.floated && c.sym !== corp.sym)
    label = 'Acquire Minor'
  } else if (mergerType === '1862_peer') {
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.floated)
    label = 'Merge (absorb)'
  } else if (mergerType === 'ptg_combine') {
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.floated && !c.isMerged)
    label = 'Combine'
  } else if (mergerType === 'rla_merge') {
    if (corp.type !== 'minor') return <Title>Select a minor to merge</Title>
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.type === 'minor' && c.floated)
    label = 'Merge Minors'
  } else if (mergerType === '1817_merge') {
    targets = game.corporations.filter(c => c.sym !== corp.sym && c.floated && c.corpSize === corp.corpSize)
    label = 'Merge (same size)'
  }

  if (targets.length === 0 && !target) {
    return <Title>{label}: no eligible targets</Title>
  }

  // Step 1: pick target
  if (!target) {
    return (
      <div>
        <Title><CB c={corp} /> — {label}</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {targets.map(t => (
            <Btn key={t.sym} v="blue" o={() => {
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
        <Title><CB c={corp} /> acquires {target}</Title>
        <div className="mt-1 space-y-1">
          <div className="flex gap-1 items-center">
            <span className="text-broker-text-muted text-xs">Shares:</span>
            {(merger.paymentOptions || [0, 1, 2]).map(n => (
              <Btn key={n} v={paymentShares === n ? 'green' : 'blue'}
                o={() => setPaymentShares(n)}>{n}</Btn>
            ))}
          </div>
          <PriceInput label="Cash difference" value={cashDiff} onChange={setCashDiff}
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
        <Title>{corp.sym} + {target} → pick Major</Title>
        <div className="flex gap-1 mt-1 flex-wrap">
          {availMajors.map(maj => (
            <Btn key={maj.sym} v="green"
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
        <Title>{corp.sym} merges with {target}</Title>
        <div className="flex gap-1 mt-1">
          <Btn v="green" o={() => doAction({ type: 'MERGE_CORPS', survivorSym: corp.sym, nonsurvivorSym: target })}>
            {corp.sym} survives
          </Btn>
          <Btn v="blue" o={() => doAction({ type: 'MERGE_CORPS', survivorSym: target, nonsurvivorSym: corp.sym })}>
            {target} survives
          </Btn>
          <Btn v="red" o={() => { setTarget(null) }}>Cancel</Btn>
        </div>
      </div>
    )
  }

  return null
}

// Reusable value picker: tap buttons + custom "other" input. No keyboard needed for common values.
function ValuePicker({ value, onChange, values = [5, 10, 20, 30, 40, 50, 80, 100, 150, 200], label }) {
  const [custom, setCustom] = useState('')
  return (
    <div>
      {label && <div className="text-broker-text-muted text-xs mb-0.5">
        {label}{value > 0 && <span className=" text-broker-text font-bold ml-1">{value}</span>}
      </div>}
      <div className="flex gap-1 flex-wrap">
        {values.map(v => (
          <Btn key={v} v={value === v ? 'green' : 'blue'} o={() => onChange(v)}>{v}</Btn>
        ))}
        <input type="number" value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(custom) || 0; if (v > 0) { onChange(v); setCustom('') } } }}
          placeholder="other"
          className="w-14 bg-broker-bg border border-broker-border rounded px-2 py-0.5 text-broker-text text-center text-xs" />
        {value > 0 && <Btn v="blue" o={() => onChange(0)}>Clear</Btn>}
      </div>
    </div>
  )
}

function PriceInput({ label, value, onChange, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-broker-text-muted text-xs">{label}:</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        autoFocus
        className="w-20 bg-broker-bg border border-broker-border rounded px-2 py-0.5 text-white text-center text-xs"
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }}
      />
      <Btn v="green" o={onConfirm}>OK</Btn>
      <Btn v="red" o={onCancel}>Cancel</Btn>
    </div>
  )
}

function SettingsPanel({ game, doAction: _doAction }) {
  const ac = useUIStore((s) => s.autoConfig)
  const turnTracking = useUIStore((s) => s.turnTracking)
  const showToasts = useUIStore((s) => s.showToasts)
  const reminders = useUIStore((s) => s.reminders)
  const sync = useSyncContext()
  const wakeLock = useWakeLock()
  const setAutoConfig = useUIStore((s) => s.setAutoConfig)
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
    { key: 'superUmpire', label: 'Edit mode: show all actions + click values to edit' },
  ]
  const onColor = 'bg-green-700/30 text-green-300'
  const offColor = 'bg-gray-800/50 text-gray-400'
  const labelColor = 'text-gray-400 text-xs mb-1'

  return (
    <div>
      <Title>Settings</Title>
      <div className="mt-1 flex gap-4 flex-wrap">
        <div>
          <div className={labelColor}>Turn Tracking</div>
          <Btn v={turnTracking === 'on' ? 'green' : 'blue'} o={() => useUIStore.getState().toggleTurnTracking()}>
            {turnTracking === 'on' ? 'On' : 'Off'}
          </Btn>
        </div>
        <div>
          <div className={labelColor}>Screen</div>
          <Btn v={!wakeLock.supported ? 'disabled' : wakeLock.enabled ? 'green' : 'blue'} o={wakeLock.supported ? wakeLock.toggle : undefined}>
            {!wakeLock.supported ? 'Stay On (n/a)' : wakeLock.enabled ? (wakeLock.active ? 'Stay On ✓' : 'Stay On ⏳') : 'Stay On'}
          </Btn>
        </div>
        <div>
          <div className={labelColor}>Compartment</div>
          {sync?.roomId ? (
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-xs">{sync.roomId}</span>
              <span className="text-[10px] text-broker-text-muted">{sync.peerCount > 0 ? `${sync.peerCount + 1} devices` : 'waiting'}</span>
              <Btn v="red" o={sync.leaveRoom}>Leave</Btn>
            </div>
          ) : (
            <Btn v="green" o={sync?.createRoom}>Create Room</Btn>
          )}
        </div>
        <div>
          <div className={labelColor}>Theme</div>
          <div className="flex gap-1">
            {Object.values(brokerThemes).map(bt => (
              <Btn key={bt.id} v={brokerThemeId === bt.id ? 'green' : 'blue'} o={() => setBrokerTheme(bt.id)}>
                {bt.label}
              </Btn>
            ))}
          </div>
        </div>
        <div>
          <div className={labelColor}>Tools</div>
          <div className="flex gap-1 flex-wrap">
            <Btn v={showToasts ? 'green' : 'blue'} o={() => useUIStore.setState(s => ({ showToasts: !s.showToasts }))}>
              {showToasts ? 'Toasts ✓' : 'Toasts'}
            </Btn>
            {game?.actionLog?.length > 0 && !inReplay && <Btn v="blue" o={() => enterReplay()}>Replay</Btn>}
            {inReplay && <Btn v="red" o={() => exitReplay()}>Exit Replay</Btn>}
            {game && <Btn v="green" o={() => exportGamePdf(game)}>Export PDF</Btn>}
            {game && <Btn v="blue" o={() => {
              const json = exportGame(game)
              const blob = new Blob([json], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${game.title.titleId}_${new Date().toISOString().slice(0,10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}>Export JSON</Btn>}
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
              <Btn key={mode} v={ac.limitMode === mode ? 'green' : 'blue'}
                o={() => setAutoConfig('limitMode', mode)}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Btn>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className={labelColor}>Reminders</div>
          <div className="space-y-0.5">
            {REMINDER_DEFS.map(r => {
              const on = reminders[r.key]
              return (
                <button key={r.key} onClick={() => useUIStore.getState().toggleReminder(r.key)}
                  className={`block w-full text-left text-xs px-2 py-0.5 rounded ${on ? onColor : offColor}`}>
                  [{on ? 'X' : ' '}] {r.label}
                </button>
              )
            })}
          </div>
        </div>
        {/* DEV only: analysis indicator */}
        {(import.meta.env.VITE_PLUSPLUS || import.meta.env.DEV) && (
          <div className="mt-2">
            <span className="text-green-400 text-[10px]">++ Analysis (dev)</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Btn({ v, o, children }) {
  const styles = { green: 'bg-green-700 text-white hover:bg-green-600', red: 'bg-red-700 text-white hover:bg-red-600', blue: 'bg-blue-700 text-white hover:bg-blue-600', yellow: 'bg-amber-700 text-white hover:bg-amber-600', disabled: 'bg-broker-surface-hover text-broker-text-muted cursor-not-allowed' }
  return <button onClick={o} className={`px-2 py-1 rounded text-xs font-medium ${styles[v] || styles.green}`}>{children}</button>
}

function CB({ c }) {
  if (!c) return null
  const style = c.stripeColor
    ? { background: `linear-gradient(135deg, ${c.color} 50%, ${c.stripeColor} 50%)` }
    : { backgroundColor: c.color, color: c.textColor }
  const sym = c.stripeColor
    ? c.sym.split('-').map((part, i) => <span key={i} style={{ color: i === 0 ? c.textColor : (c.stripeTextColor || '#fff') }}>{i > 0 ? '-' : ''}{part}</span>)
    : c.sym
  return <span className="px-1 rounded font-bold text-xs" style={style}>{sym}</span>
}
