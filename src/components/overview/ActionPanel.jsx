// ActionPanel — shared action panel for both overview skins.

import { useUIStore } from '../../store/uiStore.js'
import { playerSharePercent, corpPrice, parPrices, nextAvailableTrains } from './useOverviewData.js'

export function ActionPanel({ panel, game, player, corp, unfloated, fmt, revenueInput, setRevenueInput, revRef, onClose, doAction, skin }) {
  const price = corp ? corpPrice(game.stockMarket, corp.sym) || 0 : 0
  const B = skin === 'moderator' ? MBtn : BrokerBtn

  return (
    <div className={skin === 'moderator'
      ? 'bg-gray-900 border-t border-green-700 px-2 py-1.5 flex-shrink-0'
      : 'bg-broker-surface border-t border-broker-border px-3 py-2 flex-shrink-0'
    }>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-wrap items-center gap-1">

          {panel === 'share' && player && corp && (() => {
            const pct = playerSharePercent(player, corp.sym)
            return <>
              <Label skin={skin}>{player.name} + {corp.sym}:</Label>
              {corp.ipoShares > 0 && <B t={`IPO ${fmt(price)}`} v="green" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'ipo', percent: 10 })} />}
              {corp.marketShares > 0 && <B t={`Mkt ${fmt(price)}`} v="blue" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'market', percent: 10 })} />}
              {pct >= 10 && <B t="Sell 10%" v="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 10 })} />}
              {pct >= 20 && <B t="Sell 20%" v="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 20 })} />}
              {pct >= 30 && <B t="Sell 30%" v="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 30 })} />}
            </>
          })()}

          {panel === 'revenue' && corp && (
            <>
              <Label skin={skin}>{corp.sym} Revenue:</Label>
              <input ref={revRef} type="number" value={revenueInput} onChange={e => setRevenueInput(e.target.value)}
                placeholder="0" autoFocus
                className={skin === 'moderator'
                  ? 'w-16 bg-black border border-green-800 rounded px-1 py-0.5 text-white text-center text-xs font-mono'
                  : 'w-20 bg-broker-bg border border-broker-border rounded px-2 py-1 text-white text-center text-sm'
                }
                onKeyDown={e => {
                  const rev = parseInt(revenueInput, 10)
                  if (!rev || rev <= 0) return
                  if (e.key === 'p' || e.key === 'Enter') { e.preventDefault(); doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
                  if (e.key === 'w') { e.preventDefault(); doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
                  if (e.key === 'h') { e.preventDefault(); doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
                }}
              />
              {parseInt(revenueInput, 10) > 0 && <>
                <B t="Pay" v="green" o={() => doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: parseInt(revenueInput) })} />
                {game.title.halfPay && <B t="Half" v="yellow" o={() => doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: parseInt(revenueInput) })} />}
                <B t="W/hold" v="red" o={() => doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: parseInt(revenueInput) })} />
                <span className={skin === 'moderator' ? 'text-blue-400 text-xs' : 'text-broker-text-muted text-sm'}>{fmt(Math.floor(parseInt(revenueInput) / 10))}/sh</span>
                {price > 0 && Math.floor(parseInt(revenueInput) / 10) >= price && <span className="text-yellow-400 font-bold text-xs">x2!</span>}
              </>}
            </>
          )}

          {panel === 'train' && corp && (
            <>
              <Label skin={skin}>{corp.sym} train ({fmt(corp.cash)}):</Label>
              {nextAvailableTrains(game.depot).map((t, i) => {
                const ok = corp.cash >= t.price
                return <B key={t.name} t={`${t.name} ${fmt(t.price)}${t.rustsOn ? ' r' + t.rustsOn : ''}`}
                  v={ok ? 'green' : 'disabled'} o={() => ok && doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })} />
              })}
              {game.corporations.filter(c => c.sym !== corp.sym && c.trains.length > 0).map(other =>
                other.trains.map(t => (
                  <B key={`${other.sym}-${t.id}`} t={`${t.name} from ${other.sym}`} v="blue"
                    o={() => { const p = prompt(`Price for ${t.name} from ${other.sym}?`); const pr = parseInt(p, 10); if (pr > 0) doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: pr, fromCorpSym: other.sym }) }} />
                ))
              )}
            </>
          )}

          {panel === 'par' && player && (
            <>
              <Label skin={skin}>{player.name} par ({fmt(player.cash)}):</Label>
              {unfloated.map(c => (
                <span key={c.sym} className="inline-flex items-center gap-0.5 mr-1">
                  <span style={{ color: c.color }} className="font-bold text-xs">{c.sym}</span>
                  {parPrices(game.stockMarket).slice(0, 8).map(pp => {
                    const presPercent = game.title.shares?.[0] ?? 20
                    const cost = (pp.price * presPercent) / 10
                    const ok = player.cash >= cost
                    return <B key={`${c.sym}-${pp.price}`} t={`${pp.price}`} v={ok ? 'green' : 'disabled'}
                      o={() => ok && doAction({ type: 'PAR_SHARE', playerId: player.id, corpSym: c.sym, parPrice: pp.price, row: pp.row, col: pp.col })} />
                  })}
                </span>
              ))}
            </>
          )}

          {panel === 'loan' && corp && (() => {
            const config = game.title.loans || {}
            const loanValue = config.loanValue || 100
            const loans = corp.loans || 0
            const max = config.maxLoansPerCorp || 99
            return <>
              <Label skin={skin}>{corp.sym} Loans: {loans}/{max}:</Label>
              {loans < max && <B t={`Take +${fmt(loanValue)}`} v="green" o={() => doAction({ type: 'TAKE_LOAN', corpSym: corp.sym })} />}
              {loans > 0 && corp.cash >= loanValue && <B t={`Repay -${fmt(loanValue)}`} v="red" o={() => doAction({ type: 'REPAY_LOAN', corpSym: corp.sym })} />}
              {loans > 0 && <B t="Pay Interest" v="yellow" o={() => doAction({ type: 'PAY_INTEREST', corpSym: corp.sym })} />}
            </>
          })()}

          {panel === 'private' && player && corp && (() => {
            const privs = (game.companies || []).filter(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.canSellToCorp !== false)
            if (privs.length === 0) return <Label skin={skin}>No privates to sell</Label>
            return <>
              <Label skin={skin}>{player.name} sell to {corp.sym}:</Label>
              {privs.map(c => (
                <B key={c.sym} t={`${c.sym} (${fmt(c.value)})`} v="blue"
                  o={() => { const p = prompt(`Sell ${c.sym} to ${corp.sym} for? (face: ${c.value})`); const pr = parseInt(p, 10); if (pr > 0) doAction({ type: 'SELL_PRIVATE', companySym: c.sym, fromPlayerId: player.id, toCorpSym: corp.sym, price: pr }) }} />
              ))}
            </>
          })()}
        </div>

        <button onClick={onClose} className={skin === 'moderator' ? 'text-red-400 hover:text-red-200 font-bold text-xs' : 'text-broker-text-muted hover:text-white text-sm'}>
          Esc
        </button>
      </div>
    </div>
  )
}

function Label({ skin, children }) {
  return <span className={skin === 'moderator' ? 'text-green-400 text-xs font-mono' : 'text-broker-text-muted text-sm font-medium'}>{children}</span>
}

function MBtn({ t, v, o }) {
  const c = { green: 'bg-green-900/80 text-green-300 hover:bg-green-800', red: 'bg-red-900/80 text-red-300 hover:bg-red-800', blue: 'bg-cyan-900/80 text-cyan-300 hover:bg-cyan-800', yellow: 'bg-yellow-900/80 text-yellow-300 hover:bg-yellow-800', disabled: 'bg-gray-800/60 text-gray-600 cursor-not-allowed' }
  return <button onClick={o} className={`px-1.5 py-0.5 rounded text-xs font-mono ${c[v] || c.green}`}>{t}</button>
}

function BrokerBtn({ t, v, o }) {
  const c = { green: 'bg-green-700 text-white hover:bg-green-600', red: 'bg-red-700 text-white hover:bg-red-600', blue: 'bg-blue-700 text-white hover:bg-blue-600', yellow: 'bg-amber-700 text-white hover:bg-amber-600', disabled: 'bg-broker-surface-hover text-broker-text-muted cursor-not-allowed' }
  return <button onClick={o} className={`px-2 py-1 rounded text-xs font-medium ${c[v] || c.green}`}>{t}</button>
}
