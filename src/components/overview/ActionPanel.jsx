// ActionPanel — structured action panels for both skins.
// Two-step flows: pick entity first, then pick action.

import { useState } from 'react'
import { playerSharePercent, corpPrice, parPrices, nextAvailableTrains } from './useOverviewData.js'
import { useUIStore } from '../../store/uiStore.js'
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

  // Par: two-step — pick corp, then pick price
  if (panel === 'par' && player) {
    return <ParPanel player={player} unfloated={unfloated} game={game} fmt={fmt} doAction={doAction} m={m} />
  }

  // Share buy/sell
  if (panel === 'share' && player && corp) {
    const pct = playerSharePercent(player, corp.sym)
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
                  o={() => { const p = prompt(`Price for ${t.name} from ${other.sym}?`); const pr = parseInt(p, 10); if (pr > 0) doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: pr, fromCorpSym: other.sym }) }}>
                  {t.name} from <span style={{ color: other.color }}>{other.sym}</span>
                </Btn>
              )))}
            </div>
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
                  o={() => { const p = prompt(`Sell ${c.sym} to ${corp.sym} for? (face: ${c.value})`); const pr = parseInt(p, 10); if (pr > 0) doAction({ type: 'SELL_PRIVATE', companySym: c.sym, fromPlayerId: player.id, toCorpSym: corp.sym, price: pr }) }}>
                  {c.sym} — {fmt(c.value)}
                </Btn>
              ))}
            </div>
        }
      </div>
    )
  }

  // Navigation menu
  if (panel === 'navigate') {
    const go = (tab) => { useUIStore.getState().setActiveTab(tab); onClose() }
    const hasPrivates = game.companies?.length > 0
    const hasBeer = !!game.beerMarket
    const items = [
      { key: '1', label: 'Broker Overview', id: 'overview' },
      { key: '2', label: 'Moderator Overview', id: 'moderator' },
      { key: '3', label: 'Market', id: 'market' },
      { key: '4', label: 'Corps', id: 'corps' },
      { key: '5', label: 'Players', id: 'players' },
      ...(hasPrivates ? [{ key: '6', label: 'Privates', id: 'privates' }] : []),
      ...(hasBeer ? [{ key: '7', label: 'Beer Market', id: 'beer' }] : []),
      { key: '0', label: 'Summary / Log', id: 'summary' },
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
                    o={() => {
                      const input = prompt(`${c.sym} (${c.name}) — face value ${fmt(c.value)}\nPrice paid:`, c.value)
                      const pr = parseInt(input, 10)
                      if (pr > 0) doAction({ type: 'BUY_PRIVATE', playerId: player.id, companySym: c.sym, price: pr })
                    }}>
                    {c.sym} {fmt(c.value)} {c.revenue > 0 && `+${fmt(c.revenue)}`}
                  </Btn>
                )
              })}
            </div>
        }
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

function Btn({ m, v, o, children }) {
  const mod = { green: 'bg-green-900/80 text-green-300 hover:bg-green-800', red: 'bg-red-900/80 text-red-300 hover:bg-red-800', blue: 'bg-cyan-900/80 text-cyan-300 hover:bg-cyan-800', yellow: 'bg-yellow-900/80 text-yellow-300 hover:bg-yellow-800', disabled: 'bg-gray-800/60 text-gray-600 cursor-not-allowed' }
  const brk = { green: 'bg-green-700 text-white hover:bg-green-600', red: 'bg-red-700 text-white hover:bg-red-600', blue: 'bg-blue-700 text-white hover:bg-blue-600', yellow: 'bg-amber-700 text-white hover:bg-amber-600', disabled: 'bg-broker-surface-hover text-broker-text-muted cursor-not-allowed' }
  const styles = m ? mod : brk
  return <button onClick={o} className={`px-2 py-1 rounded text-xs font-medium ${styles[v] || styles.green}`}>{children}</button>
}
